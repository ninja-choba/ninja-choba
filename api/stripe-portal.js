// api/stripe-portal.js
// Stripe の請求管理画面（カスタマーポータル）へのリンクを発行する Vercel Edge Function
//
// このファイルが無かったため、「プラン変更・解約」「請求履歴」を押すと
// 404 が返り、画面には意味の分からないエラーが出ていた。
// 解約の手段が用意されていない状態は、特定商取引法の観点でも問題になる。

export const config = { runtime: 'edge' };

const TABLE = 'ninja_accounts';

// 環境変数のゆらぎ（前後の空白・改行・末尾スラッシュ・引用符）を吸収する
function normalizeUrl(raw) {
  if (!raw) return '';
  let url = String(raw).trim().replace(/^["']|["']$/g, '');
  if (!url) return '';
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  return url.replace(/\/+$/, '');
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET;
  const SUPABASE_URL = normalizeUrl(process.env.SUPABASE_URL || process.env.MY_SUPABASE_URL);
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!STRIPE_SECRET) {
    console.error('[Portal] STRIPE_SECRET_KEY が未設定です');
    return json({ error: '決済の設定が未了です。サポートまでご連絡ください。' }, 500);
  }
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('[Portal] Supabaseの設定が未設定です');
    return json({ error: 'サーバーの設定が未了です。サポートまでご連絡ください。' }, 500);
  }

  let email = '';
  let returnUrl = '';
  try {
    const body = await req.json();
    email = String(body.email || '').trim().toLowerCase();
    returnUrl = String(body.return_url || '').trim();
  } catch (e) {
    return json({ error: 'リクエストを読み取れませんでした' }, 400);
  }

  if (!email) {
    return json({ error: 'メールアドレスが確認できませんでした' }, 400);
  }

  try {
    // ── 1. 顧客IDを引く ──
    const lookup = await fetch(
      `${SUPABASE_URL}/rest/v1/${TABLE}?select=stripe_customer_id,plan&email=eq.${encodeURIComponent(email)}`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Accept': 'application/json',
        },
      }
    );
    const lookupText = await lookup.text();
    if (!lookup.ok) {
      console.error('[Portal] 顧客の照会に失敗:', lookup.status, lookupText);
      return json({ error: 'ご契約の確認に失敗しました。サポートまでご連絡ください。' }, 500);
    }

    let rows = [];
    try { rows = JSON.parse(lookupText); } catch (e) { rows = []; }
    let customerId = rows[0] && rows[0].stripe_customer_id;

    // ── 2. 顧客IDが無ければ、メールアドレスからStripeに問い合わせる ──
    // 以前のWebhookが書き込みに失敗していた期間の契約は、顧客IDが
    // 記録されていない。その場合でも解約できるようにする
    if (!customerId) {
      const search = await fetch(
        `https://api.stripe.com/v1/customers?email=${encodeURIComponent(email)}&limit=1`,
        { headers: { 'Authorization': `Bearer ${STRIPE_SECRET}` } }
      );
      const searchData = await search.json();
      if (search.ok && searchData.data && searchData.data.length) {
        customerId = searchData.data[0].id;
        // 次回のために記録しておく（失敗しても処理は続ける）
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?email=eq.${encodeURIComponent(email)}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ stripe_customer_id: customerId }),
          });
        } catch (e) { /* 記録できなくてもポータルは開ける */ }
      }
    }

    if (!customerId) {
      return json({
        error: 'ご契約の記録が見つかりませんでした。お支払いをされている場合は、決済完了メールを添えて support@ninja-choba.jp までご連絡ください。'
      }, 404);
    }

    // ── 3. 請求管理画面のリンクを発行 ──
    const params = new URLSearchParams();
    params.set('customer', customerId);
    if (returnUrl) params.set('return_url', returnUrl);

    const portal = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    const portalData = await portal.json();

    if (!portal.ok || !portalData.url) {
      console.error('[Portal] ポータル発行に失敗:', portal.status, JSON.stringify(portalData).slice(0, 300));
      const msg = portalData.error && portalData.error.message ? portalData.error.message : '';
      // Stripe側でポータルの設定が済んでいない場合もここに来る
      return json({
        error: '請求管理画面を開けませんでした。' + (msg ? '（' + msg + '）' : '') + ' サポートまでご連絡ください。'
      }, 500);
    }

    return json({ url: portalData.url });

  } catch (err) {
    console.error('[Portal] 処理エラー:', err);
    return json({ error: '請求管理画面を開けませんでした。時間をおいてお試しください。' }, 500);
  }
}
