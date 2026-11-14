/**
 * JSON-LD builders. They only emit fields that exist in the JSON data; nothing is inferred.
 */
import type { Profile, Publication } from './schema';

export function personJsonLd(profile: Profile, siteUrl: string) {
  const sameAs = [profile.contact.github, profile.contact.linkedin, profile.contact.scholar, profile.contact.orcid].filter(
    (u): u is string => Boolean(u),
  );
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.name,
    givenName: profile.givenName,
    familyName: profile.familyName,
    jobTitle: profile.position,
    url: siteUrl,
    email: `mailto:${profile.contact.email}`,
    affiliation: { '@type': 'CollegeOrUniversity', name: profile.institution },
    knowsAbout: profile.researchInterests,
    ...(sameAs.length ? { sameAs } : {}),
  };
}

/**
 * ScholarlyArticle is only emitted when the full author list is known — publishing a
 * single-author record for a multi-author paper would be inaccurate metadata.
 */
export function scholarlyArticleJsonLd(pub: Publication): Record<string, unknown> | null {
  if (!pub.authors || pub.authors.length === 0) return null;
  const link = pub.links.paper ?? pub.links.pdf ?? (pub.links.doi ? `https://doi.org/${pub.links.doi}` : null);
  return {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: pub.title,
    author: pub.authors.map((name) => ({ '@type': 'Person', name })),
    datePublished: String(pub.year),
    isPartOf: { '@type': 'PublicationIssue', name: pub.venue },
    ...(pub.abstract ? { abstract: pub.abstract } : {}),
    ...(link ? { url: link } : {}),
  };
}

/** BlogPosting for a published article. Every field comes from blogs.json and profile.json. */
export function blogPostingJsonLd(
  post: { title: string; summary: string; publishedAt: string | null; updatedAt: string | null; tags: string[] },
  author: Pick<Profile, 'name'>,
  pageUrl: string,
  siteUrl: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.summary,
    ...(post.publishedAt ? { datePublished: post.publishedAt } : {}),
    ...(post.updatedAt ? { dateModified: post.updatedAt } : {}),
    author: { '@type': 'Person', name: author.name, url: siteUrl },
    mainEntityOfPage: pageUrl,
    url: pageUrl,
    ...(post.tags.length ? { keywords: post.tags.join(', ') } : {}),
  };
}
