-- ============================================================
-- Ledger · migrate identity to core.people  (v2 — dependency-aware)
-- Run ONCE in the reilly-home SQL editor.
--
-- Why v2: the live DB has more dependencies on budget.people than the repo
-- schema showed — a monthly_budgets FK, and two cross-schema views in the
-- Calendar app (almanac.v_paydays, almanac.v_timeline). This version:
--   * discovers and repoints EVERY foreign key referencing budget.people
--     (paychecks, transactions, monthly_budgets, and any others), remapping
--     ids to core.people by name;
--   * temporarily drops the two almanac views, then recreates them verbatim;
--   * replaces the budget.people TABLE with a VIEW over core.people, so any
--     remaining reader (the Calendar views) keeps working against core data.
--
-- Atomic: the entire block is one transaction. If anything fails, NOTHING
-- changes. Safe to re-run (no-op once budget.people is a view).
--
-- Prereq: core.people must contain a row for each budget person, matched BY
-- NAME (set them up in Grove -> Settings -> Household, with emails).
-- ============================================================

do $$
declare
  missing      text;
  fk           record;
  def_paydays  text;
  def_timeline text;
begin
  -- Already migrated? (budget.people is now a view, not a base table)
  if exists (
    select 1 from information_schema.views
    where table_schema = 'budget' and table_name = 'people'
  ) then
    raise notice 'Already migrated -- budget.people is a view over core.people.';
    return;
  end if;
  if to_regclass('budget.people') is null then
    raise notice 'budget.people not found -- nothing to do.';
    return;
  end if;

  -- Guard: every budget person must have a core counterpart (matched by name).
  select string_agg(bp.name, ', ') into missing
  from budget.people bp
  where not exists (select 1 from core.people c where lower(c.name) = lower(bp.name));
  if missing is not null then
    raise exception
      'No core.people match for: %. Add them in Grove -> Settings -> Household first, then re-run.', missing;
  end if;

  -- Optional: adopt Ledger's original person colors as the household colors.
  -- update core.people c set color = bp.color
  --   from budget.people bp where lower(c.name) = lower(bp.name);

  -- 1. Capture + drop the Calendar views that depend on budget.people.
  --    (timeline depends on paydays, so drop timeline first.)
  if to_regclass('almanac.v_timeline') is not null then
    def_timeline := pg_get_viewdef('almanac.v_timeline'::regclass, true);
    execute 'drop view almanac.v_timeline';
  end if;
  if to_regclass('almanac.v_paydays') is not null then
    def_paydays := pg_get_viewdef('almanac.v_paydays'::regclass, true);
    execute 'drop view almanac.v_paydays';
  end if;

  -- 2. Repoint EVERY foreign key that references budget.people.
  for fk in
    select con.conname,
           ns.nspname  as sch,
           rel.relname as tbl,
           att.attname as col,
           con.confdeltype as deltype
    from pg_constraint con
    join pg_class     rel on rel.oid = con.conrelid
    join pg_namespace ns  on ns.oid  = rel.relnamespace
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = con.conkey[1]
    where con.contype = 'f'
      and con.confrelid = 'budget.people'::regclass
  loop
    execute format('alter table %I.%I drop constraint %I', fk.sch, fk.tbl, fk.conname);

    execute format(
      'update %I.%I tgt set %I = c.id '
      'from budget.people bp join core.people c on lower(c.name) = lower(bp.name) '
      'where tgt.%I = bp.id',
      fk.sch, fk.tbl, fk.col, fk.col);

    execute format(
      'alter table %I.%I add constraint %I foreign key (%I) references core.people(id) on delete %s',
      fk.sch, fk.tbl, fk.conname, fk.col,
      case fk.deltype
        when 'c' then 'cascade'
        when 'n' then 'set null'
        when 'd' then 'set default'
        when 'r' then 'restrict'
        else 'no action'
      end);
  end loop;

  -- 3. Replace the table with a view over core.people (same columns the old
  --    table exposed), so anything still reading budget.people sees core data.
  execute 'drop table budget.people';
  execute 'create view budget.people as
             select id, name, color, created_at from core.people';
  execute 'grant select on budget.people to anon, authenticated';

  -- 4. Recreate the Calendar views verbatim (they now read core data via the
  --    budget.people view) and restore their grants.
  if def_paydays is not null then
    execute 'create view almanac.v_paydays as ' || def_paydays;
    execute 'grant select on almanac.v_paydays to anon, authenticated';
  end if;
  if def_timeline is not null then
    execute 'create view almanac.v_timeline as ' || def_timeline;
    execute 'grant select on almanac.v_timeline to anon, authenticated';
  end if;

  raise notice 'Done: identity unified on core.people; all FKs repointed; budget.people is now a view; Calendar views recreated.';
end $$;
