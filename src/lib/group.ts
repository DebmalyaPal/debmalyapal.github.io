import type { Experience } from './schema';

export interface OrganizationGroup {
  organization: string;
  kind: Experience['kind'];
  /** Earliest start and latest end across the roles; `null` end means at least one role is ongoing. */
  start: string;
  end: string | null;
  roles: Experience[];
}

/**
 * Collapses consecutive roles at the same organization into one timeline entry, so a promotion
 * path (e.g. Intern → Programmer Analyst → Associate) reads as one tenure. Expects input sorted
 * most recent first; non-adjacent stints at the same organization stay separate.
 */
export function groupByOrganization(items: readonly Experience[]): OrganizationGroup[] {
  const groups: OrganizationGroup[] = [];
  for (const item of items) {
    const last = groups.at(-1);
    if (last && last.organization === item.organization && last.kind === item.kind) {
      last.roles.push(item);
      if (item.start < last.start) last.start = item.start;
      if (last.end !== null && (item.end === null || item.end > last.end)) last.end = item.end;
    } else {
      groups.push({ organization: item.organization, kind: item.kind, start: item.start, end: item.end, roles: [item] });
    }
  }
  return groups;
}

/**
 * True when the organization line would only repeat the role, e.g. role "Independent
 * Researcher" at organization "Independent research". The timeline then omits it.
 */
export function organizationRepeatsRole(role: string, organization: string): boolean {
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const r = n(role);
  const o = n(organization);
  return r.startsWith(o) || o.startsWith(r);
}
