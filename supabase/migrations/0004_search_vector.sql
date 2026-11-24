-- 0004_search_vector.sql
-- PBI-004.2 (#66): vector search over chunks, nearest first by cosine distance.
--
-- Finds chunks close in meaning to the question, even when they share no word
-- with it. Keyword search (0006) covers exact terms; RRF (#84) merges the two.
--
-- Access: security invoker, so the read rules in 0005 decide which chunks the
-- caller can see, inside this same query. This file has no level logic.
--
-- No vector index yet: exact search is correct, and PBI-020 decides by
-- benchmark whether HNSW is needed. The ORDER BY uses the distance operator
-- itself, so such an index can be used later without changing this function.
--
-- 768 dimensions, as chunks.embedding (0002, ADR 0014). Postgres does not
-- enforce the size of a function argument, but pgvector refuses to compare
-- vectors of different sizes, so a wrong-size question vector fails loudly.


create function public.search_chunks_vector(
  query_embedding vector(768),
  match_count     integer default 10
)
returns table (
  chunk_id       uuid,
  document_id    uuid,
  document_name  text,
  chunk_text     text,
  page           integer,
  -- 1 - cosine distance: higher is closer, 1 is the same direction. This is the
  -- number the relevance threshold uses (RagContext.score), never the RRF score.
  similarity     double precision
)
language plpgsql
stable
security invoker
-- pgvector's type and its <=> operator live in public, where 0001 created them.
set search_path = public, extensions
as $$
#variable_conflict use_column
begin
  if match_count is null or match_count < 1 or match_count > 50 then
    raise exception 'match_count must be between 1 and 50, got %', match_count
      using errcode = '22023';  -- invalid_parameter_value
  end if;

  if query_embedding is null then
    return;  -- nothing to compare with: an empty list, not every chunk
  end if;

  return query
    select c.id,
           c.document_id,
           d.name,
           c.text,
           c.page,
           1 - (c.embedding <=> query_embedding)
    from public.chunks c
    join public.documents d on d.id = c.document_id
    -- Also here, not only in the read rule: an admin job or the evaluation
    -- runner may call this with the secret key, which bypasses that rule.
    where d.status = 'ready'
    order by c.embedding <=> query_embedding, c.id
    limit match_count;
end;
$$;

-- Only signed-in people and server jobs may call it, as for keyword search.
revoke execute on function public.search_chunks_vector(vector, integer) from public, anon;
grant execute on function public.search_chunks_vector(vector, integer) to authenticated, service_role;
