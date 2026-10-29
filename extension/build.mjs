// Assembles a loadable extension folder in extension/build/.
import { cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.join(here, "build");
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
for (const file of ["manifest.json", "bridge.js", "options.html", "options.js"]) {
  cpSync(path.join(here, file), path.join(out, file));
}
cpSync(path.join(here, "..", "widget", "dist", "canvas-coach.js"), path.join(out, "canvas-coach.js"));
console.log(`Extension ready: ${out}`);
