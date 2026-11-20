-- 0002_core_tables.sql
-- PBI-002.2 (#57): the seven core tables of Appendix C.
--
-- Tables in dependency order: profiles, upload_batches, documents, chunks,
-- conversations, messages, audit_logs. The version columns (documents) and
-- monitoring columns (messages) are added now, while the tables are empty,
-- so PBI-022.4 and PBI-036.1 need no risky migration later.
--
-- Every foreign key states its delete rule and why. Forward-only: never edit
-- this file once applied; add a new migration instead.
-- Depends on 0001_enable_extensions.sql (pgvector).


-- Accent-free search for Vietnamese -----------------------------------------
-- Postgres has no Vietnamese text search config, so we also index the text
-- with accents removed ("học phí" -> "hoc phi"). Members often type without
-- accents.
create extension if not exists unaccent with schema extensions;

-- A generated column may only call IMMUTABLE functions. unaccent() is only
-- STABLE because it looks up its dictionary through search_path. This wrapper
-- names the dictionary explicitly, so the result never changes for the same
-- input, which makes it safe to mark immutable.
create function public.immutable_unaccent(input text)
returns text
language sql
immutable
parallel safe
strict
set search_path = ''
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, input)
$$;


-- profiles (module: accounts) -----------------------------------------------
-- One row per person, one to one with Supabase Auth.
create table public.profiles (
  -- Primary key and foreign key at once (1 to 1).
  -- Delete rule: cascade. A profile means nothing without its auth user.
  -- The app never deletes users (it sets status = 'deactivated'); if an auth
  -- user is deleted by hand, restrict rules below still block it while the
  -- person owns documents or batches.
  user_id     uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  email       text not null,
  role        text not null default 'member',
  status      text not null default 'active',
  semester    text,
  -- Null until the person accepts the privacy notice (PBI-016 blocks chat
  -- while it is null).
  consent_at  timestamptz,
  created_at  timestamptz not null default now(),
  constraint profiles_role_check   check (role in ('member', 'ebmb', 'admin')),
  constraint profiles_status_check check (status in ('active', 'deactivated'))
);

-- Unique email, ignoring case: Khoa@rmit.edu.vn and khoa@rmit.edu.vn are the
-- same person. A plain unique constraint would let both in.
create unique index profiles_email_key on public.profiles (lower(email));


-- upload_batches (module: documents) ----------------------------------------
create table public.upload_batches (
  id            uuid primary key default gen_random_uuid(),
  -- Delete rule: restrict. Who uploaded what is history we must keep.
  uploaded_by   uuid not null references public.profiles (user_id) on delete restrict,
  done_count    integer not null default 0,
  failed_count  integer not null default 0,
  created_at    timestamptz not null default now(),
  constraint upload_batches_done_count_check   check (done_count >= 0),
  constraint upload_batches_failed_count_check check (failed_count >= 0)
);


-- documents (module: documents) ---------------------------------------------
create table public.documents (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  file_type       text not null,
  storage_path    text not null,
  -- Default to the stricter level: a forgotten choice hides a file from
  -- members instead of leaking it.
  access_level    text not null default 'ebmb',
  -- Delete rule: restrict. Removing an admin must not silently remove files.
  owner           uuid not null references public.profiles (user_id) on delete restrict,
  status          text not null default 'uploading',
  -- Null unless status = 'failed'.
  error           text,
  -- Filled by the worker once the file is read; used to skip re-indexing an
  -- unchanged file (PBI-008).
  content_hash    text,
  -- Null for a file indexed outside a batch (for example the Sprint 1 test PDF).
  -- Delete rule: restrict. A batch is not deleted while its documents exist.
  batch_id        uuid references public.upload_batches (id) on delete restrict,
  created_at      timestamptz not null default now(),
  -- Version fields (PBI-022.4).
  academic_year   text,
  effective_date  date,
  -- Delete rule: set null. If the older version is deleted, this document
  -- simply supersedes nothing; it must not disappear with it.
  supersedes_id   uuid references public.documents (id) on delete set null,
  is_current      boolean not null default true,
  constraint documents_storage_path_key unique (storage_path),
  constraint documents_file_type_check    check (file_type in ('pdf', 'docx', 'xlsx', 'csv')),
  constraint documents_access_level_check check (access_level in ('member', 'ebmb')),
  constraint documents_status_check       check (status in ('uploading', 'processing', 'ready', 'failed')),
  constraint documents_not_self_superseding check (supersedes_id <> id)
);


-- chunks (module: documents; written by the ingest worker) ------------------
create table public.chunks (
  id                uuid primary key default gen_random_uuid(),
  -- Delete rule: cascade. A chunk is useless without its document, and a
  -- deleted document must leave nothing searchable behind.
  document_id       uuid not null references public.documents (id) on delete cascade,
  chunk_index       integer not null,
  -- Where the chunk came from, for the citation. Which ones are set depends
  -- on the file type: page (PDF), section (DOCX), sheet and row (XLSX, CSV).
  page              integer,
  section           text,
  sheet             text,
  row               integer,
  text              text not null,
  -- The worker embeds before it stores (parse, chunk, enrich, embed, store),
  -- so every stored chunk has its vector. No vector index yet: PBI-020 picks
  -- exact search or HNSW by benchmark.
  embedding         vector(1536) not null,
  -- Computed by Postgres on every write, so the app can never forget them.
  fts               tsvector generated always as (to_tsvector('english', text)) stored,
  fts_unaccent      tsvector generated always as (to_tsvector('simple', public.immutable_unaccent(text))) stored,
  -- Which model and pipeline produced this chunk, so a later change can find
  -- and re-index old chunks.
  embedding_model   text not null,
  pipeline_version  text not null,
  constraint chunks_document_chunk_key unique (document_id, chunk_index),
  constraint chunks_chunk_index_check check (chunk_index >= 0),
  constraint chunks_page_check        check (page >= 1),
  constraint chunks_row_check         check (row >= 1)
);


-- conversations (module: chat) ----------------------------------------------
create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  -- Delete rule: cascade. A person's chats are personal data and go with them.
  user_id     uuid not null references auth.users (id) on delete cascade,
  -- Null until the first question gives it a title.
  title       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);


-- messages (module: chat) ---------------------------------------------------
create table public.messages (
  id                   uuid primary key default gen_random_uuid(),
  -- Delete rule: cascade. A message is useless without its conversation.
  conversation_id      uuid not null references public.conversations (id) on delete cascade,
  role                 text not null,
  content              text not null,
  -- Citations kept as data ([{chunkId, documentName, page}]) so PBI-010 and
  -- PBI-019 can check and open them.
  citations            jsonb not null default '[]'::jsonb,
  -- Null until rated; -1 thumbs down, 1 thumbs up.
  rating               smallint,
  created_at           timestamptz not null default now(),
  -- Monitoring (PBI-036.1). Null on user messages.
  outcome              text,
  top_score            double precision,
  -- No foreign key: an array cannot have one, and the log must outlive a
  -- re-index that replaces the chunks.
  retrieved_chunk_ids  uuid[],
  tokens_in            integer,
  tokens_out           integer,
  cost_usd             numeric(10, 6),
  duration_ms          integer,
  constraint messages_role_check            check (role in ('user', 'assistant')),
  constraint messages_citations_array_check check (jsonb_typeof(citations) = 'array'),
  constraint messages_rating_check          check (rating in (-1, 1)),
  constraint messages_outcome_check         check (outcome in ('answered', 'not_available')),
  constraint messages_usage_check check (
    tokens_in >= 0 and tokens_out >= 0 and cost_usd >= 0 and duration_ms >= 0
  )
);


-- audit_logs (module: audit) ------------------------------------------------
create table public.audit_logs (
  id        uuid primary key default gen_random_uuid(),
  -- Who acted. Deliberately no foreign key: the log must survive the account
  -- it mentions. Null means the system (for example the ingest worker).
  actor     uuid,
  action    text not null,
  target    text,
  metadata  jsonb not null default '{}'::jsonb,
  time      timestamptz not null default now()
);


-- Indexes -------------------------------------------------------------------
-- chunks(document_id) needs no index of its own: the unique constraint on
-- (document_id, chunk_index) already builds one that starts with document_id.

-- Admin document list and the worker's queue filter by status.
create index documents_status_idx on public.documents (status);

-- Re-index check: "have we seen a file with this hash before?" (PBI-008).
create index documents_content_hash_idx on public.documents (content_hash);

-- Open a conversation: its messages in time order, with no extra sort.
create index messages_conversation_created_idx on public.messages (conversation_id, created_at);

-- Conversation list: a person's chats, most recently updated first.
create index conversations_user_updated_idx on public.conversations (user_id, updated_at desc);

-- Audit log screen: newest events first, filtered by date range.
create index audit_logs_time_idx on public.audit_logs (time);

-- Keyword search (PBI-009): GIN answers "which rows contain this word?".
create index chunks_fts_idx on public.chunks using gin (fts);
create index chunks_fts_unaccent_idx on public.chunks using gin (fts_unaccent);


-- Row Level Security --------------------------------------------------------
-- Switched on here so no table is ever readable through the public API
-- without rules, even for a moment. With RLS on and no policy, every request
-- made with a user token is denied. PBI-002.3 (#58) adds FORCE, the first
-- policy and the pgTAP tests.
alter table public.profiles       enable row level security;
alter table public.upload_batches enable row level security;
alter table public.documents      enable row level security;
alter table public.chunks         enable row level security;
alter table public.conversations  enable row level security;
alter table public.messages       enable row level security;
alter table public.audit_logs     enable row level security;
