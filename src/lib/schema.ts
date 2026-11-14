import { z } from 'zod';

/** Canonical month precision used in all JSON files: `YYYY-MM`. */
export const isoMonth = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Expected YYYY-MM');

/** A URL that may be missing. `null` means "not provided" — never render a button for it. */
const optionalUrl = z.url().nullable().default(null);

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slugs must be lowercase kebab-case');

export const profileSchema = z.object({
  name: z.string().min(1),
  givenName: z.string(),
  familyName: z.string(),
  position: z.string(),
  institution: z.string(),
  institutionShort: z.string(),
  department: z.string().nullable().default(null),
  location: z.string(),
  headline: z.string(),
  positioning: z.string(),
  intro: z.string(),
  bio: z.array(z.string()).min(1),
  collaborationNote: z.string().nullable().default(null),
  researchInterests: z.array(z.string()),
  contact: z.object({
    email: z.email(),
    github: optionalUrl,
    githubHandle: z.string().nullable().default(null),
    linkedin: optionalUrl,
    linkedinHandle: z.string().nullable().default(null),
    scholar: optionalUrl,
    orcid: optionalUrl,
    cv: z.string().nullable().default(null),
  }),
  languages: z.array(z.object({ name: z.string(), level: z.string() })).default([]),
  headshot: z.string().nullable().default(null),
});

export const themeSchema = z.object({
  id: slugSchema,
  title: z.string(),
  short: z.string(),
  question: z.string(),
  summary: z.string(),
  keywords: z.array(z.string()).default([]),
});

export const researchSchema = z.object({
  intro: z.string(),
  themes: z.array(themeSchema).min(1),
});

const metricSchema = z.object({
  value: z.string(),
  label: z.string(),
  context: z.string().nullable().default(null),
});

export const projectSchema = z
  .object({
    slug: slugSchema,
    title: z.string().min(1),
    shortTitle: z.string().min(1),
    kind: z.enum(['research', 'engineering']),
    status: z.enum(['ongoing', 'completed']),
    featured: z.boolean().default(false),
    start: isoMonth,
    end: isoMonth.nullable().default(null),
    affiliation: z.string().nullable().default(null),
    role: z.string().nullable().default(null),
    summary: z.string().min(1),
    description: z.array(z.string()).default([]),
    highlights: z.array(z.string()).default([]),
    metrics: z.array(metricSchema).default([]),
    stack: z.array(z.string()).default([]),
    themes: z.array(slugSchema).default([]),
    diagram: z.enum(['claro-dag', 'reflection-paths']).nullable().default(null),
    links: z
      .object({ repo: optionalUrl, demo: optionalUrl, paper: optionalUrl, project: optionalUrl })
      .default({ repo: null, demo: null, paper: null, project: null }),
  })
  .refine((p) => !p.end || p.end >= p.start, { message: 'end must not precede start', path: ['end'] });

export const publicationSchema = z.object({
  id: slugSchema,
  title: z.string().min(1),
  venue: z.string(),
  venueShort: z.string(),
  year: z.number().int().min(1900).max(2100),
  type: z.enum(['conference', 'workshop', 'journal', 'preprint']),
  peerReviewed: z.boolean().nullable().default(null),
  authorship: z.string().nullable().default(null),
  authors: z.array(z.string()).nullable().default(null),
  abstract: z.string().nullable().default(null),
  summary: z.string().nullable().default(null),
  themes: z.array(slugSchema).default([]),
  links: z
    .object({ paper: optionalUrl, pdf: optionalUrl, code: optionalUrl, doi: z.string().nullable().default(null) })
    .default({ paper: null, pdf: null, code: null, doi: null }),
});

export const experienceSchema = z.object({
  id: slugSchema,
  organization: z.string(),
  unit: z.string().nullable().default(null),
  role: z.string(),
  kind: z.enum(['research', 'industry']),
  location: z.string().nullable().default(null),
  start: isoMonth,
  end: isoMonth.nullable().default(null),
  advisor: z.string().nullable().default(null),
  client: z.string().nullable().default(null),
  summary: z.string().nullable().default(null),
  highlights: z.array(z.string()).default([]),
  stack: z.array(z.string()).default([]),
  projects: z.array(slugSchema).default([]),
});

const linkSchema = z.object({ label: z.string(), url: z.url() });

export const teachingSchema = z.object({
  id: slugSchema,
  course: z.string(),
  title: z.string(),
  level: z.string().nullable().default(null),
  role: z.string(),
  department: z.string(),
  institution: z.string(),
  instructor: z.string().nullable().default(null),
  start: isoMonth,
  end: isoMonth.nullable().default(null),
  highlights: z.array(z.string()).default([]),
  links: z.array(linkSchema).default([]),
});

export const educationSchema = z.object({
  id: slugSchema,
  institution: z.string(),
  unit: z.string().nullable().default(null),
  degree: z.string(),
  specialization: z.string().nullable().default(null),
  location: z.string().nullable().default(null),
  start: isoMonth,
  end: isoMonth.nullable().default(null),
  gpa: z.string().nullable().default(null),
  coursework: z.array(z.string()).default([]),
});

export const skillGroupSchema = z.object({ group: z.string(), items: z.array(z.string()).min(1) });

export type Profile = z.infer<typeof profileSchema>;
export type Theme = z.infer<typeof themeSchema>;
export type Research = z.infer<typeof researchSchema>;
export type Project = z.infer<typeof projectSchema>;
export type Publication = z.infer<typeof publicationSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Teaching = z.infer<typeof teachingSchema>;
export type Education = z.infer<typeof educationSchema>;
export type SkillGroup = z.infer<typeof skillGroupSchema>;

const dagNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  stage: z.string(),
  col: z.number().min(0),
  row: z.number().min(0),
});

export const diagramsSchema = z.object({
  claroDag: z.object({
    title: z.string(),
    caption: z.string(),
    stages: z.array(z.object({ id: z.string(), label: z.string(), detail: z.string() })).min(1),
    nodes: z.array(dagNodeSchema).min(2),
    edges: z.array(z.tuple([z.string(), z.string()])),
  }),
  reflectionPaths: z.object({
    title: z.string(),
    caption: z.string(),
    state: z.object({ label: z.string(), detail: z.string() }),
    probe: z.object({ label: z.string(), detail: z.string() }),
    branches: z.object({
      direct: z.object({ label: z.string(), detail: z.string() }),
      reflect: z.object({ label: z.string(), detail: z.string() }),
    }),
    outcomes: z.array(z.object({ id: z.string(), label: z.string(), detail: z.string() })).min(1),
    comparison: z
      .object({
        metric: z.string(),
        rows: z.array(z.object({ label: z.string(), value: z.number().min(-1).max(1) })),
        context: z.string(),
      })
      .nullable()
      .default(null),
  }),
});

export type Diagrams = z.infer<typeof diagramsSchema>;
export type ClaroDagData = Diagrams['claroDag'];
export type ReflectionPathsData = Diagrams['reflectionPaths'];

const pageCopySchema = z.object({
  title: z.string(),
  eyebrow: z.string().optional(),
  heading: z.string().optional(),
  lede: z.string().optional(),
  description: z.string().optional(),
});

export const siteSchema = z.object({
  title: z.string(),
  titleTemplate: z.string().includes('%s'),
  description: z.string(),
  locale: z.string(),
  nav: z.array(z.object({ label: z.string(), href: z.string().regex(/^[a-z0-9-]+\/$/, 'Nav hrefs are base-relative, e.g. "projects/"') })),
  pages: z.object({
    // The home page uses the bare site title, so it has no page title of its own.
    home: pageCopySchema.omit({ title: true }).strict(),
    research: pageCopySchema,
    projects: pageCopySchema,
    publications: pageCopySchema,
    experience: pageCopySchema,
    teaching: pageCopySchema,
    about: pageCopySchema,
    contact: pageCopySchema,
    blog: pageCopySchema,
    notFound: pageCopySchema,
  }),
  home: z.record(z.string(), z.string()),
  labels: z.record(z.string(), z.string()),
  rss: z.object({ title: z.string(), description: z.string() }),
  enums: z.object({
    kind: z.object({ research: z.string(), engineering: z.string() }),
    status: z.object({ ongoing: z.string(), completed: z.string() }),
    pubType: z.object({ conference: z.string(), workshop: z.string(), journal: z.string(), preprint: z.string() }),
    experienceKind: z.object({ research: z.string(), industry: z.string() }),
  }),
});

export type Site = z.infer<typeof siteSchema>;

/** Calendar date used for blog publication: `YYYY-MM-DD`, and a real date. */
export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD')
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d), 'Not a real date');

/**
 * One entry in src/data/blogs.json. JSON is the single source of truth for article metadata;
 * the MDX file at src/content/blog/<slug>/index.mdx holds only the body (no frontmatter).
 * Keep these rules in sync with scripts/blog.mjs, which validates without a build.
 */
export const blogPostSchema = z
  .object({
    slug: slugSchema,
    title: z.string().trim().min(1),
    topic: z.string().trim().min(1),
    tags: z.array(z.string().trim().min(1)).default([]),
    summary: z.string(),
    publishedAt: isoDate.nullable().default(null),
    updatedAt: isoDate.nullable().default(null),
    status: z.enum(['draft', 'published']),
    featured: z.boolean().default(false),
    contentPath: z.string().min(1),
    coverImage: z
      .string()
      .regex(/^images\/[\w.-]+\.(?:png|jpe?g|webp|avif|svg)$/i, 'Cover must be a local images/<file> path')
      .nullable()
      .default(null),
    /** Alt text for the cover. Leave null for a purely decorative cover. */
    coverAlt: z.string().nullable().default(null),
  })
  .strict()
  .superRefine((post, ctx) => {
    if (post.contentPath !== `${post.slug}/index.mdx`) {
      ctx.addIssue({ code: 'custom', path: ['contentPath'], message: `Expected "${post.slug}/index.mdx"` });
    }
    if (post.status === 'published') {
      if (!post.publishedAt) ctx.addIssue({ code: 'custom', path: ['publishedAt'], message: 'Required for published posts' });
      if (post.summary.trim().length < 30 || /^draft\b/i.test(post.summary.trim())) {
        ctx.addIssue({ code: 'custom', path: ['summary'], message: 'Published posts need a real summary (30+ characters)' });
      }
    }
    if (post.updatedAt && post.publishedAt && post.updatedAt < post.publishedAt) {
      ctx.addIssue({ code: 'custom', path: ['updatedAt'], message: 'updatedAt must not precede publishedAt' });
    }
  });

export type BlogPostMeta = z.infer<typeof blogPostSchema>;
