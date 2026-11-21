# Models

One row per table. Update it in the same PR that adds or changes a migration. Tables come with PBI-002 (Appendix C of the proposal); until then nothing exists.

| Table | Module that writes it | Purpose | Row Level Security |
| --- | --- | --- | --- |
| none yet | | | |

Rules: a table is written only by the module that owns it (`ARCHITECTURE.md`, backend table). Every table has Row Level Security on, and every policy has a pgTAP test in `supabase/tests/`. Migrations are forward only.

## Planned (proposal Appendix C)

Diagram: `docs/diagrams/er-diagram.drawio.svg`. Each row moves to the table above in the PR that adds its migration.

| Table | Module that writes it | Purpose | Main fields | Relations |
| --- | --- | --- | --- | --- |
| profiles | accounts | one row per person, role and status | user_id, name, email, role (member, ebmb, admin), status (active, deactivated), semester, consent_at, created_at | 1 to 1 with `auth.users` |
| upload_batches | documents | one row per upload | id, uploaded_by, done_count, failed_count, created_at | many per profile |
| documents | documents | one row per file | id, name, file_type, storage_path, access_level (member, ebmb), owner, status (uploading, processing, ready, failed), error, content_hash, batch_id, created_at | many per batch and per owner |
| chunks | documents (written by the ingest worker) | searchable pieces of a document | id, document_id, chunk_index, page, section, sheet, row, text, embedding vector(768), fts tsvector, embedding_model, pipeline_version | many per document, deleted with it |
| conversations | chat | one chat thread | id, user_id, title, created_at, updated_at | many per profile |
| messages | chat | questions and answers | id, conversation_id, role (user, assistant), content, citations (chunk ids), rating, created_at | many per conversation |
| audit_logs | audit | who did what, to what, when | id, actor, action, target, metadata, time | many per profile |
