# 忍者帳場 — Next.js版

小さな商いの番頭AI

## セットアップ

### 1. 環境変数を設定
`.env.local` を編集して各APIキーを設定:
- Supabase URL / Anon Key / Service Role Key
- OpenAI API Key
- Stripe Publishable Key / Secret Key / Webhook Secret

### 2. Supabaseテーブルを作成
```sql
-- accounts
create table accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  email text not null,
  name text,
  business text,
  year int default 2026,
  plan text default 'free',
  role text default 'owner',
  data_json text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- journals
create table journals (
  id uuid primary key default gen_random_uuid(),
  account_email text not null,
  date date not null,
  description text not null,
  amount int not null,
  type text check (type in ('income','expense')),
  category text,
  income_type text,
  memo text,
  img_url text,
  ai_review jsonb,
  created_at timestamptz default now()
);
```

### 3. ローカル起動
```bash
npm install
npm run dev
```

### 4. Vercelデプロイ
```bash
npx vercel
```

### 5. Expoでアプリ化（Macなしでも可）
```bash
npx create-expo-app ninja-chouba-mobile
# Next.jsのURLをWebViewで表示する形でApp Store申請
```

## 技術スタック
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Supabase（認証・DB）
- Stripe（課金）
- OpenAI（AIレビュー）
- Zustand（状態管理）
- Expo（iOS/Androidアプリ化）

## ディレクトリ構成
```
app/
  auth/          ログイン・新規登録
  dashboard/     ホーム・KPI
  receipt/       レシート撮影・記録
  cashflow/      資金繰り予測
  realestate/    不動産管理
  invoice/       請求書管理
  plan/          プラン・課金
  settings/      設定
  api/
    stripe/      Stripe Webhook・Checkout
    receipt/     AIレビュー
    journal/     仕訳CRUD
components/
  layout/        TopBar・BottomNav
  ui/            共通UIコンポーネント
lib/
  supabase/      Supabaseクライアント
  stripe/        Stripe設定
store/           Zustandグローバルストア
types/           TypeScript型定義
```
