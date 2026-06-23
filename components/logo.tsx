import Link from "next/link";

/**
 * The DoyinMart mark: an emerald rounded-square tile with a white "D" monogram
 * (the counter is cut out so the brand color shows through). Uses currentColor
 * for the tile, so it adapts to the brand token in light/dark.
 */
export function LogoMark({
  size = 28,
  className = "text-brand",
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden
    >
      <rect width="32" height="32" rx="8" fill="currentColor" />
      {/* White "D" with an even-odd counter so the tile shows through. */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M9 8h7a8 8 0 0 1 0 16H9V8zm3.4 3.2v9.6h3.6a4.8 4.8 0 0 0 0-9.6h-3.6z"
        fill="#ffffff"
      />
    </svg>
  );
}

/**
 * Full logo: mark + wordmark. `as` controls whether it links home.
 */
export function Logo({
  size = 28,
  textClassName = "text-[16px]",
  href = "/",
}: {
  size?: number;
  textClassName?: string;
  href?: string | null;
}) {
  const inner = (
    <span className="inline-flex items-center gap-2">
      <LogoMark size={size} />
      <span className={`font-medium tracking-tight ${textClassName}`}>
        <span className="text-ink">Doyin</span>
        <span className="text-brand">Mart</span>
      </span>
    </span>
  );

  if (href === null) return inner;
  return (
    <Link href={href} className="no-underline">
      {inner}
    </Link>
  );
}
