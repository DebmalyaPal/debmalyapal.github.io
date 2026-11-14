---
name: blog-publisher
description: Create, import, edit, validate and publish blog articles in this Astro portfolio (MDX body per folder, metadata in src/data/blogs.json). Use when the user wants to start, import, format, review or publish a blog post or article.
---

# Blog publisher

Read "Write a blog article" in `README.md` before editing. The rules below are enforced by
`scripts/blog.mjs` and `blogPostSchema` in `src/lib/schema.ts`.

## Where things live

- Body: `src/content/blog/<slug>/index.mdx`. No frontmatter.
- Images: `src/content/blog/<slug>/images/`. Reference them as `![Alt](./images/name.webp)`.
  Never copy them to `public/`.
- Metadata (title, topic, tags, summary, dates, status, featured, cover): only in
  `src/data/blogs.json`. Never duplicate it in the MDX or in page code.

## Steps

1. Scaffold with `npm run blog:new -- --title "Title" [--slug custom-slug]`. Don't hand-create
   folders or registry entries.
2. Write the body starting at `## ` headings. The page renders the title as the only `<h1>`,
   and validation rejects `# ` headings outside code blocks. Delete the
   `{/* BLOG-TEMPLATE: … */}` line once there is real content.
3. In `blogs.json`, set `topic`, `tags`, and a real `summary` (30+ characters). For a cover,
   set `coverImage` to `images/<file>` and `coverAlt` to a description, or leave `coverAlt`
   null for a purely decorative cover.
4. Run `npm run blog:validate`, then `npm run build`.
5. Preview locally with `npm run dev`. Drafts are visible there with a "Draft preview" banner,
   and never in a production build.
6. Publish only when the user explicitly asks: `npm run blog:publish -- --slug <slug>`.
   This only edits `blogs.json` (status `published`, `publishedAt` = today, local time).

## Integrity

- Leave new articles as `draft` unless the user explicitly says to publish.
- When importing the user's draft, preserve their factual claims and voice. Suggest edits
  separately rather than silently rewriting.
- Never invent citations, quotes, DOIs, paper results, numbers, figures or image sources.
  Verify that every referenced asset exists.
- For interactive figures, add a local React component and import it in the MDX
  (`client:visible`). It must respect `prefers-reduced-motion` and use the site's design tokens.

## Reporting

Report the actual output of `blog:validate`, the build and any tests you ran. Never git
commit, push, deploy or configure GitHub Pages without explicit authorization.
