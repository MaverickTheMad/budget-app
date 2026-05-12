-- ============================================================
-- v1.1 migration
-- Run on existing v1.0 databases. Idempotent — safe to re-run.
-- All v1.1 schema was actually included in v1.0's supabase-schema.sql,
-- but this file is here as a no-op sanity check / re-seed.
-- ============================================================

-- Ensure rules and statement_imports tables exist
create table if not exists rules (
  id uuid default gen_random_uuid() primary key,
  name text,
  match_field text default 'description',
  match_type text default 'contains',
  match_value text not null,
  category_id uuid references categories(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  priority int default 100,
  hits int default 0,
  active boolean default true,
  created_at timestamptz default now()
);

create table if not exists statement_imports (
  id uuid default gen_random_uuid() primary key,
  filename text not null,
  account_id uuid references accounts(id) on delete set null,
  period_start date,
  period_end date,
  status text default 'pending',
  raw_text text,
  parsed_count int default 0,
  committed_count int default 0,
  created_at timestamptz default now()
);

-- Ensure transactions has the source / import_batch_id columns
alter table transactions add column if not exists source text default 'manual';
alter table transactions add column if not exists import_batch_id uuid;

-- Index on import_batch_id for fast undo
create index if not exists transactions_batch_idx on transactions(import_batch_id);

-- RLS
alter table rules enable row level security;
alter table statement_imports enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array['rules','statement_imports'])
  loop
    execute format('drop policy if exists "anon all %1$s" on %1$s', t);
    execute format('create policy "anon all %1$s" on %1$s for all to anon using (true) with check (true)', t);
  end loop;
end $$;
