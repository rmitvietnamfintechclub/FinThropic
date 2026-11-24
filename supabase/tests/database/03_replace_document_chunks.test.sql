-- 03_replace_document_chunks.test.sql
-- PBI-003.4 (#63): replace_document_chunks writes all or nothing, stores the
-- warnings, and only service_role may execute it. Runs in a transaction that
-- is rolled back.

begin;

create extension if not exists pgtap with schema extensions;

select plan(11);

-- Test data, inserted as the database owner -------------------------------
insert into auth.users (id, email)
values ('00000000-0000-0000-0000-0000000000a1', 'worker@example.test');

insert into public.profiles (user_id, name, email)
values ('00000000-0000-0000-0000-0000000000a1', 'Worker Test', 'worker@example.test');

insert into public.documents (id, name, file_type, storage_path, owner, status)
values ('00000000-0000-0000-0000-0000000000d1', 'worker.pdf', 'pdf',
        'docs/worker.pdf', '00000000-0000-0000-0000-0000000000a1', 'processing');

insert into public.chunks (document_id, chunk_index, page, text, embedding, embedding_model, pipeline_version)
values ('00000000-0000-0000-0000-0000000000d1', 0, 1, 'old chunk',
        array_fill(0, array[768])::vector, 'test-model', 'v1');

-- All or nothing: a bad chunk rolls back the delete, the insert and the status.
select throws_ok(
  $$
  select public.replace_document_chunks(
    '00000000-0000-0000-0000-0000000000d1'::uuid,
    'ready',
    null,
    '[]'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'chunk_index', 1,
        'page', 1,
        'text', 'good chunk',
        'embedding', (select jsonb_agg(0) from generate_series(1, 768)),
        'embedding_model', 'test-model',
        'pipeline_version', 'v1'
      ),
      jsonb_build_object(
        'chunk_index', -1,
        'page', 1,
        'text', 'bad chunk',
        'embedding', (select jsonb_agg(0) from generate_series(1, 768)),
        'embedding_model', 'test-model',
        'pipeline_version', 'v1'
      )
    )
  )
  $$,
  '23514',
  null,
  'a bad chunk rolls the whole write back');

select is(
  (select status from public.documents where id = '00000000-0000-0000-0000-0000000000d1'),
  'processing',
  'status is unchanged after the failed call');

select is(
  (select count(*)::int from public.chunks
   where document_id = '00000000-0000-0000-0000-0000000000d1'),
  1,
  'the old chunk survives the failed call');

-- A valid call replaces the chunk, sets the status and stores the warnings.
select lives_ok(
  $$
  select public.replace_document_chunks(
    '00000000-0000-0000-0000-0000000000d1'::uuid,
    'ready',
    null,
    '["page 1: picture, little text"]'::jsonb,
    jsonb_build_array(
      jsonb_build_object(
        'chunk_index', 1,
        'page', 1,
        'text', 'good chunk',
        'embedding', (select jsonb_agg(0) from generate_series(1, 768)),
        'embedding_model', 'test-model',
        'pipeline_version', 'v1'
      )
    )
  )
  $$,
  'a valid call succeeds');

select is(
  (select status from public.documents where id = '00000000-0000-0000-0000-0000000000d1'),
  'ready',
  'status is ready after a valid call');

select is(
  (select warnings from public.documents where id = '00000000-0000-0000-0000-0000000000d1'),
  '["page 1: picture, little text"]'::jsonb,
  'the warnings are stored on the document');

select is(
  (select count(*)::int from public.chunks
   where document_id = '00000000-0000-0000-0000-0000000000d1'),
  1,
  'the old chunk is replaced, not appended');

select is(
  (select chunk_index from public.chunks
   where document_id = '00000000-0000-0000-0000-0000000000d1'),
  1,
  'the new chunk is stored');

-- Permissions: only service_role may execute the function.
select is(
  has_function_privilege(
    'anon', 'public.replace_document_chunks(uuid,text,text,jsonb,jsonb)', 'execute'),
  false,
  'anon cannot execute replace_document_chunks');

select is(
  has_function_privilege(
    'authenticated', 'public.replace_document_chunks(uuid,text,text,jsonb,jsonb)', 'execute'),
  false,
  'authenticated cannot execute replace_document_chunks');

select is(
  has_function_privilege(
    'service_role', 'public.replace_document_chunks(uuid,text,text,jsonb,jsonb)', 'execute'),
  true,
  'service_role can execute replace_document_chunks');

select * from finish();

rollback;
