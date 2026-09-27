import { getCollection, type CollectionEntry } from "astro:content";
import getReadingTime from "reading-time";

export type Post = CollectionEntry<"blog">;

/** Newest first. Drafts are hidden in production builds only. */
export async function getPublishedPosts(): Promise<Post[]> {
  const posts = await getCollection("blog", ({ data }) =>
    import.meta.env.PROD ? data.draft !== true : true,
  );
  return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
}

/**
 * Minutes to read, derived from the raw body so list pages don't have to
 * render every entry. MDX import/export lines are stripped so they don't
 * inflate the count.
 */
export function readingTimeOf(post: Post): number {
  const body = (post.body ?? "").replace(/^\s*(?:import|export)\s.*$/gm, "");
  return Math.max(1, Math.round(getReadingTime(body).minutes));
}

/** Posts sharing the most tags with `post`, newest first as a tie-break. */
export function relatedTo(post: Post, all: Post[], limit = 2): Post[] {
  const tags = new Set(post.data.tags);
  if (tags.size === 0) return [];

  return all
    .filter((candidate) => candidate.id !== post.id)
    .map((candidate) => ({
      candidate,
      shared: candidate.data.tags.filter((tag) => tags.has(tag)).length,
    }))
    .filter(({ shared }) => shared > 0)
    .sort(
      (a, b) =>
        b.shared - a.shared ||
        b.candidate.data.pubDate.valueOf() - a.candidate.data.pubDate.valueOf(),
    )
    .slice(0, limit)
    .map(({ candidate }) => candidate);
}

/** Every tag with its post count, most used first then alphabetical. */
export function tagCounts(posts: Post[]): { tag: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.data.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}
