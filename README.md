# David Huynh — blog

Personal blog about backend systems, infrastructure and reliability.
Live at <https://engineering.sentinelnodes.cc/>.

Built with [Astro](https://astro.build). Previously a Jekyll site on the Hux Blog theme;
see `git log` before the `redesign/astro` branch for that history.

## Getting started

```bash
npm install
npm run dev      # http://localhost:4321/
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Static build into `dist/`, then generates `dist/sw.js` |
| `npm run preview` | Serve the built output as it will be deployed |
| `npm run check` | Type-check `.astro`, `.ts` and content schemas |

## Writing a post

Add a `.md` (or `.mdx`) file to `src/content/blog/`. The filename becomes the URL:
`src/content/blog/my-post.md` → `/blog/my-post/`.

```yaml
---
title: "Post title"
description: "One sentence. Used on the post list, in search results and on social cards."
pubDate: 2026-03-07
tags: ["Kubernetes", ".NET"]
heroImage: "../../assets/posts/my-post/hero.jpg" # optional, used as the social card
---
```

The front matter is validated at build time by `src/content.config.ts`, so a typo or a
missing `description` fails the build rather than shipping silently.

Some notes on authoring:

- **Images** go in `src/assets/posts/<slug>/` and are referenced relatively
  (`![alt](../../assets/posts/my-post/thing.png)`). Astro optimizes them, emits `srcset`
  and sets `width`/`height` so there is no layout shift. Images in `public/` are served
  as-is and are *not* optimized — prefer `src/assets`.
- **Captions or a constrained width** need MDX. Rename the file to `.mdx` and use
  `<Figure src={img} alt="…" caption="…" width={460} />`.
- **Diagrams**: a ` ```mermaid ` fence is converted to a diagram at build time, and
  Mermaid is loaded lazily only on pages that contain one.
- **Reading time** is computed from the body; nothing to set.
- **Drafts**: `draft: true` hides a post from production builds but keeps it visible in
  `npm run dev`.

## Layout of the project

```
src/
  content/blog/     posts
  content.config.ts front-matter schema
  assets/           images processed by astro:assets
  components/       UI pieces
  layouts/          BaseLayout (shell + SEO), PostLayout (article)
  lib/              site metadata, URL helpers, post queries, remark/rehype plugins
  pages/            routes
  styles/           fonts, design tokens, global, prose
public/             served verbatim (icons, manifest, legacy redirect stubs)
scripts/            service-worker template and generator
```

### Design system

All colour, type and spacing decisions live in `src/styles/tokens.css` as CSS custom
properties, with semantic tokens (`--bg`, `--text`, `--accent`, …) redefined for dark
mode. Components reference only the semantic tokens, so retheming is a one-file change.
Every foreground/background pair in use meets WCAG AA.

Dark mode follows the OS by default; the header toggle overrides it and persists to
`localStorage`. A tiny inline script in `<head>` applies the stored choice before first
paint so there is no flash.

## Deployment

Pushing to `master` runs `.github/workflows/deploy.yml`, which builds and publishes to
GitHub Pages. `master` is the source branch; the legacy `gh-pages` branch still holds the
old Jekyll site and is no longer used once Pages is served from Actions.

> **One-time setup:** in repo *Settings → Pages*, set **Source** to **GitHub Actions**.
> Until that is done the workflow will succeed but the live site will keep serving the
> old Jekyll build.

### URLs

The site is served from the root of its custom domain. `public/CNAME` ships the
domain in the build artifact so an Actions deploy cannot drop it.

Posts moved from Jekyll's dated permalinks to `/blog/<slug>/`. The old site also sat
under a `/blogs` base on `02david20.github.io`, so both forms of every legacy URL
redirect:

| Old | New |
| --- | --- |
| `/2025/12/28/dotnet-dumps/` and `/blogs/2025/12/28/dotnet-dumps/` | `/blog/dotnet-dumps/` |
| `/2024/05/21/hello-world/` and `/blogs/...` | `/blog/hello-world/` |
| `/2026/03/07/tdd-in-llm-era/` and `/blogs/...` | `/blog/tdd-in-llm-era/` |
| `/system%20designs/design%20patterns/2026/03/07/circuit-breaker-pattern/` | `/blog/circuit-breaker-pattern/` |
| `/archive/` | `/blog/` |
| `/blogs/`, `/blogs/about/`, `/blogs/topics/` | `/`, `/about/`, `/topics/` |

Most come from `redirects` in `astro.config.mjs`. The two space-containing ones cannot
be expressed as routes, so they ship as stubs in `public/`. `/feed.xml` is unchanged.

### Service worker

`scripts/build-sw.mjs` generates `dist/sw.js` from `scripts/sw-template.js`, walking the
real build output so the precache list can never drift from the shipped filenames. Pages
are network-first (a deploy is picked up on the next visit); hashed assets are
cache-first. On activate it deletes the caches written by the previous Jekyll service
worker, which would otherwise keep serving the old site to returning visitors.
