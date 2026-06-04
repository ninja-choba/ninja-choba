# 忍者帳場 — リリースTODO

最終更新: 2026-05-27

## 🔴 重大（リリース前に必須）

### [ ] Stripe Price IDを実IDに差し替え
- ファイル: `app/api/stripe/checkout/route.ts`
- 手順:
  1. Stripeダッシュボード → Products → 各プランのPrice IDをコピー
  2. `PRICES`オブジェクトの `price_standard_month` 等を実IDに変更
  3. Webhook Endpointを `https://あなたのドメイン/api/stripe/webhook` に設定
  4. `STRIPE_WEBHOOK_SECRET` を `.env.local` に設定

### [ ] 環境変数を実キーに設定
- ファイル: `.env.local`（Vercelの場合はVercel Dashboard → Environment Variables）
  ```
  NEXT_PUBLIC_SUPABASE_URL=        ← Supabase → Settings → API
  NEXT_PUBLIC_SUPABASE_ANON_KEY=   ← Supabase → Settings → API
  SUPABASE_SERVICE_ROLE_KEY=       ← Supabase → Settings → API
  OPENAI_API_KEY=                  ← platform.openai.com/api-keys
  STRIPE_SECRET_KEY=               ← Stripe → Developers → API Keys
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
  STRIPE_WEBHOOK_SECRET=           ← Stripe → Developers → Webhooks
  NEXT_PUBLIC_APP_URL=             ← https://あなたのドメイン
  ```

### [ ] Supabaseテーブルを作成
- Supabase → SQL Editor で以下を実行:
  ```sql
  create table accounts (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users,
    email text not null,
    name text, business text,
    year int default 2026,
    plan text default 'free',
    role text default 'owner',
    data_json text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
  );

  create table journals (
    id uuid primary key default gen_random_uuid(),
    account_email text not null,
    date date not null,
    description text not null,
    amount int not null,
    type text check (type in ('income','expense')),
    category text, income_type text, memo text,
    img_url text, ai_review jsonb,
    created_at timestamptz default now()
  );

  -- RLS（Row Level Security）を有効化
  alter table accounts enable row level security;
  alter table journals enable row level security;

  -- ポリシー設定
  create policy "自分のデータのみ" on accounts
    for all using (auth.uid() = user_id);
  create policy "自分のジャーナルのみ" on journals
    for all using (account_email = auth.jwt()->>'email');
  ```

---

## 🟠 高（リリース後できるだけ早く）

### [ ] OCR実装（レシート自動読み取り）
- ファイル: `app/api/receipt/ocr/route.ts` を新規作成
- 方法: OpenAI Vision API (`gpt-4o`) に画像を送信してJSON返却
  ```typescript
  // 実装方針
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: base64Image } },
        { type: 'text', text: '店舗名・金額・日付・税率をJSONで返してください' }
      ]
    }]
  })
  ```
- `app/receipt/page.tsx` の撮影後にOCR APIを呼んでフォームを自動入力

### [ ] Supabaseリアルタイム同期
- ファイル: `app/dashboard/page.tsx` に追加
  ```typescript
  supabase.channel('journals')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'journals' },
      (payload) => { /* ストアを更新 */ })
    .subscribe()
  ```

### [ ] Service Worker（PWA）
- `next-pwa` はNext.js 16のTurbopackと非互換
- 代替: `next-pwa` の代わりに `@serwist/next` を使う
  ```bash
  npm install @serwist/next serwist
  ```
- または手動で `public/sw.js` を作成

---

## 🟡 中（余裕があれば）

### [ ] App Store申請（Expo）
- 手順:
  1. `npx create-expo-app ninja-chouba-mobile` で別プロジェクト作成
  2. `expo-web-browser` でNext.jsのURLをWebViewで表示
  3. `npx eas build --platform ios` でiOSビルド（Macなしで可）
  4. Apple Developer Program に登録（$99/年）
  5. TestFlightでテスト → App Store申請

### [ ] Google Play申請
- Expo EASで `npx eas build --platform android`
- Google Play Consoleに登録（$25一回）

### [ ] OGPサムネイル画像
- `public/og-image.png` を作成（1200×630px）
- `app/layout.tsx` の `openGraph.images` に追加

### [ ] middleware.tsの強化
- 現在: Cookieの有無のみチェック（簡易）
- 本番: Supabase SSRで `@supabase/ssr` を使ったセッション検証に変更
  ```bash
  npm install @supabase/ssr
  ```

---

## 実装済み ✅

- [x] middleware.ts（認証保護・未ログインリダイレクト）
- [x] 共通Toastコンポーネント（alert()を全廃）
- [x] loading.tsx（全7ページ・スケルトンUI）
- [x] error.tsx（全7ページ・エラー画面）
- [x] OGP設定（layout.tsx）
- [x] PWA manifest.json
- [x] アイコン（192px・512px・apple-touch-icon・favicon）
- [x] アニメーション（Tailwind keyframes）
- [x] 全ページ実装（auth/dashboard/receipt/cashflow/realestate/invoice/plan/settings）
- [x] Stripe Checkout APIルート
- [x] Stripe Webhook（プラン自動更新）
- [x] AIレビューAPIルート
- [x] Zustandグローバルストア
- [x] 型定義（TypeScript完全型付け）

- [x] e-Tax連携（XMLダウンロード・申告ガイド）
- [x] 電帳法チェック（5要件・タイムスタンプ付与）
- [x] 青色申告65万円控除チェックリスト
