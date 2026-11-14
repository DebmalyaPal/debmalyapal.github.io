/**
 * Single entry point for site content. Every JSON file in src/data is parsed and
 * validated here at build time; a malformed entry fails the build with a readable error.
 */
import { z } from 'zod';
import profileJson from '@/data/profile.json';
import researchJson from '@/data/research.json';
import projectsJson from '@/data/projects.json';
import publicationsJson from '@/data/publications.json';
import experienceJson from '@/data/experience.json';
import teachingJson from '@/data/teaching.json';
import educationJson from '@/data/education.json';
import skillsJson from '@/data/skills.json';
import diagramsJson from '@/data/diagrams.json';
import siteJson from '@/data/site.json';
import blogsJson from '@/data/blogs.json';
import {
  blogPostSchema,
  diagramsSchema,
  educationSchema,
  experienceSchema,
  profileSchema,
  projectSchema,
  publicationSchema,
  researchSchema,
  siteSchema,
  skillGroupSchema,
  teachingSchema,
} from './schema';
import { sortByRecency, sortProjects, sortPublications } from './sort';
import { sortBlogPosts } from './blog';

export function parseOrThrow<T extends z.ZodType>(schema: T, input: unknown, file: string): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues.map((i) => `  • ${i.path.join('.') || '(root)'}: ${i.message}`).join('\n');
    throw new Error(`Invalid content in src/data/${file}:\n${issues}`);
  }
  return result.data;
}

function assertUnique(values: string[], label: string) {
  const seen = new Set<string>();
  for (const v of values) {
    if (seen.has(v)) throw new Error(`Duplicate ${label}: "${v}"`);
    seen.add(v);
  }
}

export function loadContent() {
  const site = parseOrThrow(siteSchema, siteJson, 'site.json');
  const profile = parseOrThrow(profileSchema, profileJson, 'profile.json');
  const research = parseOrThrow(researchSchema, researchJson, 'research.json');
  const projects = sortProjects(parseOrThrow(z.array(projectSchema), projectsJson, 'projects.json'));
  const publications = sortPublications(parseOrThrow(z.array(publicationSchema), publicationsJson, 'publications.json'));
  const experience = sortByRecency(parseOrThrow(z.array(experienceSchema), experienceJson, 'experience.json'));
  const teaching = sortByRecency(parseOrThrow(z.array(teachingSchema), teachingJson, 'teaching.json'));
  const education = sortByRecency(parseOrThrow(z.array(educationSchema), educationJson, 'education.json'));
  const skills = parseOrThrow(z.array(skillGroupSchema), skillsJson, 'skills.json');
  const diagrams = parseOrThrow(diagramsSchema, diagramsJson, 'diagrams.json');
  // Every registry entry, drafts included. Public pages must go through publishedPosts().
  const blogs = sortBlogPosts(parseOrThrow(z.array(blogPostSchema), blogsJson, 'blogs.json'));

  assertUnique(projects.map((p) => p.slug), 'project slug');
  assertUnique(publications.map((p) => p.id), 'publication id');
  assertUnique(experience.map((e) => e.id), 'experience id');
  assertUnique(blogs.map((b) => b.slug), 'blog slug');

  // Cross-references must resolve, so a typo never produces a dead link or empty filter.
  const themeIds = new Set(research.themes.map((t) => t.id));
  const slugs = new Set(projects.map((p) => p.slug));
  for (const item of [...projects, ...publications]) {
    for (const t of item.themes) {
      if (!themeIds.has(t)) throw new Error(`Unknown theme "${t}" referenced by "${'slug' in item ? item.slug : item.id}"`);
    }
  }
  for (const e of experience) {
    for (const s of e.projects) {
      if (!slugs.has(s)) throw new Error(`Experience "${e.id}" references unknown project "${s}"`);
    }
  }

  // Diagram edges must connect declared nodes.
  const nodeIds = new Set(diagrams.claroDag.nodes.map((n) => n.id));
  for (const [a, b] of diagrams.claroDag.edges) {
    if (!nodeIds.has(a) || !nodeIds.has(b)) throw new Error(`diagrams.json: edge ${a} → ${b} references an unknown node`);
  }

  return { site, profile, research, projects, publications, experience, teaching, education, skills, diagrams, blogs };
}

export const content = loadContent();
export type Content = ReturnType<typeof loadContent>;
