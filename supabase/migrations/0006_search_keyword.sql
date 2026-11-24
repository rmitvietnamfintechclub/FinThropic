-- 0006_search_keyword.sql
-- PBI-009.1 (#83): keyword search over chunks, OR between words, accents ignored.
--
-- Finds exact terms that vector search misses: acronyms ("KPI-7"), names and
-- numbers. It matches against chunks.fts_unaccent (simple config, accents
-- removed, GIN-indexed in 0002), so "kinh phi" finds "kinh phí".
--
-- Access: security invoker, so the read rules in 0005 decide which chunks the
-- caller can see, inside this same query. This file has no level logic.


-- Stop words -----------------------------------------------------------------
-- Words that carry no meaning for search. They are removed BEFORE accents are
-- stripped, because stripping first makes different words collide:
--   "từ" (from) is a stop word, but without accents it is "tu", as in
--   "đầu tư" (investment); "hội" in "hội viên" (club member) would become "hoi",
--   like "hỏi" (to ask); "bạn" (you) would hide "ban" in "ban điều hành"
--   (executive board). Dropping "tu", "hoi" or "ban" would lose real terms.
-- The same goes for English stop words: "an" would hide "án" in "dự án"
-- (project), "can" would hide "cần" (need). Comparing before stripping keeps
-- "án" and "cần", because they still carry their marks at that point.
-- So the main list is accented, and only a few unaccented forms that are not
-- also common meaningful words are listed for people who type without tone
-- marks. Words typed without marks stay ambiguous ("bao" is both "bao nhiêu"
-- and "báo cáo"), so ambiguous ones are left in: a little noise in the ranking
-- costs less than losing a real term. PBI-020.6 (#150) measures this baseline
-- and decides what to change.
create function public.search_stop_words()
returns text[]
language sql
immutable
parallel safe
set search_path = ''
as $$
  select array[
    -- Vietnamese, as typed with tone marks
    'là', 'của', 'và', 'các', 'những', 'có', 'không', 'được', 'cho', 'với',
    'trong', 'này', 'đó', 'thì', 'mà', 'như', 'để', 'về', 'từ', 'một',
    'cũng', 'đã', 'sẽ', 'đang', 'rất', 'hay', 'hoặc', 'nếu', 'khi', 'bị',
    'bởi', 'tại', 'gì', 'nào', 'sao', 'nhiêu', 'ai', 'đâu', 'thế',
    'tôi', 'bạn', 'mình', 'xin', 'hỏi', 'vui', 'lòng', 'ạ', 'nhé', 'ơi',
    'vậy', 'nhỉ', 'chứ', 'nhưng',
    -- Vietnamese without tone marks, only where the bare form is not itself
    -- a common meaningful word
    'la', 'cua', 'va', 'cac', 'nhung', 'khong', 'duoc', 'gi', 'nao', 'nhieu',
    -- English
    'a', 'an', 'the', 'is', 'are', 'was', 'were', 'be', 'of', 'to', 'in', 'on',
    'at', 'for', 'and', 'or', 'with', 'by', 'from', 'about', 'as', 'it', 'this',
    'that', 'what', 'which', 'who', 'whom', 'how', 'when', 'where', 'why',
    'do', 'does', 'did', 'can', 'could', 'should', 'would', 'will', 'i', 'me',
    'my', 'we', 'our', 'you', 'your', 'please', 'mean', 'means', 'tell'
  ]
$$;


-- OR of tsquery values ---------------------------------------------------------
-- Joins words with OR (|) as tsquery values, never by pasting text together,
-- so nothing a person types can change the query syntax.
create aggregate public.tsquery_or_agg(tsquery) (
  sfunc = tsquery_or,
  stype = tsquery
);


-- The question as a keyword query --------------------------------------------
-- 1. Postgres splits the question into words (simple config: lowercase, no
--    stemming), e.g. "KPI-7" gives "kpi-7", "kpi" and "7".
-- 2. Stop words are removed while the accents are still there, and only then.
-- 3. Accents are stripped from what is left, to match chunks.fts_unaccent.
-- 4. The words are joined with OR. plainto_tsquery("A and B") would require
--    every word in one chunk and often finds nothing for a long question.
-- Returns null when nothing is left (empty question, or only stop words).
create function public.keyword_tsquery(question text)
returns tsquery
language sql
immutable
parallel safe
set search_path = ''
as $$
  select public.tsquery_or_agg(
           pg_catalog.plainto_tsquery('simple', public.immutable_unaccent(word))
         )
  from unnest(
         pg_catalog.tsvector_to_array(
           pg_catalog.ts_delete(
             pg_catalog.to_tsvector('simple', coalesce(question, '')),
             public.search_stop_words()
           )
         )
       ) as word
$$;


-- Keyword search -------------------------------------------------------------
-- Returns the best-matching chunks of ready documents the caller may read.
-- keyword_rank is ts_rank_cd: it orders this list only. It is not a relevance
-- score and must never reach the relevance threshold (that uses the vector
-- similarity); RRF (#84) uses the position in this list, not the number.
create function public.search_chunks_keyword(query text, match_count integer default 10)
returns table (
  chunk_id       uuid,
  document_id    uuid,
  document_name  text,
  chunk_text     text,
  page           integer,
  keyword_rank   real
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  keywords tsquery;
begin
  if match_count is null or match_count < 1 or match_count > 50 then
    raise exception 'match_count must be between 1 and 50, got %', match_count
      using errcode = '22023';  -- invalid_parameter_value
  end if;

  keywords := public.keyword_tsquery(query);
  if keywords is null then
    return;  -- nothing to search for: an empty list, not every chunk
  end if;

  return query
    select c.id,
           c.document_id,
           d.name,
           c.text,
           c.page,
           pg_catalog.ts_rank_cd(c.fts_unaccent, keywords)
    from public.chunks c
    join public.documents d on d.id = c.document_id
    where c.fts_unaccent @@ keywords
      -- Also here, not only in the read rule: an admin job or the evaluation
      -- runner may call this with the secret key, which bypasses that rule.
      and d.status = 'ready'
    order by 6 desc, c.id
    limit match_count;
end;
$$;

-- Only signed-in people and server jobs may call it. Supabase grants new
-- functions to anon by default; a visitor would see no rows anyway, but there
-- is no reason to let one run the query at all.
revoke execute on function public.search_chunks_keyword(text, integer) from public, anon;
grant execute on function public.search_chunks_keyword(text, integer) to authenticated, service_role;
