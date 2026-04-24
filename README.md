# 忍者帳場AI — Vercelデプロイ手順

## ファイル構成
```
ninja-choba/
├── api/
│   └── claude.js        ← Anthropic APIプロキシ（APIキーを安全に管理）
├── public/
│   ├── index.html       ← アプリ本体
│   ├── manifest.json    ← PWA設定
│   └── sw.js            ← Service Worker
├── package.json
└── vercel.json          ← ルーティング設定
```

## デプロイ手順（5分で完了）

### 1. このフォルダをGitHubにプッシュ
```bash
cd ninja-choba
git init
git add .
git commit -m "忍者帳場AI 初回デプロイ"
git remote add origin https://github.com/あなたのID/ninja-choba.git
git push -u origin main
```

### 2. VercelにGitHubリポジトリを連携
1. https://vercel.com/dashboard を開く
2. 「Add New Project」をクリック
3. GitHubの `ninja-choba` リポジトリを選択
4. 「Import」をクリック

### 3. 環境変数を設定（最重要）
Vercelのプロジェクト設定画面で：
- Settings → Environment Variables
- 以下を追加：

```
Name:  ANTHROPIC_API_KEY
Value: sk-ant-api03-xxxxx...（取得したAPIキー）
```

「Save」→「Deploy」

### 4. カスタムドメインを設定
- Settings → Domains
- `ninja-choba.jp` を追加
- お名前.comのDNS設定：
  ```
  Aレコード:   @ → 76.76.21.21
  CNAMEレコード: www → cname.vercel-dns.com
  ```

### 5. 動作確認
- https://ninja-choba.jp でアクセス
- レシート撮影・自動仕訳が動作することを確認
- iOSのSafariで「ホーム画面に追加」でPWAアイコン作成

## セキュリティについて
- APIキーは `api/claude.js` のEdge Functionで管理
- フロントエンド（index.html）にはAPIキーは含まれていない
- `/api/claude` にPOSTすると安全にAnthropicに中継される

## freee連携を追加する場合
freee OAuthのリダイレクトURIを：
`https://ninja-choba.jp` に設定してください。
