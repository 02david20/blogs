import rss from "@astrojs/rss";
import type { APIRoute } from "astro";

import { SITE } from "../lib/site";
import { getPublishedPosts } from "../lib/posts";
import { url } from "../lib/url";

/** Kept at /blogs/feed.xml — the same URL the Jekyll site published. */
export const GET: APIRoute = async (context) => {
  const posts = await getPublishedPosts();

  return rss({
    title: SITE.title,
    description: SITE.description,
    // The channel link should be the blog root, not the GitHub user root.
    // Item links are then relative to it and resolve correctly.
    site: new URL(url("/"), context.site).href,
    trailingSlash: true,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `blog/${post.id}/`,
      categories: [...post.data.tags],
    })),
    customData: `<language>en-us</language>`,
  });
};
