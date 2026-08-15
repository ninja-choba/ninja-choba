// api/validate-invite.js
// 招待コードを検証する。永年無料コードは「1人が1回だけ」使えるようにする。
//
// このファイルは以前から存在せず、クライアントからの
// fetch('/api/validate-invite') は常に失敗していた（端末内に保存された
// メンバー招待コードだけがフォールバックで通る状態だった）。
//
// 使い方は2通り：
//   { code }                  … 使えるコードかどうか調べるだけ（消費しない）
//   { code, email, consume:true } … 実際に使う。1件だけ更新できたら成功
//
// 「1回だけ」は、データベース側の条件付き更新（used_by が空のものだけ更新）で
// 担保する。アプリ側で「調べてから使う」の2段階にすると、その隙間に
// 二人が同時に使えてしまうため、必ず1回の更新でまとめて行う。

export const config = { runtime: 'edge' };

const TABLE = 'ninja_invite_codes';

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
    return new Response('Method not allowed', { status: 405 });
  }

  const SUPABASE_URL = normalizeUrl(process.env.SUPABASE_URL || process.env.MY_SUPABASE_URL);
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let body = {};
  try { body = await req.json(); } catch (e) {}

  const code = String(body.code || '').trim().toUpperCase();
  const email = String(body.email || '').trim().toLowerCase();
  const consume = body.consume === true;

  if (!code) return json({ valid: false, reason: 'コードが空です' });

  // 設定が無い場合は「検証できなかった」ことを正直に返す。
  // ここで valid:true を返すと、誰でも任意のコードで登録できてしまう
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('[validate-invite] Supabaseの設定が未設定です');
    return json({ valid: false, reason: 'サーバー設定が未完了です' }, 500);
  }

  const headers = {
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
    'Content-Type': 'application/json',
  };

  try {
    if (!consume) {
      // ── 調べるだけ（消費しない） ──
      const url = `${SUPABASE_URL}/rest/v1/${TABLE}`
        + `?code=eq.${encodeURIComponent(code)}`
        + `&active=is.true&used_by=is.null&select=code,plan`;
      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.error('[validate-invite] 照会に失敗', res.status, await res.text());
        return json({ valid: false, reason: '確認できませんでした' }, 500);
      }
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return json({ valid: true, plan: rows[0].plan || 'solo' });
      }
      return json({ valid: false, reason: 'このコードは使えません（無効、または既に使われています）' });
    }

    // ── 実際に使う（1回だけ） ──
    // used_by が空のものだけを更新する条件付き更新。
    // 同時に二人が使おうとしても、更新できるのは必ず片方だけになる
    if (!email) return json({ valid: false, reason: 'メールアドレスがありません' });

    const patchUrl = `${SUPABASE_URL}/rest/v1/${TABLE}`
      + `?code=eq.${encodeURIComponent(code)}`
      + `&active=is.true&used_by=is.null`;
    const res = await fetch(patchUrl, {
      method: 'PATCH',
      headers: Object.assign({}, headers, { 'Prefer': 'return=representation' }),
      body: JSON.stringify({
        used_by: email,
        used_at: new Date().toISOString(),
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error('[validate-invite] 使用処理に失敗', res.status, text);
      return json({ valid: false, reason: '登録できませんでした' }, 500);
    }

    let rows = null;
    try { rows = JSON.parse(text); } catch (e) {}
    if (Array.isArray(rows) && rows.length > 0) {
      console.log('[validate-invite] 招待コード使用:', code, email);
      return json({ valid: true, plan: rows[0].plan || 'solo' });
    }

    // 1件も更新できなかった＝既に誰かが使った、または無効なコード
    return json({ valid: false, reason: 'このコードは既に使われています' });

  } catch (err) {
    console.error('[validate-invite] 処理エラー:', err);
    return json({ valid: false, reason: '確認中に問題が起きました' }, 500);
  }
}
