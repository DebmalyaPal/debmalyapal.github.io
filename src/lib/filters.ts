/** Pure filtering helpers shared by the React islands and unit tests. */

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Every whitespace-separated term in `query` must appear somewhere in `haystack`. */
export function matchesQuery(haystack: string, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const h = normalize(haystack);
  return q.split(' ').every((term) => h.includes(term));
}

export interface ProjectFilterState {
  theme: string | null;
  kind: string | null;
  status: string | null;
  query: string;
}

export interface FilterableProject {
  title: string;
  shortTitle: string;
  summary: string;
  kind: string;
  status: string;
  themes: string[];
  stack: string[];
}

export function filterProjects<T extends FilterableProject>(items: readonly T[], f: ProjectFilterState): T[] {
  return items.filter(
    (p) =>
      (!f.theme || p.themes.includes(f.theme)) &&
      (!f.kind || p.kind === f.kind) &&
      (!f.status || p.status === f.status) &&
      matchesQuery([p.title, p.shortTitle, p.summary, ...p.stack].join(' '), f.query),
  );
}

export interface PublicationFilterState {
  type: string | null;
  theme: string | null;
  query: string;
}

export interface FilterablePublication {
  title: string;
  venue: string;
  venueShort: string;
  year: number;
  type: string;
  themes: string[];
  summary: string | null;
}

export function filterPublications<T extends FilterablePublication>(items: readonly T[], f: PublicationFilterState): T[] {
  return items.filter(
    (p) =>
      (!f.type || p.type === f.type) &&
      (!f.theme || p.themes.includes(f.theme)) &&
      matchesQuery([p.title, p.venue, p.venueShort, String(p.year), p.summary ?? ''].join(' '), f.query),
  );
}

/** Distinct values in first-seen order — used to build filter chips only from values that exist. */
export function distinct<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}
