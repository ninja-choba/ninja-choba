// api/migrate-pro-price-380.js
// 【一度だけ実行する移行ツール】
// 「忍者帳場 事業版」（prod_UgtagE3fTfibik）で、旧価格（680円/月・6,800円/年）
// のまま契約中の方を、新価格（380円/月・3,800円/年）へ移行する。
//
// 前回の migrate-pro-price.js（旧事業版980円→680円の移行）とは対象が異なる。
// 今回は同じ商品の中でのPrice差し替えなので、product_idは変わらない。
//
// 前提：Stripeダッシュボードで、事業版の商品に対して
//   ・380円/月・3,800円/年 の新しいPriceをすでに作成済み
//   ・旧680円/月・6,800円/年 のPriceはアーカイブ済み（アーカイブ前でも動作する）
// であること。
//
// 使い方：
//   確認のみ（何も変更しない）：
//     /api/migrate-pro-price-380?secret=YOUR_SECRET&dry_run=true
//   実際に移行する：
//     /api/migrate-pro-price-380?secret=YOUR_SECRET
//
// proration_behavior は 'none' にしている。これは「今すぐ差額を
// 請求・返金しない」設定で、次回の請求日から新しい380円が適用される。
// 値下げなので、利用者に不利益は無い

export const config = { runtime: 'edge' };

const PRO_PRODUCT_ID = 'prod_UgtagE3fTfibik'; // 事業版（旧ひとり版と統合済みの商品）
const OLD_MONTHLY_AMOUNT = 680;
const OLD_YEARLY_AMOUNT = 6800;
const NEW_MONTHLY_AMOUNT = 380;
const NEW_YEARLY_AMOUNT = 3800;

async function stripeGet(path, secretKey) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    headers: { 'Authorization': `Basic ${btoa(secretKey + ':')}` },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe GET ${path} 失敗: ${JSON.stringify(data.error || data)}`);
  return data;
}

async function stripePost(path, params, secretKey) {
  const res = await fetch(`https://api.stripe.com${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(secretKey + ':')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Stripe POST ${path} 失敗: ${JSON.stringify(data.error || data)}`);
  return data;
}

export default async function handler(req) {
  const corsHeaders = { 'Content-Type': 'application/json' };
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');
  const dryRun = url.searchParams.get('dry_run') === 'true';
  const SETUP_SECRET = process.env.SETUP_SECRET;

  if (!SETUP_SECRET || secret !== SETUP_SECRET) {
    return new Response(JSON.stringify({ error: '認証失敗。?secret=設定した値 のパラメータが必要です。' }), { status: 401, headers: corsHeaders });
  }

  const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY;
  if (!STRIPE_SECRET) {
    return new Response(JSON.stringify({ error: '環境変数 STRIPE_SECRET_KEY が未設定です。' }), { status: 500, headers: corsHeaders });
  }

  try {
    // 事業版の商品に紐づく全Priceを、有効・アーカイブ済みを問わず取得する。
    // アーカイブ済みのPriceでも、それを参照している既存のサブスクリプション自体は
    // 引き続き取得できるため、旧価格を先にアーカイブしていても問題無い
    const allPrices = await stripeGet(`/v1/prices?product=${PRO_PRODUCT_ID}&limit=100`, STRIPE_SECRET);
    const prices = allPrices.data || [];

    function findPrice(amount, interval) {
      return prices.find(function(p) {
        return p.unit_amount === amount && p.recurring && p.recurring.interval === interval;
      });
    }

    const newMonthly = findPrice(NEW_MONTHLY_AMOUNT, 'month');
    const newYearly = findPrice(NEW_YEARLY_AMOUNT, 'year');
    const oldMonthly = findPrice(OLD_MONTHLY_AMOUNT, 'month');
    const oldYearly = findPrice(OLD_YEARLY_AMOUNT, 'year');

    if (!newMonthly || !newYearly) {
      return new Response(JSON.stringify({
        error: '新価格（380円/月・3,800円/年）がStripe側に見つかりません。先にダッシュボードで作成してください。',
        found_prices: prices.map(function(p){ return { id: p.id, amount: p.unit_amount, interval: p.recurring && p.recurring.interval, active: p.active }; }),
      }), { status: 400, headers: corsHeaders });
    }

    var oldPriceIds = [];
    if (oldMonthly) oldPriceIds.push(oldMonthly.id);
    if (oldYearly) oldPriceIds.push(oldYearly.id);

    if (!oldPriceIds.length) {
      return new Response(JSON.stringify({ message: '旧価格（680円/6,800円）のPriceが見つかりませんでした（すでに移行済み、またはPriceが完全に削除されている可能性があります）' }), { status: 200, headers: corsHeaders });
    }

    // 旧価格を使っている、アクティブなサブスクリプションを集める
    var targets = [];
    for (var i = 0; i < oldPriceIds.length; i++) {
      var subs = await stripeGet(`/v1/subscriptions?price=${oldPriceIds[i]}&status=active&limit=100`, STRIPE_SECRET);
      targets = targets.concat(subs.data || []);
    }

    if (!targets.length) {
      return new Response(JSON.stringify({ message: '旧価格（680円/6,800円）で契約中の方は見つかりませんでした。移行対象はありません。' }), { status: 200, headers: corsHeaders });
    }

    var results = [];
    for (var j = 0; j < targets.length; j++) {
      var sub = targets[j];
      var item = sub.items.data[0];
      var oldInterval = item.price.recurring.interval;
      var newPrice = oldInterval === 'year' ? newYearly : newMonthly;

      var entry = {
        subscription_id: sub.id,
        customer: sub.customer,
        email: sub.metadata && sub.metadata.email || null,
        old_price: item.price.id,
        old_amount: item.price.unit_amount,
        new_price: newPrice.id,
        new_amount: newPrice.unit_amount,
      };

      if (!dryRun) {
        // 実際に価格を差し替える。proration_behavior:'none'で、
        // 今すぐの請求・返金はせず、次回請求日から新価格が適用されるようにする
        var params = new URLSearchParams({
          'items[0][id]': item.id,
          'items[0][price]': newPrice.id,
          'proration_behavior': 'none',
        });
        await stripePost(`/v1/subscriptions/${sub.id}`, params, STRIPE_SECRET);
        entry.status = '移行しました';
      } else {
        entry.status = '（確認のみ・まだ変更していません）';
      }
      results.push(entry);
    }

    return new Response(JSON.stringify({
      dry_run: dryRun,
      message: dryRun
        ? results.length + '件が移行対象です。内容を確認し、問題無ければ dry_run を外して再度実行してください。'
        : results.length + '件を新価格へ移行しました。',
      results: results,
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
