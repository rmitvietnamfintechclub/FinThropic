# Endpoints

One row per route. Update it in the same PR that changes a route.

| Method and path | Who | Input | Output | Module |
| --- | --- | --- | --- | --- |
| GET `/api/health` | anyone | none | `{status, database: "skipped", checkedAt}` | health |
| GET `/api/health?deep=1` | anyone | `deep` is `0` or `1`; anything else gives 400 `invalid_request` | `{status, database: "ok"/"fail", checkedAt}`, 503 when the database does not answer | health |

Every route needs a permission test (who may call it, who may not).
