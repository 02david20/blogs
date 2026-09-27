/**
 * Generates dist/sw.js from scripts/sw-template.js.
 *
 * Walks the real build output so the precache list can never drift from the
 * shipped filenames — the failure mode of the previous hand-maintained list,
 * which referenced an image that no longer existed and therefore silently
 * cached nothing at all.
 */
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const DIST = "dist";
const BASE = "/blogs";

/** Public paths that exist only to bounce legacy URLs; never precache them. */
const REDIRECT_DIRS = [/^\d{4}[\\/]/, /^archive[\\/]/, /^system designs[\\/]/];

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });

const files = walk(DIST).map((f) => relative(DIST, f));

const isRedirect = (rel) => REDIRECT_DIRS.some((re) => re.test(rel));

const toUrl = (rel) => {
  const posix = rel.split(sep).join("/");
  if (posix === "index.html") return `${BASE}/`;
  if (posix.endsWith("/index.html")) return `${BASE}/${posix.slice(0, -"index.html".length)}`;
  return `${BASE}/${posix}`;
};

const htmlFiles = files.filter((rel) => rel.endsWith(".html") && !isRedirect(rel));

/**
 * Only the JS a page actually references. Mermaid alone splits into ~119
 * dynamically-imported chunks; precaching those would make the install step
 * enormous for two diagrams. They are runtime-cached on first use instead.
 */
const referenced = new Set();
for (const rel of htmlFiles) {
  const html = readFileSync(join(DIST, rel), "utf8");
  for (const match of html.matchAll(/["'(](\/blogs\/_astro\/[^"')\s]+)["')]/g)) {
    referenced.add(match[1]);
  }
}

const precache = [
  ...new Set([
    ...htmlFiles.map(toUrl),
    ...referenced,
    // Stylesheets and latin font subsets are small and needed on every page.
    ...files.filter((rel) => /\.(css|woff2|webmanifest)$/.test(rel)).map(toUrl),
  ]),
].sort();

const hash = createHash("sha256");
for (const rel of files.sort()) {
  hash.update(rel);
  hash.update(String(statSync(join(DIST, rel)).size));
}
const version = hash.digest("hex").slice(0, 12);

/* Anchored on the assignments so a mention of a token in a comment cannot
   swallow the substitution. */
const sw = readFileSync("scripts/sw-template.js", "utf8")
  .replace("const PRECACHE_URLS = __PRECACHE__;", `const PRECACHE_URLS = ${JSON.stringify(precache, null, 2)};`)
  .replace('const VERSION = "__VERSION__";', `const VERSION = ${JSON.stringify(version)};`)
  .replace('const OFFLINE_URL = "__OFFLINE__";', `const OFFLINE_URL = ${JSON.stringify(`${BASE}/offline/`)};`);

for (const token of ["__PRECACHE__", "__VERSION__", "__OFFLINE__"]) {
  if (sw.includes(token)) {
    throw new Error(`[sw] placeholder ${token} was not substituted`);
  }
}

writeFileSync(join(DIST, "sw.js"), sw);
console.log(`[sw] dist/sw.js — version ${version}, ${precache.length} precached entries`);
