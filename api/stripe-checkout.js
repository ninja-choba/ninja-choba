// api/stripe-checkout.js
// Stripe Checkout Session を生成する Vercel Edge Function

export const config = { runtime: 'edge' };

// プランとPrice IDのマッピング
// ⚠️ 本番Price IDはStripeダッシュボードで作成後に置き換えてください
const PLANS = {
  solo: {
    name: '忍者帳場 ひとり版',
    price_id: process.env.STRIPE_PRICE_SOLO,      // ¥680/月
    amount: 680,
  },
  pro: {
    name: '忍者帳場 事業版',
    price_id: process.env.STRIPE_PRICE_PRO,       // ¥980/月
    amount: 980,
  },
  realestate: {
    name: '忍者帳場 不動産版',
    price_id: process.env.STRIPE_PRICE_REALESTATE, // ¥1,980/月
    amount: 1980,
  },
};

export default async function handler(req) {
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

    if (!planData.price_id) {
      return new Response(JSON.stringify({ error: `Price ID未設定: ${plan}` }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Stripe Checkout Session 作成
    const params = new URLSearchParams({
      'mode': 'subscription',
      'line_items[0][price]': planData.price_id,
      'line_items[0][quantity]': '1',
      'success_url': success_url || 'https://ninja-choba.vercel.app/?checkout=success&plan=' + plan,
      'cancel_url': cancel_url || 'https://ninja-choba.vercel.app/?checkout=cancel',
      'customer_email': email || '',
      'locale': 'ja',
      'metadata[plan]': plan,
      'metadata[email]': email || '',
      'subscription_data[metadata][plan]': plan,
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
        'Access-Control-Allow-Origin': '*',
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
