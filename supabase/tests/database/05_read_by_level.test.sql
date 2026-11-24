-- 05_read_by_level.test.sql
-- PBI-009.1 (#83): the read rules in 0005_read_by_level.sql. A member reads
-- ready member documents and their chunks; EBMB members and admins read all
-- ready documents; nobody reads a document that is not ready; a deactivated
-- account and a visitor read nothing; nobody can write.
-- Runs in a transaction that is rolled back.

begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

-- Four people and three documents, inserted as the database owner -----------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'member@example.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'ebmb@example.test'),
  ('00000000-0000-0000-0000-0000000000a3', 'admin@example.test'),
  ('00000000-0000-0000-0000-0000000000a4', 'gone@example.test');

insert into public.profiles (user_id, name, email, role, status) values
  ('00000000-0000-0000-0000-0000000000a1', 'Member',      'member@example.test', 'member', 'active'),
  ('00000000-0000-0000-0000-0000000000a2', 'EBMB member', 'ebmb@example.test',   'ebmb',   'active'),
  ('00000000-0000-0000-0000-0000000000a3', 'Admin',       'admin@example.test',  'admin',  'active'),
  ('00000000-0000-0000-0000-0000000000a4', 'Deactivated', 'gone@example.test',   'member', 'deactivated');

insert into public.documents (id, name, file_type, storage_path, access_level, owner, status) values
  ('00000000-0000-0000-0000-0000000000d1', 'Club handbook', 'pdf', 'docs/handbook.pdf', 'member',
   '00000000-0000-0000-0000-0000000000a3', 'ready'),
  ('00000000-0000-0000-0000-0000000000d2', 'Board minutes', 'pdf', 'docs/minutes.pdf',  'ebmb',
   '00000000-0000-0000-0000-0000000000a3', 'ready'),
  ('00000000-0000-0000-0000-0000000000d3', 'Draft rules',   'pdf', 'docs/draft.pdf',    'member',
   '00000000-0000-0000-0000-0000000000a3', 'processing');

insert into public.chunks (document_id, chunk_index, page, text, embedding, embedding_model, pipeline_version) values
  ('00000000-0000-0000-0000-0000000000d1', 0, 1, 'Members meet every Friday.',
   array_fill(0, array[768])::vector, 'test-model', 'test'),
  ('00000000-0000-0000-0000-0000000000d2', 0, 1, 'The board approved the budget.',
   array_fill(0, array[768])::vector, 'test-model', 'test'),
  ('00000000-0000-0000-0000-0000000000d3', 0, 1, 'Draft text, not published.',
   array_fill(0, array[768])::vector, 'test-model', 'test');

set local role authenticated;

-- Member ---------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a1"}', true);

select is(public.current_user_level(), 'member', 'an active member reads at member level');
select results_eq($$select name from public.documents$$, $$values ('Club handbook')$$,
  'a member sees only ready member documents');
select results_eq($$select text from public.chunks$$, $$values ('Members meet every Friday.')$$,
  'a member sees only the chunks of those documents');
select is_empty($$select * from public.chunks where document_id = '00000000-0000-0000-0000-0000000000d2'$$,
  'a member cannot read an EBMB chunk even by asking for its document id');

-- EBMB member and admin ------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a2"}', true);

select is(public.current_user_level(), 'ebmb', 'an active EBMB member reads at EBMB level');
select results_eq($$select name from public.documents order by name$$,
  $$values ('Board minutes'), ('Club handbook')$$,
  'an EBMB member sees member and EBMB documents, but not one that is still processing');
select is((select count(*)::int from public.chunks), 2, 'an EBMB member sees the chunks of both');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a3"}', true);

select is(public.current_user_level(), 'ebmb', 'an admin reads at EBMB level');
select is((select count(*)::int from public.documents), 2, 'an admin sees both ready documents');

-- Deactivated account and unknown token --------------------------------------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a4"}', true);

select is(public.current_user_level(), null, 'a deactivated account has no level');
select is_empty($$select * from public.documents$$, 'a deactivated account sees no documents');
select is_empty($$select * from public.chunks$$,    'a deactivated account sees no chunks');

select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000ff"}', true);
select is_empty($$select * from public.documents$$, 'a token with no profile sees no documents');

-- Read only ------------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a2"}', true);
select throws_ok(
  $$insert into public.documents (name, file_type, storage_path, access_level, owner, status)
    values ('x.pdf', 'pdf', 'docs/x.pdf', 'member', '00000000-0000-0000-0000-0000000000a2', 'ready')$$,
  '42501', null, 'nobody can add a document through a user token');

reset role;

-- Visitor --------------------------------------------------------------------
set local role anon;
select is_empty($$select * from public.documents$$, 'a visitor sees no documents');
select is_empty($$select * from public.chunks$$,    'a visitor sees no chunks');
reset role;

select * from finish();

rollback;
