/**
 * Content collections. Blog article bodies live at src/content/blog/<slug>/index.mdx;
 * all metadata lives in src/data/blogs.json (see src/lib/schema.ts → blogPostSchema).
 *
 * Draft isolation happens here, at the source: a production build only loads the MDX of
 * posts whose status is "published". Draft bodies and the images they import are never
 * compiled, so they cannot reach routes, RSS, search, the sitemap or emitted assets, and an
 * unfinished draft cannot break the build. The dev server also loads drafts for preview.
 */
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import blogIndex from './data/blogs.json';

const includeDrafts = import.meta.env.DEV;
const loadable = (blogIndex as { slug: string; status: string }[])
  .filter((post) => includeDrafts || post.status === 'published')
  .map((post) => `${post.slug}/index.mdx`);

const blogBodies = defineCollection({
  // With nothing to load, a no-op loader avoids glob's "no files found" warning on every build.
  loader:
    loadable.length > 0
      ? glob({ base: './src/content/blog', pattern: loadable, generateId: ({ entry }) => entry.split('/')[0]! })
      : { name: 'blog-empty', load: async ({ store }) => store.clear() },
  // Metadata is in blogs.json, not frontmatter. scripts/blog.mjs rejects frontmatter.
  schema: z.object({}).strict(),
});

export const collections = { blogBodies };
