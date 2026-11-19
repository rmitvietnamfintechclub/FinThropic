/**
 * Architecture rules from docs/ARCHITECTURE.md and Appendix G, enforced in CI by `bun run arch`.
 * A violation is an error with the rule name and the two files. Fix the import; do not edit the rule
 * without an ADR approved by the Project Leader.
 */
const CLIENT_DIRS = "^src/(components|common|hooks|stores|utils|config)/";
const SHARED_CONTRACTS_FORBID = "^src/(server|components|common|hooks|stores|utils|config|app)/";
const MODULE = "^src/server/modules/([^/]+)/";

/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "no-server-code-in-client-code",
      comment: "Client folders never import src/server (it must never ship to the browser).",
      severity: "error",
      from: { path: CLIENT_DIRS },
      to: { path: "^src/server/" },
    },
    {
      name: "package-isolation",
      comment:
        "A component package (components/<group>/<Package>) never imports another package (Appendix G2).",
      severity: "error",
      from: { path: "^src/components/([^/]+)/([^/]+)/" },
      to: { path: "^src/components/", pathNot: "^src/components/$1/$2/" },
    },
    {
      name: "contracts-pure",
      comment:
        "src/contracts holds the wire shapes used by both sides. It imports only zod and other contracts.",
      severity: "error",
      from: { path: "^src/contracts/" },
      to: { path: SHARED_CONTRACTS_FORBID },
    },
    {
      name: "module-door-from-other-module",
      comment: "A module reaches another module only through its index.ts (Appendix G3).",
      severity: "error",
      from: { path: MODULE },
      to: { path: "^src/server/modules/(?!$1/)[^/]+/(?!index\\.ts$)" },
    },
    {
      name: "module-door-from-outside",
      comment: "Routes, pages and shared code reach a module only through its index.ts.",
      severity: "error",
      from: { path: "^src/", pathNot: "^src/server/modules/" },
      to: { path: "^src/server/modules/[^/]+/(?!index\\.ts$)" },
    },
    {
      name: "layers-call-down-only",
      comment: "Route, controller, service, repository. A lower layer never imports a higher one.",
      severity: "error",
      from: { path: "/repositories/" },
      to: { path: "/(services|controllers)/" },
    },
    {
      name: "service-not-above-controller",
      severity: "error",
      from: { path: "/services/" },
      to: { path: "/controllers/" },
    },
    {
      name: "never-skip-a-layer",
      comment: "A controller calls a service, never a repository.",
      severity: "error",
      from: { path: "/controllers/" },
      to: { path: "/repositories/" },
    },
    {
      name: "plain-layers-stay-plain",
      comment:
        "Models, DTOs, validators, interfaces and constants hold no behaviour that calls other layers.",
      severity: "error",
      from: { path: "/(models|dtos|validators|interfaces|constants)/" },
      to: { path: "/(services|repositories|controllers)/" },
    },
    {
      name: "database-client-only-in-repositories",
      comment: "SQL and the Supabase client live in repositories and src/server/config only.",
      severity: "error",
      from: { pathNot: "^src/server/(config/|modules/[^/]+/repositories/)" },
      to: { path: "node_modules/@supabase/supabase-js" },
    },
    {
      name: "provider-sdk-only-in-adapters",
      comment:
        "No direct call to the AI SDK or any provider: use the ports in src/server/ai/ports.ts (ADR 0014).",
      severity: "error",
      from: { pathNot: "^src/server/ai/adapters/" },
      to: { path: "node_modules/(ai|@ai-sdk|@google)/" },
    },
    {
      name: "no-circular",
      severity: "error",
      from: {},
      to: { circular: true },
    },
    {
      name: "not-to-unresolvable",
      severity: "error",
      from: {},
      to: { couldNotResolve: true },
    },
    {
      name: "not-to-test-code",
      comment: "Production code never imports test files.",
      severity: "error",
      from: { pathNot: "\\.test\\.(ts|tsx)$" },
      to: { path: "\\.test\\.(ts|tsx)$" },
    },
  ],
  options: {
    tsConfig: { fileName: "tsconfig.json" },
    doNotFollow: { path: "node_modules" },
    exclude: { path: "\\.next/" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default"],
    },
    reporterOptions: { text: { highlightFocused: true } },
  },
};
