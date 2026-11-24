# Models

One row per table. Update it in the same PR that adds or changes a migration. Diagram: `docs/diagrams/er-diagram.drawio.svg`.

Migration: `supabase/migrations/0002_core_tables.sql` (PBI-002.2). Tests: `supabase/tests/database/00_core_tables.test.sql`.

| Table | Module that writes it | Purpose | Who may read it | Row Level Security |
| --- | --- | --- | --- | --- |
| profiles | accounts | one row per person, role and status | the person (own row), admins | on and forced; `profiles_select_own`: a signed-in person reads their own row (admin access comes with PBI-015) |
| upload_batches | documents | one row per upload | admins | on and forced; no policy yet (deny) |
| documents | documents | one row per file, with version fields | members see `member` files, EBMB and admins see all, once `ready` | on and forced; `documents_select_by_level` (0005), see "Who can read which documents" |
| chunks | documents (written by the ingest worker) | searchable pieces of a document | same rule as its document | on and forced; `chunks_select_by_level` (0005): readable exactly when its document is |
| conversations | chat | one chat thread | its owner | on and forced; no policy yet (deny) |
| messages | chat | questions, answers and monitoring numbers | the owner of the conversation; admins see the monitoring numbers | on and forced; no policy yet (deny) |
| audit_logs | audit | who did what, to what, when | admins | on and forced; no policy yet (deny) |

"Who may read it" is the intended rule; until its policy lands, Row Level Security denies every request made with a user token. The ingest worker and admin jobs use the secret key, which bypasses Row Level Security (ADR 0005). Policies: `supabase/migrations/0003_rls.sql`. Tests: `supabase/tests/database/01_rls_enabled.test.sql` (on, forced, only the expected policies) and `02_anon_sees_nothing.test.sql` (no session sees nothing; a signed-in person sees only their own profile).

Rules: a table is written only by the module that owns it (`ARCHITECTURE.md`, backend table). Every table has Row Level Security on, and every policy has a pgTAP test in `supabase/tests/`. Migrations are forward only.

## Who can read which documents

Each document has an `access_level`, chosen by the admin who uploads it: `member` (every club member) or `ebmb` (the executive board only). New documents default to `ebmb`, so a forgotten choice hides a file instead of leaking it.

| Reader | Reading level | `member` documents | `ebmb` documents | Not `ready` yet (uploading, processing, failed) |
| --- | --- | --- | --- | --- |
| Member (role `member`, active) | `member` | yes | **no** | no |
| EBMB member (role `ebmb`, active) | `ebmb` | yes | yes | no |
| Admin (role `admin`, active) | `ebmb` | yes | yes | no (admin screens use the admin client) |
| Deactivated account, no profile, or not signed in | none | no | no | no |

- The level comes from the person's own `profiles` row on the server (`current_user_level()`), never from the request, so sending `level: "ebmb"` changes nothing (PBI-017).
- A chunk is readable exactly when its document is, so search results, citations and direct reads all follow the same rule.
- The rule is written once, as Row Level Security in `supabase/migrations/0005_read_by_level.sql`. Search functions are `security invoker` and hold no level logic of their own, so keyword search (`search_chunks_keyword`, 0006) and vector search apply it inside the same query.
- Admin jobs, the ingest worker and the evaluation runner use the secret key, which bypasses the rule (ADR 0005); keyword search still returns only `ready` documents for them.
- Tests: `supabase/tests/database/05_read_by_level.test.sql` (the table above) and `04_search_keyword.test.sql` (AC3: a Member's search never returns an EBMB chunk).

## Fields and constraints

| Table | Fields | Constraints |
| --- | --- | --- |
| profiles | user_id (primary key), name, email, role, status, semester, consent_at (null until consent), created_at | user_id references `auth.users`, on delete cascade; email unique ignoring case; role in member, ebmb, admin (default member); status in active, deactivated (default active) |
| upload_batches | id, uploaded_by, done_count, failed_count, created_at | uploaded_by references profiles, on delete restrict; counts not negative |
| documents | id, name, file_type, storage_path, access_level, owner, status, error, content_hash, batch_id, created_at, academic_year, effective_date, supersedes_id, is_current | storage_path unique; file_type in pdf, docx, xlsx, csv; access_level in member, ebmb (default ebmb); status in uploading, processing, ready, failed; owner references profiles, on delete restrict; batch_id references upload_batches, on delete restrict (null outside a batch); supersedes_id references documents, on delete set null, never itself |
| chunks | id, document_id, chunk_index, page, section, sheet, row, text, embedding vector(768), fts, fts_unaccent, embedding_model, pipeline_version | document_id references documents, on delete cascade; (document_id, chunk_index) unique; chunk_index not negative; page and row from 1; fts (English) and fts_unaccent (accents removed, for Vietnamese) generated by Postgres |
| conversations | id, user_id, title, created_at, updated_at | user_id references `auth.users`, on delete cascade |
| messages | id, conversation_id, role, content, citations, rating, created_at, outcome, top_score, retrieved_chunk_ids, tokens_in, tokens_out, cost_usd, duration_ms | conversation_id references conversations, on delete cascade; role in user, assistant; citations a JSON array; rating -1 or 1; outcome answered or not_available; usage numbers not negative; retrieved_chunk_ids has no foreign key so the log outlives a re-index |
| audit_logs | id, actor, action, target, metadata, time | actor has no foreign key so the log outlives the account (null means the system) |

Indexes: `documents(status)`, `documents(content_hash)`, `messages(conversation_id, created_at)`, `conversations(user_id, updated_at desc)`, `audit_logs(time)`, GIN on `chunks.fts` and `chunks.fts_unaccent`. `chunks(document_id)` is served by the unique index on `(document_id, chunk_index)`. No vector index yet: PBI-020 decides by benchmark.
