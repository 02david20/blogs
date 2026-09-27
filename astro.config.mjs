// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";
import expressiveCode from "astro-expressive-code";
import { rehypeHeadingIds } from "@astrojs/markdown-remark";

import { remarkMermaid } from "./src/lib/remark-mermaid.mjs";
import { rehypeHeadingAnchors } from "./src/lib/rehype-heading-anchors.mjs";

export default defineConfig({
  site: "https://engineering.sentinelnodes.cc",
  trailingSlash: "always",

  integrations: [
    // Must precede mdx() so MDX code blocks get the same treatment.
    expressiveCode({
      themes: ["github-light", "github-dark"],
      // Follow our own theme attribute rather than EC's per-theme-name default.
      // `useDarkModeMediaQuery` (on by default) additionally emits a
      // prefers-color-scheme block, so an untoggled visitor still matches their OS.
      themeCssSelector: (theme) => `[data-theme="${theme.type}"]`,
      styleOverrides: {
        codeFontFamily: "var(--font-mono)",
        uiFontFamily: "var(--font-sans)",
        codeFontSize: "0.875rem",
        codeLineHeight: "1.6",
        borderRadius: "0.5rem",
        borderColor: "var(--border)",
        codePaddingBlock: "1rem",
        codePaddingInline: "1.15rem",
        frames: {
          shadowColor: "transparent",
          editorTabBarBackground: "var(--bg-subtle)",
          terminalBackground: "var(--code-bg)",
          terminalTitlebarBackground: "var(--bg-subtle)",
        },
      },
      defaultProps: { wrap: false },
    }),
    mdx(),
    sitemap(),
  ],

  markdown: {
    remarkPlugins: [remarkMermaid],
    rehypePlugins: [
      // Astro assigns heading ids after user plugins, so the id pass has to be
      // requested explicitly here — the anchor plugin links to those ids.
      rehypeHeadingIds,
      rehypeHeadingAnchors,
    ],
  },

  image: {
    responsiveStyles: true,
  },

  // Legacy Jekyll permalinks. Verified against the live feed before migration.
  // The circuit-breaker post's old URL contains literal spaces, so it cannot be
  // expressed as a route pattern — it ships as a stub in public/ instead.
  // Legacy Jekyll permalinks, verified against the published feed before the
  // migration. The site previously lived under a `/blogs` base on
  // 02david20.github.io, so both the bare and `/blogs`-prefixed forms are
  // covered. The circuit-breaker post's old URL contains literal spaces and
  // cannot be expressed as a route — it ships as a stub in public/.
  redirects: {
    "/2024/05/21/hello-world/": "/blog/hello-world/",
    "/2025/12/28/dotnet-dumps/": "/blog/dotnet-dumps/",
    "/2026/03/07/tdd-in-llm-era/": "/blog/tdd-in-llm-era/",
    "/archive/": "/blog/",

    "/blogs/": "/",
    "/blogs/archive/": "/blog/",
    "/blogs/about/": "/about/",
    "/blogs/topics/": "/topics/",
    "/blogs/2024/05/21/hello-world/": "/blog/hello-world/",
    "/blogs/2025/12/28/dotnet-dumps/": "/blog/dotnet-dumps/",
    "/blogs/2026/03/07/tdd-in-llm-era/": "/blog/tdd-in-llm-era/",
  },
});
