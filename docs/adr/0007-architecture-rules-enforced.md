# 0007 Architecture rules are enforced by tools

Status: accepted
Date: 2026-11-15   Decided by: Project Leader

## Context
Rules that live only in a document are broken by the third pull request. Appendix G has strict rules (layers call down, one door per module,
no provider SDK outside adapters).

## Options
`eslint-plugin-boundaries` (maintained, v7.4.3 released 2026-11-12, but needs resolver settings for the `@/` alias that we did not verify), `eslint no-restricted-imports`
(cannot express "same module" rules), `dependency-cruiser` (resolves real paths, rules read as regular expressions with capture groups).

## Decision
`dependency-cruiser`, config in `web/.dependency-cruiser.cjs`, run by `bun run arch` locally and in CI. Each rule was checked with a deliberately broken import
(14 rules, each failed on purpose before merge, including `contracts-pure` and `package-isolation` for packages in the same group and in different groups from ADR 0011). Plus two ESLint rules: only the config layer reads `process.env`, and `dangerouslySetInnerHTML` is forbidden.
Needs Node 22 or newer (the tool requires `^22 || ^24 || >=26`), so the whole repo pins Node 22 in `.node-version`.

## Consequences
A violation is a CI error with the rule name and both files. Changing a rule needs an ADR approved by the Project Leader.
When you add a new top-level folder under `web/src/`, add it to the rules in the same PR.
