# 0001 Stack

Status: accepted
Date: 2026-11-15   Decided by: Project Leader and Head of Technology (approved proposal, 08/11/2026)

## Context
A student team of seven builds a chatbot that answers from the club's own documents for about 50 users. The budget is USD 30 for the AI API and free tiers for everything else. Permissions and search must work on the same records.

## Options
1. One Next.js app (frontend and backend), Supabase, a Python indexing job: one deploy, one database; Python only where its document libraries are needed.
2. Separate frontend and backend services: two deploys, two auth setups, more work for no gain at this size.
3. A hosted RAG product: fast to start, but no control over permissions, citations or cost.

## Decision
Option 1. One Next.js app (TypeScript, Tailwind) on Vercel; Supabase (PostgreSQL with pgvector, Auth, Storage, Row Level Security); a Python indexing job run by GitHub Actions; Gemini behind our own gateway (ports and adapters, ADR in PBI-004).

## Consequences
One deploy and one database; Row Level Security protects documents and search with the same rules. The AI provider can change in one folder. A Python worker means two languages in CI.
