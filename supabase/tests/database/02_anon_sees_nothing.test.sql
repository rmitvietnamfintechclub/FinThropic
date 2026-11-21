-- 02_anon_sees_nothing.test.sql
-- PBI-002.3 (#58), TC2: a request with no session sees no rows in any table,
-- and a signed-in person sees only their own profile. Every table has data in
-- it first, so an empty result proves Row Level Security, not an empty table.
-- Runs in a transaction that is rolled back.

begin;

create extension if not exists pgtap with schema extensions;

select plan(18);

-- Test data, inserted as the database owner -------------------------------
-- Two people: A (the one signed in later) and B (someone else).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.test');

insert into public.profiles (user_id, name, email) values
  ('00000000-0000-0000-0000-00000000000a', 'Person A', 'a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'Person B', 'b@example.test');

insert into public.upload_batches (id, uploaded_by)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000a');

insert into public.documents (id, name, file_type, storage_path, access_level, owner, status, batch_id)
values ('00000000-0000-0000-0000-0000000000d1', 'handbook.pdf', 'pdf', 'docs/handbook.pdf', 'member',
        '00000000-0000-0000-0000-00000000000a', 'ready', '00000000-0000-0000-0000-0000000000b1');

insert into public.chunks (document_id, chunk_index, page, text, embedding, embedding_model, pipeline_version)
values ('00000000-0000-0000-0000-0000000000d1', 0, 1, 'The membership fee is paid each semester.',
        array_fill(0, array[768])::vector, 'test-model', 'test');

insert into public.conversations (id, user_id)
values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000a');

insert into public.messages (conversation_id, role, content)
values ('00000000-0000-0000-0000-0000000000c1', 'user', 'What is the fee?');

insert into public.audit_logs (actor, action, target)
values ('00000000-0000-0000-0000-00000000000a', 'document.upload', 'docs/handbook.pdf');


-- No session: the anon role sees nothing --------------------------------------
set local role anon;

select is_empty($$select * from public.profiles$$,       'anon sees no profiles');
select is_empty($$select * from public.upload_batches$$, 'anon sees no upload batches');
select is_empty($$select * from public.documents$$,      'anon sees no documents');
select is_empty($$select * from public.chunks$$,         'anon sees no chunks');
select is_empty($$select * from public.conversations$$,  'anon sees no conversations');
select is_empty($$select * from public.messages$$,       'anon sees no messages');
select is_empty($$select * from public.audit_logs$$,     'anon sees no audit logs');

select throws_ok(
  $$insert into public.profiles (user_id, name, email)
    values ('00000000-0000-0000-0000-00000000000a', 'Intruder', 'x@example.test')$$,
  '42501', null, 'anon cannot insert a profile');

reset role;


-- Signed in as A: only A's own profile ---------------------------------------
-- auth.uid() reads the "sub" claim of the request's token.
set local role authenticated;
select set_config('request.jwt.claims',
  '{"sub": "00000000-0000-0000-0000-00000000000a", "role": "authenticated"}', true);

select results_eq(
  $$select user_id from public.profiles$$,
  $$values ('00000000-0000-0000-0000-00000000000a'::uuid)$$,
  'a signed-in person sees exactly their own profile');

select is_empty(
  $$select * from public.profiles where user_id = '00000000-0000-0000-0000-00000000000b'$$,
  'a signed-in person cannot see someone else''s profile');

-- No policy yet on the other tables, so even a signed-in person sees nothing.
select is_empty($$select * from public.upload_batches$$, 'authenticated sees no upload batches yet');
select is_empty($$select * from public.documents$$,      'authenticated sees no documents yet');
select is_empty($$select * from public.chunks$$,         'authenticated sees no chunks yet');
select is_empty($$select * from public.conversations$$,  'authenticated sees no conversations yet, not even their own');
select is_empty($$select * from public.messages$$,       'authenticated sees no messages yet');
select is_empty($$select * from public.audit_logs$$,     'authenticated sees no audit logs');

-- The policy only allows reading; changing a profile is refused.
select throws_ok(
  $$insert into public.profiles (user_id, name, email)
    values ('00000000-0000-0000-0000-00000000000a', 'Again', 'a2@example.test')$$,
  '42501', null, 'a signed-in person cannot insert a profile');

-- An update with no update policy changes no rows (Postgres does not raise).
select is_empty(
  $$update public.profiles set role = 'admin'
    where user_id = '00000000-0000-0000-0000-00000000000a' returning user_id$$,
  'a signed-in person cannot make themselves admin');

reset role;

select * from finish();

rollback;
