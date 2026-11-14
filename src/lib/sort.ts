interface Dated {
  start: string;
  end: string | null;
}

/** Most recent first: ongoing items (end === null) lead, then by end, then by start. */
export function compareRecency(a: Dated, b: Dated): number {
  const endA = a.end ?? '9999-12';
  const endB = b.end ?? '9999-12';
  if (endA !== endB) return endB.localeCompare(endA);
  return b.start.localeCompare(a.start);
}

export function sortByRecency<T extends Dated>(items: readonly T[]): T[] {
  return [...items].sort(compareRecency);
}

/** Featured projects first, then most recent. Stable for equal keys. */
export function sortProjects<T extends Dated & { featured: boolean }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => Number(b.featured) - Number(a.featured) || compareRecency(a, b));
}

/** Newest year first, then alphabetical by title for a deterministic order. */
export function sortPublications<T extends { year: number; title: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
}
