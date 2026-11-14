import type { Publication, Site } from '@/lib/schema';
import Tag from './Tag';
import LinkButton from './LinkButton';

interface Props {
  pub: Publication;
  labels: Site['labels'];
  enums: Site['enums'];
  themeNames: Record<string, string>;
  headingLevel?: 'h2' | 'h3';
  compact?: boolean;
}

export default function PublicationRow({ pub, labels, enums, themeNames, headingLevel = 'h3', compact = false }: Props) {
  const H = headingLevel;
  const doi = pub.links.doi ? `https://doi.org/${pub.links.doi}` : null;
  const hasLinks = Boolean(pub.links.paper || pub.links.pdf || pub.links.code || doi);
  return (
    <article className="grid gap-3 border-t border-line py-7 md:grid-cols-[7rem_1fr] md:gap-8">
      <div className="flex items-baseline gap-3 md:flex-col md:gap-1">
        <p className="font-display text-3xl leading-none text-ink">{pub.year}</p>
        <p className="font-mono text-[0.7rem] tracking-wide text-faint uppercase">{enums.pubType[pub.type]}</p>
      </div>
      <div className="min-w-0">
        <H className="text-[1.08rem] leading-snug font-medium text-ink md:text-xl">{pub.title}</H>
        <p className="mt-2 text-sm text-muted">
          <span className="text-signal">{pub.venue}</span>
          {pub.authorship && <span> · {pub.authorship}</span>}
        </p>
        {pub.authors && <p className="mt-1 text-sm text-faint">{pub.authors.join(', ')}</p>}
        {!compact && pub.summary && <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted">{pub.summary}</p>}
        {!compact && (
          <ul className="mt-4 flex flex-wrap gap-2" aria-label={labels.themes}>
            {pub.themes.map((t) => (
              <li key={t}>
                <Tag>{themeNames[t] ?? t}</Tag>
              </li>
            ))}
          </ul>
        )}
        {hasLinks && (
          <div className="mt-4 flex flex-wrap gap-2">
            <LinkButton href={pub.links.paper} label={labels.paper} />
            <LinkButton href={pub.links.pdf} label={labels.pdf} />
            <LinkButton href={pub.links.code} label={labels.repo} />
            <LinkButton href={doi} label={labels.doi} />
          </div>
        )}
      </div>
    </article>
  );
}
