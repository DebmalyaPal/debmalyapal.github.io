/**
 * End-to-end blog build test.
 *
 * Copies the project into a temporary directory (node_modules is symlinked), creates
 * clearly labelled fixture articles there with the real CLI, runs a production build, and
 * inspects the output. The working tree and src/data/blogs.json are never modified, so no
 * fixture article can leak into the real site.
 *
 * Fixtures: one draft carrying a unique marker string and two draft-only images, and two
 * published articles exercising headings, code, math, a table, an inline image and a cover.
 *
 * Run: npm run test:blog-build   (≈30 s; builds the site once)
 */
import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';
import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const project = resolve(fileURLToPath(new URL('..', import.meta.url)));
const DRAFT_MARKER = 'DRAFT-LEAK-CANARY-5c1e9a';
const DRAFT = { slug: 'zz-fixture-draft', title: 'Fixture draft that must stay private' };
const PUB = { slug: 'zz-fixture-published', title: 'Fixture published article for the build test' };
const PUB2 = { slug: 'zz-fixture-second', title: 'Second fixture article with another topic' };

let root;
let dist;
let server;
let base;

/**
 * A valid PNG of random noise. Noise does not compress, so each image stays above Vite's
 * 4 KB inlining threshold and is emitted as a real file; a leak would therefore be visible.
 */
function png(width, height) {
  const crcTable = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = Buffer.concat(
    Array.from({ length: height }, () => Buffer.from([0, ...Array.from({ length: width * 3 }, () => Math.floor(Math.random() * 256))])),
  );
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

function cli(...args) {
  const r = spawnSync(process.execPath, [join(project, 'scripts/blog.mjs'), ...args], { env: { ...process.env, BLOG_ROOT: root }, encoding: 'utf8' });
  assert.equal(r.status, 0, `blog ${args.join(' ')} failed:\n${r.stderr}`);
}
const registry = () => JSON.parse(readFileSync(join(root, 'src/data/blogs.json'), 'utf8'));
const setRegistry = (posts) => writeFileSync(join(root, 'src/data/blogs.json'), `${JSON.stringify(posts, null, 2)}\n`);
const article = (slug) => join(root, 'src/content/blog', slug);

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

before(async () => {
  root = mkdtempSync(join(tmpdir(), 'blog-build-'));
  for (const item of ['src', 'public', 'astro.config.mjs', 'package.json', 'tsconfig.json']) {
    cpSync(join(project, item), join(root, item), { recursive: true });
  }
  symlinkSync(join(project, 'node_modules'), join(root, 'node_modules'), 'dir');
  // Start from an empty registry regardless of what the real site contains.
  setRegistry([]);
  rmSync(join(root, 'src/content/blog'), { recursive: true, force: true });
  cpSync(join(project, 'src/content/blog/.gitkeep'), join(root, 'src/content/blog/.gitkeep'));

  // Draft: unique marker text, an inline image, and a cover. None of it may reach dist/.
  cli('new', '--title', DRAFT.title, '--slug', DRAFT.slug);
  writeFileSync(join(article(DRAFT.slug), 'images/draft-only-figure.png'), png(64, 64));
  writeFileSync(join(article(DRAFT.slug), 'images/draft-only-cover.png'), png(64, 64));
  writeFileSync(join(article(DRAFT.slug), 'index.mdx'), `## Secret section\n\n${DRAFT_MARKER} unpublished body text.\n\n![Draft figure](./images/draft-only-figure.png)\n`);

  // Published article #1: every content feature.
  cli('new', '--title', PUB.title, '--slug', PUB.slug);
  writeFileSync(join(article(PUB.slug), 'images/fixture-figure.png'), png(96, 54));
  writeFileSync(join(article(PUB.slug), 'images/fixture-cover.png'), png(120, 60));
  writeFileSync(
    join(article(PUB.slug), 'index.mdx'),
    [
      '## Introduction',
      '',
      'This fixture exists only inside the build test. It checks headings, code, math, tables and images.',
      '',
      '### A subsection',
      '',
      'Inline math such as $E = mc^2$ renders with KaTeX, and so does display math:',
      '',
      '$$',
      '\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}',
      '$$',
      '',
      '```python',
      'def reflect(state):',
      '    return state  # a deliberately long comment line that should scroll inside the code block rather than the page',
      '```',
      '',
      '| Column | Value |',
      '| --- | --- |',
      '| a | 1 |',
      '',
      '![Fixture figure alt text](./images/fixture-figure.png)',
      '',
      '## Conclusion',
      '',
      'Closing paragraph for the fixture article.',
      '',
    ].join('\n'),
  );

  // Published article #2: a second topic, so topic filters render.
  cli('new', '--title', PUB2.title, '--slug', PUB2.slug);
  writeFileSync(join(article(PUB2.slug), 'index.mdx'), '## Overview\n\nA short second fixture article with enough text to be publishable as a test.\n');

  setRegistry(
    registry().map((p) =>
      p.slug === PUB.slug
        ? { ...p, topic: 'Fixture topic A', tags: ['fixture', 'testing'], summary: 'A published fixture used to verify article generation end to end.', coverImage: 'images/fixture-cover.png', coverAlt: 'Fixture cover alt text' }
        : p.slug === PUB2.slug
          ? { ...p, topic: 'Fixture topic B', summary: 'A second published fixture with a different topic for filter tests.' }
          : { ...p, coverImage: 'images/draft-only-cover.png', summary: `Draft summary ${DRAFT_MARKER}` },
    ),
  );
  cli('publish', '--slug', PUB.slug);
  cli('publish', '--slug', PUB2.slug);
  cli('validate');

  const build = spawnSync(process.execPath, [join(project, 'node_modules/astro/bin/astro.mjs'), 'build'], { cwd: root, encoding: 'utf8' });
  assert.equal(build.status, 0, `astro build failed:\n${build.stdout}\n${build.stderr}`);
  dist = join(root, 'dist');

  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.xml': 'application/xml', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.txt': 'text/plain' };
  server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = join(dist, path);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    if (!file.startsWith(dist) || !existsSync(file)) {
      res.writeHead(404, { 'content-type': 'text/html' }).end(readFileSync(join(dist, '404.html')));
      return;
    }
    res.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server?.close();
  if (root) rmSync(root, { recursive: true, force: true });
});

test('drafts leave no trace anywhere in the build output', () => {
  assert.equal(existsSync(join(dist, 'blog', DRAFT.slug)), false, 'draft route generated');
  const leaks = [];
  for (const file of walk(dist)) {
    const rel = file.slice(dist.length);
    if (/draft-only/.test(rel)) leaks.push(`asset ${rel}`);
    const ext = extname(file);
    if (['.html', '.xml', '.js', '.css', '.json', '.txt'].includes(ext)) {
      const text = readFileSync(file, 'utf8');
      for (const needle of [DRAFT_MARKER, DRAFT.slug, DRAFT.title, 'draft-only']) if (text.includes(needle)) leaks.push(`${rel} contains "${needle}"`);
    }
  }
  assert.deepEqual(leaks, []);
});

test('published article is generated with title, math, code, table and images', () => {
  const html = readFileSync(join(dist, 'blog', PUB.slug, 'index.html'), 'utf8');
  assert.equal((html.match(/<h1[\s>]/g) ?? []).length, 1, 'exactly one h1');
  assert.ok(html.includes(PUB.title));
  assert.match(html, /class="katex"/, 'inline math rendered');
  assert.match(html, /class="katex-display"/, 'display math rendered');
  assert.match(html, /<pre class="astro-code/, 'highlighted code block');
  assert.match(html, /--shiki-light:/, 'dual-theme code colours');
  assert.match(html, /<table/);
  assert.match(html, /<img[^>]+alt="Fixture figure alt text"[^>]+src="\/_astro\/[^"]+"|<img[^>]+src="\/_astro\/[^"]+"[^>]+alt="Fixture figure alt text"/, 'inline image emitted as a local asset');
  assert.match(html, /<img[^>]+src="\/_astro\/fixture-cover[^"]+"[^>]+alt="Fixture cover alt text"|alt="Fixture cover alt text"[^>]+src="\/_astro\/fixture-cover/, 'cover image emitted as a local asset');
  // Both images must be real files in dist (not inlined), which is what makes the draft-leak check meaningful.
  const assets = readdirSync(join(dist, '_astro'));
  assert.ok(assets.some((f) => f.startsWith('fixture-figure')), 'inline image file emitted');
  assert.ok(assets.some((f) => f.startsWith('fixture-cover')), 'cover image file emitted');
  assert.match(html, /"@type":"BlogPosting"/, 'BlogPosting JSON-LD');
  assert.match(html, /property="article:published_time"/);
  assert.match(html, /rel="canonical" href="https:\/\/debmalyapal\.github\.io\/blog\/zz-fixture-published\/"/);
  assert.doesNotMatch(html, /name="robots" content="noindex"/);
});

test('listing, RSS and sitemap include published posts only', () => {
  const listing = readFileSync(join(dist, 'blog/index.html'), 'utf8');
  assert.ok(listing.includes(PUB.title) && listing.includes(PUB2.title));
  const rss = readFileSync(join(dist, 'rss.xml'), 'utf8');
  assert.equal((rss.match(/<item>/g) ?? []).length, 2);
  assert.ok(rss.includes(`<link>https://debmalyapal.github.io/blog/${PUB.slug}/</link>`));
  assert.match(rss, /<pubDate>[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4}/);
  const sitemap = readFileSync(join(dist, 'sitemap-0.xml'), 'utf8');
  assert.ok(sitemap.includes(`/blog/${PUB.slug}/`) && sitemap.includes(`/blog/${PUB2.slug}/`));
});

test('article and listing pages pass axe and never scroll sideways', async () => {
  const browser = await chromium.launch();
  try {
    const problems = [];
    for (const theme of ['dark', 'light']) {
      for (const width of [320, 375, 768, 1024, 1440]) {
        const context = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: theme });
        const page = await context.newPage();
        for (const path of ['/blog/', `/blog/${PUB.slug}/`]) {
          await page.goto(base + path);
          await page.waitForLoadState('networkidle');
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
          if (overflow > 0) problems.push(`${theme} ${width}px ${path}: overflows by ${overflow}px`);
          if (width === 375 || width === 1440) {
            const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
            for (const v of violations) problems.push(`${theme} ${width}px ${path}: ${v.id} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
          }
        }
        await context.close();
      }
    }
    assert.deepEqual(problems, []);
  } finally {
    await browser.close();
  }
});

test('listing search and topic filters work after hydration', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.goto(`${base}/blog/`);
    await page.locator('astro-island:not([ssr])').first().waitFor({ state: 'attached' });
    const status = page.getByRole('status');
    await page.getByRole('button', { name: 'Fixture topic B' }).click();
    await assert.doesNotReject(status.filter({ hasText: '1 / 2' }).waitFor());
    assert.match(page.url(), /topic=Fixture\+topic\+B/);
    await page.getByRole('button', { name: 'All', exact: true }).click();
    await page.getByRole('searchbox').fill('no-such-article-zzz');
    await page.getByText('Nothing matches these filters.').waitFor();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await status.filter({ hasText: '2 / 2' }).waitFor();
  } finally {
    await browser.close();
  }
});

test('table of contents links jump to their headings', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(`${base}/blog/${PUB.slug}/`);
    const toc = page.getByRole('navigation', { name: 'On this page' });
    await toc.getByRole('link', { name: 'Conclusion' }).click();
    assert.match(page.url(), /#conclusion$/);
    assert.ok(await page.locator('#conclusion').isVisible());
  } finally {
    await browser.close();
  }
});
