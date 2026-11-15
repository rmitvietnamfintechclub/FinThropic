# Coding standard

## Layers
Layers call down only; never skip a layer. SQL in repositories, HTTP in routes and controllers, business rules in services.
Validate every input; shape every output with a DTO. Other modules only through the interface.
The frontend trusts nothing that arrives: a TypeScript type is erased at build time and checks no data. Every frontend service parses its response with the schema from `src/contracts/` (`getJson(path, schema)`); unknown fields are dropped and a wrong type becomes an error state. Render named fields only: never spread a response into props, never use `dangerouslySetInnerHTML`.

## Rules the tools enforce
`bun run arch` fails on: client code importing `src/server`; one component package (`components/<group>/<Package>`) importing another; `src/contracts` importing anything except zod and other contracts; a module reaching into another module except through its `index.ts`; a lower layer importing a higher one; a controller skipping the service; the Supabase client outside repositories and `server/config`; a provider SDK outside `server/ai/adapters`; a model, DTO, validator, interface or constant importing a service, repository or controller; circular imports; unresolvable imports; production code importing a test file. ESLint fails on `process.env` outside `server/config` and on `dangerouslySetInnerHTML`.
Do not work around a rule. If it is wrong, open an ADR.

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

## Done means
Follows this standard, CI green, tests pass, reviewed by one person, preview deployed, docs updated if behaviour changed.
