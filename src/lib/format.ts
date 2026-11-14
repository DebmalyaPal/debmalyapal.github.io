const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** `2026-04` → `Apr 2026`. Returns the input unchanged if it is not a valid YYYY-MM. */
export function formatMonth(iso: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return iso;
  return `${MONTHS[month - 1]} ${m[1]}`;
}

/** Current month as YYYY-MM. Injectable for tests. */
export function currentMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Human date range. `end === null` reads as "Present"; an end date still in the future
 * reads as "Expected …" so planned dates are never presented as completed.
 */
export function formatRange(start: string, end: string | null, now: string = currentMonth()): string {
  const s = formatMonth(start);
  if (end === null) return `${s} – Present`;
  if (end > now) return `${s} – Expected ${formatMonth(end)}`;
  if (end === start) return s;
  return `${s} – ${formatMonth(end)}`;
}

export function yearOf(iso: string): string {
  return iso.slice(0, 4);
}

/** `2026-11-05` → `Nov 5, 2026`. Parsed as a calendar date, so no time zone can shift the day. */
export function formatDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return iso;
  return `${MONTHS[month - 1]} ${Number(m[3])}, ${m[1]}`;
}
