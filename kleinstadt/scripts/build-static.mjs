// Builds a single self-contained HTML file of the UI with the mock simulation running in the browser.
// Usage: node scripts/build-static.mjs  →  dist-static/lindenbach.html
// The page has no server: scripts/static/api.ts answers the /api/sim calls in-page. Real AI needs the Next server.
import { build } from "esbuild";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(root, "dist-static");
await mkdir(out, { recursive: true });

const result = await build({
  absWorkingDir: root,
  entryPoints: [resolve(root, "scripts/static/entry.tsx")],
  bundle: true,
  minify: true,
  write: false,
  format: "iife",
  platform: "browser",
  target: ["es2022"],
  jsx: "automatic",
  tsconfig: resolve(root, "tsconfig.json"),
  alias: { "next/dynamic": resolve(root, "scripts/static/next-dynamic.tsx") },
  define: {
    "process.env": JSON.stringify({ NODE_ENV: "production", MOCK_AI: "true", MAX_AI_CALLS_PER_DAY: "200" }),
  },
  logLevel: "warning",
});

const js = result.outputFiles[0].text.replace(/<\/script/gi, "<\\/script").replace(/<!--/g, "<\\!--");
const css = await readFile(resolve(root, "app/globals.css"), "utf8");
const html = `<title>Kleinstadt Lindenbach</title>
<style>
${css}
/* static build: the page is the whole viewport */
html, body, #root { height: 100%; }
.app { height: 100%; }
</style>
<div id="root"></div>
<script>${js}</script>
`;
const file = resolve(out, "lindenbach.html");
await writeFile(file, html);
console.log(`${file}  ${(html.length / 1024 / 1024).toFixed(2)} MB`);
