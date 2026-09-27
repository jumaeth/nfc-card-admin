// Copies the page builders and everything they import from the panel app
// (../nfc-card-app) into this repo, so both editors stay identical.
//
//   pnpm sync:builders          copy the files over
//   pnpm sync:builders --check  only report drift, exit 1 if any
//
// The panel app is the source of truth. Never edit these files here.
import { cpSync, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const source = resolve(root, process.env.PANEL_APP_DIR ?? "../nfc-card-app");

const SHARED = [
  "src/lib/page-content.ts",
  "src/lib/page-theme.ts",
  "src/lib/i18n.ts",
  "src/lib/utils.ts",
  "src/components/ui.tsx",
  "src/components/localized-input.tsx",
  "src/components/builders",
  // The public page views, so the editor preview is the real page.
  "src/components/public",
];

if (!existsSync(source)) {
  console.error(`Panel app not found at ${source}. Set PANEL_APP_DIR.`);
  process.exit(1);
}

/** A shared path, expanded to the files inside it when it is a directory. */
function files(path) {
  const abs = join(source, path);
  if (!statSync(abs).isDirectory()) return [path];
  return readdirSync(abs).map((name) => `${path}/${name}`);
}

const check = process.argv.includes("--check");
const drifted = [];

for (const path of SHARED.flatMap(files)) {
  const from = join(source, path);
  const to = join(root, path);
  const same = existsSync(to) && readFileSync(from).equals(readFileSync(to));
  if (same) continue;
  drifted.push(path);
  if (!check) cpSync(from, to, { recursive: true });
}

if (drifted.length === 0) {
  console.log("Builders are in sync with the panel app.");
} else if (check) {
  console.error(`Out of sync with the panel app:\n  ${drifted.join("\n  ")}`);
  console.error("Run `pnpm sync:builders` to update.");
  process.exit(1);
} else {
  console.log(`Updated from the panel app:\n  ${drifted.join("\n  ")}`);
}
