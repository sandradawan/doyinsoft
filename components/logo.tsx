import Link from "next/link";

/**
 * The DoyinMart mark: an emerald rounded-square tile holding a white shopping
 * bag, with the Doyin "D" formed by the bag's negative space (the tile shows
 * through, so the D is always the brand colour in light/dark). The bag nods to
 * the marketplace; the D ties it to the name. currentColor drives the tile.
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
      {/* Brand tile */}
      <rect width="32" height="32" rx="8.5" fill="currentColor" />

      {/* Bag handle */}
      <path
        d="M12 12.6v-1.7a4 4 0 0 1 8 0v1.7"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.9"
        strokeLinecap="round"
      />

      {/* White bag body with the "D" cut out (even-odd: bag = white,
          D body = tile shows through, D counter = white). */}
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.7 12.4h14.6a1 1 0 0 1 1 1.07l-0.78 10.9a2.4 2.4 0 0 1-2.4 2.23H10.88a2.4 2.4 0 0 1-2.4-2.23l-0.78-10.9a1 1 0 0 1 1-1.07Zm4.5 3.3v8.1h3.06a4.05 4.05 0 0 0 0-8.1H13.2Zm2 1.95v4.2h1.06a2.1 2.1 0 0 0 0-4.2H15.2Z"
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
