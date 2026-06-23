import { adminAffiliatePayouts, AFFILIATE_PAYOUTS_PAGE_SIZE } from "@/lib/affiliate";
import { formatPrice } from "@/lib/format";
import { Pagination } from "@/components/pagination";
import { markAffiliatePaid } from "../actions";

function shortDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short" });
}

export default async function AdminAffiliatesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const query = q?.trim() ?? "";
  const page = Math.max(1, Number(pageParam) || 1);
  const { items: payouts, total } = await adminAffiliatePayouts(page, query || undefined);
  const pending = payouts.filter((p) => p.status === "requested");

  const hrefForPage = (p: number) => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (p > 1) params.set("page", String(p));
    const s = params.toString();
    return `/admin/affiliates${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <h1 className="text-[22px] font-medium m-0 mb-1">Affiliate payouts</h1>
      <p className="text-[13px] text-ink-soft m-0 mb-4">
        {pending.length} pending on this page. Send the transfer to the bank shown, then mark it paid.
      </p>

      <form method="get" className="flex gap-2 mb-4 max-w-md">
        <input
          name="q"
          defaultValue={query}
          placeholder="Search affiliate code or email…"
          className="field flex-1"
        />
        <button className="btn-primary px-4 py-2">Search</button>
      </form>

      {payouts.length === 0 ? (
        <p className="text-[13px] text-ink-soft">No payout requests yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {payouts.map((p) => (
            <div key={p.id} className="border border-line rounded-lg p-3 text-[13px]">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-medium">{p.code}</span>
                <span className="text-ink-soft">{p.email}</span>
                <span className="ml-auto font-medium">{formatPrice(p.amount_minor, "NGN")}</span>
                <span
                  className={`text-[11px] px-2 py-[2px] rounded-md ${
                    p.status === "paid" ? "bg-success-bg text-success" : "bg-info-bg text-info"
                  }`}
                >
                  {p.status}
                </span>
              </div>
              <p className="text-[11px] text-ink-faint m-0 mt-1">
                {p.account_name ?? "—"} · {p.account_number ?? "—"} · bank {p.bank_code ?? "—"} ·
                requested {shortDate(p.created_at)}
              </p>
              {p.status === "requested" && (
                <form action={markAffiliatePaid} className="mt-2">
                  <input type="hidden" name="id" value={p.id} />
                  <button className="btn-primary text-[12px] px-3 py-[6px]">Mark paid</button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      <Pagination
        page={page}
        total={total}
        pageSize={AFFILIATE_PAYOUTS_PAGE_SIZE}
        hrefForPage={hrefForPage}
      />
    </div>
  );
}
