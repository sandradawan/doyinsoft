import { adminAffiliatePayouts } from "@/lib/affiliate";
import { formatPrice } from "@/lib/format";
import { markAffiliatePaid } from "../actions";

function shortDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short" });
}

export default async function AdminAffiliatesPage() {
  const payouts = await adminAffiliatePayouts();
  const pending = payouts.filter((p) => p.status === "requested");

  return (
    <div>
      <h1 className="text-[22px] font-medium m-0 mb-1">Affiliate payouts</h1>
      <p className="text-[13px] text-ink-soft m-0 mb-5">
        {pending.length} pending request{pending.length === 1 ? "" : "s"}. Send the transfer to the
        bank shown, then mark it paid.
      </p>

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
    </div>
  );
}
