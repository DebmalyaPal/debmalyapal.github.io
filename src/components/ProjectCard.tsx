import type { Project, Site } from '@/lib/schema';
import { formatRange } from '@/lib/format';
import { projectUrl } from '@/lib/slug';
import Tag from './Tag';

export interface CardCopy {
  labels: Site['labels'];
  enums: Site['enums'];
  themeNames: Record<string, string>;
}

interface Props extends CardCopy {
  project: Project;
  index: number;
  /** "feature" is the large editorial layout; "row" is the compact archive layout. */
  layout?: 'feature' | 'row';
  headingLevel?: 'h2' | 'h3';
}

export default function ProjectCard({ project: p, index, layout = 'row', headingLevel = 'h3', labels, enums, themeNames }: Props) {
  const H = headingLevel;
  const href = projectUrl(p.slug);
  const lead = p.metrics[0];
  const number = String(index + 1).padStart(2, '0');

  if (layout === 'feature') {
    return (
      <article className="group relative grid gap-6 border-t border-line py-10 md:grid-cols-[4rem_minmax(0,1fr)] md:gap-x-8 lg:grid-cols-[4rem_minmax(0,1fr)_minmax(0,16rem)]">
        <p className="font-mono text-xs text-faint" aria-hidden="true">
          {number}
        </p>
        <div className="min-w-0">
          <p className="eyebrow mb-3 flex flex-wrap gap-x-3 gap-y-1">
            <span>{enums.kind[p.kind]}</span>
            <span aria-hidden="true">/</span>
            <span>{formatRange(p.start, p.end)}</span>
            {p.status === 'ongoing' && <span className="text-signal">● {enums.status.ongoing}</span>}
          </p>
          <H className="text-[clamp(1.6rem,1.2rem+1.6vw,2.6rem)] leading-[1.05] font-medium tracking-tight text-ink">
            <a href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
              {p.shortTitle}
            </a>
          </H>
          <p className="mt-1 font-display text-lg text-muted italic">{p.title.replace(`${p.shortTitle}: `, '')}</p>
          <p className="mt-4 max-w-2xl text-[0.98rem] leading-relaxed text-muted">{p.summary}</p>
          <ul className="mt-5 flex flex-wrap gap-2" aria-label={labels.themes}>
            {p.themes.map((t) => (
              <li key={t}>
                <Tag>{themeNames[t] ?? t}</Tag>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap items-end justify-between gap-6 md:col-start-2 lg:col-start-auto lg:flex-col lg:flex-nowrap lg:items-end lg:text-right">
          {lead ? (
            <div>
              <p className="font-display text-4xl leading-none text-signal">{lead.value}</p>
              <p className="mt-2 text-xs text-faint">{lead.label}</p>
            </div>
          ) : (
            <span />
          )}
          <span className="inline-flex items-center gap-2 text-sm text-ink transition-transform duration-500 ease-(--ease-signal) group-hover:translate-x-1 group-has-[a:focus-visible]:text-signal">
            {labels.readMore} <span aria-hidden="true">→</span>
          </span>
        </div>
        {/* Focus ring for the whole card, since the stretched link covers it. */}
        <span className="pointer-events-none absolute inset-0 -mx-3 rounded-lg ring-signal group-has-[a:focus-visible]:ring-2" aria-hidden="true" />
      </article>
    );
  }

  return (
    <article className="group relative grid gap-3 border-t border-line py-6 sm:grid-cols-[1fr_auto] sm:gap-8">
      <div className="min-w-0">
        <H className="text-lg font-medium tracking-tight text-ink">
          <a href={href} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-hover:text-signal">
            {p.title}
          </a>
        </H>
        <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-muted">{p.summary}</p>
        <ul className="mt-3 flex flex-wrap gap-2" aria-label={labels.themes}>
          <li>
            <Tag tone={p.kind === 'research' ? 'pulse' : 'neutral'}>{enums.kind[p.kind]}</Tag>
          </li>
          {p.themes.map((t) => (
            <li key={t}>
              <Tag>{themeNames[t] ?? t}</Tag>
            </li>
          ))}
        </ul>
      </div>
      <p className="font-mono text-xs whitespace-nowrap text-faint sm:text-right">
        {formatRange(p.start, p.end)}
        {p.status === 'ongoing' && <span className="ml-2 text-signal">●</span>}
      </p>
      <span className="pointer-events-none absolute inset-0 -mx-3 rounded-lg ring-signal group-has-[a:focus-visible]:ring-2" aria-hidden="true" />
    </article>
  );
}
