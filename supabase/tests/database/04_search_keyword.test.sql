-- 04_search_keyword.test.sql
-- PBI-009.1 (#83): keyword search. AC1 (an acronym in one document is found),
-- AC3 (the access filter is inside the query: a Member never gets an EBMB
-- chunk), OR between words, accents ignored, stop words dropped without losing
-- real Vietnamese words, and the input checks.
-- Runs in a transaction that is rolled back.

begin;

create extension if not exists pgtap with schema extensions;

select plan(23);

-- The function itself --------------------------------------------------------
select has_function('public', 'search_chunks_keyword', array['text', 'integer'],
  'search_chunks_keyword(query, match_count) exists');
select is(
  (select prosecdef from pg_proc where oid = 'public.search_chunks_keyword(text, integer)'::regprocedure),
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

insert into public.chunks (id, document_id, chunk_index, page, text, embedding, embedding_model, pipeline_version) values
  ('00000000-0000-0000-0000-00000000c001', '00000000-0000-0000-0000-0000000000d1', 0, 1,
   'KPI-7 là chỉ số đo số thành viên mới mỗi học kỳ.',
   array_fill(0, array[768])::vector, 'test-model', 'test'),
  ('00000000-0000-0000-0000-00000000c002', '00000000-0000-0000-0000-0000000000d1', 1, 2,
   'Kinh phí hội viên là 200.000 đồng mỗi học kỳ.',
   array_fill(0, array[768])::vector, 'test-model', 'test'),
  ('00000000-0000-0000-0000-00000000c003', '00000000-0000-0000-0000-0000000000d1', 2, 3,
   'Quỹ đầu tư của câu lạc bộ do ban điều hành quản lý. Mỗi dự án được duyệt riêng.',
   array_fill(0, array[768])::vector, 'test-model', 'test'),
  ('00000000-0000-0000-0000-00000000c004', '00000000-0000-0000-0000-0000000000d2', 0, 1,
   'Ngân sách XQ-9 cho năm 2027 đã được duyệt.',
   array_fill(0, array[768])::vector, 'test-model', 'test'),
  ('00000000-0000-0000-0000-00000000c005', '00000000-0000-0000-0000-0000000000d3', 0, 1,
   'Quy định PENDINGWORD chưa công bố.',
   array_fill(0, array[768])::vector, 'test-model', 'test');


-- As a member ------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a1"}', true);

-- TC1 (AC1): the acronym appears in one document only.
select is(
  (select chunk_id from public.search_chunks_keyword('What does KPI-7 mean?', 5) limit 1),
  '00000000-0000-0000-0000-00000000c001'::uuid,
  'AC1: "What does KPI-7 mean?" puts the one chunk with KPI-7 first');

select is(
  (select document_name from public.search_chunks_keyword('KPI-7', 5) limit 1),
  'Club handbook', 'the result carries the document name for the citation');

-- Accents ignored, both ways.
select ok(
  '00000000-0000-0000-0000-00000000c002'::uuid in (select chunk_id from public.search_chunks_keyword('kinh phi', 5)),
  '"kinh phi" typed without tone marks finds "Kinh phí"');
select ok(
  '00000000-0000-0000-0000-00000000c002'::uuid in (select chunk_id from public.search_chunks_keyword('Kinh phí', 5)),
  '"Kinh phí" typed with tone marks finds it too');

-- OR, not AND: a long question with one useful word still finds the chunk.
select ok(
  '00000000-0000-0000-0000-00000000c001'::uuid in
    (select chunk_id from public.search_chunks_keyword('Xin cho hỏi KPI-7 trong năm nay được tính thế nào ạ?', 5)),
  'a long question finds the chunk through the one word it shares with it');

-- Stop words.
select is_empty(
  $$select * from public.search_chunks_keyword('là của và những được không', 5)$$,
  'a question made only of stop words returns nothing, not every chunk');
select is_empty($$select * from public.search_chunks_keyword('   ', 5)$$, 'a blank question returns nothing');
select is_empty($$select * from public.search_chunks_keyword(null, 5)$$,  'a null question returns nothing');

-- Stop words are removed before accents, so real words survive.
select ok(
  '00000000-0000-0000-0000-00000000c003'::uuid in (select chunk_id from public.search_chunks_keyword('đầu tư', 5)),
  '"đầu tư" (investment) is searched: "tư" is not the stop word "từ"');
select ok(
  '00000000-0000-0000-0000-00000000c003'::uuid in (select chunk_id from public.search_chunks_keyword('ban điều hành', 5)),
  '"ban điều hành" (executive board) is searched: "ban" is not the stop word "bạn"');
select ok(
  '00000000-0000-0000-0000-00000000c003'::uuid in (select chunk_id from public.search_chunks_keyword('dự án', 5)),
  '"dự án" (project) is searched: "án" is not the English stop word "an"');
select ok(
  '00000000-0000-0000-0000-00000000c002'::uuid in (select chunk_id from public.search_chunks_keyword('hội viên', 5)),
  '"hội viên" (club member) is searched: "hội" is not the stop word "hỏi"');

-- TC3 (AC3): a Member question that matches an EBMB chunk by keyword.
select is_empty($$select * from public.search_chunks_keyword('XQ-9', 5)$$,
  'AC3: a member never gets an EBMB chunk, even when the keyword matches it');
select is_empty($$select * from public.search_chunks_keyword('PENDINGWORD', 5)$$,
  'a document that is still processing is never returned');

-- match_count.
select is((select count(*)::int from public.search_chunks_keyword('học kỳ', 1)), 1,
  'match_count limits the number of rows');
select throws_ok($$select * from public.search_chunks_keyword('KPI-7', 0)$$,  '22023', null,
  'match_count 0 is refused');
select throws_ok($$select * from public.search_chunks_keyword('KPI-7', 51)$$, '22023', null,
  'match_count above 50 is refused');


-- As an EBMB member --------------------------------------------------------------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a2"}', true);
select is(
  (select chunk_id from public.search_chunks_keyword('XQ-9', 5) limit 1),
  '00000000-0000-0000-0000-00000000c004'::uuid,
  'an EBMB member finds the EBMB chunk the member could not');
select is_empty($$select * from public.search_chunks_keyword('PENDINGWORD', 5)$$,
  'not even an EBMB member gets a document that is still processing');


-- As a deactivated account and as a visitor ----------------------------------------
select set_config('request.jwt.claims', '{"sub": "00000000-0000-0000-0000-0000000000a4"}', true);
select is_empty($$select * from public.search_chunks_keyword('KPI-7', 5)$$,
  'a deactivated account finds nothing');
reset role;

set local role anon;
select throws_ok($$select * from public.search_chunks_keyword('KPI-7', 5)$$, '42501', null,
  'a visitor may not run the search at all');
reset role;

select * from finish();

rollback;
