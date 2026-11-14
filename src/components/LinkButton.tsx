interface Props {
  /** When null or empty, nothing renders — the site never shows a placeholder link. */
  href: string | null | undefined;
  label: string;
  variant?: 'primary' | 'ghost' | 'text';
  /** Accessible name when the visible label alone is ambiguous (e.g. "Code" for a specific project). */
  ariaLabel?: string;
}

const styles = {
  primary: 'bg-ink text-bg hover:bg-signal border-transparent',
  ghost: 'border-line-strong text-ink hover:border-signal hover:text-signal',
  text: 'border-transparent px-0! text-muted hover:text-ink',
};

export default function LinkButton({ href, label, variant = 'ghost', ariaLabel }: Props) {
  if (!href) return null;
  const external = /^https?:\/\//.test(href);
  return (
    <a
      href={href}
      aria-label={ariaLabel}
      className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-medium transition-colors duration-300 ${styles[variant]}`}
      {...(external ? { target: '_blank', rel: 'noopener' } : {})}
    >
      <span>{label}</span>
      <span aria-hidden="true" className="font-mono text-xs">
        {external ? '↗' : href.startsWith('mailto:') ? '@' : '→'}
      </span>
      {external && <span className="sr-only"> (opens in a new tab)</span>}
    </a>
  );
}
