import { Stars } from "@/components/stars";
import { Pagination } from "@/components/pagination";
import { ADMIN_PAGE_SIZE, adminReviews } from "@/lib/data";
import { deleteReview } from "../actions";

function shortDate(iso: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const page = Math.max(1, Number(pageParam) || 1);
  const { items: reviews, total } = await adminReviews(page, query || undefined);

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/reviews${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <h1 className="text-[22px] font-medium m-0 mb-4">Reviews</h1>

      <form method="get" className="flex gap-2 mb-4 max-w-md">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search reviewer or text…"
          className="field flex-1"
        />
        <button className="btn-primary px-4 py-2">Search</button>
      </form>

      {reviews.length === 0 ? (
        <p className="text-[13px] text-ink-soft">No reviews yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {reviews.map((r) => (
            <div key={r.id} className="border border-line rounded-lg p-3 text-[13px]">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="font-medium">
                  {r.author_name}{" "}
                  <span className="text-ink-faint font-normal">on {r.product_name}</span>
                </span>
                <span className="text-[11px] text-ink-faint">{shortDate(r.created_at)}</span>
              </div>
              <Stars value={r.rating} size={12} />
              {r.body && <p className="text-[13px] text-ink-soft leading-[1.6] m-0 mt-1">{r.body}</p>}
              <form action={deleteReview} className="mt-2">
                <input type="hidden" name="id" value={r.id} />
                <button className="text-[12px] text-info bg-info-bg rounded-md px-3 py-[5px] border-0 cursor-pointer">
                  Delete review
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} total={total} pageSize={ADMIN_PAGE_SIZE} hrefForPage={hrefForPage} />
    </div>
  );
}
