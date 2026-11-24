-- 0005_read_by_level.sql
-- PBI-009.1 (#83): who may read which documents and chunks.
--
-- #58 closed every table (deny by default). Search functions are security
-- invoker, so without a read rule a member would get zero results from both
-- keyword and vector search. This file opens exactly one thing: reading ready
-- documents, and their chunks, at or below the person's level.
--
--   level    | who                         | reads
--   ---------+-----------------------------+------------------------------------
--   member   | active profile, role member | ready documents with access_level 'member'
--   ebmb     | active profile, role ebmb   | all ready documents ('member' and 'ebmb')
--            |   or admin                  |
--   (none)   | deactivated, no profile,    | nothing
--            |   or not signed in          |
--
-- The rule lives here once and applies to every query that reads these tables:
-- keyword search (#83), vector search (#66) and direct API reads. Search
-- functions therefore hold no level logic of their own. The level always comes
-- from the person's own profile row on the server, never from the request
-- (PBI-017). Admin jobs and the worker use the secret key, which bypasses this
-- (ADR 0005).


-- The caller's reading level ------------------------------------------------
-- Reads the caller's own profile row, which profiles_select_own (#58) allows.
-- Returns null for anyone who may read nothing, so every rule below fails closed.
create function public.current_user_level()
returns text
language sql
stable
security invoker
set search_path = ''
as $$
  select case p.role
           when 'member' then 'member'
           when 'ebmb'   then 'ebmb'
           when 'admin'  then 'ebmb'
         end
  from public.profiles p
  where p.user_id = (select auth.uid())
    and p.status = 'active'
$$;


-- documents ------------------------------------------------------------------
-- Only ready documents: a file still uploading, processing or failed is not
-- part of the knowledge base yet. The level function is wrapped in a
-- sub-select so Postgres evaluates it once per query, not once per row.
create policy documents_select_by_level
  on public.documents
  for select
  to authenticated
  using (
    status = 'ready'
    and case (select public.current_user_level())
          when 'ebmb'   then true
          when 'member' then access_level = 'member'
          else false
        end
  );


-- chunks ---------------------------------------------------------------------
-- A chunk is readable exactly when its document is. The sub-query reads
-- documents, which Row Level Security filters with the rule above, so the two
-- rules can never disagree.
create policy chunks_select_by_level
  on public.chunks
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.documents d
      where d.id = chunks.document_id
    )
  );
