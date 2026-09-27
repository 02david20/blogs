/**
 * Single place for site identity. Everything user-facing reads from here.
 * NOTE: `name`, `tagline` and `intro` are drafted from the old sidebar
 * description and About page — worth rewriting in your own voice.
 */
export const SITE = {
  name: "David Huynh",
  title: "David Huynh",
  tagline: "Backend & infrastructure engineering",
  description:
    "Notes on backend systems, infrastructure and reliability — Kubernetes, .NET, distributed systems and the occasional debugging war story.",
  intro:
    "I'm a software engineer who works close to the system, where infrastructure, reliability and performance meet. I write about the things I hit while building and running containerised platforms — and what they taught me.",
  locale: "en",
  author: "David Huynh",
  github: "02david20",
  linkedin: "vinh-huynh-3617511a7",
} as const;

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/blog/", label: "Blog" },
  { href: "/topics/", label: "Topics" },
  { href: "/tools/", label: "Tools" },
  { href: "/about/", label: "About" },
] as const;
