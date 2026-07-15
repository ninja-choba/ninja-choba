-- ============================================================
-- ninja_accounts テーブル RLS（Row Level Security）有効化
-- ============================================================
-- 目的：アプリ側のロジックにバグがあっても、ログインユーザーが
--       他人のデータ（他人のuser_idの行）に一切アクセスできないよう、
--       データベース側で二重の安全網をかける。
--
-- 前提（コード側の実装で確認済み）：
--   ・SB.userId = session.user.id（Supabase Authのログインユーザー正規ID）
--   ・読み込み： .from('ninja_accounts').select(...).eq('user_id', userId)
--   ・保存　　： upsert({ user_id: SB.userId, ... }, { onConflict: 'email' })
--   → user_id カラムが auth.uid() と一致する設計になっている（RLS標準パターン）
--
-- ⚠️ 重要：このSQLは Supabase ダッシュボードの SQL Editor で
--          「STEP 0 →（確認）→ STEP 1」の順に、慎重に実行すること。
--          設定を誤ると正規ユーザーもデータにアクセスできなくなるため、
--          必ず STEP 0 の確認結果を見てから STEP 1 を実行する。
-- ============================================================


-- ────────────────────────────────────────────────
-- STEP 0：現状確認（まずこれだけ実行して結果を確認する）
-- ────────────────────────────────────────────────

-- 0-1. ninja_accounts のカラム構成と user_id の型を確認
--      （user_id が uuid 型であることを確認する。text型の場合は STEP1 の
--        auth.uid() = user_id を auth.uid()::text = user_id に読み替える）
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ninja_accounts'
ORDER BY ordinal_position;

-- 0-2. 現在RLSが有効かどうかを確認（rls_enabled が false なら未設定）
SELECT relname AS table_name, relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'ninja_accounts';

-- 0-3. 既存のポリシーがあるか確認（通常は空のはず）
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'ninja_accounts';

-- 0-4. user_id が NULL の行がないか確認（NULLの行があるとRLS有効化後に
--      アクセスできなくなる。0件であることを確認する）
SELECT COUNT(*) AS null_user_id_rows
FROM ninja_accounts
WHERE user_id IS NULL;


-- ============================================================
-- 【ここで一旦停止】STEP 0 の結果を確認：
--   ・0-1: user_id が uuid 型か？（text型なら STEP1 を読み替え）
--   ・0-4: null_user_id_rows が 0 か？（0でない場合は先に修正が必要・下部の付録A参照）
--   問題なければ STEP 1 に進む。
-- ============================================================


-- ────────────────────────────────────────────────
-- STEP 1：RLS 有効化とポリシー作成（確認後に実行）
-- ────────────────────────────────────────────────

-- 1-1. RLSを有効化
ALTER TABLE ninja_accounts ENABLE ROW LEVEL SECURITY;

-- 1-2. 自分の行だけ SELECT できる
DROP POLICY IF EXISTS "ninja_accounts_select_own" ON ninja_accounts;
CREATE POLICY "ninja_accounts_select_own" ON ninja_accounts
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- 1-3. 自分の user_id でのみ INSERT できる
DROP POLICY IF EXISTS "ninja_accounts_insert_own" ON ninja_accounts;
CREATE POLICY "ninja_accounts_insert_own" ON ninja_accounts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 1-4. 自分の行だけ UPDATE できる（upsertのUPDATE側もこれが必要）
DROP POLICY IF EXISTS "ninja_accounts_update_own" ON ninja_accounts;
CREATE POLICY "ninja_accounts_update_own" ON ninja_accounts
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 1-5. 自分の行だけ DELETE できる（退会時のデータ削除用）
DROP POLICY IF EXISTS "ninja_accounts_delete_own" ON ninja_accounts;
CREATE POLICY "ninja_accounts_delete_own" ON ninja_accounts
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ────────────────────────────────────────────────
-- STEP 2：有効化後の確認
-- ────────────────────────────────────────────────

-- 2-1. RLSが有効になり、4つのポリシーが作成されたことを確認
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'ninja_accounts'
ORDER BY policyname;

-- 2-2. 【実機確認】この後、実際にアプリでログインして
--      ・自分の仕訳データが今まで通り表示される
--      ・レシート取込・保存ができる
--      を必ず確認すること。もし自分のデータが見えなくなったら、
--      下部の「ロールバック」を実行して元に戻す。


-- ============================================================
-- ■ ロールバック（もし正規ユーザーがアクセスできなくなった場合）
-- ============================================================
-- 下記を実行するとRLSが無効化され、有効化前の状態に戻る。
--
-- ALTER TABLE ninja_accounts DISABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "ninja_accounts_select_own" ON ninja_accounts;
-- DROP POLICY IF EXISTS "ninja_accounts_insert_own" ON ninja_accounts;
-- DROP POLICY IF EXISTS "ninja_accounts_update_own" ON ninja_accounts;
-- DROP POLICY IF EXISTS "ninja_accounts_delete_own" ON ninja_accounts;


-- ============================================================
-- ■ 付録A：user_id が NULL の行があった場合（STEP 0-4 が 0 でない場合）
-- ============================================================
-- 過去にuser_idを入れずに保存された行があると、RLS有効化後に
-- その行にアクセスできなくなる。emailからユーザーを特定して
-- user_idを補完する必要があるが、これは手作業での確認が必要。
-- まずどの行がNULLか確認する：
--
-- SELECT email, name, user_id FROM ninja_accounts WHERE user_id IS NULL;
--
-- 該当ユーザーのauth上のIDを auth.users から調べて手動で更新するか、
-- 本人に再ログイン・再保存してもらうことでuser_idが埋まる。
-- （このケースが発生した場合は、対応方針を相談すること）
