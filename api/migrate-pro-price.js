// api/migrate-pro-price.js
// 【一度だけ実行する移行ツール】
// 旧「事業版」（980円・prod_UgtfpfjxxT5AM5）で契約中の方を、
// 統合後の680円（prod_UgtagE3fTfibik、旧ひとり版の商品）へ移行する。
//
// 必ず、まず ?dry_run=true で対象者と内容を確認してから、
// dry_runを外して実行すること。
//
// 使い方：
//   確認のみ（何も変更しない）：
//     /api/migrate-pro-price?secret=YOUR_SECRET&dry_run=true
//   実際に移行する：
//     /api/migrate-pro-price?secret=YOUR_SECRET
//
// proration_behavior は 'none' にしている。これは「今すぐ差額を
// 請求・返金しない」設定で、次回の請求日から新しい680円が適用される。
// 値下げなので、利用者に不利益は無い

export const config = { runtime: 'edge' };

const OLD_PRO_PRODUCT_ID = 'prod_UgtfpfjxxT5AM5'; // 旧事業版（980円）
const NEW_PRODUCT_ID = 'prod_UgtagE3fTfibik';     // 統合後（旧ひとり版・680円、月額と年額の両方がある）

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

// 指定したProductの、指定intervalのアクティブなPrice IDを取得
async function getPriceId(productId, secretKey, interval) {
  const data = await stripeGet(`/v1/prices?product=${productId}&active=true&limit=100`, secretKey);
  const matched = (data.data || []).find(function(p) {
    return p.recurring && p.recurring.interval === interval;
  });
  if (!matched) throw new Error(`Product ${productId} に interval=${interval} のPriceが見つかりません`);
  return matched.id;
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
    // 新しい680円（月額）・6,800円（年額）のPrice IDを、統合先のProductから解決する
    const newMonthlyPriceId = await getPriceId(NEW_PRODUCT_ID, STRIPE_SECRET, 'month');
    const newYearlyPriceId = await getPriceId(NEW_PRODUCT_ID, STRIPE_SECRET, 'year');

    // 旧事業版（980円）のアクティブなPrice一覧を取得（月額・年額の両方あり得る）
    const oldPrices = await stripeGet(`/v1/prices?product=${OLD_PRO_PRODUCT_ID}&active=true&limit=100`, STRIPE_SECRET);
    const oldPriceIds = (oldPrices.data || []).map(function(p) { return p.id; });

    if (!oldPriceIds.length) {
      return new Response(JSON.stringify({ message: '旧事業版のPriceが見つかりませんでした（すでに移行済み、または商品IDが違う可能性があります）' }), { status: 200, headers: corsHeaders });
    }

    // 旧事業版の各Priceを使っている、アクティブなサブスクリプションを集める
    var targets = [];
    for (var i = 0; i < oldPriceIds.length; i++) {
      var subs = await stripeGet(`/v1/subscriptions?price=${oldPriceIds[i]}&status=active&limit=100`, STRIPE_SECRET);
      targets = targets.concat(subs.data || []);
    }

    if (!targets.length) {
      return new Response(JSON.stringify({ message: '旧事業版（980円）で契約中の方は見つかりませんでした。移行対象はありません。' }), { status: 200, headers: corsHeaders });
    }

    var results = [];
    for (var j = 0; j < targets.length; j++) {
      var sub = targets[j];
      var item = sub.items.data[0];
      var oldInterval = item.price.recurring.interval;
      var newPriceId = oldInterval === 'year' ? newYearlyPriceId : newMonthlyPriceId;

      var entry = {
        subscription_id: sub.id,
        customer: sub.customer,
        email: sub.metadata && sub.metadata.email || null,
        old_price: item.price.id,
        old_amount: item.price.unit_amount,
        new_price: newPriceId,
        new_amount: oldInterval === 'year' ? 6800 : 680,
      };

      if (!dryRun) {
        // 実際に価格を差し替える。proration_behavior:'none'で、
        // 今すぐの請求・返金はせず、次回請求日から新価格が適用されるようにする
        var params = new URLSearchParams({
          'items[0][id]': item.id,
          'items[0][price]': newPriceId,
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
        : results.length + '件を680円へ移行しました。',
      results: results,
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
