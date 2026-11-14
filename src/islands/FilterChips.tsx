interface Option {
  value: string;
  label: string;
}

interface Props {
  legend: string;
  allLabel: string;
  options: Option[];
  value: string | null;
  onChange: (value: string | null) => void;
}

/** A group of toggle buttons; exactly one (or "All") is pressed at a time. */
export default function FilterChips({ legend, allLabel, options, value, onChange }: Props) {
  const chip =
    'min-h-9 rounded-full border px-3.5 text-sm transition-colors aria-pressed:border-signal aria-pressed:bg-signal-soft aria-pressed:text-ink border-line text-muted hover:text-ink hover:border-line-strong';
  return (
    <fieldset className="min-w-0">
      <legend className="eyebrow mb-2.5">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={chip} aria-pressed={value === null} onClick={() => onChange(null)}>
          {allLabel}
        </button>
        {options.map((o) => (
          <button key={o.value} type="button" className={chip} aria-pressed={value === o.value} onClick={() => onChange(value === o.value ? null : o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
