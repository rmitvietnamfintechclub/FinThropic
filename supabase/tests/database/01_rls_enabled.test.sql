-- 01_rls_enabled.test.sql
-- PBI-002.3 (#58), TC1: Row Level Security is enabled and forced on each of
-- the seven tables, and the only policy is the one we expect.
-- Runs in a transaction that is rolled back.

begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

-- Enabled and forced, table by table -----------------------------------------
select ok(relrowsecurity,      format('%s has Row Level Security enabled', relname))
from pg_class
where oid in ('public.profiles'::regclass, 'public.upload_batches'::regclass,
              'public.documents'::regclass, 'public.chunks'::regclass,
              'public.conversations'::regclass, 'public.messages'::regclass,
              'public.audit_logs'::regclass)
order by relname;

select ok(relforcerowsecurity, format('%s has Row Level Security forced', relname))
from pg_class
where oid in ('public.profiles'::regclass, 'public.upload_batches'::regclass,
              'public.documents'::regclass, 'public.chunks'::regclass,
              'public.conversations'::regclass, 'public.messages'::regclass,
              'public.audit_logs'::regclass)
order by relname;

-- Only the expected policy exists --------------------------------------------
-- A new policy must come with its own test; this check makes adding one
-- without updating the tests fail loudly.
-- pg_policies uses the "name" type, which has its own collation; casting to
-- text with an explicit collation keeps the comparison unambiguous.
select is(
  (select array_agg((tablename || '.' || policyname)::text collate "default" order by 1)
   from pg_policies where schemaname = 'public'),
  array['profiles.profiles_select_own']::text[],
  'the only policy in public is profiles_select_own');

-- Negative case: the check really detects a table without RLS -------------
create table public.rls_probe (id int);
select ok(
  not (select relrowsecurity from pg_class where oid = 'public.rls_probe'::regclass),
  'a table created without Row Level Security is reported as off');

select * from finish();

rollback;
