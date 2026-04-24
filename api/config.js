// api/config.js
// フロントエンドに設定を安全に渡す（APIキーは渡さない）
export const config = { runtime: 'edge' };

export default async function handler(req) {
  return new Response(JSON.stringify({
    supabase_url:  process.env.SUPABASE_URL  || null,
    supabase_key:  process.env.SUPABASE_ANON_KEY || null,
    has_supabase:  !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY),
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}
