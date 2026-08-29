// api/stripe-checkout.js
// Stripe Checkout Session を生成する Vercel Edge Function
// prod_ IDからprice_IDを自動解決するため、環境変数不要

export const config = { runtime: 'edge' };

// プランと商品IDのマッピング（Stripeダッシュボードから取得済み）
// 月払い・年払いは同じ product_id を共有し、interval（month/year）で価格を出し分ける。
// Stripe側で各Productに「月額」と「年額」の2つのPriceを作成しておくこと。
//
// 【2026-08-26 ひとり版・事業版の統合】
// 「ひとり版」と「事業版」を統合し、事業版680円の1つにした。
// 旧ひとり版の商品（prod_UgtagE3fTfibik）はすでに680円で登録済みだったため、
// 新しい商品を作らず、そのままproとして使い回している（Stripe側の変更を最小限にするため）。
// 旧事業版の商品（prod_UgtfpfjxxT5AM5・980円）は、新規のチェックアウトには
// もう使わないが、削除はしていない（過去の請求履歴等が参照している可能性があるため）。
// soloキーは、統合前のリンクや古いキャッシュから呼ばれた場合の後方互換として残し、
// proと全く同じ商品・価格を指すようにしている
const PLANS = {
  pro: {
    name: '忍者帳場 事業版',
    product_id: 'prod_UgtagE3fTfibik', // 旧ひとり版の商品（680円ですでに登録済み）
    amount: 680,
    interval: 'month',
  },
  solo: { // 後方互換：統合前の「ひとり版」。中身はproと同一
    name: '忍者帳場 事業版',
    product_id: 'prod_UgtagE3fTfibik',
    amount: 680,
    interval: 'month',
  },
  realestate: {
    name: '忍者帳場 不動産版',
    product_id: 'prod_UgthPJPtr3im61',
    amount: 1980,
    interval: 'month',
  },
  dencho: {
    name: '忍者帳場 電帳法対応オプション',
    product_id: 'prod_UlMxzANWTfXsMN',
    amount: 300,
    interval: 'month',
  },
  // 年払い（月払いと同じProductを共有し、interval='year'で年額Priceを取得）
  pro_yearly: {
    name: '忍者帳場 事業版（年払い）',
    product_id: 'prod_UgtagE3fTfibik', // 旧ひとり版の商品（年額6,800円もすでに登録済み）
    amount: 6800,
    interval: 'year',
  },
  solo_yearly: { // 後方互換：中身はpro_yearlyと同一
    name: '忍者帳場 事業版（年払い）',
    product_id: 'prod_UgtagE3fTfibik',
    amount: 6800,
    interval: 'year',
  },
  realestate_yearly: {
    name: '忍者帳場 不動産版（年払い）',
    product_id: 'prod_UgthPJPtr3im61',
    amount: 19800,
    interval: 'year',
  },
};

// prod_IDから、指定interval（month/year）のアクティブなprice_IDを取得
async function getPriceId(productId, secretKey, interval) {
  // そのProductのアクティブなPriceを最大100件取得し、intervalで絞り込む
  const res = await fetch(
    `https://api.stripe.com/v1/prices?product=${productId}&active=true&limit=100`,
    {
      headers: {
        'Authorization': `Basic ${btoa(secretKey + ':')}`,
      },
    }
  );
  const data = await res.json();
  if (!res.ok || !data.data || data.data.length === 0) {
    throw new Error(`Price ID取得失敗: ${productId}`);
  }
  // intervalが指定されていれば、その課金間隔のPriceを優先的に選ぶ
  if (interval) {
    const matched = data.data.find(function(p) {
      return p.recurring && p.recurring.interval === interval;
    });
    if (matched) return matched.id;
    throw new Error(`Price ID取得失敗: ${productId} に interval=${interval} のPriceがありません`);
  }
  return data.data[0].id;
}

// 許可するフロントエンドのオリジン（本番ドメインのみ）
const ALLOWED_ORIGINS = ['https://ninja-choba.jp', 'https://www.ninja-choba.jp'];

export default async function handler(req) {
  const origin = req.headers.get('origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET) {
    return new Response(JSON.stringify({ error: 'Stripe未設定' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();
    const { plan, email, success_url, cancel_url } = body;

    const planData = PLANS[plan];
    if (!planData) {
      return new Response(JSON.stringify({ error: '無効なプランです' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // prod_IDからprice_IDを自動解決（月払い/年払いはintervalで出し分け）
    const priceId = await getPriceId(planData.product_id, STRIPE_SECRET, planData.interval);

    // Stripe Checkout Session 作成。
    // metadata[plan]・subscription_data[metadata][plan]には、統合後の
    // 正式なプラン名（'pro'）を書き込む。'solo'から来た場合でも、
    // 実際に契約するのは同じ商品・価格なので、以降はproとして扱われるようにする
    const savedPlanName = plan === 'solo' ? 'pro' : (plan === 'solo_yearly' ? 'pro_yearly' : plan);
    const params = new URLSearchParams({
      'mode': 'subscription',
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      'success_url': success_url || 'https://ninja-choba.jp/?checkout=success&plan=' + savedPlanName,
      'cancel_url': cancel_url || 'https://ninja-choba.jp/?checkout=cancel',
      'customer_email': email || '',
      'locale': 'ja',
      'metadata[plan]': savedPlanName,
      'metadata[email]': email || '',
      'subscription_data[metadata][plan]': savedPlanName,
      'subscription_data[metadata][email]': email || '',
      'allow_promotion_codes': 'true',
      'billing_address_collection': 'auto',
    });

    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(STRIPE_SECRET + ':')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const session = await res.json();

    if (!res.ok) {
      console.error('[Stripe] Session作成失敗:', session.error);
      return new Response(JSON.stringify({ error: session.error?.message || 'Session作成失敗' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ url: session.url, session_id: session.id }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowOrigin,
      },
    });

  } catch (err) {
    console.error('[Stripe] エラー:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
