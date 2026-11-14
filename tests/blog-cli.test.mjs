/**
 * Tests for scripts/blog.mjs. Each test runs the CLI against a throwaway fixture
 * directory (BLOG_ROOT), never against the real src/data/blogs.json.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = resolve(fileURLToPath(new URL('../scripts/blog.mjs', import.meta.url)));

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'blog-cli-'));
  mkdirSync(join(root, 'src', 'data'), { recursive: true });
  mkdirSync(join(root, 'src', 'content', 'blog'), { recursive: true });
  writeFileSync(join(root, 'src', 'data', 'blogs.json'), '[]\n');
  return root;
}
const run = (root, ...args) => spawnSync(process.execPath, [script, ...args], { env: { ...process.env, BLOG_ROOT: root }, encoding: 'utf8' });
const posts = (root) => JSON.parse(readFileSync(join(root, 'src/data/blogs.json'), 'utf8'));
const savePosts = (root, value) => writeFileSync(join(root, 'src/data/blogs.json'), JSON.stringify(value, null, 2));
const body = (root, slug, text) => writeFileSync(join(root, 'src/content/blog', slug, 'index.mdx'), text);
const REAL_BODY = '## Introduction\n\nHere are several detailed paragraphs discussing reasoning and experiments.\n\n## Conclusion\n\nNext steps.';

function withFixture(fn) {
  const root = fixture();
  try {
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test('new scaffolds a draft folder, MDX body and registry entry', () =>
  withFixture((root) => {
    const r = run(root, 'new', '--title', 'How LLMs Reason');
    assert.equal(r.status, 0, r.stderr);
    const [post] = posts(root);
    assert.equal(post.slug, 'how-llms-reason');
    assert.equal(post.status, 'draft');
    assert.equal(post.publishedAt, null);
    assert.equal(post.contentPath, 'how-llms-reason/index.mdx');
    assert.ok(existsSync(join(root, 'src/content/blog/how-llms-reason/images')));
    const mdx = readFileSync(join(root, 'src/content/blog/how-llms-reason/index.mdx'), 'utf8');
    // The template must be valid MDX: an MDX comment, never an HTML comment.
    assert.match(mdx, /^\{\/\*/);
    assert.doesNotMatch(mdx, /<!--/);
    assert.doesNotMatch(mdx, /^---/);
    assert.equal(run(root, 'validate').status, 0);
  }));

test('publish refuses until the summary and body are real, then stamps a local date', () =>
  withFixture((root) => {
    run(root, 'new', '--title', 'How LLMs Reason');
    assert.notEqual(run(root, 'publish', '--slug', 'how-llms-reason').status, 0, 'template summary and body');
    const p = posts(root);
    p[0].summary = 'A technical walkthrough of language model reasoning, with experiments and notes.';
    savePosts(root, p);
    assert.notEqual(run(root, 'publish', '--slug', 'how-llms-reason').status, 0, 'template body still present');
    body(root, 'how-llms-reason', REAL_BODY);
    const r = run(root, 'publish', '--slug', 'how-llms-reason');
    assert.equal(r.status, 0, r.stderr);
    const [post] = posts(root);
    assert.equal(post.status, 'published');
    const d = new Date();
    const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    assert.equal(post.publishedAt, today);
    assert.notEqual(run(root, 'publish', '--slug', 'how-llms-reason').status, 0, 'already published');
  }));

test('duplicate slugs and existing folders are rejected', () =>
  withFixture((root) => {
    assert.equal(run(root, 'new', '--title', 'First Post', '--slug', 'first-post').status, 0);
    assert.notEqual(run(root, 'new', '--title', 'Another Post', '--slug', 'first-post').status, 0);
    mkdirSync(join(root, 'src/content/blog/orphan'));
    assert.notEqual(run(root, 'new', '--title', 'Orphan').status, 0);
  }));

test('slugs are derived cleanly from accented or symbolic titles', () =>
  withFixture((root) => {
    assert.equal(run(root, 'new', '--title', 'Über Café: Q&A — Part 2').status, 0);
    assert.equal(posts(root)[0].slug, 'uber-cafe-q-and-a-part-2');
    assert.notEqual(run(root, 'new', '--title', '!!!').status, 0, 'empty slug');
    assert.notEqual(run(root, 'new', '--title', 'Bad', '--slug', 'Bad_Slug').status, 0, 'non-kebab slug');
  }));

test('validate rejects malformed metadata', () =>
  withFixture((root) => {
    run(root, 'new', '--title', 'Valid Post');
    const base = posts(root)[0];
    const cases = {
      'unknown field': { ...base, author: 'x' },
      'bad status': { ...base, status: 'live' },
      'wrong contentPath': { ...base, contentPath: 'other/index.mdx' },
      'impossible date': { ...base, publishedAt: '2026-02-30' },
      'updated before published': { ...base, publishedAt: '2026-05-02', updatedAt: '2026-05-01' },
      'remote cover': { ...base, coverImage: 'https://example.com/a.png' },
      'missing cover file': { ...base, coverImage: 'images/missing.png' },
      'published without date': { ...base, status: 'published', summary: 'A genuinely descriptive summary of this article.' },
      'empty tag': { ...base, tags: [' '] },
    };
    for (const [label, entry] of Object.entries(cases)) {
      savePosts(root, [entry]);
      assert.notEqual(run(root, 'validate').status, 0, label);
    }
  }));

test('validate rejects frontmatter, a second h1, and unregistered folders', () =>
  withFixture((root) => {
    run(root, 'new', '--title', 'Valid Post');
    body(root, 'valid-post', '---\ntitle: x\n---\n\n## Intro\n');
    assert.notEqual(run(root, 'validate').status, 0, 'frontmatter');
    body(root, 'valid-post', '# Another title\n\nText');
    assert.notEqual(run(root, 'validate').status, 0, 'h1 in body');
    body(root, 'valid-post', '## Intro\n\n```md\n# a heading inside a code block is fine\n```\n');
    assert.equal(run(root, 'validate').status, 0, 'h1 inside code fence is allowed');
    mkdirSync(join(root, 'src/content/blog/stray-folder'));
    assert.notEqual(run(root, 'validate').status, 0, 'unregistered folder');
  }));

test('a cover image inside the article folder validates', () =>
  withFixture((root) => {
    run(root, 'new', '--title', 'With Cover');
    writeFileSync(join(root, 'src/content/blog/with-cover/images/cover.png'), 'not-a-real-png');
    savePosts(root, [{ ...posts(root)[0], coverImage: 'images/cover.png', coverAlt: 'A diagram' }]);
    assert.equal(run(root, 'validate').status, 0);
  }));
