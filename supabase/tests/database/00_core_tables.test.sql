-- 00_core_tables.test.sql
-- PBI-002.2 (#57): the seven core tables exist, their constraints reject bad
-- rows, and delete rules behave as written in 0002_core_tables.sql.
-- Runs inside a transaction that is rolled back, so it leaves no data behind.
-- Run with: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(25);

-- TC1: the seven Appendix C tables exist ------------------------------------
select has_table('public', 'profiles',       'profiles exists');
select has_table('public', 'upload_batches', 'upload_batches exists');
select has_table('public', 'documents',      'documents exists');
select has_table('public', 'chunks',         'chunks exists');
select has_table('public', 'conversations',  'conversations exists');
select has_table('public', 'messages',       'messages exists');
select has_table('public', 'audit_logs',     'audit_logs exists');

select col_type_is('public', 'chunks', 'embedding', 'vector(1536)', 'chunks.embedding is vector(1536)');

-- Test data: one auth user, profile, batch and document ----------------------
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000001', 'admin@example.test');

insert into public.profiles (user_id, name, email, role)
values ('00000000-0000-0000-0000-000000000001', 'Test Admin', 'Admin@Example.test', 'admin');

insert into public.upload_batches (id, uploaded_by)
values ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-000000000001');

insert into public.documents (id, name, file_type, storage_path, owner, batch_id)
values ('00000000-0000-0000-0000-0000000000d1', 'handbook.pdf', 'pdf', 'docs/handbook.pdf',
        '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000b1');

insert into public.chunks (document_id, chunk_index, page, text, embedding, embedding_model, pipeline_version)
values ('00000000-0000-0000-0000-0000000000d1', 0, 1, 'Học phí của câu lạc bộ',
        array_fill(0, array[1536])::vector, 'test-model', 'test');

-- Check constraints reject bad values (error 23514) -------------------------
select throws_ok(
  $$insert into public.profiles (user_id, name, email, role)
    values ('00000000-0000-0000-0000-000000000001', 'X', 'x@example.test', 'boss')$$,
  '23514', null, 'profiles.role rejects a value outside member, ebmb, admin');

select throws_ok(
  $$update public.documents set access_level = 'public' where id = '00000000-0000-0000-0000-0000000000d1'$$,
  '23514', null, 'documents.access_level rejects a value outside member, ebmb');

select throws_ok(
  $$update public.documents set status = 'done' where id = '00000000-0000-0000-0000-0000000000d1'$$,
  '23514', null, 'documents.status rejects an unknown status');

select throws_ok(
  $$update public.upload_batches set done_count = -1 where id = '00000000-0000-0000-0000-0000000000b1'$$,
  '23514', null, 'upload_batches.done_count rejects a negative count');

-- Unique constraints reject duplicates (error 23505) ------------------------
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-000000000002', 'second@example.test');

select throws_ok(
  $$insert into public.profiles (user_id, name, email)
    values ('00000000-0000-0000-0000-000000000002', 'Dup', 'admin@example.test')$$,
  '23505', null, 'profiles.email is unique ignoring case');

select throws_ok(
  $$insert into public.documents (name, file_type, storage_path, owner)
    values ('copy.pdf', 'pdf', 'docs/handbook.pdf', '00000000-0000-0000-0000-000000000001')$$,
  '23505', null, 'documents.storage_path is unique');

select throws_ok(
  $$insert into public.chunks (document_id, chunk_index, text, embedding, embedding_model, pipeline_version)
    values ('00000000-0000-0000-0000-0000000000d1', 0, 'again', array_fill(0, array[1536])::vector, 'm', 'v')$$,
  '23505', null, 'chunks (document_id, chunk_index) is unique');

-- Foreign keys reject rows that point nowhere (error 23503) -----------------
select throws_ok(
  $$insert into public.chunks (document_id, chunk_index, text, embedding, embedding_model, pipeline_version)
    values (gen_random_uuid(), 0, 'orphan', array_fill(0, array[1536])::vector, 'm', 'v')$$,
  '23503', null, 'chunks.document_id must point to a document');

select throws_ok(
  $$insert into public.documents (name, file_type, storage_path, owner, batch_id)
    values ('x.pdf', 'pdf', 'docs/x.pdf', '00000000-0000-0000-0000-000000000001', gen_random_uuid())$$,
  '23503', null, 'documents.batch_id must point to a batch');

select throws_ok(
  $$insert into public.messages (conversation_id, role, content)
    values (gen_random_uuid(), 'user', 'hello')$$,
  '23503', null, 'messages.conversation_id must point to a conversation');

-- Restrict rules block deletes that would lose history (error 23503) --------
select throws_ok(
  $$delete from public.upload_batches where id = '00000000-0000-0000-0000-0000000000b1'$$,
  '23503', null, 'a batch cannot be deleted while documents point to it');

select throws_ok(
  $$delete from public.profiles where user_id = '00000000-0000-0000-0000-000000000001'$$,
  '23503', null, 'a profile cannot be deleted while it owns documents');

-- Generated search columns are filled by Postgres ---------------------------
select ok(
  (select fts_unaccent @@ to_tsquery('simple', 'hoc & phi') from public.chunks
   where document_id = '00000000-0000-0000-0000-0000000000d1'),
  'fts_unaccent finds Vietnamese text typed without accents');

select ok(
  (select fts is not null from public.chunks where document_id = '00000000-0000-0000-0000-0000000000d1'),
  'fts is computed on insert');

-- Cascade rules: deleting a parent removes its children ---------------------
insert into public.conversations (id, user_id)
values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-000000000001');
insert into public.messages (conversation_id, role, content)
values ('00000000-0000-0000-0000-0000000000c1', 'user', 'What is the fee?');

delete from public.conversations where id = '00000000-0000-0000-0000-0000000000c1';
select is(
  (select count(*)::int from public.messages where conversation_id = '00000000-0000-0000-0000-0000000000c1'),
  0, 'deleting a conversation removes its messages');

delete from public.documents where id = '00000000-0000-0000-0000-0000000000d1';
select is(
  (select count(*)::int from public.chunks where document_id = '00000000-0000-0000-0000-0000000000d1'),
  0, 'deleting a document removes its chunks');

-- Row Level Security is on for each table (fully tested in #58) -------------
select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in ('public.profiles'::regclass, 'public.upload_batches'::regclass,
                 'public.documents'::regclass, 'public.chunks'::regclass,
                 'public.conversations'::regclass, 'public.messages'::regclass,
                 'public.audit_logs'::regclass)),
  'Row Level Security is enabled on all seven tables');

select * from finish();

rollback;
