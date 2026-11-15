// Fails when the name of a secret variable, or a listed secret value, appears in build output that browsers receive.
// Run after `bun run build`. In CI, SECRET_CHECK_VALUES holds fake values (comma separated) so a leaked value is found too.
// Scanned: everything under .next/static (client JavaScript and CSS), and the prerendered pages and React Server
// Component payloads under .next/server/app (.html, .rsc, .body). Server-only code is not scanned: it may name the
// variables, because only the server reads them.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";

const NAMES = ["SUPABASE_SECRET_KEY", "GEMINI_API_KEY"];
const VALUES = (process.env.SECRET_CHECK_VALUES ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const NEEDLES = [...NAMES, ...VALUES];
const ROOTS: { dir: string; extensions?: string[] }[] = [
  { dir: ".next/static" },
  { dir: ".next/server/app", extensions: [".html", ".rsc", ".body"] },
];

function* files(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* files(path);
    else yield path;
  }
}

if (!existsSync(".next/static")) {
  console.error("check:bundle: no build output found. Run `bun run build` first.");
  process.exit(1);
}

let scanned = 0;
const hits: string[] = [];
for (const { dir, extensions } of ROOTS) {
  if (!existsSync(dir)) continue;
  for (const file of files(dir)) {
    if (extensions && !extensions.includes(extname(file))) continue;
    scanned += 1;
    const text = readFileSync(file, "utf8");
    for (const needle of NEEDLES) {
      // Report the variable name, never the value itself.
      if (text.includes(needle))
        hits.push(`${file}: contains ${NAMES.includes(needle) ? needle : "a secret value"}`);
    }
  }
}

if (hits.length > 0) {
  console.error(`check:bundle FAILED, a secret reaches the browser:\n${hits.join("\n")}`);
  process.exit(1);
}
console.warn(
  `check:bundle ok: ${scanned} files, ${NAMES.length} names and ${VALUES.length} values checked`,
);
