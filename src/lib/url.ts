/**
 * Single source of truth for base-aware URLs.
 *
 * The site is served from a sub-path (`/blogs`), which the previous Jekyll
 * build handled by hand-prepending `site.baseurl` in 44 places — and got
 * wrong in several of them. Everything internal goes through here instead.
 */
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Base-aware absolute path, always with a trailing slash. */
export function url(path = "/"): string {
  const clean = `/${path}`.replace(/\/+/g, "/");
  const withSlash = clean.endsWith("/") ? clean : `${clean}/`;
  return `${BASE}${withSlash}`;
}

/** Fully-qualified URL, for canonical links, OG tags and the RSS feed. */
export function absoluteUrl(path: string, site: URL | undefined): string {
  return new URL(url(path), site ?? "https://02david20.github.io").href;
}

/** `/blog/<slug>/` for a post id. */
export const postUrl = (id: string) => url(`/blog/${id}`);

/** `/topics/<tag>/` — slugified so tags like "C#" and ".NET" stay URL-safe. */
export const tagSlug = (tag: string) =>
  tag
    .toLowerCase()
    .replace(/\+/g, "-plus")
    .replace(/#/g, "-sharp")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const tagUrl = (tag: string) => url(`/topics/${tagSlug(tag)}`);
