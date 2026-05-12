-- ============================================================
-- Seed: Bills + Debts from Family_Budget.xlsx
-- Run AFTER supabase-schema.sql
-- ============================================================

-- Bills (from "Bill due dates" tab)
insert into bills (name, amount, due_day, category_id, autopay) values
  ('Rent',                     1300, 1,  (select id from categories where name='Bills & Utilities'), true),
  ('Mitsubishi (Car)',          150, 5,  (select id from categories where name='Car'),              true),
  ('Discover CC',                60, 7,  (select id from categories where name='Bills & Utilities'), true),
  ('GEICO',                     250, 16, (select id from categories where name='Bills & Utilities'), true),
  ('National Fuel (Gas)',        70, 20, (select id from categories where name='Bills & Utilities'), true),
  ('National Grid (Electric)',  150, 20, (select id from categories where name='Bills & Utilities'), true),
  ('Capital One CC',            350, 20, (select id from categories where name='Bills & Utilities'), true),
  ('Spectrum (Internet)',        70, 20, (select id from categories where name='Bills & Utilities'), true),
  ('Crunchyroll',                12, 23, (select id from categories where name='Entertainment'),     false),
  ('Citi CC',                   300, 23, (select id from categories where name='Bills & Utilities'), true),
  ('Capital One CC (Mav)',      300, 28, (select id from categories where name='Bills & Utilities'), true),
  ('Subaru/Phone',              400, 30, (select id from categories where name='Car'),              false)
on conflict do nothing;

-- Debts (from Snowball tab — snapshot of current balances)
insert into debts (name, starting_balance, current_balance, apr, min_payment, snowball_payment, payoff_order) values
  ('Capital One CC (Matt)',  4800,   4800,    0.2799, 150, 150,  1),
  ('Citi CC',                1900,   1900,    0.2799, 400, 400,  2),
  ('Capital One CC',         10983.65, 10983.65, 0.2350, 450, 450,  3),
  ('Car Payment (Mitsubishi)', 3963,  3963,    0.0774, 144, 144,  4),
  ('Car Payment (Subaru)',  13100,  13100,    0,      300, 300,  5)
on conflict do nothing;

-- Paychecks (from Bills + Extra Income tabs)
insert into paychecks (person_id, label, amount, cadence, account_id) values
  ((select id from people where name='Ren'), 'Ren Paycheck (Bill Acct)',  1250, 'biweekly',
   (select id from accounts where name='Chase')),
  ((select id from people where name='Mav'), 'Mav Paycheck (Chase Acct)', 2167, 'biweekly',
   (select id from accounts where name='Chase'))
on conflict do nothing;
