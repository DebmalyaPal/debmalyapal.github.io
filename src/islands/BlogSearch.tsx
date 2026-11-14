import { useMemo } from 'react';
import type { Site } from '@/lib/schema';
import { distinct } from '@/lib/filters';
import { filterBlogPosts } from '@/lib/blog';
import BlogCard, { type BlogCardData } from '@/components/blog/BlogCard';
import EmptyState from '@/components/EmptyState';
import FilterChips from './FilterChips';
import { useQueryState } from './useQueryState';

interface Props {
  /** Already restricted to published posts by the page; this island never sees drafts in a build. */
  posts: BlogCardData[];
  labels: Site['labels'];
}

const KEYS = ['topic', 'q'] as const;

export default function BlogSearch({ posts, labels }: Props) {
  const topicOptions = distinct(posts.map((p) => p.topic))
    .sort((a, b) => a.localeCompare(b))
    .map((t) => ({ value: t, label: t }));
  const [f, set, reset] = useQueryState(KEYS, { topic: topicOptions.map((o) => o.value) });
  const visible = useMemo(() => filterBlogPosts(posts, { topic: f.topic, query: f.q ?? '' }), [posts, f]);

  return (
    <div>
      <div className="grid gap-6 rounded-xl border border-line bg-raised/60 p-5 md:p-6">
        <label className="block max-w-xl min-w-0">
          <span className="eyebrow mb-2.5 block">{labels.search}</span>
          <input
            type="search"
            value={f.q ?? ''}
            onChange={(e) => set('q', e.target.value || null)}
            placeholder={labels.searchBlogHint}
            className="h-10 w-full rounded-full border border-line-strong bg-bg px-4 text-sm text-ink placeholder:text-faint focus:border-signal"
          />
        </label>
        {topicOptions.length > 1 && (
          <FilterChips legend={labels.topic} allLabel={labels.all} options={topicOptions} value={f.topic} onChange={(v) => set('topic', v)} />
        )}
      </div>

      <p className="mt-6 font-mono text-xs text-faint" role="status" aria-live="polite">
        {visible.length} / {posts.length}
      </p>

      {visible.length === 0 ? (
        <EmptyState message={labels.noResults} actionLabel={labels.clearFilters} onAction={reset} />
      ) : (
        <div className="mt-2">
          {visible.map((p) => (
            <BlogCard key={p.slug} post={p} labels={labels} />
          ))}
        </div>
      )}
    </div>
  );
}
