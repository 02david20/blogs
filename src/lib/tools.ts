/**
 * Single source of truth for the /tools/ section. Every tool page and the
 * /tools/ index read from here, so links between tools can't drift out of
 * sync the way hand-written cross-links eventually do.
 */
import { url } from "./url";

export interface ToolMeta {
  slug: string;
  title: string;
  tagline: string;
  description: string;
}

export const TOOLS: ToolMeta[] = [
  {
    slug: "url-encoder",
    title: "URL Encoder / Decoder",
    tagline: "Percent-encode or decode a string for safe use in a URL.",
    description:
      "Encode or decode URLs and URL components in your browser — handles Unicode correctly and reports invalid encoded input clearly.",
  },
  {
    slug: "json-formatter",
    title: "JSON Formatter & Validator",
    tagline: "Pretty-print, minify, and validate JSON with error locations.",
    description:
      "Format, minify, and validate JSON directly in your browser, with syntax error reporting and approximate error locations.",
  },
  {
    slug: "jwt-decoder",
    title: "JWT Decoder",
    tagline: "Decode a JWT's header and payload — no signature verification.",
    description:
      "Decode a JSON Web Token's header and payload locally in your browser and inspect its claims. Does not verify the signature.",
  },
  {
    slug: "base64",
    title: "Base64 Encoder / Decoder",
    tagline: "Convert text or files to and from Base64, including URL-safe.",
    description:
      "Encode or decode Base64 text and files in your browser, with UTF-8 and URL-safe Base64 support.",
  },
  {
    slug: "unix-timestamp",
    title: "Unix Timestamp Converter",
    tagline: "Convert between Unix time and human-readable dates.",
    description:
      "Convert Unix timestamps to human-readable dates and back, in seconds or milliseconds, UTC or local time.",
  },
  {
    slug: "uuid-generator",
    title: "UUID Generator",
    tagline: "Generate cryptographically random UUID v4 values.",
    description:
      "Generate one or many UUID v4 values in your browser using the Web Crypto API, ready to copy or download.",
  },
  {
    slug: "hash-generator",
    title: "Hash Generator",
    tagline: "SHA-256, SHA-384, SHA-512 (and legacy SHA-1) via Web Crypto.",
    description:
      "Compute SHA-1, SHA-256, SHA-384, and SHA-512 hashes of text or files locally, using the browser's Web Crypto API.",
  },
  {
    slug: "regex-tester",
    title: "Regex Tester",
    tagline: "Test a JavaScript regular expression against sample text.",
    description:
      "Test JavaScript regular expressions against sample text with match highlighting, capture groups, and flag support.",
  },
  {
    slug: "json-to-typescript",
    title: "JSON → TypeScript Converter",
    tagline: "Turn a JSON sample into TypeScript interfaces or types.",
    description:
      "Convert a JSON sample into TypeScript interfaces or type aliases, handling nested objects, arrays, and nullable fields.",
  },
  {
    slug: "cron-generator",
    title: "Cron Expression Generator",
    tagline: "Build a standard 5-field cron expression interactively.",
    description:
      "Build a standard 5-field cron expression with interactive fields, common presets, and a plain-language explanation.",
  },
  {
    slug: "text-diff",
    title: "Text Diff Checker",
    tagline: "Compare two blocks of text line by line.",
    description:
      "Compare two blocks of text in your browser and see added, removed, and changed lines highlighted side by side.",
  },
  {
    slug: "url-query-parser",
    title: "URL Query String Parser",
    tagline: "Parse a URL's query string into readable key/value pairs.",
    description:
      "Parse a URL or query string into readable key/value pairs, or build a query string from pairs, entirely in your browser.",
  },
  {
    slug: "remove-duplicate-lines",
    title: "Remove Duplicate Lines",
    tagline: "Dedupe the lines in a block of text.",
    description:
      "Remove duplicate lines from a block of text in your browser, with case-sensitivity, trimming, and sorting options.",
  },
];

export const toolBySlug = (slug: string): ToolMeta | undefined =>
  TOOLS.find((tool) => tool.slug === slug);

export const toolUrl = (slug: string): string => url(`/tools/${slug}`);

export const relatedTools = (slugs: string[]): ToolMeta[] =>
  slugs.map((slug) => toolBySlug(slug)).filter((tool): tool is ToolMeta => Boolean(tool));
