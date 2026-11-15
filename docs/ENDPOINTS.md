# Endpoints

One row per route. Update it in the same PR that changes a route.

| Method and path | Who | Input | Output | Module |
| --- | --- | --- | --- | --- |
| GET `/api/health` | anyone | none | `{status, database: "skipped", checkedAt}` | health |
| GET `/api/health?deep=1` | anyone | `deep` is `0` or `1`; anything else gives 400 `invalid_request` | `{status, database: "ok"/"fail", checkedAt}`, 503 when the database does not answer | health |

Every route needs a permission test (who may call it, who may not).

## Planned (proposal Appendix C)

Each row moves to the table above, with its exact input and output, in the PR that builds it.

| Method and path | Who | Module | Flow diagram |
| --- | --- | --- | --- |
| POST `/api/chat` | signed-in, consented users | chat | `sequence-ask-question` |
| GET `/api/conversations`, DELETE `/api/conversations/:id` | signed-in users, own conversations only | chat | `sequence-conversations` |
| GET `/api/citations/:id` | signed-in users, re-checked against their current level | documents | `sequence-open-citation` |
| POST `/api/documents/batches`, GET `/api/documents` | Admin | documents | `sequence-upload-index` |
| PATCH `/api/documents/:id`, DELETE `/api/documents/:id` | Admin | documents | `sequence-delete-reclassify` |
| POST `/api/documents/:id/retry` | Admin | documents | `sequence-retry-document` |
| POST `/api/users`, POST `/api/users/import`, PATCH `/api/users/:id` | Admin | accounts | `sequence-manage-accounts` |
| GET `/api/audit` | Admin | audit | `sequence-audit-log` |

The consent route (PBI-016) is added when it is built.
