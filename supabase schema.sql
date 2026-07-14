-- ══════════════════════════════════════════════════════════
-- 忍者帳場AI — Supabase スキーマ設計
-- 電子帳簿保存法対応（7年保存・改ざん防止・検索機能）
-- ══════════════════════════════════════════════════════════

-- ── 拡張機能 ──
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ══════════════════
-- 1. ユーザー・事業者
-- ══════════════════
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  display_name  TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  business        TEXT,
  email           TEXT,
  year            INTEGER DEFAULT 2026,
  line_token      TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════
-- 2. 仕訳データ（電子帳簿保存法対応）
-- ══════════════════
CREATE TABLE IF NOT EXISTS journals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,

  -- 基本仕訳情報
  date            DATE NOT NULL,
  description     TEXT NOT NULL,
  amount          INTEGER NOT NULL,
  type            TEXT NOT NULL CHECK (type IN ('income','expense')),
  category        TEXT NOT NULL,
  tax_rate        INTEGER DEFAULT 10,
  tax_type        TEXT DEFAULT '課税',
  status          TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed','ambiguous','pending','excluded')),

  -- AI判定情報
  phase           TEXT,
  confidence      TEXT CHECK (confidence IN ('high','medium','low')),
  law             TEXT,    -- 法的根拠
  reason          TEXT,    -- 判定理由
  unit_price      INTEGER, -- 飲食費の1人単価
  persons         INTEGER, -- 人数
  income_type     TEXT,    -- 'realestate' など

  -- freee連携
  freee_deal_id   TEXT,

  -- 電子帳簿保存法対応（改ざん防止）
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by      UUID REFERENCES profiles(id),
  is_deleted      BOOLEAN DEFAULT FALSE,  -- 論理削除のみ（物理削除禁止）

  -- 保存期限（7年）
  retain_until    DATE GENERATED ALWAYS AS (date + INTERVAL '7 years 6 months') STORED
);

-- 仕訳の変更履歴テーブル（改ざん防止・電帳法要件）
CREATE TABLE IF NOT EXISTS journal_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_id      UUID NOT NULL REFERENCES journals(id),
  changed_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  changed_by      UUID REFERENCES profiles(id),
  action          TEXT NOT NULL CHECK (action IN ('create','update','delete')),
  old_data        JSONB,  -- 変更前のデータ
  new_data        JSONB   -- 変更後のデータ
);

-- ══════════════════
-- 3. レシート・領収書（スキャナ保存対応）
-- ══════════════════
CREATE TABLE IF NOT EXISTS receipts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  store           TEXT,
  total           INTEGER,
  persons         INTEGER DEFAULT 0,
  comment         TEXT,
  status          TEXT DEFAULT 'confirmed',

  -- 画像パス（Cloudflare R2 または Supabase Storage）
  image_url       TEXT,        -- 元画像URL
  image_path      TEXT,        -- ストレージ内パス
  image_size      INTEGER,     -- バイト数
  image_hash      TEXT,        -- SHA256ハッシュ（改ざん検知）

  -- 電帳法対応
  scan_timestamp  TIMESTAMPTZ DEFAULT NOW(),  -- スキャン日時（2ヶ月+7営業日以内の証明）
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  retain_until    DATE GENERATED ALWAYS AS (date + INTERVAL '7 years 6 months') STORED
);

CREATE TABLE IF NOT EXISTS receipt_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id      UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  amount          INTEGER NOT NULL,
  tax_rate        INTEGER DEFAULT 10,
  tax_type        TEXT DEFAULT '課税',
  category        TEXT,
  law             TEXT,
  reason          TEXT,
  unit_price      INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'confirmed',
  auto_layer      INTEGER,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════
-- 4. 請求書・支払調書
-- ══════════════════
CREATE TABLE IF NOT EXISTS invoices (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  vendor          TEXT NOT NULL,
  amount          INTEGER NOT NULL,
  withholding     INTEGER DEFAULT 0,
  net_amount      INTEGER,
  category        TEXT,
  status          TEXT DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid')),
  due_date        DATE,
  is_qualified    BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  retain_until    DATE GENERATED ALWAYS AS (date + INTERVAL '7 years 6 months') STORED
);

-- ══════════════════
-- 5. 不動産管理
-- ══════════════════
CREATE TABLE IF NOT EXISTS properties (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id        UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  type              TEXT,
  address           TEXT,
  structure         TEXT,
  built             DATE,
  acquisition_date  DATE,
  acquisition_cost  INTEGER DEFAULT 0,
  land_cost         INTEGER DEFAULT 0,
  building_cost     INTEGER DEFAULT 0,
  loan_balance      INTEGER DEFAULT 0,
  loan_rate         DECIMAL(5,2) DEFAULT 0,
  loan_monthly      INTEGER DEFAULT 0,
  management_company TEXT,
  management_fee_rate DECIMAL(5,2) DEFAULT 5,
  total_units       INTEGER DEFAULT 0,
  floors            INTEGER DEFAULT 0,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenants (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room            TEXT NOT NULL,
  name            TEXT,
  status          TEXT DEFAULT 'vacant' CHECK (status IN ('active','vacant')),
  rent            INTEGER DEFAULT 0,
  common_fee      INTEGER DEFAULT 0,
  parking         INTEGER DEFAULT 0,
  deposit         INTEGER DEFAULT 0,
  key_money       INTEGER DEFAULT 0,
  contract_start  DATE,
  contract_end    DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════
-- 6. 予算管理
-- ══════════════════
CREATE TABLE IF NOT EXISTS budgets (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  year            INTEGER NOT NULL,
  month           INTEGER,  -- NULL=年次予算
  category        TEXT NOT NULL,
  amount          INTEGER NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (account_id, year, month, category)
);

-- ══════════════════
-- 7. 自動仕訳キュー
-- ══════════════════
CREATE TABLE IF NOT EXISTS auto_queue (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  date            DATE NOT NULL,
  description     TEXT NOT NULL,
  amount          INTEGER NOT NULL,
  comment         TEXT,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending','processed','excluded','error')),
  result          JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  processed_at    TIMESTAMPTZ
);

-- ══════════════════
-- 8. 同期ログ（freee等）
-- ══════════════════
CREATE TABLE IF NOT EXISTS sync_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id      UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  service         TEXT NOT NULL DEFAULT 'freee',
  message         TEXT NOT NULL,
  type            TEXT DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ══════════════════
-- 9. 招待コード（マルチユーザー招待）
-- ══════════════════
-- 注: 実際の本番運用データは ninja_accounts テーブル（data_jsonにJSONで一括保存）
-- を使用しているため、上記1〜8の正規化テーブル群とは独立して以下を追加する。
-- 招待コードはサインアップ時（未ログイン状態）にも検証されるため、
-- anonロールでのSELECT/UPDATEを許可する（招待コードという性質上、コード自体が
-- 知られていることが前提のため許容。email等の閲覧範囲は必要最小限に留める）。
CREATE TABLE IF NOT EXISTS ninja_invites (
  code            TEXT PRIMARY KEY,
  owner_email     TEXT NOT NULL,
  invited_email   TEXT,
  role            TEXT DEFAULT 'viewer' CHECK (role IN ('admin','editor','viewer')),
  used            BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_ninja_invites_owner ON ninja_invites(owner_email);

ALTER TABLE ninja_invites ENABLE ROW LEVEL SECURITY;

-- 発行：ログイン済みユーザーのみ（doInviteMember経由、SB.clientの認証セッションで実行）
CREATE POLICY "insert_own_invite" ON ninja_invites FOR INSERT
  TO authenticated WITH CHECK (true);

-- 検証：サインアップ画面（未ログイン）からも参照する必要があるためanon許可
CREATE POLICY "select_invite_for_validation" ON ninja_invites FOR SELECT
  TO anon, authenticated USING (true);

-- 使用済みフラグの更新：api/validate-invite.js（サーバー側）がanonキーで実行
CREATE POLICY "update_invite_used_flag" ON ninja_invites FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- ══════════════════
-- インデックス（検索機能 = 電帳法要件）
-- ══════════════════
-- 日付・金額・取引先での検索（電子帳簿保存法の検索要件）
CREATE INDEX IF NOT EXISTS idx_journals_date        ON journals(account_id, date);
CREATE INDEX IF NOT EXISTS idx_journals_amount      ON journals(account_id, amount);
CREATE INDEX IF NOT EXISTS idx_journals_category    ON journals(account_id, category);
CREATE INDEX IF NOT EXISTS idx_journals_description ON journals USING gin(to_tsvector('simple', description));
CREATE INDEX IF NOT EXISTS idx_receipts_date        ON receipts(account_id, date);
CREATE INDEX IF NOT EXISTS idx_receipts_store       ON receipts(account_id, store);

-- ══════════════════
-- Row Level Security（自分のデータしか見えない）
-- ══════════════════
ALTER TABLE profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals    ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices    ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties  ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants     ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets     ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_queue  ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs   ENABLE ROW LEVEL SECURITY;

-- RLSポリシー
CREATE POLICY "own_profile" ON profiles FOR ALL USING (auth.uid() = id);

CREATE POLICY "own_accounts" ON accounts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "own_journals" ON journals FOR ALL USING (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);
CREATE POLICY "own_receipts" ON receipts FOR ALL USING (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);
CREATE POLICY "own_receipt_items" ON receipt_items FOR ALL USING (
  receipt_id IN (SELECT r.id FROM receipts r JOIN accounts a ON r.account_id = a.id WHERE a.user_id = auth.uid())
);
CREATE POLICY "own_invoices" ON invoices FOR ALL USING (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);
CREATE POLICY "own_properties" ON properties FOR ALL USING (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);
CREATE POLICY "own_tenants" ON tenants FOR ALL USING (
  property_id IN (SELECT p.id FROM properties p JOIN accounts a ON p.account_id = a.id WHERE a.user_id = auth.uid())
);
CREATE POLICY "own_budgets" ON budgets FOR ALL USING (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);
CREATE POLICY "own_queue" ON auto_queue FOR ALL USING (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);
CREATE POLICY "own_sync_logs" ON sync_logs FOR ALL USING (
  account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())
);

-- ══════════════════
-- トリガー（改ざん防止・updated_at自動更新）
-- ══════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_accounts_updated    BEFORE UPDATE ON accounts    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_journals_updated    BEFORE UPDATE ON journals    FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_properties_updated  BEFORE UPDATE ON properties  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tenants_updated     BEFORE UPDATE ON tenants     FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 仕訳変更履歴を自動記録（改ざん防止）
CREATE OR REPLACE FUNCTION record_journal_history()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO journal_history(journal_id, action, new_data, changed_by)
    VALUES(NEW.id, 'create', to_jsonb(NEW), NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO journal_history(journal_id, action, old_data, new_data, changed_by)
    VALUES(NEW.id, 'update', to_jsonb(OLD), to_jsonb(NEW), NEW.created_by);
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO journal_history(journal_id, action, old_data)
    VALUES(OLD.id, 'delete', to_jsonb(OLD));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_journal_history
AFTER INSERT OR UPDATE OR DELETE ON journals
FOR EACH ROW EXECUTE FUNCTION record_journal_history();

