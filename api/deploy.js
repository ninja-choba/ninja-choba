// api/deploy.js
// 管理者専用 自動デプロイAPI
// iPhoneからHTMLファイルをアップロードするだけでninja-choba.jpを更新する

export const config = { runtime: 'edge' };

const ALLOWED_ORIGINS = [
  'https://ninja-choba.jp',
  'https://www.ninja-choba.jp',
  'https://ninja-choba.vercel.app',
];

function cors(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Password',
  };
}

export default async function handler(req) {
  const origin = req.headers.get('origin') || '';

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors(origin) });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  // 管理者パスワード確認
  const adminPw = req.headers.get('X-Admin-Password');
  const correctPw = process.env.ADMIN_PASSWORD || 'ninja-admin-2026';
  if (adminPw !== correctPw) {
    return new Response(JSON.stringify({ error: '認証失敗' }), {
      status: 401, headers: { 'Content-Type': 'application/json', ...cors(origin) }
    });
  }

  const hookUrl = process.env.VERCEL_DEPLOY_HOOK;
  if (!hookUrl) {
    return new Response(JSON.stringify({ error: 'Deploy Hook未設定。VercelのEnvironment VariablesにVERCEL_DEPLOY_HOOKを設定してください。' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...cors(origin) }
    });
  }

  try {
    // FormDataからファイルを取得してGitHubに保存
    const formData = await req.formData();
    const file = formData.get('file');

    if (!file) {
      return new Response(JSON.stringify({ error: 'ファイルが見つかりません' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...cors(origin) }
      });
    }

    const fileContent = await file.text();
    if (!fileContent.includes('忍者帳場AI')) {
      return new Response(JSON.stringify({ error: '忍者帳場AIのファイルではありません' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...cors(origin) }
      });
    }

    // GitHubにファイルをプッシュ（GitHub API経由）
    const githubToken = process.env.GITHUB_TOKEN;
    const githubRepo  = process.env.GITHUB_REPO; // 例: yourname/ninja-choba

    if (githubToken && githubRepo) {
      // 現在のファイルのSHAを取得
      const shaRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/public/index.html`, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
        }
      });
      const shaData = shaRes.ok ? await shaRes.json() : null;
      const sha = shaData?.sha;

      // ファイルをBase64エンコードしてプッシュ
      const encoded = btoa(unescape(encodeURIComponent(fileContent)));
      const pushRes = await fetch(`https://api.github.com/repos/${githubRepo}/contents/public/index.html`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: `忍者帳場AI 更新 ${new Date().toLocaleString('ja-JP', {timeZone:'Asia/Tokyo'})}`,
          content: encoded,
          ...(sha ? { sha } : {}),
        })
      });

      if (!pushRes.ok) {
        const err = await pushRes.json();
        return new Response(JSON.stringify({ error: 'GitHubへの保存に失敗: ' + (err.message||'') }), {
          status: 500, headers: { 'Content-Type': 'application/json', ...cors(origin) }
        });
      }

      // GitHubプッシュ成功 → Vercelが自動デプロイ（GitHub連携時は不要）
      return new Response(JSON.stringify({
        ok: true,
        message: 'GitHubに保存しました。2〜3分後にninja-choba.jpに反映されます。'
      }), {
        headers: { 'Content-Type': 'application/json', ...cors(origin) }
      });
    }

    // GitHub未設定の場合はDeploy Hookだけ叩く
    const deployRes = await fetch(hookUrl, { method: 'POST' });
    if (!deployRes.ok) throw new Error('Deploy Hook失敗');

    return new Response(JSON.stringify({
      ok: true,
      message: 'デプロイを開始しました。2〜3分後に反映されます。（※GitHub未設定のためファイル更新なし）'
    }), {
      headers: { 'Content-Type': 'application/json', ...cors(origin) }
    });

  } catch(e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...cors(origin) }
    });
  }
}
