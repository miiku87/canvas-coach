// Assembles a loadable extension folder in extension/build/.
// Canvas addresses in server/.env (ALLOWED_ORIGINS) are added to the
// manifest, so custom Canvas domains work without editing it by hand.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "build");
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const file of ["bridge.js", "options.html", "options.js"]) {
  cpSync(path.join(here, file), path.join(out, file));
}
cpSync(path.join(here, "..", "widget", "dist", "canvas-coach.js"), path.join(out, "canvas-coach.js"));

const envFile = path.join(here, "..", "server", ".env");
const origins = (
  existsSync(envFile) ? readFileSync(envFile, "utf8").match(/^ALLOWED_ORIGINS=(.*)$/m)?.[1] ?? "" : ""
)
  .split(",")
  .map((s) => s.trim().replace(/\/$/, ""))
  .filter((s) => /^https?:\/\/[^/*]+$/.test(s));

const manifest = JSON.parse(readFileSync(path.join(here, "manifest.json"), "utf8"));
for (const script of manifest.content_scripts) {
  script.matches = [...new Set([...script.matches, ...origins.map((o) => `${o}/*`)])];
}
writeFileSync(path.join(out, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Extension ready: ${out}`);
console.log(`Canvas addresses: ${manifest.content_scripts[0].matches.join(", ")}`);
