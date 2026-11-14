import { expect, test, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import projects from '../../src/data/projects.json' with { type: 'json' };
import site from '../../src/data/site.json' with { type: 'json' };
import blogs from '../../src/data/blogs.json' with { type: 'json' };

/** Waits until the named island has hydrated (Astro removes `ssr` once it has). */
async function hydrated(page: Page, component: string) {
  const island = page.locator(`astro-island[component-url*="/${component}."]`).first();
  await island.scrollIntoViewIfNeeded();
  await expect(island).not.toHaveAttribute('ssr');
}

const PAGES = ['/', ...site.nav.map((n) => `/${n.href}`), ...projects.map((p) => `/projects/${p.slug}/`)];

test.describe('every page', () => {
  for (const path of PAGES) {
    test(`${path} renders one h1, readable text, and no placeholder links`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      await expect(page.locator('h1')).toHaveCount(1);
      // An empty blog is legitimately short; it must then say so explicitly instead.
      if (path === '/blog/' && !blogs.some((b: { status: string }) => b.status === 'published')) {
        await expect(page.getByText(site.labels.blogEmpty)).toBeVisible();
      } else {
        expect((await page.locator('main').innerText()).length).toBeGreaterThan(200);
      }
      await expect(page.locator('a[href="#"], a[href=""], a:not([href])')).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  }
});

test('tab titles are concise and every page uses the [DP] favicon', async ({ page, request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'head checks run once');
  const expected: [string, string][] = [
    ['/', 'Debmalya Pal'],
    ...site.nav.map((n): [string, string] => [`/${n.href}`, `${(site.pages as Record<string, { title?: string }>)[n.href.slice(0, -1)]?.title} | Debmalya Pal`]),
    ...projects.map((p): [string, string] => [`/projects/${p.slug}/`, `${p.shortTitle} | Debmalya Pal`]),
  ];
  for (const [path, title] of expected) {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', title);
    await expect(page.locator('link[rel="icon"]')).toHaveCount(1);
    await expect(page.locator('link[rel="icon"]')).toHaveAttribute('href', '/favicon.svg');
  }
  const icon = await request.get('/favicon.svg');
  expect(icon.status()).toBe(200);
  expect(icon.headers()['content-type']).toContain('image/svg+xml');
  expect(readdirSync('dist').filter((f) => /^favicon\.(ico|png)$/.test(f))).toEqual([]);
});

test('primary navigation reaches every section', async ({ page, isMobile }) => {
  await page.goto('/');
  for (const item of site.nav) {
    if (isMobile) await page.getByRole('button', { name: site.labels.menu }).click();
    const nav = page.getByRole('navigation', { name: isMobile ? 'Primary mobile' : 'Primary' });
    await nav.getByRole('link', { name: item.label, exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/${item.href}$`));
    // The mobile menu is closed after navigating, so check the DOM rather than the accessibility tree.
    await expect(page.locator('header nav a[aria-current="page"]').first()).toHaveText(item.label);
  }
});

test('project detail loads directly and links back', async ({ page }) => {
  await page.goto('/projects/when2reflect/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('When2Reflect');
  await expect(page.getByText('0.07 → 0.37').first()).toBeVisible();
  await page.getByRole('link', { name: site.labels.backToProjects }).first().click();
  await expect(page).toHaveURL(/\/projects\/$/);
});

test('null project links render no buttons; supplied links do', async ({ page }) => {
  await page.goto('/projects/claro/');
  await expect(page.getByRole('link', { name: /Project page/ })).toHaveAttribute('href', 'https://hxi.ucsd.edu/project/claro/');
  await page.goto('/projects/when2reflect/');
  for (const label of [site.labels.repo, site.labels.demo, site.labels.paper, site.labels.project]) {
    await expect(page.getByRole('link', { name: new RegExp(`^${label}\\b`) })).toHaveCount(0);
  }
});

test('project filters narrow, persist to the URL, and reset', async ({ page }) => {
  await page.goto('/projects/');
  await hydrated(page, 'ProjectFilters');
  const results = page.getByRole('status');
  await expect(results).toHaveText(`${projects.length} / ${projects.length}`);
  await page.getByRole('group', { name: site.labels.type }).getByRole('button', { name: site.enums.kind.engineering }).click();
  const engineering = projects.filter((p) => p.kind === 'engineering').length;
  await expect(results).toHaveText(`${engineering} / ${projects.length}`);
  await expect(page).toHaveURL(/kind=engineering/);
  await page.getByRole('searchbox').fill('zzzz-no-match');
  await expect(page.getByText(site.labels.noResults)).toBeVisible();
  await page.getByRole('button', { name: site.labels.clearFilters }).click();
  await expect(results).toHaveText(`${projects.length} / ${projects.length}`);
});

test('publication search filters by text', async ({ page }) => {
  await page.goto('/publications/');
  await hydrated(page, 'PublicationSearch');
  await page.getByRole('searchbox').fill('stylometry');
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1);
});

test('research atlas highlights a theme with buttons and syncs ?theme=', async ({ page }) => {
  await page.goto('/research/');
  await hydrated(page, 'ResearchAtlas');
  await page.getByRole('button', { name: /LLM Reasoning/ }).click();
  await expect(page).toHaveURL(/theme=reasoning/);
  await expect(page.getByRole('heading', { name: new RegExp(site.labels.relatedProjects) })).toContainText('(1)');
});

test('CLARO diagram steps through stages by keyboard', async ({ page }) => {
  await page.goto('/projects/claro/');
  await hydrated(page, 'ConceptualDag');
  const next = page.getByRole('button', { name: site.labels.nextStage });
  await next.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /Execute/ })).toHaveAttribute('aria-pressed', 'true');
});

test.describe('blog', () => {
  // The registry ships empty; tests/blog-build.test.mjs covers real articles with fixtures.
  test('empty blog shows a plain empty state and no search UI', async ({ page }) => {
    await page.goto('/blog/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(site.pages.blog.heading);
    await expect(page.getByText(site.labels.blogEmpty)).toBeVisible();
    await expect(page.getByRole('searchbox')).toHaveCount(0);
    await expect(page.locator('main article')).toHaveCount(0);
  });

  test('RSS feed is valid XML, discoverable, and empty', async ({ page, request }) => {
    const res = await request.get('/rss.xml');
    expect(res.status()).toBe(200);
    const xml = await res.text();
    expect(xml).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?><rss version="2.0">/);
    expect(xml).toContain(`<title>${site.rss.title}</title>`);
    expect(xml).not.toContain('<item>');
    await page.goto('/');
    await expect(page.locator('link[rel="alternate"][type="application/rss+xml"]')).toHaveAttribute('href', '/rss.xml');
  });
});

test('skip link moves focus to main content', async ({ page, isMobile, browserName }) => {
  test.skip(isMobile, 'keyboard test runs on desktop');
  await page.goto('/about/');
  // macOS WebKit/Safari skips links on Tab by default; Option+Tab is the platform's link-reaching key.
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  const skip = page.getByRole('link', { name: site.labels.skipLink });
  await expect(skip).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
});

test.describe('motion', () => {
  test('animation is on by default, with no in-page switch', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'full');
    await expect(page.locator('canvas[data-signal-field]')).toHaveAttribute('data-signal-field', 'live');
    await expect(page.getByRole('switch')).toHaveCount(0);
    expect(await page.evaluate(() => localStorage.getItem('motion'))).toBeNull();
  });

  test('follows a live change to the OS reduced-motion setting', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas[data-signal-field]');
    await expect(canvas).toHaveAttribute('data-signal-field', 'live');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await expect(canvas).toHaveAttribute('data-signal-field', 'static');
  });

  test.describe('with prefers-reduced-motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('starts static with no animated backdrop', async ({ page }) => {
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduced');
      await expect(page.locator('canvas[data-signal-field]')).toHaveAttribute('data-signal-field', 'static');
      const duration = await page.locator('.signal-backdrop').first().evaluate((el) => getComputedStyle(el).animationDuration);
      expect(parseFloat(duration)).toBeLessThan(0.01);
    });
  });
});

test.describe('layout', () => {
  for (const width of [320, 375, 768, 1024, 1440]) {
    test(`no horizontal overflow at ${width}px`, async ({ page, isMobile }) => {
      test.skip(isMobile, 'widths are set explicitly on desktop');
      await page.setViewportSize({ width, height: 900 });
      for (const path of ['/', '/research/', '/projects/', '/projects/claro/', '/projects/when2reflect/', '/publications/', '/blog/', '/experience/', '/about/', '/contact/']) {
        await page.goto(path);
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        expect(overflow, path).toBeLessThanOrEqual(0);
        // Headings must not be clipped by their own box.
        const clipped = await page.$$eval('h1, h2', (els) => els.filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent));
        expect(clipped, path).toEqual([]);
        // Diagram labels must stay inside their SVG (they are clipped by the viewBox otherwise).
        const spill = await page.$$eval('svg text', (els) =>
          els
            .filter((t) => t.getClientRects().length > 0)
            .filter((t) => {
              const r = t.getBoundingClientRect();
              const s = t.closest('svg')!.getBoundingClientRect();
              return r.left < s.left - 1 || r.right > s.right + 1;
            })
            .map((t) => t.textContent),
        );
        expect(spill, path).toEqual([]);
      }
    });
  }
});

test.describe('accessibility (axe)', () => {
  for (const theme of ['dark', 'light'] as const) {
    for (const path of ['/', '/research/', '/projects/', '/projects/when2reflect/', '/projects/claro/', '/publications/', '/blog/', '/experience/', '/teaching/', '/about/', '/contact/', '/404.html']) {
      test(`${path} has no WCAG A/AA or best-practice violations (${theme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: theme, reducedMotion: 'reduce' });
        await page.goto(path);
        await page.waitForLoadState('networkidle');
        const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']).analyze();
        expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
      });
    }
  }
});

test('no developer-facing or instructional copy in the build output', async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'file scan runs once');
  const html: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.html')) html.push(full);
    }
  };
  walk('dist');
  const banned = [/disturb the field/i, /built with astro/i, /maintained in JSON/i, /validated at build time/i, /\bmove, tap\b/i];
  const hits = html.flatMap((f) => banned.filter((re) => re.test(readFileSync(f, 'utf8'))).map((re) => `${f}: ${re}`));
  expect(hits).toEqual([]);
});

/**
 * Privacy gate over every generated file (HTML, XML, JSON, JS), not just rendered pages.
 * Patterns are generic on purpose so the private values themselves never live in the repo.
 */
test('no sensitive personal data in the build output', async ({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'file scan runs once');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(html|xml|json|js|txt|css)$/.test(entry.name)) files.push(full);
    }
  };
  walk('dist');
  expect(files.length).toBeGreaterThan(10);
  const patterns: [string, RegExp][] = [
    ['tel: link', /href=["']tel:/i],
    ['US phone number', /(?<![\d.])\(?\d{3}\)?[-. ]\d{3}[-. ]\d{4}(?!\d)/],
    ['street address', /(?<![-\w])\d{2,5}\s+[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\s+(?:St|Street|Ave|Avenue|Rd|Road|Blvd|Dr|Drive|Ln|Lane|Ct|Way)\b\.?/],
    ['personal webmail', /[\w.+-]+@(?:gmail|yahoo|outlook|hotmail|icloud)\.com/i],
  ];
  const hits: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    for (const [label, re] of patterns) {
      const m = re.exec(text);
      if (m) hits.push(`${file}: ${label} → ${m[0]}`);
    }
  }
  expect(hits).toEqual([]);
});
