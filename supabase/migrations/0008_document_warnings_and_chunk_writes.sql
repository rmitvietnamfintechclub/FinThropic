-- 0008_document_warnings_and_chunk_writes.sql
-- Forward-only. 0002 stays as merged; this adds the warnings column and the one
-- write function the worker uses, so a status change and its chunks commit together.

alter table public.documents
  add column warnings jsonb not null default '[]';

comment on column public.documents.warnings is
  'Per-page warnings such as "page 45: picture, little text". Empty unless the file was read with warnings.';

create function public.replace_document_chunks(
  p_document_id uuid,
  p_status      text,
  p_error       text,
  p_warnings    jsonb,
  p_chunks      jsonb
) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from public.chunks where document_id = p_document_id;

  insert into public.chunks (
    document_id, chunk_index, page, text, embedding, embedding_model, pipeline_version
  )
  select
    p_document_id,
    (item ->> 'chunk_index')::integer,
    (item ->> 'page')::integer,
    item ->> 'text',
    (item -> 'embedding')::text::vector,
    item ->> 'embedding_model',
    item ->> 'pipeline_version'
  from jsonb_array_elements(p_chunks) as item;

  update public.documents
     set status = p_status,
         error = p_error,
         warnings = p_warnings
   where id = p_document_id;
end;
$$;

comment on function public.replace_document_chunks(uuid, text, text, jsonb, jsonb) is
  'One transaction: replace a document''s chunks and set its status, error and warnings. '
  'Called by the ingest worker with rpc(); reused by the re-index path (PBI-008.4).';

revoke execute on function public.replace_document_chunks(uuid, text, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_document_chunks(uuid, text, text, jsonb, jsonb)
  to service_role;
