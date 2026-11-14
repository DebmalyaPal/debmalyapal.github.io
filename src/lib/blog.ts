/**
 * Pure blog helpers: no `astro:content` import, so they run in unit tests and islands alike.
 * Rendering-related lookups live in blog-content.ts.
 */
import type { BlogPostMeta } from './schema';
import { matchesQuery } from './filters';

/** Public listing order: featured first, then newest publication date, then title. */
export function sortBlogPosts<T extends Pick<BlogPostMeta, 'featured' | 'publishedAt' | 'title'>>(items: readonly T[]): T[] {
  return [...items].sort(
    (a, b) => Number(b.featured) - Number(a.featured) || (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '') || a.title.localeCompare(b.title),
  );
}

/** The only gate between the registry and anything public (routes, listing, RSS, search). */
export function publishedPosts<T extends Pick<BlogPostMeta, 'status'>>(items: readonly T[]): T[] {
  return items.filter((p) => p.status === 'published');
}

/**
 * Estimated reading time at 220 words per minute, ignoring code blocks, JSX/HTML tags,
 * import/export lines and Markdown punctuation. Never less than one minute.
 */
export function readingMinutes(body: string | undefined): number {
  const text = (body ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^\s*(?:import|export)\s.*$/gm, ' ')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/^\s*(?:[-*+]|\d+\.)\s+/gm, ' ')
    .replace(/[#*_[\]()`>$|]/g, ' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}

export interface BlogFilterState {
  topic: string | null;
  query: string;
}

export function filterBlogPosts<T extends Pick<BlogPostMeta, 'title' | 'topic' | 'summary' | 'tags'>>(items: readonly T[], f: BlogFilterState): T[] {
  return items.filter((p) => (!f.topic || p.topic === f.topic) && matchesQuery([p.title, p.topic, p.summary, ...p.tags].join(' '), f.query));
}
