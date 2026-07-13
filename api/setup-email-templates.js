// api/setup-email-templates.js
// 一度だけ実行するメールテンプレート設定ツール
// デプロイ後、ブラウザで /api/setup-email-templates?secret=YOUR_SECRET にアクセスして実行

export const config = { runtime: 'edge' };

const PROJECT_REF = 'klktxgbgevbcntqweokv';

const CONFIRM_HTML = `<div style="font-family:'Hiragino Mincho ProN','Yu Mincho',Georgia,serif;max-width:560px;margin:0 auto;padding:40px 24px;background:#fff;color:#1a1a1a">
  <div style="text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #e8e0d0">
    <p style="font-size:24px;font-weight:bold;letter-spacing:6px;color:#1a1a1a;margin:0">忍者帳場</p>
    <p style="font-size:11px;color:#999;letter-spacing:3px;margin:6px 0 0">NINJA CHOBA</p>
  </div>
  <p style="font-size:16px;line-height:2;margin-bottom:8px">拝啓</p>
  <p style="font-size:15px;line-height:2;margin-bottom:24px">
    このたびは、忍者帳場へのご入門、まことにありがとうございます。<br>
    帳場の門をくぐるにあたり、まずはご登録のお確かめをお願い申し上げます。
  </p>
  <div style="text-align:center;margin-bottom:40px">
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;padding:16px 52px;background:#1a1a1a;color:#fff;text-decoration:none;font-size:14px;letter-spacing:3px;border-radius:2px">
      入門を確かめる
    </a>
  </div>
  <p style="font-size:12px;color:#999;line-height:2;margin-bottom:8px">
    ボタンが押せない場合は下記URLをブラウザに貼り付けてください。<br>
    <span style="word-break:break-all">{{ .ConfirmationURL }}</span>
  </p>
  <div style="border-top:1px solid #e8e0d0;padding-top:24px;margin-top:24px">
    <p style="font-size:12px;color:#999;line-height:2;margin:0">
      このメールに心当たりのない方は、そのままお捨ておきくださいませ。<br>
      リンクの有効期限は24時間でございます。
    </p>
  </div>
  <p style="font-size:12px;color:#bbb;text-align:center;margin-top:32px;letter-spacing:2px">© 忍者帳場</p>
</div>`;

const RECOVERY_HTML = `<div style="font-family:'Hiragino Mincho ProN','Yu Mincho',Georgia,serif;max-width:560px;margin:0 auto;padding:40px 24px;background:#fff;color:#1a1a1a">
  <div style="text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #e8e0d0">
    <p style="font-size:24px;font-weight:bold;letter-spacing:6px;color:#1a1a1a;margin:0">忍者帳場</p>
    <p style="font-size:11px;color:#999;letter-spacing:3px;margin:6px 0 0">NINJA CHOBA</p>
  </div>
  <p style="font-size:16px;line-height:2;margin-bottom:8px">拝啓</p>
  <p style="font-size:15px;line-height:2;margin-bottom:24px">
    合言葉（パスワード）の再設定のご依頼を承りました。<br>
    下のボタンより、新しい合言葉をお設定ください。
  </p>
  <div style="text-align:center;margin-bottom:40px">
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;padding:16px 52px;background:#1a1a1a;color:#fff;text-decoration:none;font-size:14px;letter-spacing:3px;border-radius:2px">
      合言葉を再設定する
    </a>
  </div>
  <p style="font-size:12px;color:#999;line-height:2;margin-bottom:8px">
    ボタンが押せない場合は下記URLをブラウザに貼り付けてください。<br>
    <span style="word-break:break-all">{{ .ConfirmationURL }}</span>
  </p>
  <div style="border-top:1px solid #e8e0d0;padding-top:24px;margin-top:24px">
    <p style="font-size:12px;color:#999;line-height:2;margin:0">
      このメールに心当たりのない方は、そのままお捨ておきくださいませ。<br>
      リンクの有効期限は1時間でございます。
    </p>
  </div>
  <p style="font-size:12px;color:#bbb;text-align:center;margin-top:32px;letter-spacing:2px">© 忍者帳場</p>
</div>`;

const MAGIC_LINK_HTML = `<div style="font-family:'Hiragino Mincho ProN','Yu Mincho',Georgia,serif;max-width:560px;margin:0 auto;padding:40px 24px;background:#fff;color:#1a1a1a">
  <div style="text-align:center;margin-bottom:32px;padding-bottom:24px;border-bottom:1px solid #e8e0d0">
    <p style="font-size:24px;font-weight:bold;letter-spacing:6px;color:#1a1a1a;margin:0">忍者帳場</p>
    <p style="font-size:11px;color:#999;letter-spacing:3px;margin:6px 0 0">NINJA CHOBA</p>
  </div>
  <p style="font-size:16px;line-height:2;margin-bottom:8px">拝啓</p>
  <p style="font-size:15px;line-height:2;margin-bottom:24px">
    忍者帳場へようこそおいでくださいました。<br>
    下のボタンより、帳場へお入りください。<br>
    このリンクは一度限りの通り道でございます。
  </p>
  <div style="text-align:center;margin-bottom:40px">
    <a href="{{ .ConfirmationURL }}"
       style="display:inline-block;padding:16px 52px;background:#1a1a1a;color:#fff;text-decoration:none;font-size:14px;letter-spacing:3px;border-radius:2px">
      帳場へ入る
    </a>
  </div>
  <p style="font-size:12px;color:#999;line-height:2;margin-bottom:8px">
    ボタンが押せない場合は下記URLをブラウザに貼り付けてください。<br>
    <span style="word-break:break-all">{{ .ConfirmationURL }}</span>
  </p>
  <div style="border-top:1px solid #e8e0d0;padding-top:24px;margin-top:24px">
    <p style="font-size:12px;color:#999;line-height:2;margin:0">
      このメールに心当たりのない方は、そのままお捨ておきくださいませ。<br>
      リンクの有効期限は1時間でございます。
    </p>
  </div>
  <p style="font-size:12px;color:#bbb;text-align:center;margin-top:32px;letter-spacing:2px">© 忍者帳場</p>
</div>`;

export default async function handler(req) {
  const corsHeaders = { 'Content-Type': 'application/json' };

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'GET only' }), { status: 405, headers: corsHeaders });
  }

  // シークレットキーで保護
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');
  const SETUP_SECRET = process.env.SETUP_SECRET;

  if (!SETUP_SECRET || secret !== SETUP_SECRET) {
    return new Response(JSON.stringify({ error: '認証失敗。?secret=設定した値 のパラメータが必要です。' }), { status: 401, headers: corsHeaders });
  }

  const ACCESS_TOKEN = process.env.SUPABASE_MANAGEMENT_TOKEN;
  if (!ACCESS_TOKEN) {
    return new Response(JSON.stringify({ error: '環境変数 SUPABASE_MANAGEMENT_TOKEN が未設定です。' }), { status: 500, headers: corsHeaders });
  }

  try {
    const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mailer_subjects_confirmation: '【忍者帳場】帳場への入門を確かめてください',
        mailer_templates_confirmation_content: CONFIRM_HTML,
        mailer_subjects_recovery: '【忍者帳場】合言葉の再設定について',
        mailer_templates_recovery_content: RECOVERY_HTML,
        mailer_subjects_magic_link: '【忍者帳場】帳場への入り口はこちらです',
        mailer_templates_magic_link_content: MAGIC_LINK_HTML,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: 'Supabase APIエラー', detail: data }), { status: res.status, headers: corsHeaders });
    }

    return new Response(JSON.stringify({
      success: true,
      message: '3種類のメールテンプレートの設定が完了しました。',
      templates: ['新規登録確認', 'パスワードリセット', 'マジックリンク'],
    }), { status: 200, headers: corsHeaders });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
}
