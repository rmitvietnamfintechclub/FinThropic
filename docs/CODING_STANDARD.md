# Coding standard

## Layers
Layers call down only; never skip a layer. SQL in repositories, HTTP in routes and controllers, business rules in services.
Validate every input; shape every output with a DTO. Other modules only through the interface.
The frontend trusts nothing that arrives: a TypeScript type is erased at build time and checks no data. Every frontend service parses its response with the schema from `src/contracts/` (`getJson(path, schema)`); unknown fields are dropped and a wrong type becomes an error state. Render named fields only: never spread a response into props, never use `dangerouslySetInnerHTML`.

## Shared UI
Reusable UI lives in `src/common/ui/` (shadcn/ui, ADR 0006): no business logic, no data fetching. Add a component with `bun x shadcn@latest add <name>` from `web/`. A feature that needs a variant wraps the shared component in its own package; do not edit `common/ui` for one screen.

## Rules the tools enforce
`bun run arch` fails on: client code importing `src/server`; one component package (`components/<group>/<Package>`) importing another; `src/contracts` importing anything except zod and other contracts; a module reaching into another module except through its `index.ts`; a lower layer importing a higher one; a controller skipping the service; the Supabase client outside repositories and `server/config`; a provider SDK outside `server/ai/adapters`; a model, DTO, validator, interface or constant importing a service, repository or controller; circular imports; unresolvable imports; production code importing a test file. ESLint fails on `process.env` outside `server/config` and on `dangerouslySetInnerHTML`.
Do not work around a rule. If it is wrong, open an ADR.

## API conventions
- **Route:** `web/src/app/api/<resource>/route.ts`, plural nouns (`/api/documents`, `/api/users/:id`), actions only where a noun does not fit (`/api/documents/:id/retry`). The route file only wraps and calls the module's controller.
- **Wrappers:** every route uses `withErrorHandler`, plus `withAuth`, `withRole` and `withRateLimit` as needed. The server decides who the caller is and what level they have; never trust a role or level sent by the browser.
- **Input:** validated with zod in the module's validator before the service runs. Unknown or wrong input is a 400.
- **Output:** shaped by the module's DTO, typed from the contract in `src/contracts/<module>.dto.ts`. Never return a database row as it is.
- **Errors:** JSON `{ "error": "<snake_case_code>", "requestId": "..." }`, never a stack trace. Codes used: 400 `invalid_request`, 401 not signed in, 403 not allowed (for example `consent_required`), 404 not found, 409 conflict (for example a document that cannot be retried), 429 rate limited, 500 `internal_error`, 501 `not_implemented`, 503 a dependency is down.
- **Request id:** every response carries `x-request-id`; log it with every line about that request.
- **Tests:** each endpoint has a permission test (who may call it, who may not) and a contract test on the frontend service.
- **Docs:** add or change the row in `docs/ENDPOINTS.md` in the same PR.

## Logging and errors
Use `logger` (`server/utils/logger.ts`), never `console` directly (the logger is the only place allowed to write to stdout). Log ids and counts, never secrets, tokens, member questions or document text.
Routes are wrapped in `withErrorHandler`: it adds `x-request-id` and returns clean JSON errors.

## Naming
- Files: components `PascalCase.tsx`, everything else `camelCase.ts` or `kebab-case.md`. Python: `snake_case.py`.
- One feature = one component package (frontend) or one module (backend).
- Constants in `constants/`, not inline numbers.

## Commits and PRs (Conventional Commits 1.0.0)
`type(scope): short description in the present tense`
Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`, `perf`. Scope = area, such as `web`, `ingest`, `db`.
Breaking change: `feat(api)!: ...`. One logical change per commit. The PR title follows the same format
(squash merge makes it the commit on main).

## Branches
Trunk-based (see `CONTRIBUTING.md`): `feat/<issue-number>-short-name`, `fix/...`, `docs/...`, created from the latest `main` and merged within 1 to 2 days. No direct push to `main`, no branches per role.

## Tests
Everyone writes tests for their own part. A permission test for every endpoint. A bug fix starts with a failing test.

## Lint
Medium strict (ADR 0004). Fix warnings in the files you touch.

## Documents
A new route goes in `docs/ENDPOINTS.md`, a new table in `docs/MODELS.md`, a new pattern in an ADR (`docs/adr/0000-template.md`), all in the same PR.

## Done means
Follows this standard, CI green, tests pass, approved by your role pair (1 approval, required by the ruleset on `main`), docs updated if behaviour changed, and a screen matches its approved wireframe (PBI-047) at 360 px and 1280 px, with any change from it agreed in the PR. Production is deployed from `main` by hand (`docs/OPERATIONS.md`).

The accounts KhanhQNguyn and rmitvietnamfintechclub may bypass the approval rule.
