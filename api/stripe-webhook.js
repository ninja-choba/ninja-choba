// api/stripe-webhook.js
// Stripe Webhook を受け取りプランを反映する Vercel Edge Function

export const config = { runtime: 'edge' };

// 帳簿を保存しているテーブル名。以前 'accounts' に書いていたが実在せず、
// 決済してもプランが反映されなかった（利用者は課金済みなのに無料版のまま）。
const TABLE = 'ninja_accounts';

async function verifyStripeSignature(payload, sigHeader, secret) {
  const encoder = new TextEncoder();
  const parts = sigHeader.split(',');
  const tPart = parts.find(p => p.startsWith('t='));
  const v1Part = parts.find(p => p.startsWith('v1='));
  if (!tPart || !v1Part) return false;

  const timestamp = tPart.slice(2);
  const signature = v1Part.slice(3);
  const signedPayload = `${timestamp}.${payload}`;

  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
  const computed = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return computed === signature;
}

// 環境変数のゆらぎ（前後の空白・改行・末尾スラッシュ・引用符）を吸収する。
// 以前これが原因で URL が壊れ、認証APIが Invalid URL string. で落ちていた。
function normalizeUrl(raw) {
  if (!raw) return '';
  let url = String(raw).trim().replace(/^["']|["']$/g, '');
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  return url.replace(/\/+$/, '');
}

// Supabaseへの更新をまとめて行う。
// 以前は結果を一切見ておらず、テーブル名が違っていても気づけなかった。
// 失敗したら例外を投げ、Stripeに500を返してもらう（Stripeが自動で再送する）。
async function patchAccount({ url, key, filter, body, label }) {
  const endpoint = `${url}/rest/v1/${TABLE}?${filter}`;
  const res = await fetch(endpoint, {
    method: 'PATCH',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      // 更新した行を返してもらい、本当に反映されたかを確かめる
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    console.error(`[Webhook] ${label} 失敗 HTTP ${res.status}:`, text);
    throw new Error(`${label} に失敗しました（HTTP ${res.status}）: ${text.slice(0, 200)}`);
  }

  // 該当する行が無ければ空配列が返る。これも失敗として扱う
  let rows = null;
  try { rows = JSON.parse(text); } catch (e) { /* 解析できなければ後段で判定 */ }
  if (Array.isArray(rows) && rows.length === 0) {
    console.error(`[Webhook] ${label}: 該当する行がありません`, filter);
    throw new Error(`${label}: 対象の帳簿が見つかりませんでした（${filter}）`);
  }

  console.log(`[Webhook] ${label} 成功:`, text.slice(0, 200));
  return rows;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  const SUPABASE_URL = normalizeUrl(process.env.SUPABASE_URL || process.env.MY_SUPABASE_URL);
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const sig = req.headers.get('stripe-signature');
  const rawBody = await req.text();

  // 署名検証
  if (WEBHOOK_SECRET) {
    const valid = await verifyStripeSignature(rawBody, sig, WEBHOOK_SECRET);
    if (!valid) {
      return new Response('署名検証失敗', { status: 400 });
    }
  }

  const event = JSON.parse(rawBody);
  console.log('[Webhook] event:', event.type);

  // 設定が欠けている場合は、成功したように見せずエラーを返す。
  // Stripeが再送してくれるので、設定を直せば後から反映される。
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[Webhook] 環境変数が未設定です', {
      SUPABASE_URL: !!SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_KEY,
    });
    return new Response(JSON.stringify({ error: 'Supabase設定が未設定です' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // プランマッピング（Price ID → プラン名）
  const PRICE_TO_PLAN = {
    [process.env.STRIPE_PRICE_SOLO]:        'solo',
    [process.env.STRIPE_PRICE_PRO]:         'pro',
    [process.env.STRIPE_PRICE_REALESTATE]:  'realestate',
    [process.env.STRIPE_PRICE_DENCHO]:      'dencho',
  };

  try {
    switch (event.type) {

      // 決済成功 → プランを有効化
      case 'checkout.session.completed': {
        const session = event.data.object;
        const email = session.customer_email
                   || session.customer_details?.email
                   || session.metadata?.email;
        const rawPlan = session.metadata?.plan;
        // 年払い（solo_yearly等）は基本プラン名（solo/pro/realestate）に正規化して保存する。
        // クライアント側のisPaidPlan()/getPlan()はsolo/pro/realestateのみを認識するため、
        // '_yearly'付きのまま保存すると課金済みなのに無料版扱いになってしまう。
        const plan = rawPlan ? rawPlan.replace(/_yearly$/, '') : rawPlan;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (!email || !plan) {
          console.error('[Webhook] メールまたはプランが取れませんでした', { email, rawPlan });
          throw new Error('決済情報からメールアドレスまたはプランを特定できませんでした');
        }

        // 電帳法オプションはプランを変えず dencho_option フラグだけ立てる
        const patchBody = plan === 'dencho'
          ? { dencho_option: true, dencho_activated_at: new Date().toISOString(), stripe_customer_id: customerId }
          : { plan, plan_status: 'active', stripe_customer_id: customerId, stripe_subscription_id: subscriptionId, plan_activated_at: new Date().toISOString() };

        await patchAccount({
          url: SUPABASE_URL,
          key: SUPABASE_SERVICE_KEY,
          filter: `email=eq.${encodeURIComponent(email)}`,
          body: patchBody,
          label: `プラン有効化(${plan}) ${email}`,
        });
        break;
      }

      // サブスクリプション更新
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const priceId = sub.items?.data?.[0]?.price?.id;
        // Price IDからプラン判定。未登録（年払いPrice等）の場合はサブスクのmetadataのplanを使い、
        // '_yearly'を除去して基本プラン名に正規化する。
        let plan = PRICE_TO_PLAN[priceId];
        if (!plan) {
          const metaPlan = sub.metadata?.plan;
          plan = metaPlan ? metaPlan.replace(/_yearly$/, '') : 'free';
        }
        const status = sub.status; // active / past_due / canceled

        // メールが取れないことがあるため、顧客IDでも引けるようにする。
        // これが無いと更新の取りこぼしが起きる
        const email = sub.metadata?.email;
        const filter = email
          ? `email=eq.${encodeURIComponent(email)}`
          : (sub.customer ? `stripe_customer_id=eq.${encodeURIComponent(sub.customer)}` : null);
        if (!filter) {
          console.error('[Webhook] 更新対象を特定できません', sub.id);
          throw new Error('サブスクリプション更新の対象を特定できませんでした');
        }

        await patchAccount({
          url: SUPABASE_URL,
          key: SUPABASE_SERVICE_KEY,
          filter,
          body: {
            plan: status === 'active' ? plan : 'free',
            plan_status: status,
          },
          label: `プラン更新(${plan}/${status})`,
        });
        break;
      }

      // 解約 → 無料プランに戻す
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const email = sub.metadata?.email;
        const filter = email
          ? `email=eq.${encodeURIComponent(email)}`
          : (sub.customer ? `stripe_customer_id=eq.${encodeURIComponent(sub.customer)}` : null);
        if (!filter) {
          console.error('[Webhook] 解約対象を特定できません', sub.id);
          throw new Error('解約の対象を特定できませんでした');
        }

        await patchAccount({
          url: SUPABASE_URL,
          key: SUPABASE_SERVICE_KEY,
          filter,
          body: {
            plan: 'free',
            plan_status: 'canceled',
            stripe_subscription_id: null,
          },
          label: '解約',
        });
        break;
      }

      // 支払い失敗
      case 'invoice.payment_failed': {
        console.warn('[Webhook] 支払い失敗:', event.data.object.customer_email);
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('[Webhook] 処理エラー:', err);
    // 500を返すとStripeが自動で再送するため、設定を直せば後から反映される
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
