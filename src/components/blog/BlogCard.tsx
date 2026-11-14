import type { BlogPostMeta, Site } from '@/lib/schema';
import { formatDate } from '@/lib/format';
import { blogUrl } from '@/lib/slug';
import Tag from '../Tag';

/** Serializable card data: metadata plus values computed at build time. */
export type BlogCardData = Pick<BlogPostMeta, 'slug' | 'title' | 'topic' | 'tags' | 'summary' | 'publishedAt' | 'status' | 'coverAlt'> & {
  readingMinutes: number;
  coverUrl: string | null;
};

interface Props {
  post: BlogCardData;
  labels: Site['labels'];
  headingLevel?: 'h2' | 'h3';
}

/** Editorial row, matching ProjectCard/PublicationRow: date column, then title, summary, tags. */
export default function BlogCard({ post: p, labels, headingLevel = 'h2' }: Props) {
  const H = headingLevel;
  return (
    <article className="group relative grid gap-4 border-t border-line py-8 md:grid-cols-[9rem_minmax(0,1fr)] md:gap-8">
      <div className="flex items-baseline gap-3 font-mono text-xs text-faint md:flex-col md:gap-1.5">
        {p.publishedAt && <time dateTime={p.publishedAt}>{formatDate(p.publishedAt)}</time>}
        <span>
          {p.readingMinutes} {labels.minRead}
        </span>
      </div>
      <div className="grid min-w-0 gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
        <div className="min-w-0">
          <p className="eyebrow flex flex-wrap gap-x-3">
            <span className="text-signal">{p.topic}</span>
            {p.status === 'draft' && <span className="text-pulse">Draft</span>}
          </p>
          <H className="mt-2 text-xl leading-snug font-medium tracking-tight text-ink md:text-2xl">
            <a href={blogUrl(p.slug)} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-hover:text-signal">
              {p.title}
            </a>
          </H>
          <p className="mt-2 max-w-3xl text-[0.95rem] leading-relaxed text-muted">{p.summary}</p>
          {p.tags.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2" aria-label={labels.tags}>
              {p.tags.map((t) => (
                <li key={t}>
                  <Tag>{t}</Tag>
                </li>
              ))}
            </ul>
          )}
        </div>
        {p.coverUrl && (
          <img
            src={p.coverUrl}
            alt={p.coverAlt ?? ''}
            loading="lazy"
            decoding="async"
            className="aspect-[16/10] w-full rounded-lg border border-line object-cover sm:w-56"
          />
        )}
      </div>
      <span className="pointer-events-none absolute inset-0 -mx-3 rounded-lg ring-signal group-has-[a:focus-visible]:ring-2" aria-hidden="true" />
    </article>
  );
}
