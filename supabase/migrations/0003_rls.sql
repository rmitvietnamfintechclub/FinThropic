-- 0003_rls.sql
-- PBI-002.3 (#58): Row Level Security on every table, deny by default.
--
-- How it works: with Row Level Security on, a row is visible only if a policy
-- allows it. No policy means no rows, so a table starts fully closed and each
-- later PBI opens exactly what its feature needs, with a pgTAP test.
--
-- Who it protects against: requests made with a user token (the anon or
-- authenticated role), which is everything a member triggers through
-- createUserClient(). The secret key (service_role) bypasses Row Level
-- Security by design and is used only by admin jobs and the worker (ADR 0005).


-- Enable and force on all seven tables --------------------------------------
-- ENABLE was already switched on in 0002; repeating it is harmless and keeps
-- this file a complete statement of the rule.
-- FORCE also applies the policies to the table's owner, so a function or job
-- running as the owner cannot read around them by accident.
alter table public.profiles       enable row level security, force row level security;
alter table public.upload_batches enable row level security, force row level security;
alter table public.documents      enable row level security, force row level security;
alter table public.chunks         enable row level security, force row level security;
alter table public.conversations  enable row level security, force row level security;
alter table public.messages       enable row level security, force row level security;
alter table public.audit_logs     enable row level security, force row level security;


-- The one policy needed now -------------------------------------------------
-- A signed-in person may read their own profile, so the app can show their
-- name and check their role and consent. Nothing else: no insert, update or
-- delete (accounts are created by admins through PBI-015), and nobody may read
-- anyone else's row.
--
-- auth.uid() is wrapped in a sub-select so Postgres evaluates it once per
-- query instead of once per row (Supabase's recommended form).
create policy profiles_select_own
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = user_id);
