interface Props {
  message: string;
  /** When both are given, renders a reset button. */
  actionLabel?: string;
  onAction?: () => void;
}

/** Shown when filters match nothing, so the page never collapses into a blank area. */
export default function EmptyState({ message, actionLabel, onAction }: Props) {
  return (
    <div className="mt-6 rounded-xl border border-dashed border-line-strong p-10 text-center">
      <p className="text-muted">{message}</p>
      {actionLabel && onAction && (
        <button type="button" onClick={onAction} className="mt-4 text-sm text-signal underline underline-offset-4">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
