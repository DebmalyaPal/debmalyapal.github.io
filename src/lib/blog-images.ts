/**
 * Cover images for blog posts, resolved through `virtual:blog-covers` (see
 * src/integrations/blog-covers.mjs) so that only published posts' covers enter a build.
 */
import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import covers from 'virtual:blog-covers';
import type { BlogPostMeta } from './schema';

export function coverImage(post: Pick<BlogPostMeta, 'slug' | 'coverImage'>): ImageMetadata | null {
  if (!post.coverImage) return null;
  const image = covers[post.slug];
  if (!image) throw new Error(`Cover image not found: src/content/blog/${post.slug}/${post.coverImage}`);
  return image;
}

/** A card-sized WebP rendition (SVG covers are used as-is). */
export async function coverCardUrl(post: Pick<BlogPostMeta, 'slug' | 'coverImage'>): Promise<string | null> {
  const image = coverImage(post);
  if (!image) return null;
  if (image.format === 'svg') return image.src;
  return (await getImage({ src: image, width: 640, format: 'webp' })).src;
}
