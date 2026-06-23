import Link from "next/link";

/** Prev/Next pager. `hrefForPage` builds a URL preserving the page's own filters. */
export function Pagination({
  page,
  total,
  pageSize,
  hrefForPage,
}: {
  page: number;
  total: number;
  pageSize: number;
  hrefForPage: (p: number) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;
  const btn =
    "border border-line rounded-md px-3 py-[5px] no-underline text-ink-soft hover:border-line-strong";
  return (
    <div className="flex items-center justify-between mt-4 text-[12px]">
      <span className="text-ink-faint">
        Page {page} of {totalPages} · {total} total
      </span>
      <div className="flex gap-2">
        {page > 1 && <Link href={hrefForPage(page - 1)} className={btn}>← Prev</Link>}
        {page < totalPages && <Link href={hrefForPage(page + 1)} className={btn}>Next →</Link>}
      </div>
    </div>
  );
}
