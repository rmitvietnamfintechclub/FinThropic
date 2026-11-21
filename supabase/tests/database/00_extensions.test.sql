-- 00_extensions.test.sql
-- PBI-002.1 (#56): the extensions the schema needs are enabled.
-- Also gives `supabase test db` (and the CI database job) a test to run
-- before the table and Row Level Security tests exist.
-- Runs inside a transaction that is rolled back, so it leaves nothing behind.
-- Run with: supabase test db

begin;

create extension if not exists pgtap with schema extensions;

select plan(1);

select has_extension('vector', 'pgvector is enabled for chunk embeddings');

select * from finish();

rollback;
