import { build } from "esbuild";

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "iife",
  target: ["chrome110", "firefox115", "safari16"],
  outfile: "dist/canvas-coach.js",
  minify: process.env.NODE_ENV === "production",
  legalComments: "none",
  banner: { js: "/* Canvas Coach widget – https://github.com/miiku87/canvas-coach */" },
});
console.log("built widget/dist/canvas-coach.js");
