-- 03_search_vector.test.sql
-- PBI-004.2 (#66): vector search. The nearest chunk comes first with its
-- similarity, the access filter is inside the query (a Member never gets an
-- EBMB chunk, even the nearest one), documents not ready are never returned,
-- and the input checks.
-- Vectors are 768 numbers: a 1 or 0 in the first two places, zeros after.
-- Runs in a transaction that is rolled back.

begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

-- The function itself --------------------------------------------------------
select has_function('public', 'search_chunks_vector', 'search_chunks_vector exists');
select is(
  (select prosecdef from pg_proc where oid = 'public.search_chunks_vector(vector, integer)'::regprocedure),
  false, 'it runs as the caller (security invoker), so the read rules apply');

-- People and documents, inserted as the database owner -----------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'member@example.test'),
  ('00000000-0000-0000-0000-0000000000a2', 'ebmb@example.test'),
  ('00000000-0000-0000-0000-0000000000a4', 'gone@example.test');

insert into public.profiles (user_id, name, email, role, status) values
  ('00000000-0000-0000-0000-0000000000a1', 'Member',      'member@example.test', 'member', 'active'),
  ('00000000-0000-0000-0000-0000000000a2', 'EBMB member', 'ebmb@example.test',   'ebmb',   'active'),
  ('00000000-0000-0000-0000-0000000000a4', 'Deactivated', 'gone@example.test',   'member', 'deactivated');

insert into public.documents (id, name, file_type, storage_path, access_level, owner, status) values
  ('00000000-0000-0000-0000-0000000000d1', 'Club handbook', 'pdf', 'docs/handbook.pdf', 'member',
   '00000000-0000-0000-0000-0000000000a2', 'ready'),
  ('00000000-0000-0000-0000-0000000000d2', 'Board minutes', 'pdf', 'docs/minutes.pdf',  'ebmb',
   '00000000-0000-0000-0000-0000000000a2', 'ready'),
  ('00000000-0000-0000-0000-0000000000d3', 'Draft rules',   'pdf', 'docs/draft.pdf',    'member',
   '00000000-0000-0000-0000-0000000000a2', 'processing');

-- The question vector is [1, 0, 0, ...].
-- c001 (member) points the same way: similarity 1, the nearest a member may read.
-- c002 (member) is at a right angle: similarity 0, the farthest.
-- c003 (EBMB) and c004 (not ready) point the same way too, so they would come
-- first if the access filter or the status check were missing.
insert into public.chunks (id, document_id, chunk_index, page, text, embedding, embedding_model, pipeline_version) values
  ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000000d1', 0, 1,
   'Budget requests go to the Treasurer two weeks before the event.',
   (array[1, 0]::real[] || array_fill(0::real, array[766]))::vector, 'test-model', 'test'),
  ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-0000000000d1', 1, 2,
   'The club logo is blue and white.',
   (array[0, 1]::real[] || array_fill(0::real, array[766]))::vector, 'test-model', 'test'),
  ('00000000-0000-0000-0000-00000000c003', '00000000-0000-0000-0000-0000000000d2', 0, 1,
   'The board approved the 2027 budget.',
   (array[1, 0]::real[] || array_fill(0::real, array[766]))::vector, 'test-model', 'test'),
  ('00000000-0000-0000-0000-00000000c004', '00000000-0000-0000-0000-0000000000d3', 0, 1,
   'Draft budget rules, not published.',
   (array[1, 0]::real[] || array_fill(0::real, array[766]))::vector, 'test-model', 'test');


-- As a member ------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a1"}', true);

select is(
  (select chunk_id from public.search_chunks_vector(
     (array[1, 0]::real[] || array_fill(0::real, array[766]))::vector, 5) limit 1),
  '00000000-0000-0000-0000-00000000c001'::uuid,
  'the nearest chunk the member may read comes first');
select ok(
  (select abs(similarity - 1) < 1e-6 from public.search_chunks_vector(
     (array[1, 0]::real[] || array_fill(0::real, array[766]))::vector, 5) limit 1),
  'a chunk pointing the same way as the question has similarity 1');
select is(
  (select chunk_id from public.search_chunks_vector(
     (array[1, 0]::real[] || array_fill(0::real, array[766]))::vector, 5) offset 1 limit 1),
  '00000000-0000-0000-0000-00000000c002'::uuid,
  'farther chunks come after nearer ones');
select is(
  (select count(*)::int from public.search_chunks_vector(
     (array[1, 0]::real[] || array_fill(0::real, array[766]))::vector, 5)),
  2, 'a member gets only the two chunks of the ready member document');
select ok(
  not exists (select 1 from public.search_chunks_vector(
     (array[1, 0]::real[] || array_fill(0::real, array[766]))::vector, 5)
     where chunk_id = '00000000-0000-0000-0000-00000000c003'),
  'a member never gets an EBMB chunk, even the nearest one');
select ok(
  not exists (select 1 from public.search_chunks_vector(
     (array[1, 0]::real[] || array_fill(0::real, array[766]))::vector, 5)
     where chunk_id = '00000000-0000-0000-0000-00000000c004'),
  'a document that is still processing is never returned');

-- match_count.
select is(
  (select count(*)::int from public.search_chunks_vector(
     (array[1, 0]::real[] || array_fill(0::real, array[766]))::vector, 1)),
  1, 'match_count limits the number of rows');
select throws_ok(
  $$select * from public.search_chunks_vector((array[1, 0]::real[] || array_fill(0::real, array[766]))::vector, 0)$$,
  '22023', null, 'match_count 0 is refused');
select throws_ok(
  $$select * from public.search_chunks_vector((array[1, 0]::real[] || array_fill(0::real, array[766]))::vector, 51)$$,
  '22023', null, 'match_count above 50 is refused');
select is_empty($$select * from public.search_chunks_vector(null, 5)$$,
  'a null question vector returns nothing, not every chunk');


-- As an EBMB member --------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a2"}', true);
select ok(
  exists (select 1 from public.search_chunks_vector(
     (array[1, 0]::real[] || array_fill(0::real, array[766]))::vector, 5)
     where chunk_id = '00000000-0000-0000-0000-00000000c003'),
  'an EBMB member gets the EBMB chunk the member could not');


-- As a deactivated account and as a visitor ----------------------------------------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a4"}', true);
select is_empty(
  $$select * from public.search_chunks_vector((array[1, 0]::real[] || array_fill(0::real, array[766]))::vector, 5)$$,
  'a deactivated account finds nothing');
reset role;

set local role anon;
select throws_ok(
  $$select * from public.search_chunks_vector((array[1, 0]::real[] || array_fill(0::real, array[766]))::vector, 5)$$,
  '42501', null, 'a visitor may not run the search at all');

select * from finish();

rollback;
