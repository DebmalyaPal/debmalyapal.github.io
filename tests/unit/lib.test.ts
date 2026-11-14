import { describe, expect, it } from 'vitest';
import { filterProjects, filterPublications, matchesQuery, normalize, distinct } from '@/lib/filters';
import { slugify, projectUrl, url } from '@/lib/slug';
import { compareRecency, sortByRecency, sortProjects, sortPublications } from '@/lib/sort';
import { formatMonth, formatRange, currentMonth, yearOf } from '@/lib/format';
import { groupByOrganization, organizationRepeatsRole } from '@/lib/group';
import type { Experience } from '@/lib/schema';

describe('format', () => {
  it('formats YYYY-MM months', () => {
    expect(formatMonth('2026-04')).toBe('Apr 2026');
    expect(formatMonth('2026-12')).toBe('Dec 2026');
  });
  it('returns invalid input unchanged', () => {
    expect(formatMonth('2026-13')).toBe('2026-13');
    expect(formatMonth('April 2026')).toBe('April 2026');
  });
  it('renders ongoing, expected, single-month and closed ranges', () => {
    const now = '2026-11';
    expect(formatRange('2026-04', null, now)).toBe('Apr 2026 – Present');
    expect(formatRange('2025-09', '2027-06', now)).toBe('Sep 2025 – Expected Jun 2027');
    expect(formatRange('2026-03', '2026-03', now)).toBe('Mar 2026');
    expect(formatRange('2022-02', '2022-08', now)).toBe('Feb 2022 – Aug 2022');
  });
  it('derives the current month and year', () => {
    expect(currentMonth(new Date(2026, 10, 5))).toBe('2026-11');
    expect(currentMonth(new Date(2026, 0, 1))).toBe('2026-01');
    expect(yearOf('2026-04')).toBe('2026');
  });
});

describe('slug', () => {
  it('produces kebab-case slugs', () => {
    expect(slugify('When2Reflect: Predicting Utility')).toBe('when2reflect-predicting-utility');
    expect(slugify('  Hybrid RAG  for Genomics!! ')).toBe('hybrid-rag-for-genomics');
    expect(slugify('Civic & Policy')).toBe('civic-and-policy');
    expect(slugify('Café Déjà-vu')).toBe('cafe-deja-vu');
  });
  it('builds base-relative URLs', () => {
    expect(url()).toBe('/');
    expect(url('/projects/')).toBe('/projects/');
    expect(projectUrl('claro')).toBe('/projects/claro/');
  });
});

describe('sort', () => {
  const a = { start: '2024-01', end: null };
  const b = { start: '2025-01', end: '2025-06' };
  const c = { start: '2025-03', end: null };
  it('puts ongoing items first, newest start breaking ties', () => {
    expect(sortByRecency([b, a, c])).toEqual([c, a, b]);
    expect(compareRecency(a, a)).toBe(0);
  });
  it('places featured projects before the rest', () => {
    const items = [
      { slug: 'old-featured', featured: true, start: '2020-01', end: '2020-02' },
      { slug: 'new', featured: false, start: '2026-01', end: null },
    ];
    expect(sortProjects(items).map((p) => p.slug)).toEqual(['old-featured', 'new']);
  });
  it('orders publications by year then title', () => {
    const pubs = [
      { year: 2025, title: 'Z' },
      { year: 2026, title: 'B' },
      { year: 2026, title: 'A' },
    ];
    expect(sortPublications(pubs).map((p) => `${p.year}${p.title}`)).toEqual(['2026A', '2026B', '2025Z']);
  });
  it('does not mutate its input', () => {
    const input = [b, a];
    sortByRecency(input);
    expect(input).toEqual([b, a]);
  });
});

describe('filters', () => {
  const projects = [
    { title: 'When2Reflect', shortTitle: 'W2R', summary: 'hidden-state probes', kind: 'research', status: 'ongoing', themes: ['reasoning'], stack: ['PyTorch'] },
    { title: 'MediPredict', shortTitle: 'MP', summary: 'disease prediction', kind: 'engineering', status: 'completed', themes: [], stack: ['Flask'] },
  ];
  const none = { theme: null, kind: null, status: null, query: '' };
  it('normalizes case, accents and whitespace', () => {
    expect(normalize('  Café   RAG ')).toBe('cafe rag');
    expect(matchesQuery('Hidden-state probes', 'PROBES hidden')).toBe(true);
    expect(matchesQuery('Hidden-state probes', 'probes rag')).toBe(false);
    expect(matchesQuery('anything', '   ')).toBe(true);
  });
  it('applies theme, kind, status and query together', () => {
    expect(filterProjects(projects, none)).toHaveLength(2);
    expect(filterProjects(projects, { ...none, theme: 'reasoning' }).map((p) => p.title)).toEqual(['When2Reflect']);
    expect(filterProjects(projects, { ...none, kind: 'engineering' }).map((p) => p.title)).toEqual(['MediPredict']);
    expect(filterProjects(projects, { ...none, status: 'ongoing', query: 'flask' })).toHaveLength(0);
    expect(filterProjects(projects, { ...none, query: 'pytorch' }).map((p) => p.title)).toEqual(['When2Reflect']);
  });
  it('filters publications including null summaries', () => {
    const pubs = [
      { title: 'Probing', venue: 'ACL BioNLP Workshop', venueShort: 'BioNLP', year: 2026, type: 'workshop', themes: ['interpretability'], summary: null },
      { title: 'Stylometry', venue: 'ACL PrivateNLP', venueShort: 'PrivateNLP', year: 2025, type: 'conference', themes: [], summary: 'privacy' },
    ];
    expect(filterPublications(pubs, { type: null, theme: null, query: '2026' }).map((p) => p.title)).toEqual(['Probing']);
    expect(filterPublications(pubs, { type: 'conference', theme: null, query: 'privacy' })).toHaveLength(1);
    expect(filterPublications(pubs, { type: null, theme: 'interpretability', query: 'bionlp' })).toHaveLength(1);
  });
  it('keeps distinct values in first-seen order', () => {
    expect(distinct(['b', 'a', 'b', 'c'])).toEqual(['b', 'a', 'c']);
  });
});

describe('groupByOrganization', () => {
  const role = (id: string, organization: string, start: string, end: string | null, kind: Experience['kind'] = 'industry'): Experience => ({
    id,
    organization,
    unit: null,
    role: id,
    kind,
    location: null,
    start,
    end,
    advisor: null,
    client: null,
    summary: null,
    highlights: [],
    stack: [],
    projects: [],
  });
  it('merges consecutive roles and spans their dates', () => {
    const groups = groupByOrganization([role('assoc', 'Acme', '2025-04', '2025-09'), role('analyst', 'Acme', '2022-09', '2025-03'), role('intern', 'Acme', '2022-02', '2022-08')]);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ start: '2022-02', end: '2025-09' });
    expect(groups[0]!.roles.map((r) => r.id)).toEqual(['assoc', 'analyst', 'intern']);
  });
  it('keeps an ongoing role ongoing and separates different organizations', () => {
    const groups = groupByOrganization([role('now', 'Uni', '2026-04', null, 'research'), role('ta', 'Uni', '2025-09', '2025-12', 'research'), role('job', 'Acme', '2022-01', '2025-01')]);
    expect(groups.map((g) => g.organization)).toEqual(['Uni', 'Acme']);
    expect(groups[0]!.end).toBeNull();
  });
});

describe('organizationRepeatsRole', () => {
  it('detects an organization line that only restates the role', () => {
    expect(organizationRepeatsRole('Independent Researcher', 'Independent research')).toBe(true);
    expect(organizationRepeatsRole('Freelance', 'Freelance')).toBe(true);
  });

  it('keeps distinct organizations', () => {
    expect(organizationRepeatsRole('Graduate Student Researcher', 'University of California, San Diego')).toBe(false);
    expect(organizationRepeatsRole('Associate', 'Cognizant Technology Solutions')).toBe(false);
  });
});
