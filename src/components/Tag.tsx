import type { ReactNode } from 'react';

type Tone = 'neutral' | 'signal' | 'pulse';

const tones: Record<Tone, string> = {
  neutral: 'border-line text-muted',
  signal: 'border-signal/35 text-signal',
  pulse: 'border-pulse/35 text-pulse',
};

export default function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[0.68rem] tracking-wide ${tones[tone]}`}>
      {children}
    </span>
  );
}
