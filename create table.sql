-- ══════════════════════════════════════════════════════════════
-- 忍者帳場：ninja_accounts テーブルの作成
--
-- これまでこのテーブルが存在せず、帳簿がクラウドに一度も保存されて
-- いなかった。そのため端末ごとに別々のデータになっていた。
--
-- 実行方法：Supabaseダッシュボード → SQL Editor に貼って Run
-- ══════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────
-- STEP 1：テーブルを作る
--
-- アプリは「1事業者＝1行」で、帳簿の中身をまるごと data_json に入れる。
-- email を一意にしているのは、保存時に onConflict: 'email' で
-- 上書き（upsert）しているため。
-- ──────────────────────────────────────────────

create table if not exists public.ninja_accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text not null unique,
  name        text default '',
  business    text default '',
  year        integer default extract(year from now()),
  plan        text default 'free',
  role        text default 'user',
  data_json   text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- 自分の行を引くときに使う索引
create index if not exists ninja_accounts_user_id_idx on public.ninja_accounts(user_id);

-- 更新日時を自動で入れる
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists ninja_accounts_updated_at on public.ninja_accounts;
create trigger ninja_accounts_updated_at
  before update on public.ninja_accounts
  for each row execute function public.set_updated_at();


-- ──────────────────────────────────────────────
-- STEP 2：他人の帳簿が見えないようにする（RLS）
--
-- 会計データは取引先・金額・住所が含まれる、最も秘匿性の高い情報。
-- 「自分の user_id の行だけ」を読み書きできるようにする。
-- これを設定しないと、鍵を持つ者が全員の帳簿を読める状態になる。
-- ──────────────────────────────────────────────

alter table public.ninja_accounts enable row level security;

drop policy if exists "ninja_accounts_select_own" on public.ninja_accounts;
drop policy if exists "ninja_accounts_insert_own" on public.ninja_accounts;
drop policy if exists "ninja_accounts_update_own" on public.ninja_accounts;
drop policy if exists "ninja_accounts_delete_own" on public.ninja_accounts;

create policy "ninja_accounts_select_own"
on public.ninja_accounts for select
to authenticated
using (user_id = auth.uid());

create policy "ninja_accounts_insert_own"
on public.ninja_accounts for insert
to authenticated
with check (user_id = auth.uid());

create policy "ninja_accounts_update_own"
on public.ninja_accounts for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "ninja_accounts_delete_own"
on public.ninja_accounts for delete
to authenticated
using (user_id = auth.uid());


-- ──────────────────────────────────────────────
-- STEP 3：確認
-- ──────────────────────────────────────────────

-- 列がそろっているか
select column_name, data_type
from information_schema.columns
where table_schema = 'public' and table_name = 'ninja_accounts'
order by ordinal_position;

-- RLSが有効か（rowsecurity が true であること）
select tablename, rowsecurity
from pg_tables
where schemaname = 'public' and tablename = 'ninja_accounts';

-- ポリシーが4件できているか
select policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'ninja_accounts'
order by policyname;


-- ──────────────────────────────────────────────
-- 実行後にやること
--
-- 1. アプリでログインし直す
-- 2. 何か1件記す（レシートを撮る、手入力するなど）
-- 3. check.html の「三、クラウドの帳簿」で件数が出るか確認
-- 4. もう一方の端末（ホーム画面のアプリ／ブラウザ）でログイン
--    → 同じ帳簿が開けば完了
--
-- ※ これまで端末内にあったデータは、ログイン後に保存操作を行うと
--    クラウドへ上がる。焦って消さないこと。
-- ──────────────────────────────────────────────


-- ──────────────────────────────────────────────
-- 元に戻す場合（ロールバック）
-- ※ テーブルを消すと中の帳簿も消えるため、通常は行わないこと
-- ──────────────────────────────────────────────
--
-- drop policy if exists "ninja_accounts_select_own" on public.ninja_accounts;
-- drop policy if exists "ninja_accounts_insert_own" on public.ninja_accounts;
-- drop policy if exists "ninja_accounts_update_own" on public.ninja_accounts;
-- drop policy if exists "ninja_accounts_delete_own" on public.ninja_accounts;
-- alter table public.ninja_accounts disable row level security;
