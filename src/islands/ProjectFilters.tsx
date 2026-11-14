import { useMemo } from 'react';
import type { Project, Theme } from '@/lib/schema';
import { distinct, filterProjects } from '@/lib/filters';
import ProjectCard, { type CardCopy } from '@/components/ProjectCard';
import EmptyState from '@/components/EmptyState';
import FilterChips from './FilterChips';
import { useQueryState } from './useQueryState';

interface Props extends CardCopy {
  projects: Project[];
  themes: Pick<Theme, 'id' | 'short'>[];
}

const KEYS = ['theme', 'kind', 'status', 'q'] as const;

export default function ProjectFilters({ projects, themes, labels, enums, themeNames }: Props) {
  // Only offer filters for values that actually occur, so no chip ever leads to an empty list on its own.
  const themeOptions = themes.filter((t) => projects.some((p) => p.themes.includes(t.id))).map((t) => ({ value: t.id, label: t.short }));
  const kindOptions = distinct(projects.map((p) => p.kind)).map((k) => ({ value: k, label: enums.kind[k] }));
  const statusOptions = distinct(projects.map((p) => p.status)).map((s) => ({ value: s, label: enums.status[s] }));

  const [f, set, reset] = useQueryState(KEYS, {
    theme: themeOptions.map((o) => o.value),
    kind: kindOptions.map((o) => o.value),
    status: statusOptions.map((o) => o.value),
  });

  const visible = useMemo(
    () => filterProjects(projects, { theme: f.theme, kind: f.kind, status: f.status, query: f.q ?? '' }),
    [projects, f],
  );
  const filtering = Boolean(f.theme || f.kind || f.status || f.q);
  const featured = filtering ? [] : visible.filter((p) => p.featured);
  const rest = filtering ? visible : visible.filter((p) => !p.featured);
  const copy = { labels, enums, themeNames };

  return (
    <div>
      {/* Search on its own row; chip groups keep their natural width and wrap as whole groups. */}
      <div className="grid gap-6 rounded-xl border border-line bg-raised/60 p-5 md:p-6">
        <label className="block max-w-xl min-w-0">
          <span className="eyebrow mb-2.5 block">{labels.search}</span>
          <input
            type="search"
            value={f.q ?? ''}
            onChange={(e) => set('q', e.target.value || null)}
            placeholder={labels.searchProjectsHint}
            className="h-10 w-full rounded-full border border-line-strong bg-bg px-4 text-sm text-ink placeholder:text-faint focus:border-signal"
          />
        </label>
        <div className="flex flex-wrap gap-x-10 gap-y-6">
          <FilterChips legend={labels.themes} allLabel={labels.all} options={themeOptions} value={f.theme} onChange={(v) => set('theme', v)} />
          <FilterChips legend={labels.type} allLabel={labels.all} options={kindOptions} value={f.kind} onChange={(v) => set('kind', v)} />
          <FilterChips legend={labels.status} allLabel={labels.all} options={statusOptions} value={f.status} onChange={(v) => set('status', v)} />
        </div>
      </div>

      <p className="mt-6 font-mono text-xs text-faint" role="status" aria-live="polite">
        {visible.length} / {projects.length}
      </p>

      {visible.length === 0 && (
        <EmptyState message={labels.noResults} actionLabel={labels.clearFilters} onAction={reset} />
      )}

      {featured.length > 0 && (
        <section aria-labelledby="featured-heading" className="mt-8">
          <h2 id="featured-heading" className="eyebrow mb-2">
            {labels.featured}
          </h2>
          {featured.map((p, i) => (
            <ProjectCard key={p.slug} project={p} index={i} layout="feature" {...copy} />
          ))}
        </section>
      )}

      {rest.length > 0 && (
        <section aria-labelledby="rest-heading" className="mt-12">
          <h2 id="rest-heading" className="eyebrow mb-2">
            {filtering ? labels.results : labels.archive}
          </h2>
          {rest.map((p, i) => (
            <ProjectCard key={p.slug} project={p} index={i} layout="row" {...copy} />
          ))}
        </section>
      )}
    </div>
  );
}
