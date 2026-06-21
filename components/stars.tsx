import { Star } from "lucide-react";

/**
 * Read-only star rating. Renders 5 stars, filled up to the rounded value,
 * in the brand color. Optionally shows the count alongside.
 */
export function Stars({
  value,
  count,
  size = 13,
}: {
  value: number;
  count?: number;
  size?: number;
}) {
  const filled = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <span className="inline-flex" aria-label={`${value} out of 5`}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={size}
            className={i < filled ? "text-brand fill-current" : "text-line"}
            aria-hidden
          />
        ))}
      </span>
      {typeof count === "number" && (
        <span className="text-[11px] text-ink-soft">
          {value.toFixed(1)} ({count})
        </span>
      )}
    </span>
  );
}
