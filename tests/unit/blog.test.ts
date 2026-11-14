import { describe, expect, it } from 'vitest';
import { blogPostSchema } from '@/lib/schema';
import { filterBlogPosts, publishedPosts, readingMinutes, sortBlogPosts } from '@/lib/blog';
import { formatDate } from '@/lib/format';
import { blogPostingJsonLd } from '@/lib/jsonld';
import { blogUrl } from '@/lib/slug';
import { content } from '@/lib/data';

const draft = {
  slug: 'a-draft',
  title: 'A draft',
  topic: 'Research notes',
  tags: [],
  summary: 'Draft: add an accurate public summary before publishing.',
  publishedAt: null,
  updatedAt: null,
  status: 'draft' as const,
  featured: false,
  contentPath: 'a-draft/index.mdx',
  coverImage: null,
};
const published = {
  ...draft,
  slug: 'a-post',
  title: 'A post',
  contentPath: 'a-post/index.mdx',
  status: 'published' as const,
  publishedAt: '2026-11-05',
  summary: 'A real summary that is comfortably longer than thirty characters.',
};

describe('blog registry', () => {
  it('ships empty: no fabricated articles', () => {
    expect(content.blogs).toEqual([]);
  });

  it('accepts the scaffolded draft and a complete published post', () => {
    expect(blogPostSchema.safeParse(draft).success).toBe(true);
    const parsed = blogPostSchema.parse(published);
    expect(parsed.coverAlt).toBeNull();
  });

  it('rejects malformed metadata', () => {
    const bad = {
      'unknown key': { ...draft, author: 'x' },
      'non-kebab slug': { ...draft, slug: 'A Draft', contentPath: 'A Draft/index.mdx' },
      'wrong contentPath': { ...draft, contentPath: 'other/index.mdx' },
      'impossible date': { ...published, publishedAt: '2026-02-30' },
      'published without date': { ...published, publishedAt: null },
      'published with placeholder summary': { ...published, summary: 'Draft: add an accurate public summary before publishing.' },
      'updated before published': { ...published, updatedAt: '2026-11-01' },
      'remote cover': { ...draft, coverImage: 'https://example.com/a.png' },
      'unknown status': { ...draft, status: 'scheduled' },
    };
    for (const [label, value] of Object.entries(bad)) {
      expect(blogPostSchema.safeParse(value).success, label).toBe(false);
    }
  });

  it('exposes only published posts publicly', () => {
    expect(publishedPosts([draft, published]).map((p) => p.slug)).toEqual(['a-post']);
  });

  it('sorts featured first, then newest, then title', () => {
    const items = [
      { featured: false, publishedAt: '2026-01-01', title: 'B' },
      { featured: false, publishedAt: '2026-03-01', title: 'C' },
      { featured: true, publishedAt: '2025-01-01', title: 'A' },
      { featured: false, publishedAt: '2026-03-01', title: 'Aa' },
    ];
    expect(sortBlogPosts(items).map((p) => p.title)).toEqual(['A', 'Aa', 'C', 'B']);
  });

  it('filters by topic and by text across title, summary and tags', () => {
    const items = [
      { title: 'Probing hidden states', topic: 'Interpretability', summary: 'Linear probes.', tags: ['probing'] },
      { title: 'Agent planning', topic: 'Agents', summary: 'DAG schedulers.', tags: ['orchestration'] },
    ];
    expect(filterBlogPosts(items, { topic: 'Agents', query: '' })).toHaveLength(1);
    expect(filterBlogPosts(items, { topic: null, query: 'orchestration' })[0]!.title).toBe('Agent planning');
    expect(filterBlogPosts(items, { topic: 'Agents', query: 'probe' })).toHaveLength(0);
  });
});

describe('readingMinutes', () => {
  it('counts prose at 220 wpm and never returns less than one minute', () => {
    expect(readingMinutes('')).toBe(1);
    expect(readingMinutes(Array.from({ length: 440 }, () => 'word').join(' '))).toBe(2);
    expect(readingMinutes(Array.from({ length: 441 }, () => 'word').join(' '))).toBe(3);
  });

  it('ignores code blocks, imports, comments, tags and images', () => {
    const body = [
      "import Chart from './Chart.tsx';",
      '{/* BLOG-TEMPLATE: note */}',
      '```python',
      Array.from({ length: 1000 }, () => 'x = 1').join('\n'),
      '```',
      '<Chart client:visible />',
      '![alt text here](./images/a.png)',
      'Two words.',
    ].join('\n');
    expect(readingMinutes(body)).toBe(1);
  });

  it('keeps hyphenated words whole', () => {
    expect(readingMinutes(Array.from({ length: 220 }, () => 'self-reflection').join(' '))).toBe(1);
  });
});

describe('dates, URLs and JSON-LD', () => {
  it('formats calendar dates without time-zone drift', () => {
    expect(formatDate('2026-11-05')).toBe('Nov 5, 2026');
    expect(formatDate('2026-01-31')).toBe('Jan 31, 2026');
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('builds base-relative article URLs', () => {
    expect(blogUrl('a-post')).toBe('/blog/a-post/');
  });

  it('emits BlogPosting only from supplied fields', () => {
    const ld = blogPostingJsonLd({ ...published, tags: ['llm'] }, { name: 'Debmalya Pal' }, 'https://x.test/blog/a-post/', 'https://x.test/');
    expect(ld).toMatchObject({ '@type': 'BlogPosting', headline: 'A post', datePublished: '2026-11-05', keywords: 'llm' });
    expect(ld).not.toHaveProperty('dateModified');
    expect(ld).not.toHaveProperty('image');
  });
});
