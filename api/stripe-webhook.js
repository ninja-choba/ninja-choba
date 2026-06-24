// api/stripe-webhook.js
// Stripe Webhook を受け取りプランを反映する Vercel Edge Function

export const config = { runtime: 'edge' };

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

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
  const SUPABASE_URL = process.env.SUPABASE_URL;
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
        const email = session.customer_email || session.metadata?.email;
        const plan  = session.metadata?.plan;
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (email && plan && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
          // 電帳法オプションはプランを変えず dencho_option フラグだけ立てる
          const patchBody = plan === 'dencho'
            ? { dencho_option: true, dencho_activated_at: new Date().toISOString(), stripe_customer_id: customerId }
            : { plan, plan_status: 'active', stripe_customer_id: customerId, stripe_subscription_id: subscriptionId, plan_activated_at: new Date().toISOString() };

          await fetch(`${SUPABASE_URL}/rest/v1/accounts?email=eq.${encodeURIComponent(email)}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify(patchBody),
          });
        }
        break;
      }

      // サブスクリプション更新
      case 'customer.subscription.updated': {
        const sub = event.data.object;
        const priceId = sub.items?.data?.[0]?.price?.id;
        const plan = PRICE_TO_PLAN[priceId] || 'free';
        const status = sub.status; // active / past_due / canceled

        if (SUPABASE_URL && SUPABASE_SERVICE_KEY && sub.metadata?.email) {
          await fetch(`${SUPABASE_URL}/rest/v1/accounts?email=eq.${encodeURIComponent(sub.metadata.email)}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              plan: status === 'active' ? plan : 'free',
              plan_status: status,
            }),
          });
        }
        break;
      }

      // 解約 → 無料プランに戻す
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        if (SUPABASE_URL && SUPABASE_SERVICE_KEY && sub.metadata?.email) {
          await fetch(`${SUPABASE_URL}/rest/v1/accounts?email=eq.${encodeURIComponent(sub.metadata.email)}`, {
            method: 'PATCH',
            headers: {
              'apikey': SUPABASE_SERVICE_KEY,
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
              plan: 'free',
              plan_status: 'canceled',
              stripe_subscription_id: null,
            }),
          });
        }
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
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
