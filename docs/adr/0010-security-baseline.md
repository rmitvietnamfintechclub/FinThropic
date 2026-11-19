# 0010 Security baseline of the repository

Status: accepted
Date: 2026-11-15   Decided by: Project Leader

## Decision
- **Fail closed:** `withAuth`, `withRole` and `withRateLimit` return 501 until implemented. A stub must never look like protection.
- **Headers:** `next.config.ts` sets `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy` and hides `X-Powered-By`.
  The Content Security Policy needs a nonce and is built in PBI-011 (Sprint 2) using the Next.js CSP guide.
- **Secrets:** gitleaks scans every PR; `.env*` is ignored; `fixtures/private/` is ignored; the secret key is used only by the admin client and the worker (ADR 0005).
- **CI:** read-only token by default, actions pinned to full commit SHAs and kept current by Dependabot, CodeQL code scanning (runs on the public repository, ADR 0013).
- **Database:** Row Level Security tests with pgTAP in CI (`supabase test db`) once `supabase/config.toml` exists.
- **Environments:** Vercel preview deployments use a separate Supabase project and separate keys from production. A preview must never hold the production secret key.

## Consequences
`supabase test db` only starts working once `supabase init` has run (PBI-002); the CI job is written now so it switches on by itself.
