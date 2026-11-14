/**
 * Joins blogs.json metadata with the MDX bodies loaded by the `blogBodies` collection.
 * Server-side only (pages, RSS); never import this from a hydrated island.
 */
import { getCollection, type CollectionEntry } from 'astro:content';
import { content } from './data';
import { publishedPosts, readingMinutes } from './blog';
import type { BlogPostMeta } from './schema';

export type BlogPost = BlogPostMeta & { entry: CollectionEntry<'blogBodies'>; readingMinutes: number };

/** Drafts are routable only in `astro dev`, where the collection also loads their bodies. */
export const draftsVisible = import.meta.env.DEV;

export async function getRoutablePosts(): Promise<BlogPost[]> {
  const candidates = draftsVisible ? content.blogs : publishedPosts(content.blogs);
  if (candidates.length === 0) return [];
  const entries = await getCollection('blogBodies');
  const byId = new Map(entries.map((e) => [e.id, e]));
  return candidates.map((meta) => {
    const entry = byId.get(meta.slug);
    if (!entry) throw new Error(`blogs.json lists "${meta.slug}" but src/content/blog/${meta.contentPath} was not found`);
    return { ...meta, entry, readingMinutes: readingMinutes(entry.body) };
  });
}

/** What visitors can see: the listing, search, RSS and sitemap all derive from this. */
export async function getPublicPosts(): Promise<BlogPost[]> {
  return publishedPosts(await getRoutablePosts());
}
