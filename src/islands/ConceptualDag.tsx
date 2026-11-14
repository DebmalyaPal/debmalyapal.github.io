import { useState } from 'react';
import type { ClaroDagData } from '@/lib/schema';
import { useReducedMotion } from '@/hooks/useMotionPreference';

interface Props {
  data: ClaroDagData;
  labels: { previous: string; next: string; step: string };
}

const COL_W = 168;
const ROW_H = 74;
const NODE_W = 138;
const NODE_H = 40;
const PAD_X = 16;
const PAD_Y = 22;

/** Splits a label into at most two lines so nodes stay compact. */
function lines(label: string): string[] {
  if (label.length <= 16) return [label];
  const words = label.split(' ');
  let first = '';
  while (words.length && `${first} ${words[0]}`.trim().length <= 16) first = `${first} ${words.shift()}`.trim();
  return [first, words.join(' ')];
}

/**
 * Conceptual view of CLARO's planner → capabilities → evidence → synthesis flow.
 * Stepping through stages highlights the nodes that belong to it and the edges feeding them.
 * Every label and edge comes from diagrams.json; nothing here reflects measured behaviour.
 */
export default function ConceptualDag({ data, labels }: Props) {
  const reduced = useReducedMotion();
  const [step, setStep] = useState(0);
  const stage = data.stages[step]!;
  const stageIndex = Object.fromEntries(data.stages.map((s, i) => [s.id, i]));
  const node = Object.fromEntries(data.nodes.map((n) => [n.id, n]));

  const cols = Math.max(...data.nodes.map((n) => n.col)) + 1;
  const rows = Math.max(...data.nodes.map((n) => n.row)) + 1;
  const W = PAD_X * 2 + (cols - 1) * COL_W + NODE_W;
  const H = PAD_Y * 2 + (rows - 1) * ROW_H + NODE_H;
  const pos = (id: string) => {
    const n = node[id]!;
    return { x: PAD_X + n.col * COL_W, y: PAD_Y + n.row * ROW_H };
  };
  const state = (stageId: string) => {
    const i = stageIndex[stageId] ?? 0;
    return i === step ? 'active' : i < step ? 'done' : 'idle';
  };

  return (
    <>
      <figure className="rounded-xl border border-line bg-sunken/60 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow">{data.title}</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
              disabled={step === 0}
              className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-ink disabled:opacity-35"
              aria-label={labels.previous}
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(data.stages.length - 1, s + 1))}
              disabled={step === data.stages.length - 1}
              className="grid size-9 place-items-center rounded-full border border-line text-muted hover:text-ink disabled:opacity-35"
              aria-label={labels.next}
            >
              →
            </button>
          </div>
        </div>

        <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label={labels.step}>
          {data.stages.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                aria-pressed={i === step}
                onClick={() => setStep(i)}
                className="group flex w-full items-baseline gap-2 rounded-lg border border-line px-3 py-2 text-left text-sm text-muted transition-colors hover:text-ink aria-pressed:border-signal aria-pressed:bg-signal-soft aria-pressed:text-ink"
              >
                <span className="font-mono text-[0.68rem] text-faint group-aria-pressed:text-muted">{String(i + 1).padStart(2, '0')}</span>
                {s.label}
              </button>
            </li>
          ))}
        </ol>

        <p className="mt-4 min-h-[3lh] max-w-3xl text-sm leading-relaxed text-muted" aria-live="polite">
          <span className="text-ink">{stage.label}. </span>
          {stage.detail}
        </p>

        {/* Wide screens: the graph. Small screens: the same nodes grouped by stage. */}
        <div className="mt-4 hidden md:block" aria-hidden="true">
          <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full">
            <defs>
              <marker id="dag-arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 L8 4 L0 8 z" fill="var(--line-strong)" />
              </marker>
              <marker id="dag-arrow-on" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M0 0 L8 4 L0 8 z" fill="var(--signal)" />
              </marker>
            </defs>
            {data.edges.map(([a, b]) => {
              const p = pos(a);
              const q = pos(b);
              const x1 = p.x + NODE_W;
              const y1 = p.y + NODE_H / 2;
              const x2 = q.x - 2;
              const y2 = q.y + NODE_H / 2;
              const mx = (x1 + x2) / 2;
              const target = state(node[b]!.stage);
              const on = target === 'active';
              return (
                <path
                  key={`${a}-${b}`}
                  d={`M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={on ? 'var(--signal)' : 'var(--line-strong)'}
                  strokeWidth={on ? 1.6 : 1}
                  markerEnd={on ? 'url(#dag-arrow-on)' : 'url(#dag-arrow)'}
                  style={{ opacity: target === 'idle' ? 0.35 : 1 }}
                  className={on && !reduced ? 'svg-ease dag-flow' : 'svg-ease'}
                  {...(on && !reduced ? { strokeDasharray: '5 5' } : {})}
                />
              );
            })}
            {data.nodes.map((n) => {
              const { x, y } = pos(n.id);
              const st = state(n.stage);
              const text = lines(n.label);
              return (
                <g key={n.id} className="svg-ease" style={{ opacity: st === 'idle' ? 0.45 : 1 }}>
                  <rect
                    x={x}
                    y={y}
                    width={NODE_W}
                    height={NODE_H}
                    rx={8}
                    fill={st === 'active' ? 'var(--signal-soft)' : 'var(--bg-raised)'}
                    stroke={st === 'active' ? 'var(--signal)' : 'var(--line-strong)'}
                  />
                  <text x={x + NODE_W / 2} y={y + NODE_H / 2 + (text.length === 1 ? 4 : -3)} textAnchor="middle" className="fill-ink text-[11.5px]">
                    {text.map((t, i) => (
                      <tspan key={t} x={x + NODE_W / 2} dy={i === 0 ? 0 : 14}>
                        {t}
                      </tspan>
                    ))}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <ol className="mt-4 grid gap-3 md:sr-only">
          {data.stages.map((s, i) => (
            <li key={s.id} className={`rounded-lg border p-3 ${i === step ? 'border-signal' : 'border-line'}`}>
              <p className="eyebrow">
                {String(i + 1).padStart(2, '0')} · {s.label}
              </p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {data.nodes
                  .filter((n) => n.stage === s.id)
                  .map((n) => (
                    <li key={n.id} className="rounded-md border border-line bg-raised px-2 py-1 text-xs text-ink">
                      {n.label}
                    </li>
                  ))}
              </ul>
            </li>
          ))}
        </ol>

        <figcaption className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-faint">{data.caption}</figcaption>
      </figure>
    </>
  );
}
