import type { Content } from './data';
import { formatRange } from './format';

/** Serializable props for the ResearchAtlas island, derived entirely from content JSON. */
export function atlasProps({ research, projects, publications, site }: Content) {
  const { labels } = site;
  return {
    themes: research.themes,
    projects: projects
      .filter((p) => p.themes.length > 0)
      .map((p) => ({ slug: p.slug, shortTitle: p.shortTitle, meta: formatRange(p.start, p.end), themes: p.themes })),
    publications: publications.map((p) => ({ id: p.id, title: p.title, meta: `${p.venueShort} · ${p.year}`, themes: p.themes })),
    labels: {
      all: labels.all,
      relatedProjects: labels.relatedProjects,
      relatedPublications: labels.relatedPublications,
      themes: labels.themes,
      projects: labels.projects,
      publications: labels.publications,
    },
  };
}

export function themeNames({ research }: Content): Record<string, string> {
  return Object.fromEntries(research.themes.map((t) => [t.id, t.short]));
}
