# 0006 shadcn/ui for shared UI

Status: accepted
Date: 2026-11-15   Decided by: Project Leader

## Context
The proposal asks for a small, consistent design system on Tailwind. Every folder directly under `src/components/` is a feature group, and packages may not import each other (ADR 0007, ADR 0011), so shared UI parts need a home outside `src/components/`.

## Options
1. shadcn/ui: the CLI copies component source into the repo; we own and can change every file. Runtime libraries are small (`@base-ui/react` primitives, `class-variance-authority`, `cn`, `lucide-react`).
2. A packaged component library (MUI, Chakra): versioned upgrades, but styling fights Tailwind and the bundle is larger.
3. Hand-written components: full control, but accessibility (focus, keyboard, ARIA) has to be rebuilt and tested by us.

## Decision
Option 1, preset `base-nova` (Base UI primitives, neutral palette), chosen by `shadcn init -d`.
- Components live in `web/src/common/ui/` and the helper in `web/src/common/lib/utils.ts`, set through the `components.json` aliases (`@/common`, `@/common/ui`, `@/common/lib`, `@/common/lib/utils`, `@/hooks`). Nothing goes in `src/components/ui/` or `src/lib/`.
- Add a component with `bun x shadcn@latest add <name>` from `web/`. Generated files are kept as the CLI writes them (they import `cn` from the `cn` package) so later updates diff cleanly.
- The `shadcn` package is a dev dependency: it is only needed at build time for `@import "shadcn/tailwind.css"`.
- componentry.dev and other registries install through the same CLI. Check the licence of every third-party component before adding it.

## Consequences
- Pages and packages import UI from `@/common/ui/...`. A feature that needs a variant wraps the shared component inside its own package instead of editing `common/ui` for one screen.
- Theme tokens are CSS variables in `src/app/globals.css`. Dark mode now follows a `.dark` class, not the system setting; the app is light only until a theme decision is made (open point in PBI-046.1, revisit with PBI-043).
- No animated components on the chat screens. Any animated block is judged on Lighthouse performance and accessibility at 360 px, bundle size and `prefers-reduced-motion` support before it is added.
