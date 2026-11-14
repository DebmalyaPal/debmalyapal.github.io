import { useMemo } from 'react';
import type { Publication, Site, Theme } from '@/lib/schema';
import { distinct, filterPublications } from '@/lib/filters';
import PublicationRow from '@/components/PublicationRow';
import EmptyState from '@/components/EmptyState';
import FilterChips from './FilterChips';
import { useQueryState } from './useQueryState';

interface Props {
  publications: Publication[];
  themes: Pick<Theme, 'id' | 'short'>[];
  labels: Site['labels'];
  enums: Site['enums'];
  themeNames: Record<string, string>;
}

const KEYS = ['type', 'theme', 'q'] as const;

export default function PublicationSearch({ publications, themes, labels, enums, themeNames }: Props) {
  const typeOptions = distinct(publications.map((p) => p.type)).map((t) => ({ value: t, label: enums.pubType[t] }));
  const themeOptions = themes.filter((t) => publications.some((p) => p.themes.includes(t.id))).map((t) => ({ value: t.id, label: t.short }));
  const [f, set, reset] = useQueryState(KEYS, { type: typeOptions.map((o) => o.value), theme: themeOptions.map((o) => o.value) });

  const visible = useMemo(() => filterPublications(publications, { type: f.type, theme: f.theme, query: f.q ?? '' }), [publications, f]);

  // Group by year for an editorial, scannable list.
  const years = distinct(visible.map((p) => p.year));

  return (
    <div>
      <div className="grid gap-6 rounded-xl border border-line bg-raised/60 p-5 md:p-6">
        <label className="block max-w-xl min-w-0">
          <span className="eyebrow mb-2.5 block">{labels.search}</span>
          <input
            type="search"
            value={f.q ?? ''}
            onChange={(e) => set('q', e.target.value || null)}
            placeholder={labels.searchPublicationsHint}
            className="h-10 w-full rounded-full border border-line-strong bg-bg px-4 text-sm text-ink placeholder:text-faint focus:border-signal"
          />
        </label>
        <div className="flex flex-wrap gap-x-10 gap-y-6">
          {typeOptions.length > 1 && (
            <FilterChips legend={labels.type} allLabel={labels.all} options={typeOptions} value={f.type} onChange={(v) => set('type', v)} />
          )}
          <FilterChips legend={labels.themes} allLabel={labels.all} options={themeOptions} value={f.theme} onChange={(v) => set('theme', v)} />
        </div>
      </div>

      <p className="mt-6 font-mono text-xs text-faint" role="status" aria-live="polite">
        {visible.length} / {publications.length}
      </p>

      {visible.length === 0 ? (
        <EmptyState message={labels.noResults} actionLabel={labels.clearFilters} onAction={reset} />
      ) : (
        years.map((y) => (
          <section key={y} aria-label={String(y)} className="mt-4">
            {visible
              .filter((p) => p.year === y)
              .map((p) => (
                <PublicationRow key={p.id} pub={p} labels={labels} enums={enums} themeNames={themeNames} headingLevel="h2" />
              ))}
          </section>
        ))
      )}
    </div>
  );
}
