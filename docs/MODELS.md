# Models

One row per table. Update it in the same PR that adds or changes a migration. Tables come with PBI-002 (Appendix C of the proposal); until then nothing exists.

| Table | Module that writes it | Purpose | Row Level Security |
| --- | --- | --- | --- |
| none yet | | | |

Rules: a table is written only by the module that owns it (`ARCHITECTURE.md`, backend table). Every table has Row Level Security on, and every policy has a pgTAP test in `supabase/tests/`. Migrations are forward only.
