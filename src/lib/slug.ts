/** Kebab-case slug from free text. Used to suggest slugs and to validate that JSON slugs are canonical. */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Path helpers keep the base URL in one place so a project-site base path only needs a config change. */
const BASE = import.meta.env.BASE_URL ?? '/';

export function url(path = ''): string {
  const base = BASE.endsWith('/') ? BASE : `${BASE}/`;
  const clean = path.replace(/^\/+/, '');
  return `${base}${clean}`;
}

export function projectUrl(slug: string): string {
  return url(`projects/${slug}/`);
}

export function blogUrl(slug: string): string {
  return url(`blog/${slug}/`);
}
