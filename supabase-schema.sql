-- ============================================================
-- Family Budget — Supabase Schema
-- Mirrors the structure of Family_Budget.xlsx with room to grow.
-- ============================================================

-- Accounts (Chase, Ally, Cash, Sep Acct, Wealthfront, etc.)
create table if not exists accounts (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  kind text default 'checking',           -- checking | savings | cash | credit | loan
  owner text default 'shared',            -- 'mav' | 'ren' | 'shared'
  archived boolean default false,
  created_at timestamptz default now()
);

-- People / paycheck owners
create table if not exists people (
  id uuid default gen_random_uuid() primary key,
  name text not null,                     -- 'Mav', 'Ren'
  color text default '#6b7a5a',
  created_at timestamptz default now()
);

-- Spending categories (matches the 13 in FY sheets)
create table if not exists categories (
  id uuid default gen_random_uuid() primary key,
  name text not null,                     -- 'Bills & Utilities', 'Groceries', etc.
  kind text default 'expense',            -- expense | income | savings | debt
  color text default '#c08478',
  sort_order int default 0,
  archived boolean default false
);

-- Paycheck definitions (recurring income sources)
create table if not exists paychecks (
  id uuid default gen_random_uuid() primary key,
  person_id uuid references people(id) on delete cascade,
  label text not null,                    -- 'Mav Paycheck (Chase)'
  amount numeric(10,2) not null,
  cadence text default 'biweekly',        -- weekly | biweekly | semimonthly | monthly
  account_id uuid references accounts(id) on delete set null,
  next_date date,
  created_at timestamptz default now()
);

-- Bills master list (from the Bills tab + Bill due dates tab)
create table if not exists bills (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  amount numeric(10,2) not null,
  due_day int,                            -- day of month, 1-31
  cadence text default 'monthly',
  category_id uuid references categories(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  autopay boolean default false,
  funded_by_paycheck uuid references paychecks(id) on delete set null,
  active boolean default true,
  notes text,
  created_at timestamptz default now()
);

-- Bill payment instances (one row per month per bill, for the "Paid?" checkmarks)
create table if not exists bill_payments (
  id uuid default gen_random_uuid() primary key,
  bill_id uuid references bills(id) on delete cascade,
  due_date date not null,
  amount numeric(10,2) not null,
  paid boolean default false,
  paid_date date,
  transaction_id uuid,                    -- linked once matched to a tx
  created_at timestamptz default now(),
  unique (bill_id, due_date)
);

-- Monthly budgets per category
create table if not exists monthly_budgets (
  id uuid default gen_random_uuid() primary key,
  category_id uuid references categories(id) on delete cascade,
  year int not null,
  month int not null,                     -- 1-12
  amount numeric(10,2) not null default 0,
  unique (category_id, year, month)
);

-- The ledger — every transaction
create table if not exists transactions (
  id uuid default gen_random_uuid() primary key,
  date date not null,
  amount numeric(10,2) not null,          -- negative = expense, positive = income
  description text not null,
  raw_description text,                   -- preserved from import
  category_id uuid references categories(id) on delete set null,
  account_id uuid references accounts(id) on delete set null,
  person_id uuid references people(id) on delete set null,
  source text default 'manual',           -- manual | import | recurring
  import_batch_id uuid,
  notes text,
  created_at timestamptz default now()
);

create index if not exists transactions_date_idx on transactions(date desc);
create index if not exists transactions_category_idx on transactions(category_id);
create index if not exists transactions_account_idx on transactions(account_id);

-- Goals / Sinking funds (from the K column of Extra Income)
create table if not exists goals (
  id uuid default gen_random_uuid() primary key,
  name text not null,                     -- 'House Downpayment', 'Emergency', 'Vet'
  target_amount numeric(10,2),
  current_amount numeric(10,2) default 0,
  account_id uuid references accounts(id) on delete set null,
  monthly_contribution numeric(10,2),
  target_date date,
  color text default '#b8945a',
  archived boolean default false,
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Goal contributions log
create table if not exists goal_contributions (
  id uuid default gen_random_uuid() primary key,
  goal_id uuid references goals(id) on delete cascade,
  date date not null,
  amount numeric(10,2) not null,
  notes text,
  created_at timestamptz default now()
);

-- Debts (snowball list)
create table if not exists debts (
  id uuid default gen_random_uuid() primary key,
  name text not null,                     -- 'Capital One CC (Matt)', 'Car (Subaru)'
  starting_balance numeric(10,2) not null,
  current_balance numeric(10,2) not null,
  apr numeric(6,4) default 0,             -- 0.2799 for 27.99%
  min_payment numeric(10,2) default 0,
  snowball_payment numeric(10,2),         -- planned monthly payment in the snowball plan
  payoff_order int,                       -- order in the snowball
  paid_off boolean default false,
  paid_off_date date,
  account_id uuid references accounts(id) on delete set null,
  created_at timestamptz default now()
);

-- Debt payment log
create table if not exists debt_payments (
  id uuid default gen_random_uuid() primary key,
  debt_id uuid references debts(id) on delete cascade,
  date date not null,
  amount numeric(10,2) not null,
  principal numeric(10,2),
  interest numeric(10,2),
  balance_after numeric(10,2),
  notes text,
  created_at timestamptz default now()
);

-- Categorization rules (v1.1 prep, safe to populate now)
create table if not exists rules (
  id uuid default gen_random_uuid() primary key,
  name text,
  match_field text default 'description', -- description | amount
  match_type text default 'contains',     -- contains | equals | starts | regex
  match_value text not null,
  category_id uuid references categories(id) on delete cascade,
  account_id uuid references accounts(id) on delete set null,
  priority int default 100,
  hits int default 0,                     -- diagnostic
  active boolean default true,
  created_at timestamptz default now()
);

-- Statement imports (v1.1)
create table if not exists statement_imports (
  id uuid default gen_random_uuid() primary key,
  filename text not null,
  account_id uuid references accounts(id) on delete set null,
  period_start date,
  period_end date,
  status text default 'pending',          -- pending | review | committed | discarded
  raw_text text,
  parsed_count int default 0,
  committed_count int default 0,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security — anon access (matches Ren's Journal pattern)
-- ============================================================
alter table accounts          enable row level security;
alter table people            enable row level security;
alter table categories        enable row level security;
alter table paychecks         enable row level security;
alter table bills             enable row level security;
alter table bill_payments     enable row level security;
alter table monthly_budgets   enable row level security;
alter table transactions      enable row level security;
alter table goals             enable row level security;
alter table goal_contributions enable row level security;
alter table debts             enable row level security;
alter table debt_payments     enable row level security;
alter table rules             enable row level security;
alter table statement_imports enable row level security;

do $$
declare t text;
begin
  for t in select unnest(array[
    'accounts','people','categories','paychecks','bills','bill_payments',
    'monthly_budgets','transactions','goals','goal_contributions',
    'debts','debt_payments','rules','statement_imports'
  ])
  loop
    execute format('drop policy if exists "anon all %1$s" on %1$s', t);
    execute format('create policy "anon all %1$s" on %1$s for all to anon using (true) with check (true)', t);
  end loop;
end $$;

-- ============================================================
-- Seed data — categories, people, accounts, bills, goals, debts
-- (Pulled from your Family_Budget.xlsx)
-- ============================================================
insert into people (name, color) values
  ('Mav', '#6b7a5a'),
  ('Ren', '#c08478')
on conflict do nothing;

insert into categories (name, color, sort_order) values
  ('Bills & Utilities', '#6b4a55', 1),
  ('Pets (Misc.)',      '#b8945a', 2),
  ('Groceries',         '#6b7a5a', 3),
  ('Dining Out',        '#c08478', 4),
  ('Travel',            '#5a7a8e', 5),
  ('Shopping',          '#8e5a4f', 6),
  ('Gas',               '#a89060', 7),
  ('Misc.',             '#8a7e78', 8),
  ('Medical',           '#a85a5a', 9),
  ('Car',               '#5a6b7a', 10),
  ('Entertainment',     '#7a5a8e', 11),
  ('Savings',           '#5a8e6b', 12),
  ('Income',            '#3d6b4a', 99)
on conflict do nothing;

insert into accounts (name, kind, owner) values
  ('Chase',        'checking', 'shared'),
  ('Ally',         'savings',  'shared'),
  ('Cash',         'cash',     'shared'),
  ('Sep Acct',     'savings',  'shared'),
  ('Wealthfront',  'savings',  'shared')
on conflict do nothing;

insert into goals (name, monthly_contribution, sort_order) values
  ('House Downpayment', 0, 1),
  ('Emergency',         0, 2),
  ('Vet',               0, 3),
  ('Medical Bills',     0, 4),
  ('Car Maintenance',   0, 5),
  ('School',            0, 6),
  ('Hockey',            0, 7),
  ('Christmas Presents',0, 8),
  ('Tattoos',           0, 9),
  ('Vacations',         0, 10),
  ('Extra Savings',     0, 11)
on conflict do nothing;
