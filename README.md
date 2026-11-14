# debmalyapal.github.io

Personal research and engineering portfolio for **Debmalya Pal**: a static site built with
Astro, TypeScript, Tailwind CSS v4 and React islands. Every piece of content (projects,
publications, experience, teaching, education, skills, and even nav labels and headings)
lives in JSON under `src/data/` and is validated with Zod at build time.

> Deployment has deliberately not been set up yet.

---

## Quick start

Requirements: Node.js 20+ (developed on Node 24) and npm.

```bash
npm install                        # install dependencies
npx playwright install chromium    # one-time: browser for end-to-end tests and Lighthouse

npm run dev                        # dev server with hot reload → http://localhost:4321/
npm run build                      # type-check + production build → dist/
npm run preview                    # serve dist/ exactly as it will be deployed → http://localhost:4321/
```

`npm run build` runs `astro check` first, so a TypeScript error or an invalid JSON entry
fails the build with a message naming the file and field.

> **Note on `npm run preview`:** Astro allows a single preview server per project. If it says
> "Preview server already running", either open the URL it prints or stop it with
> `npx astro preview stop`.

## Testing

| Command | What it runs |
| --- | --- |
| `npm test` | Vitest unit tests: sorting, date formatting, filters, slugs, schema validation, and loading every JSON file |
| `npm run build && npm run test:e2e` | Playwright against the production build, on desktop Chrome and a Pixel 7 profile (see below) |
| `npm run test:blog-cli` | Node tests for the blog CLI (scaffold, validate, publish) in throwaway folders |
| `npm run test:blog-build` | Builds a temporary copy of the site with fixture articles; checks article generation, images, RSS, sitemap, draft isolation, axe and mobile layout (about 30 s) |
| `npm run test:all` | All of the above, in order |
| `npm run test:e2e:browsers` | The Playwright smoke suite in Firefox and WebKit (opt-in; needs `npx playwright install firefox webkit`) |
| `npm run check` | Astro and TypeScript diagnostics only |
| `npm run lighthouse` | Lighthouse report for the home page. Run `npm run preview` in another terminal first |

The Playwright suite (`tests/e2e/smoke.spec.ts`) covers:

- every route returns 200, has exactly one `<h1>`, real body text, no `href="#"` links, and no JS errors
- primary navigation (including the mobile menu), and loading `/projects/when2reflect/` directly
- that `null` links render no button, while supplied links do
- project filters (including URL persistence and reset), publication search, the research atlas's `?theme=` sync, and CLARO stage stepping by keyboard
- skip link focus, animation on by default, and the OS `prefers-reduced-motion` fallback
- no horizontal overflow, clipped headings or diagram labels spilling out of their SVG at 320, 375, 768, 1024 and 1440 px
- axe accessibility checks (WCAG 2.1 A/AA plus axe best practices) on 12 pages, in dark and light themes, at both viewports
- the empty blog state, and that `/rss.xml` is valid and linked from every page
- a privacy scan of every generated file for phone numbers, street addresses, `tel:` links and personal webmail

## Project structure

```
src/
  data/            ← all content (JSON). Edit these to update the site.
  lib/
    schema.ts      Zod schemas: the contract every JSON file must satisfy
    data.ts        loads + validates all JSON, checks cross-references, sorts → `content`
    sort.ts        recency / featured / publication ordering
    format.ts      month and date-range formatting ("Apr 2026 – Present")
    filters.ts     search and filter logic shared by islands and tests
    slug.ts        slugify + base-path-aware URL helpers
    group.ts       groups consecutive roles at one organization for the timeline
    atlas.ts       serializable props for the research atlas
    jsonld.ts      schema.org Person / ScholarlyArticle / BlogPosting (only from factual fields)
    blog.ts        blog sorting, filtering, reading time, the published-only gate
    blog-content.ts  joins blogs.json with MDX bodies (server-side only)
    blog-images.ts   article cover images (published posts only)
  content/blog/    blog article bodies: <slug>/index.mdx + <slug>/images/
  content.config.ts  blog collection; loads only published articles in production builds
  integrations/blog-covers.mjs  Vite module importing published covers only
  components/      static Astro/React components (cards, rows, timeline, nav, SEO)
  islands/         interactive React components hydrated in the browser
    SignalFieldHero.tsx   canvas particle field in the home hero
    ResearchAtlas.tsx     theme ↔ project ↔ publication map
    ConceptualDag.tsx     CLARO planner → capabilities → evidence → synthesis diagram
    ReflectionPaths.tsx   When2Reflect direct vs. reflection-induced branches
    ProjectFilters.tsx    /projects/ search and filters
    PublicationSearch.tsx /publications/ search and filters
    BlogSearch.tsx        /blog/ search and topic filters
  layouts/BaseLayout.astro
  pages/           one file per route; projects/[slug].astro and blog/[slug].astro generate detail pages
  styles/global.css  design tokens, themes, base styles
scripts/blog.mjs   blog CLI (blog:new, blog:validate, blog:publish)
tests/
  unit/            Vitest
  e2e/             Playwright + axe
  blog-*.test.mjs  blog CLI and fixture-build tests (node --test)
.claude/skills/blog-publisher, .agents/skills/blog-publisher   agent skill for Claude Code / Codex
```

Every page is pre-rendered to static HTML, including the output of the interactive
components. The islands then hydrate to add interaction, so content is readable and crawlable
without JavaScript.

---

## Updating content

All content is in `src/data/`. After editing, run `npm run build` (or keep `npm run dev`
running). If something is wrong, the build stops with a message such as:

```
Invalid content in src/data/projects.json:
  • 3.start: Expected YYYY-MM
```

### Conventions used in every file

- **Dates** are `"YYYY-MM"` strings. `"end": null` means ongoing and displays as "Present".
  An end date in the future displays as "Expected Mon YYYY".
- **Links** are full `https://` URLs or `null`. **A `null` link never renders a button**, so
  never use a placeholder such as `"#"`.
- **Slugs and ids** are lowercase kebab-case (`my-new-project`) and must be unique.
- **Theme ids** must match an `id` in `research.json` (`interpretability`, `reasoning`,
  `agents`, `trustworthy`). Unknown ids fail the build.
- Order in the file doesn't matter. Lists are sorted automatically (see below).

### Add a project

Append an object to `src/data/projects.json`. A new page is generated at
`/projects/<slug>/`, and the project appears in `/projects/`, the research atlas, and related-project
links automatically.

```jsonc
{
  "slug": "my-new-project",              // URL: /projects/my-new-project/
  "title": "Full Title: With a Subtitle",
  "shortTitle": "Full Title",            // used on cards, the atlas, and the page <h1>
  "kind": "research",                    // "research" | "engineering"
  "status": "ongoing",                   // "ongoing" | "completed"
  "featured": false,                     // true → large card on home and /projects/
  "start": "2026-11",
  "end": null,                           // null = ongoing
  "affiliation": null,                   // e.g. "UC San Diego · advised by …" or null
  "role": null,                          // e.g. "Lead engineer" or null
  "summary": "One or two sentences shown on cards.",
  "description": ["Paragraph shown on the project page.", "Another paragraph."],
  "highlights": ["What you did, one bullet per entry."],
  "metrics": [
    { "value": "~40%", "label": "latency reduction", "context": "Where the number comes from." }
  ],
  "stack": ["Python", "PyTorch"],
  "themes": ["reasoning"],               // ids from research.json
  "diagram": null,                       // "claro-dag" | "reflection-paths" | null
  "links": { "repo": null, "demo": null, "paper": null, "project": null }
}
```

Only `slug`, `title`, `shortTitle`, `kind`, `status`, `start` and `summary` are required.
Everything else has a safe default (empty list, `null`, or `false`).

**Ordering:** featured projects come first, then ongoing ones, then the rest by most recent
end date and then start date. **Metrics** are shown under "Reported results". Only include
numbers you can stand behind, and use `context` to say where each comes from. The first
metric also appears on the featured card.

**Diagrams:** `diagram` selects one of the two built-in conceptual diagrams. Their text
lives in `src/data/diagrams.json`. A new kind of diagram needs a new component in
`src/islands/`, a new enum value in `projectSchema` (`src/lib/schema.ts`), and a branch in
`src/components/ProjectDiagram.astro`.

**Linking a project to a role:** add its slug to the `projects` array of an entry in
`experience.json`. The project page then shows "Part of: <role>", and the build fails if the
slug doesn't exist.

### Add a publication

Append to `src/data/publications.json`:

```jsonc
{
  "id": "short-kebab-id-2027",
  "title": "Paper Title",
  "venue": "Full Venue Name",
  "venueShort": "Venue",
  "year": 2027,
  "type": "conference",                  // "conference" | "workshop" | "journal" | "preprint"
  "peerReviewed": true,                  // true | false | null (unknown)
  "authorship": "First author",          // or null
  "authors": null,                       // full ordered author list, e.g. ["A. Author", "Debmalya Pal"]
  "abstract": null,
  "summary": "One-line description shown in the list.",
  "themes": ["interpretability"],
  "links": { "paper": null, "pdf": null, "code": null, "doi": null }   // doi is the bare DOI, e.g. "10.18653/v1/…"
}
```

Paper, PDF, Code and DOI buttons appear only for non-null links. Schema.org
`ScholarlyArticle` metadata is emitted only when `authors` is filled in, so incomplete
author data is never published as fact.

### Write a blog article

Articles are MDX files with their metadata in `src/data/blogs.json`. New articles are always
drafts. Drafts can be previewed in `npm run dev`, but never appear in a production build.

```bash
npm run blog:new -- --title "When does reflection help?"   # scaffold a draft
# write src/content/blog/when-does-reflection-help/index.mdx (start at "## ")
# put figures in .../images/ and reference them as ![Alt text](./images/figure.webp)
# set topic, tags and a real summary in src/data/blogs.json
npm run blog:validate                                         # check metadata, files, images
npm run dev                                                   # preview (draft banner shown)
npm run blog:publish -- --slug when-does-reflection-help      # mark published (no push/deploy)
npm run build                                                 # article, listing, RSS, sitemap
```

Articles support math (`$…$`, `$$…$$` via KaTeX), highlighted code that follows the theme,
tables, local images, an automatic table of contents (from `##`/`###` headings), and reading
time. Agents (Claude Code, Codex) use the `blog-publisher` skill, which follows the same rules.

Writing notes:

- Delete the `{/* BLOG-TEMPLATE: … */}` line; publishing refuses while it remains. Use MDX
  comments (`{/* … */}`); HTML comments are not valid MDX.
- Keep images in the article's `images/` folder, never in `public/`. They are optimised at build time.
- For an interactive figure, add a React component under `src/components/blog/`, import it in the
  MDX and render it with `client:visible`. It must respect `prefers-reduced-motion`.
- To unpublish, set `status` back to `"draft"` in `blogs.json`.

| `blogs.json` field | Notes |
| --- | --- |
| `title` | The page `<h1>`, card title and RSS title. |
| `topic` | One topic; becomes a filter on `/blog/` once there are two or more topics. |
| `tags` | Optional list of strings. |
| `summary` | 30+ characters, no "Draft" prefix. Used as the lede, meta description and RSS description. |
| `publishedAt` | `YYYY-MM-DD`. Set by `blog:publish` (local date) if empty. |
| `updatedAt` | Optional `YYYY-MM-DD`, not before `publishedAt`. |
| `featured` | `true` pins the article to the top of the listing. |
| `coverImage` / `coverAlt` | Optional `images/<file>` inside the article folder; `coverAlt` is `null` for a decorative cover. |
| `status` | `draft` or `published`. Use `blog:publish` rather than editing by hand. |
| `contentPath` | Always `<slug>/index.mdx`. Set by `blog:new`. |

Drafts stay private: a production build compiles only published articles
(`src/content.config.ts`), and cover images come from `virtual:blog-covers`
(`src/integrations/blog-covers.mjs`), which includes published covers only. `npm run
test:blog-build` builds a temporary copy of the site with a marked fixture draft and fails if
any trace of it reaches the output.

The blog ships empty. `/blog/` shows a plain "No articles have been published yet."
until the first article is published.

### Add or update experience, teaching, education, skills

| File | One entry is… | Notes |
| --- | --- | --- |
| `experience.json` | a role | Consecutive roles at the same `organization` are grouped on the timeline. `kind`: `"research"` or `"industry"`. `projects` lists related project slugs. |
| `teaching.json` | a course appointment | `links` is a list of `{ "label", "url" }`. Leave it empty rather than adding placeholders. |
| `education.json` | a degree | `gpa` and `coursework` are optional. |
| `skills.json` | a skill group | `{ "group": "…", "items": ["…"] }`. Shown on /about/ in file order. |

### Profile, contact, and site copy

- `profile.json`: name, position, headline, bio paragraphs, research interests, languages and
  contact details. Social links (`github`, `linkedin`, `scholar`, `orcid`) render only when
  non-null. Set `cv` to a path such as `"/cv.pdf"` (and put the file in `public/`) to show a CV
  button, but **only publish a sanitized CV** with no phone number or home address.
- `research.json`: the research intro and the four themes (id, title, question, summary).
- `diagrams.json`: all text in the CLARO and When2Reflect diagrams, including the reported
  comparison values and captions.
- `site.json`: site title and description, navigation, page headings and ledes, and every UI
  label (buttons, filter names, empty states). Nav `href`s are base-relative (`"projects/"`).

### Privacy

The e2e privacy test scans every generated file for phone numbers, street addresses,
`tel:` links and personal webmail addresses. Run `npm run build && npm run test:e2e`
before publishing any content change that touches contact details.

---

## Accessibility and motion

- Dark theme by default, with a light theme. The theme follows the OS on first visit and is
  then remembered. Both themes are checked with axe.
- Animation is on by default. When the OS requests reduced motion, all motion stops: the hero
  freezes to a still frame and diagram transitions become instant. There is no in-page
  switch; the site follows the OS setting, including live changes.
- The hero animation pauses when off-screen or in a background tab, and lowers its particle
  density on low-power devices or when frames run slow.
- All interactions work by keyboard, with a skip link and visible focus rings. Each
  diagram's content is also available as text.
