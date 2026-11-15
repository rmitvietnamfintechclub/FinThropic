# Security policy

## Reporting a vulnerability
Do not open an issue. Message the Project Leader or the Head of Technology of the RMIT Vietnam FinTech Club directly
(GitHub's private reporting is not available on this private repository, ADR 0012). Say what you
found, how to reproduce it, and what it could expose. You will get an answer within 5 working days.

## What counts
Anything that lets a person see a document, answer, citation or account they should not (a Member reading EBMB content is the
most serious case), run code in another person's browser, or read or spend our secrets (database secret key, AI API key).

## If a secret leaks
1. Rotate it at once (Supabase, Google AI Studio, Vercel). Deleting the commit is not enough: it stays in history and caches.
2. Tell the Project Leader.
3. Write what happened and what was changed in a short note in `docs/`.

## Supported versions
Only the deployed `main` branch.
