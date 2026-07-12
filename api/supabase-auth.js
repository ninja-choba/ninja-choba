// api/supabase-auth.js
// Supabase Auth へのプロキシ Edge Function
// フロントエンドから直接Supabase APIを叩かずにここを経由する

export const config = { runtime: 'edge' };

const MY_SUPABASE_URL = process.env.MY_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  }

  if (!MY_SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return new Response(JSON.stringify({ error: 'Supabase未設定' }), { status: 500, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, email, password, access_token } = body;

    let supaPath = '';
    let supaBody = {};
    let authHeader = `Bearer ${SUPABASE_ANON_KEY}`;

    switch (action) {
      case 'signup':
        supaPath = '/auth/v1/signup';
        supaBody = { email, password };
        break;

      case 'login':
        supaPath = '/auth/v1/token?grant_type=password';
        supaBody = { email, password };
        break;

      case 'logout':
        supaPath = '/auth/v1/logout';
        if (access_token) authHeader = `Bearer ${access_token}`;
        supaBody = {};
        break;

      case 'update_password':
        supaPath = '/auth/v1/user';
        if (!access_token) return new Response(JSON.stringify({ error: '認証が必要です' }), { status: 401, headers: corsHeaders });
        authHeader = `Bearer ${access_token}`;
        supaBody = { password };
        break;

      case 'get_user':
        supaPath = '/auth/v1/user';
        if (!access_token) return new Response(JSON.stringify({ error: '認証が必要です' }), { status: 401, headers: corsHeaders });
        authHeader = `Bearer ${access_token}`;
        supaBody = null;
        break;

      case 'reset_password':
        supaPath = '/auth/v1/recover';
        supaBody = { email };
        break;

      default:
        return new Response(JSON.stringify({ error: '無効なアクション' }), { status: 400, headers: corsHeaders });
    }

    const res = await fetch(`${MY_SUPABASE_URL}${supaPath}`, {
      method: supaBody === null ? 'GET' : 'POST',
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
    console.error('[supabase-auth] エラー:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
