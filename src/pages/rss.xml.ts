import rss from '@astrojs/rss';
import type { APIRoute } from 'astro';
import { content } from '@/lib/data';
import { getPublicPosts } from '@/lib/blog-content';
import { blogUrl } from '@/lib/slug';

/** Published posts only; drafts are never loaded in a production build. */
export const GET: APIRoute = async ({ site }) => {
  const posts = await getPublicPosts();
  return rss({
    title: content.site.rss.title,
    description: content.site.rss.description,
    site: site!,
    trailingSlash: true,
    customData: '<language>en-us</language>',
    items: posts.map((post) => ({
      title: post.title,
      description: post.summary,
      // Noon UTC keeps the calendar date stable in every reader's time zone.
      pubDate: new Date(`${post.publishedAt}T12:00:00Z`),
      link: blogUrl(post.slug),
      categories: [post.topic, ...post.tags],
    })),
  });
};
