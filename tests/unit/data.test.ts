import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { content, parseOrThrow } from '@/lib/data';
import { experienceSchema, projectSchema, publicationSchema } from '@/lib/schema';
import { personJsonLd, scholarlyArticleJsonLd } from '@/lib/jsonld';

describe('seeded content', () => {
  it('loads and validates every JSON file', () => {
    expect(content.profile.name).toBe('Debmalya Pal');
    expect(content.projects.length).toBeGreaterThan(0);
    expect(content.publications.length).toBeGreaterThan(0);
    expect(content.experience.length).toBeGreaterThan(0);
    expect(content.teaching.length).toBeGreaterThan(0);
    expect(content.education.length).toBeGreaterThan(0);
    expect(content.research.themes.length).toBe(4);
  });

  it('includes the featured research projects with their diagrams', () => {
    const bySlug = Object.fromEntries(content.projects.map((p) => [p.slug, p]));
    expect(bySlug.when2reflect?.diagram).toBe('reflection-paths');
    expect(bySlug.claro?.diagram).toBe('claro-dag');
  });

  it('never stores a phone number or street address in public data', () => {
    const text = JSON.stringify(content);
    expect(text).not.toMatch(/\+?\d[\d\s().-]{8,}\d/);
    expect(text).not.toMatch(/\b(street|road|apartment|apt\.?|lane|avenue)\b/i);
  });
});

describe('schema defaults and validation', () => {
  const minimalProject = {
    slug: 'new-thing',
    title: 'New Thing',
    shortTitle: 'New',
    kind: 'research',
    status: 'ongoing',
    start: '2026-10',
    summary: 'One line.',
  };

  it('fills optional project fields with safe empty values', () => {
    const p = projectSchema.parse(minimalProject);
    expect(p).toMatchObject({ featured: false, end: null, role: null, diagram: null, highlights: [], metrics: [], themes: [] });
    expect(p.links).toEqual({ repo: null, demo: null, paper: null, project: null });
  });

  it('rejects malformed slugs, dates, URLs and inverted ranges', () => {
    expect(projectSchema.safeParse({ ...minimalProject, slug: 'Bad Slug' }).success).toBe(false);
    expect(projectSchema.safeParse({ ...minimalProject, start: '2026-4' }).success).toBe(false);
    expect(projectSchema.safeParse({ ...minimalProject, links: { repo: 'not a url' } }).success).toBe(false);
    expect(projectSchema.safeParse({ ...minimalProject, end: '2025-01' }).success).toBe(false);
  });

  it('accepts a publication with only required fields and null links', () => {
    const pub = publicationSchema.parse({ id: 'x-2026', title: 'X', venue: 'V', venueShort: 'V', year: 2026, type: 'workshop' });
    expect(pub.authors).toBeNull();
    expect(pub.links.paper).toBeNull();
    expect(scholarlyArticleJsonLd(pub)).toBeNull();
  });

  it('accepts an experience entry without summary or highlights', () => {
    const e = experienceSchema.parse({ id: 'intern', organization: 'Org', role: 'Intern', kind: 'industry', start: '2022-02', end: '2022-08' });
    expect(e.summary).toBeNull();
    expect(e.highlights).toEqual([]);
  });

  it('reports the file and field path on failure', () => {
    expect(() => parseOrThrow(z.array(projectSchema), [{ ...minimalProject, kind: 'hobby' }], 'projects.json')).toThrow(/projects\.json[\s\S]*0\.kind/);
  });
});

describe('JSON-LD', () => {
  it('emits Person with only supplied profiles', () => {
    const ld = personJsonLd(content.profile, 'https://debmalyapal.github.io/');
    expect(ld.name).toBe('Debmalya Pal');
    expect(ld.sameAs).toEqual([content.profile.contact.github, content.profile.contact.linkedin].filter(Boolean));
  });
  it('emits ScholarlyArticle only when authors are known', () => {
    for (const pub of content.publications) {
      const ld = scholarlyArticleJsonLd(pub);
      if (pub.authors?.length) expect(ld).not.toBeNull();
      else expect(ld).toBeNull();
    }
  });
});
