// api/claude.js
// Anthropic API へのセキュアなプロキシ
// APIキーはVercelの環境変数に保存し、フロントエンドには公開しない

export const config = { runtime: 'edge' };

// 許可するオリジン（本番ドメインとlocalhost）
const ALLOWED_ORIGINS = [
  'https://ninja-choba.jp',
  'https://www.ninja-choba.jp',
  'http://localhost:3000',
  'http://localhost:5000',
];

export default async function handler(req) {
  const origin = req.headers.get('origin') || '';

  // CORS プリフライト
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  // POST のみ受け付ける
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // APIキーの確認
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json();

    // モデルを強制（フロントから上書きされないように）
    body.model = 'claude-sonnet-4-20250514';

    // max_tokens の上限を設定（コスト制御）
    if (!body.max_tokens || body.max_tokens > 4000) {
      body.max_tokens = body.max_tokens || 1000;
    }

    // Anthropic API にプロキシ
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin),
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders(origin),
      },
    });
  }
}

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
