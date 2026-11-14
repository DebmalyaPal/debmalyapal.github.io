import { useEffect, useMemo, useState } from 'react';
import type { Theme } from '@/lib/schema';
import { svgStyle } from '@/hooks/useMotionPreference';
import { projectUrl } from '@/lib/slug';

export interface AtlasItem {
  id: string;
  label: string;
  /** Secondary line (venue, period). */
  meta: string;
  themes: string[];
  href: string | null;
  kind: 'project' | 'publication';
}

interface Props {
  themes: Theme[];
  projects: { slug: string; shortTitle: string; meta: string; themes: string[] }[];
  publications: { id: string; title: string; meta: string; themes: string[] }[];
  labels: { all: string; relatedProjects: string; relatedPublications: string; themes: string; projects: string; publications: string };
  /** When true, theme selection is mirrored to ?theme= (used on /research/). */
  syncUrl?: boolean;
}

// Layout of the bipartite map, in SVG user units.
const W = 760;
// Columns leave ~128 units left of projects and ~195 right of publications for labels (12px text ≈ 6.5 units/char).
const COL = { project: 140, theme: 350, publication: 545 };
const ROW_GAP = 46;
const PAD = 36;

function truncate(text: string, max: number) {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

export default function ResearchAtlas({ themes, projects, publications, labels, syncUrl = false }: Props) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    if (!syncUrl) return;
    const t = new URLSearchParams(window.location.search).get('theme');
    if (t && themes.some((th) => th.id === t)) setActive(t);
  }, [syncUrl, themes]);
  const [hovered, setHovered] = useState<string | null>(null);
  const focus = hovered ?? active;

  const items: AtlasItem[] = useMemo(
    () => [
      ...projects.map((p) => ({ id: `p:${p.slug}`, label: p.shortTitle, meta: p.meta, themes: p.themes, href: projectUrl(p.slug), kind: 'project' as const })),
      ...publications.map((p) => ({ id: `u:${p.id}`, label: p.title, meta: p.meta, themes: p.themes, href: null, kind: 'publication' as const })),
    ],
    [projects, publications],
  );

  const select = (id: string | null) => {
    setActive(id);
    if (syncUrl) {
      const params = new URLSearchParams(window.location.search);
      if (id) params.set('theme', id);
      else params.delete('theme');
      const qs = params.toString();
      window.history.replaceState(null, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    }
  };

  const projItems = items.filter((i) => i.kind === 'project');
  const pubItems = items.filter((i) => i.kind === 'publication');
  const rows = Math.max(projItems.length, pubItems.length, themes.length);
  const H = PAD * 2 + (rows - 1) * ROW_GAP;
  const yFor = (index: number, count: number) => PAD + ((rows - count) * ROW_GAP) / 2 + index * ROW_GAP;
  const themeY = Object.fromEntries(themes.map((t, i) => [t.id, yFor(i, themes.length)]));
  const lit = (themeIds: string[]) => !focus || themeIds.includes(focus);
  const activeTheme = themes.find((t) => t.id === focus) ?? null;
  const relatedProjects = projItems.filter((i) => lit(i.themes));
  const relatedPubs = pubItems.filter((i) => lit(i.themes));

  return (
    <>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-14">
        <div>
          <p className="eyebrow mb-3" id="atlas-legend">
            {labels.themes}
          </p>
          <ul className="grid gap-2" aria-labelledby="atlas-legend">
            <li>
              <button
                type="button"
                aria-pressed={active === null}
                onClick={() => select(null)}
                className="w-full rounded-lg border border-line px-4 py-2.5 text-left text-sm text-muted transition-colors hover:border-line-strong hover:text-ink aria-pressed:border-signal aria-pressed:bg-signal-soft aria-pressed:text-ink"
              >
                {labels.all}
              </button>
            </li>
            {themes.map((t, i) => (
              <li key={t.id}>
                <button
                  type="button"
                  aria-pressed={active === t.id}
                  onClick={() => select(active === t.id ? null : t.id)}
                  onMouseEnter={() => setHovered(t.id)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(t.id)}
                  onBlur={() => setHovered(null)}
                  className="group w-full rounded-lg border border-line px-4 py-3 text-left transition-colors hover:border-line-strong aria-pressed:border-signal aria-pressed:bg-signal-soft"
                >
                  <span className="flex items-baseline gap-3">
                    <span className="font-mono text-[0.7rem] text-faint">{String(i + 1).padStart(2, '0')}</span>
                    <span className="font-medium text-ink">{t.title}</span>
                  </span>
                  <span className="mt-1 block pl-7 text-sm leading-snug text-muted">{t.question}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0">
          {/* The map is a visual summary; the lists below carry the same information for every screen size and assistive tech. */}
          <div className="relative hidden overflow-hidden rounded-xl border border-line bg-sunken/60 md:block" aria-hidden="true">
            <div className="hairline-grid absolute inset-0 opacity-40 [mask-image:radial-gradient(closest-side,black,transparent)]" />
            <svg viewBox={`0 0 ${W} ${H}`} className="relative block h-auto w-full" role="presentation">
              {items.map((it) => {
                const list = it.kind === 'project' ? projItems : pubItems;
                const y = yFor(list.indexOf(it), list.length);
                const x = COL[it.kind];
                return it.themes.map((th) => {
                  const ty = themeY[th];
                  if (ty === undefined) return null;
                  const on = !focus || focus === th;
                  const x2 = COL.theme;
                  const mid = (x + x2) / 2;
                  return (
                    <path
                      key={`${it.id}-${th}`}
                      className="svg-ease"
                      d={`M ${x} ${y} C ${mid} ${y}, ${mid} ${ty}, ${x2} ${ty}`}
                      fill="none"
                      stroke={on && focus ? 'var(--signal)' : 'var(--line-strong)'}
                      strokeWidth={on && focus ? 1.4 : 1}
                      style={{ opacity: on ? 1 : 0.18 }}
                    />
                  );
                });
              })}

              {themes.map((t) => {
                const y = themeY[t.id]!;
                const on = !focus || focus === t.id;
                return (
                  <g key={t.id}>
                    <circle className="svg-ease" cx={COL.theme} cy={y} r={focus === t.id ? 9 : 6} fill={on ? 'var(--signal)' : 'var(--line-strong)'} style={svgStyle({ r: focus === t.id ? 9 : 6 })} />
                    <circle cx={COL.theme} cy={y} r={15} fill="none" stroke="var(--signal)" strokeOpacity={focus === t.id ? 0.5 : 0} />
                    <text x={COL.theme} y={y - 20} textAnchor="middle" className="fill-ink font-mono text-[11px]" opacity={on ? 1 : 0.4}>
                      {t.short}
                    </text>
                  </g>
                );
              })}

              {[projItems, pubItems].map((list) =>
                list.map((it, i) => {
                  const y = yFor(i, list.length);
                  const x = COL[it.kind];
                  const on = lit(it.themes);
                  const left = it.kind === 'project';
                  return (
                    <g key={it.id} className="svg-ease" style={{ opacity: on ? 1 : 0.28 }}>
                      <circle cx={x} cy={y} r={4.5} fill={left ? 'var(--bg)' : 'var(--pulse)'} stroke={left ? 'var(--pulse)' : 'none'} strokeWidth={1.5} />
                      <text x={left ? x - 12 : x + 12} y={y + 4} textAnchor={left ? 'end' : 'start'} className="fill-muted text-[12px]">
                        {truncate(it.label, left ? 19 : 28)}
                      </text>
                    </g>
                  );
                }),
              )}
              <text x={COL.project} y={18} textAnchor="end" className="fill-faint font-mono text-[10px] tracking-widest uppercase">
                {labels.projects}
              </text>
              <text x={COL.publication} y={18} textAnchor="start" className="fill-faint font-mono text-[10px] tracking-widest uppercase">
                {labels.publications}
              </text>
            </svg>
          </div>

          <div aria-live="polite" className="mt-8">
            {activeTheme && (
              <div className="mb-8 max-w-2xl">
                <p className="text-lg text-ink">{activeTheme.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{activeTheme.summary}</p>
              </div>
            )}
            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <h3 className="eyebrow mb-3">
                  {labels.relatedProjects} <span className="text-signal">({relatedProjects.length})</span>
                </h3>
                <ul className="grid gap-px">
                  {relatedProjects.map((it) => (
                    <li key={it.id} className="border-t border-line py-2.5">
                      <a href={it.href ?? undefined} className="text-sm text-ink hover:text-signal">
                        {it.label}
                      </a>
                      <span className="block font-mono text-[0.7rem] text-faint">{it.meta}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="eyebrow mb-3">
                  {labels.relatedPublications} <span className="text-signal">({relatedPubs.length})</span>
                </h3>
                <ul className="grid gap-px">
                  {relatedPubs.map((it) => (
                    <li key={it.id} className="border-t border-line py-2.5">
                      <span className="text-sm leading-snug text-ink">{it.label}</span>
                      <span className="block font-mono text-[0.7rem] text-faint">{it.meta}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
