// api/supabase-auth.js
// Supabase Auth へのプロキシ Edge Function
// フロントエンドから直接Supabase APIを叩かずにここを経由する

export const config = { runtime: 'edge' };

const MY_SUPABASE_URL = process.env.MY_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req) {
  const corsHeaders = {
    // ⚠️開発が終わったら '*' ではなく特定のフロントエンドドメインに制限することを推奨
    'Access-Control-Allow-Origin': '*', 
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  // プリフライト（OPTIONS）リクエストの処理
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // フロントエンドからは常にPOSTで受け取る
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  // 環境変数のチェック
  if (!MY_SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase設定（URLまたはKEY）が未設定です。VercelのEnvironment Variablesを確認してください。' }), { status: 500, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, email, password, access_token, refresh_token } = body;

    let supaPath = '';
    let supaMethod = 'POST'; // 基本はPOST
    let supaBody = {};
    let authHeader = `Bearer ${SUPABASE_ANON_KEY}`;

    // アクションごとの条件分岐
    switch (action) {
      case 'signup':
        supaPath = '/auth/v1/signup';
        supaBody = { email, password };
        break;

      case 'login':
        supaPath = '/auth/v1/token?grant_type=password';
        supaBody = { email, password };
        break;

      case 'refresh':
        supaPath = '/auth/v1/token?grant_type=refresh_token';
        supaBody = { refresh_token };
        break;

      case 'logout':
        supaPath = '/auth/v1/logout';
        if (access_token) authHeader = `Bearer ${access_token}`;
        supaBody = {};
        break;

      case 'update_password':
        supaPath = '/auth/v1/user';
        supaMethod = 'PUT'; // パスワード更新は PUT メソッドが必須
        if (!access_token) return new Response(JSON.stringify({ error: '認証（access_token）が必要です' }), { status: 401, headers: corsHeaders });
        authHeader = `Bearer ${access_token}`;
        supaBody = { password };
        break;

      case 'get_user':
        supaPath = '/auth/v1/user';
        supaMethod = 'GET'; // ユーザー情報取得は GET メソッド
        if (!access_token) return new Response(JSON.stringify({ error: '認証（access_token）が必要です' }), { status: 401, headers: corsHeaders });
        authHeader = `Bearer ${access_token}`;
        supaBody = null; // GETのときはBodyを送らない
        break;

      case 'reset_password':
        supaPath = '/auth/v1/recover';
        supaBody = { email };
        break;

      default:
        return new Response(JSON.stringify({ error: '無効なアクション（action）です' }), { status: 400, headers: corsHeaders });
    }

    // 実際のSupabase APIへリクエストを転送（プロキシ）
    const res = await fetch(`${MY_SUPABASE_URL}${supaPath}`, {
      method: supaMethod,
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': authHeader,
      },
      body: supaBody === null ? undefined : JSON.stringify(supaBody),
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: corsHeaders,
    });

  } catch (err) {
    console.error('[supabase-auth] 処理エラー:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
