#!/usr/bin/env node
/**
 * Blog authoring CLI. Built-in Node modules only, so it runs without a build.
 *
 *   npm run blog:new -- --title "Article title" [--slug custom-slug]
 *   npm run blog:validate
 *   npm run blog:publish -- --slug article-slug
 *
 * Metadata lives in src/data/blogs.json; bodies in src/content/blog/<slug>/index.mdx.
 * These checks mirror blogPostSchema in src/lib/schema.ts; keep the two in sync.
 * Nothing here commits, pushes or deploys.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.env.BLOG_ROOT || process.cwd());
const indexFile = join(root, 'src/data/blogs.json');
const contentDir = join(root, 'src/content/blog');
const args = process.argv.slice(2);
const command = args[0];

/** The scaffold marker. An MDX comment: HTML comments are not valid MDX. */
const TEMPLATE_MARKER = '{/* BLOG-TEMPLATE:';
const KEYS = ['slug', 'title', 'topic', 'tags', 'summary', 'publishedAt', 'updatedAt', 'status', 'featured', 'contentPath', 'coverImage', 'coverAlt'];

function option(name) {
  const equals = args.find((arg) => arg.startsWith(`--${name}=`));
  if (equals) return equals.slice(name.length + 3);
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : undefined;
}
function die(message) {
  console.error(`Blog: ${message}`);
  process.exit(1);
}
function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
const slugSafe = (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
const realDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
/** Today's date in the author's own time zone, not UTC. */
function localToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Body text outside fenced code blocks, for structural checks. */
const prose = (body) => body.replace(/^(```|~~~)[\s\S]*?^\1/gm, '');
const isDraftSummary = (summary) => summary.trim().length < 30 || /^draft\b/i.test(summary.trim());

function readIndex() {
  if (!existsSync(indexFile)) die(`Missing ${indexFile}`);
  let posts;
  try {
    posts = JSON.parse(readFileSync(indexFile, 'utf8'));
  } catch (err) {
    die(`Invalid JSON in src/data/blogs.json: ${err.message}`);
  }
  if (!Array.isArray(posts)) die('blogs.json must be an array');
  return posts;
}
/** Write to a temp file then rename, so an interrupted run never leaves half-written JSON. */
function saveIndex(posts) {
  const tmp = `${indexFile}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(posts, null, 2)}\n`, 'utf8');
  renameSync(tmp, indexFile);
}

function validate({ quiet = false } = {}) {
  const posts = readIndex();
  const slugs = new Set();
  for (const [i, post] of posts.entries()) {
    if (!post || typeof post !== 'object' || Array.isArray(post)) die(`Entry ${i} must be an object`);
    const { slug, title, topic, summary, contentPath, coverImage, coverAlt, status, publishedAt, updatedAt, tags, featured } = post;
    if (typeof slug !== 'string' || !slugSafe(slug)) die(`Entry ${i}: slug must be lowercase kebab-case`);
    const unknown = Object.keys(post).filter((k) => !KEYS.includes(k));
    if (unknown.length) die(`${slug}: unknown field(s) ${unknown.join(', ')}`);
    if (slugs.has(slug)) die(`Duplicate slug: ${slug}`);
    slugs.add(slug);
    if (typeof title !== 'string' || !title.trim()) die(`${slug}: title required`);
    if (typeof topic !== 'string' || !topic.trim()) die(`${slug}: topic required`);
    if (typeof summary !== 'string') die(`${slug}: summary required`);
    if (tags !== undefined && (!Array.isArray(tags) || tags.some((t) => typeof t !== 'string' || !t.trim()))) die(`${slug}: tags must be non-empty strings`);
    if (featured !== undefined && typeof featured !== 'boolean') die(`${slug}: featured must be true or false`);
    if (!['draft', 'published'].includes(status)) die(`${slug}: status must be "draft" or "published"`);
    if (contentPath !== `${slug}/index.mdx`) die(`${slug}: contentPath must be "${slug}/index.mdx"`);
    if (publishedAt != null && !realDate(publishedAt)) die(`${slug}: publishedAt must be a real YYYY-MM-DD date`);
    if (updatedAt != null && !realDate(updatedAt)) die(`${slug}: updatedAt must be a real YYYY-MM-DD date`);
    if (updatedAt && publishedAt && updatedAt < publishedAt) die(`${slug}: updatedAt must not precede publishedAt`);
    if (coverAlt != null && typeof coverAlt !== 'string') die(`${slug}: coverAlt must be a string or null`);

    const article = join(contentDir, slug, 'index.mdx');
    if (!existsSync(article)) die(`${slug}: missing src/content/blog/${slug}/index.mdx`);
    const body = readFileSync(article, 'utf8');
    if (/^---\s*$/m.test(body.split('\n', 1)[0])) die(`${slug}: metadata belongs in blogs.json, not MDX frontmatter`);
    if (/^#\s/m.test(prose(body))) die(`${slug}: start sections at "## " — the page already renders the title as the only <h1>`);

    if (coverImage != null) {
      if (typeof coverImage !== 'string' || !/^images\/[\w.-]+\.(png|jpe?g|webp|avif|svg)$/i.test(coverImage)) die(`${slug}: coverImage must be images/<file>.(png|jpg|webp|avif|svg)`);
      if (!existsSync(join(contentDir, slug, coverImage))) die(`${slug}: coverImage not found at src/content/blog/${slug}/${coverImage}`);
    }
    if (status === 'published') {
      if (!publishedAt) die(`${slug}: published posts need publishedAt`);
      if (isDraftSummary(summary)) die(`${slug}: write a real summary (30+ characters) before publishing`);
      if (body.includes(TEMPLATE_MARKER) || !body.trim()) die(`${slug}: replace the article template before publishing`);
    }
  }
  // Every article folder must be registered, or its body would silently never appear.
  if (existsSync(contentDir)) {
    for (const entry of readdirSync(contentDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && !slugs.has(entry.name)) {
        die(`src/content/blog/${entry.name}/ has no entry in blogs.json (add one with blog:new, or remove the folder)`);
      }
    }
  }
  if (!quiet) console.log(`Validated ${posts.length} blog post(s): ${posts.filter((p) => p.status === 'published').length} published, ${posts.filter((p) => p.status === 'draft').length} draft.`);
  return posts;
}

if (command === 'new') {
  const title = option('title');
  if (!title || !title.trim()) die('Usage: npm run blog:new -- --title "Your article title" [--slug custom-slug]');
  const slug = option('slug') || slugify(title);
  if (!slugSafe(slug)) die(`Slug "${slug}" must be lowercase kebab-case`);
  const posts = validate({ quiet: true });
  if (posts.some((post) => post.slug === slug)) die(`Slug already exists: ${slug}`);
  const folder = join(contentDir, slug);
  if (existsSync(folder)) die(`Folder already exists: src/content/blog/${slug}`);
  mkdirSync(join(folder, 'images'), { recursive: true });
  writeFileSync(
    join(folder, 'index.mdx'),
    `${TEMPLATE_MARKER} delete this line once the article is written. Metadata lives in src/data/blogs.json. */}\n\n## Introduction\n\nWrite your article here.\n`,
    'utf8',
  );
  writeFileSync(join(folder, 'images', '.gitkeep'), '', 'utf8');
  posts.push({
    slug,
    title: title.trim(),
    topic: 'Research notes',
    tags: [],
    summary: 'Draft: add an accurate public summary before publishing.',
    publishedAt: null,
    updatedAt: null,
    status: 'draft',
    featured: false,
    contentPath: `${slug}/index.mdx`,
    coverImage: null,
    coverAlt: null,
  });
  saveIndex(posts);
  console.log(`Created draft src/content/blog/${slug}/index.mdx and registered it in src/data/blogs.json (status: draft).`);
} else if (command === 'validate') {
  validate();
} else if (command === 'publish') {
  const slug = option('slug');
  if (!slug || !slugSafe(slug)) die('Usage: npm run blog:publish -- --slug article-slug');
  const posts = validate({ quiet: true });
  const article = posts.find((post) => post.slug === slug);
  if (!article) die(`Unknown slug: ${slug}`);
  if (article.status === 'published') die(`${slug} is already published (on ${article.publishedAt})`);
  const body = readFileSync(join(contentDir, slug, 'index.mdx'), 'utf8');
  if (isDraftSummary(article.summary)) die('First replace the draft summary in blogs.json with a real one (30+ characters)');
  if (body.includes(TEMPLATE_MARKER) || prose(body).replace(/\{\/\*[\s\S]*?\*\/\}/g, '').trim().length < 60) die('First finish the MDX article body (and delete the template line)');
  const proposed = { ...article, status: 'published', publishedAt: article.publishedAt || localToday() };
  saveIndex(posts.map((post) => (post.slug === slug ? proposed : post)));
  validate({ quiet: true });
  console.log(`Published ${slug} (publishedAt ${proposed.publishedAt}). It appears on the next build. Nothing was committed, pushed or deployed.`);
} else {
  die('Commands: new --title "..." [--slug ...] | validate | publish --slug ...');
}
