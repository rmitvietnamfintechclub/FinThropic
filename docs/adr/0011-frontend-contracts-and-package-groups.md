# 0011 Frontend contracts and package groups

Status: accepted
Date: 2026-11-15   Decided by: Project Leader, after review by Dr Tri (RMIT)

## Context
Dr Tri's review of the architecture: (1) in a TypeScript frontend, define the data types you expect from the backend so unexpected or malicious attributes are not carried; (2) organise the frontend packages into groups, for example one group for everything about accounts.
TypeScript types are erased at build time, so `getJson<T>()` with a cast checks nothing at runtime. The backend already validates input (zod) and shapes output with DTOs; the frontend side of the same wire was unchecked.

## Options
1. A `dtos/` folder inside each package with its own schema: the shape is written twice (backend and frontend) and can drift.
2. One shared `src/contracts/<module>.dto.ts` with a zod schema per response, used by the backend DTO (as a type) and by the frontend service (to parse). Possible because both sides are TypeScript in one app.
3. A separate workspace package for contracts: more tooling, no gain with one TypeScript consumer.

## Decision
Option 2. `getJson(path, schema)` parses every response; unknown fields are dropped, a wrong type throws `ContractError` and the screen shows the service-error state. `contracts/` imports only zod and other contracts (rule `contracts-pure`). ESLint forbids `dangerouslySetInnerHTML`.
Frontend packages live in groups named like the backend modules: `components/chat/`, `documents/`, `accounts/`, `auth/`, `audit/` (and `health/` for the example). `package-isolation` now means `components/<group>/<Package>`: a package never imports another package, in any group.

## Consequences
Each endpoint gets one contract file agreed by its backend and frontend owners before either side is coded (PBI-004.5 and PBI-005.2 are the first). A response that does not match its contract is an error, not silently accepted data. Paths in sub-issues changed from `components/<Package>` to `components/<group>/<Package>`.
