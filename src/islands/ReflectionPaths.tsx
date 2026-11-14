import { useState } from 'react';
import type { ReflectionPathsData } from '@/lib/schema';
import { svgStyle } from '@/hooks/useMotionPreference';

interface Props {
  data: ReflectionPathsData;
  labels: { outcomes: string; better: string; worse: string };
}

// Schematic geometry (SVG user units). Vertical position of a branch end encodes
// "better / worse outcome" qualitatively; there is no numeric scale.
const W = 640;
const H = 260;
const STATE = { x: 70, y: 150 };
const PROBE = { x: 70, y: 52 };
const END_X = 540;
const DIRECT_Y = 110;
const REFLECT_END: Record<string, number> = { improve: 58, neutral: 110, harm: 196 };

function directPath() {
  return `M ${STATE.x} ${STATE.y} C 220 ${STATE.y}, 300 ${DIRECT_Y}, ${END_X} ${DIRECT_Y}`;
}

/** The reflection branch dips into a small loop (the reflection step) before continuing. */
function reflectPath(endY: number) {
  return `M ${STATE.x} ${STATE.y} C 150 ${STATE.y + 40}, 200 ${STATE.y + 48}, 250 ${STATE.y + 30} C 290 ${STATE.y + 14}, 290 ${STATE.y + 62}, 262 ${STATE.y + 56} C 236 ${STATE.y + 50}, 262 ${STATE.y + 26}, 320 ${STATE.y + 22} C 420 ${STATE.y + 14}, 440 ${endY}, ${END_X} ${endY}`;
}

export default function ReflectionPaths({ data, labels }: Props) {
  const [outcome, setOutcome] = useState(data.outcomes[0]!.id);
  const current = data.outcomes.find((o) => o.id === outcome)!;
  const endY = REFLECT_END[outcome] ?? DIRECT_Y;

  return (
    <>
      <figure className="rounded-xl border border-line bg-sunken/60 p-4 sm:p-6">
        <p className="eyebrow">{data.title}</p>

        <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_17rem] lg:items-start">
          <div className="min-w-0">
            <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" aria-hidden="true">
              {/* Outcome axis */}
              <line x1={END_X + 46} y1={36} x2={END_X + 46} y2={222} stroke="var(--line-strong)" />
              <text x={END_X + 46} y={26} textAnchor="middle" className="fill-faint font-mono text-[10px] max-sm:hidden">
                {labels.better} ↑
              </text>
              <text x={END_X + 46} y={242} textAnchor="middle" className="fill-faint font-mono text-[10px] max-sm:hidden">
                {labels.worse} ↓
              </text>

              {/* Probe reads the shared state */}
              <line x1={STATE.x} y1={STATE.y - 12} x2={PROBE.x} y2={PROBE.y + 14} stroke="var(--pulse)" strokeDasharray="3 4" />
              <rect x={PROBE.x - 14} y={PROBE.y - 14} width={28} height={28} rx={6} fill="var(--pulse-soft)" stroke="var(--pulse)" />
              <text x={PROBE.x + 24} y={PROBE.y + 4} className="fill-ink text-[12px] max-sm:hidden">
                {data.probe.label}
              </text>

              <path d={directPath()} fill="none" stroke="var(--text-muted)" strokeWidth={1.6} />
              {/* The CSS `d` property morphs the branch where supported (Chromium, Firefox); elsewhere the attribute applies instantly. */}
              <path className="svg-ease" d={reflectPath(endY)} fill="none" stroke="var(--signal)" strokeWidth={1.8} style={svgStyle({ d: `path("${reflectPath(endY)}")` })} />

              <circle cx={END_X} cy={DIRECT_Y} r={5} fill="var(--text-muted)" />
              <circle className="svg-ease" cx={END_X} cy={endY} r={6} fill="var(--signal)" style={svgStyle({ cy: endY })} />

              {/* The direct label sits on the side away from the reflected branch so the curves never cross it. */}
              <g className="svg-ease" style={{ transform: `translateY(${endY < DIRECT_Y ? DIRECT_Y + 22 : DIRECT_Y - 12}px)` }}>
                <text x={END_X - 8} textAnchor="end" className="fill-muted text-[12px] max-sm:hidden">
                  {data.branches.direct.label}
                </text>
              </g>
              <g className="svg-ease" style={{ transform: `translateY(${outcome === 'neutral' ? endY + 22 : endY + (endY < DIRECT_Y ? -12 : 22)}px)` }}>
                <text x={END_X - 8} textAnchor="end" className="fill-signal text-[12px] max-sm:hidden">
                  {data.branches.reflect.label}
                </text>
              </g>

              <circle cx={STATE.x} cy={STATE.y} r={9} fill="var(--bg)" stroke="var(--text)" strokeWidth={1.5} />
              <text x={STATE.x} y={STATE.y + 32} textAnchor="middle" className="fill-ink text-[12px] max-sm:hidden">
                {data.state.label.split(' ').slice(0, 1).join(' ')}
              </text>
              <text x={STATE.x} y={STATE.y + 47} textAnchor="middle" className="fill-ink text-[12px] max-sm:hidden">
                {data.state.label.split(' ').slice(1).join(' ')}
              </text>
            </svg>
            {/* Below 640px the SVG labels would render at ~5px, so they are hidden and the keyed legend below names each mark. */}
            <p className="mt-2 text-right font-mono text-[0.7rem] text-faint sm:hidden">
              ↑ {labels.better} · ↓ {labels.worse}
            </p>
          </div>

          <div>
            <fieldset>
              <legend className="eyebrow mb-2.5">{labels.outcomes}</legend>
              <div className="grid gap-2">
                {data.outcomes.map((o) => (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={o.id === outcome}
                    onClick={() => setOutcome(o.id)}
                    className="rounded-lg border border-line px-3 py-2 text-left text-sm text-muted transition-colors hover:text-ink aria-pressed:border-signal aria-pressed:bg-signal-soft aria-pressed:text-ink"
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <p className="mt-3 min-h-[3lh] text-sm leading-relaxed text-muted" aria-live="polite">
              {current.detail}
            </p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {(
            [
              [data.state, 'size-3 rounded-full border-[1.5px] border-ink'],
              [data.probe, 'size-3 rounded-[3px] border border-pulse bg-pulse-soft'],
              [data.branches.direct, 'h-[2px] w-4 bg-muted'],
              [data.branches.reflect, 'h-[2px] w-4 bg-signal'],
            ] as const
          ).map(([part, swatch]) => (
            <div key={part.label}>
              <dt className="flex items-center gap-2 text-ink">
                <span className={`inline-block shrink-0 ${swatch}`} aria-hidden="true" />
                {part.label}
              </dt>
              <dd className="mt-1 leading-relaxed text-muted">{part.detail}</dd>
            </div>
          ))}
        </dl>

        {data.comparison && (
          <div className="mt-6 border-t border-line pt-5">
            <p className="eyebrow">{data.comparison.metric}</p>
            <div className="mt-4 grid gap-3">
              {data.comparison.rows.map((row, i) => {
                // Rows are listed baseline-first in diagrams.json; the final row is the method being reported.
                const last = i === data.comparison!.rows.length - 1;
                return (
                  <div key={row.label} className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-x-3 gap-y-1.5 sm:grid-cols-[13rem_minmax(0,1fr)_3rem]">
                    <span className="col-span-2 text-sm text-muted sm:col-span-1">{row.label}</span>
                    <span className="relative h-2.5 rounded-sm bg-line" aria-hidden="true">
                      <span
                        className={`absolute inset-y-0 left-0 rounded-r-[4px] ${last ? 'bg-signal' : 'bg-faint'}`}
                        style={{ width: `${Math.max(0, row.value) * 100}%` }}
                      />
                    </span>
                    <span className="text-right font-mono text-sm text-ink tabular-nums">{row.value.toFixed(2)}</span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-relaxed text-faint">{data.comparison.context}</p>
          </div>
        )}

        <figcaption className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-faint">{data.caption}</figcaption>
      </figure>
    </>
  );
}
