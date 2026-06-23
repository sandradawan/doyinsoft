import Link from "next/link";
import { DashboardHeader } from "@/components/dashboard-header";
import { ShareLink } from "@/components/share-link";
import { requireUser } from "@/lib/auth";
import {
  getAffiliateBalance,
  getAffiliateBank,
  getAffiliatePayouts,
  getAffiliateStats,
  getAffiliateToday,
  getOrCreateAffiliate,
} from "@/lib/affiliate";
import { getSettings } from "@/lib/settings";
import { listPaystackBanks } from "@/lib/paystack";
import { formatPrice } from "@/lib/format";
import { BankForm, WithdrawButton } from "./affiliate-client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

function shortDate(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function AffiliatePage() {
  const user = await requireUser();
  const affiliate = await getOrCreateAffiliate(user.id, user.email);

  const [stats, settings, balance, bank, payouts, banks, today] = await Promise.all([
    affiliate ? getAffiliateStats(affiliate.id) : null,
    getSettings(),
    affiliate ? getAffiliateBalance(affiliate.id) : null,
    affiliate ? getAffiliateBank(affiliate.id) : null,
    affiliate ? getAffiliatePayouts(affiliate.id) : [],
    listPaystackBanks(),
    affiliate ? getAffiliateToday(affiliate.id) : { earned_minor: 0, count: 0 },
  ]);

  const code = affiliate?.code ?? "";
  const link = `${SITE_URL}/?ref=${code}`;
  const available = balance?.available_minor ?? 0;

  return (
    <main className="max-w-2xl mx-auto px-5 py-7 text-[14px]">
      <DashboardHeader
        name={user.email.split("@")[0] || "Affiliate"}
        email={user.email}
        initials={(user.email[0] ?? "A").toUpperCase()}
        role="Affiliate"
      />

      <h1 className="text-[24px] font-medium m-0 mb-1">Earn with DoyinSoft</h1>
      <p className="text-[14px] text-ink-soft m-0 mb-6">
        Share your link. When someone buys through it, you earn{" "}
        <span className="font-medium text-ink">{settings.affiliate_percent}%</span> of the sale.
      </p>

      <div className="grid [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))] gap-4 mb-6">
        <div className="bg-brand-tint rounded-lg p-5">
          <p className="text-[14px] text-brand m-0 mb-2">Earned today</p>
          <p className="text-[24px] font-medium text-brand m-0 leading-none">{formatPrice(today.earned_minor, "NGN")}</p>
          <p className="text-[12px] text-ink-faint m-0 mt-1.5">{today.count} sale{today.count === 1 ? "" : "s"}</p>
        </div>
        <div className="bg-muted rounded-lg p-5">
          <p className="text-[14px] text-ink-soft m-0 mb-2">Available</p>
          <p className="text-[24px] font-medium m-0 leading-none">{formatPrice(available, "NGN")}</p>
        </div>
        <div className="bg-muted rounded-lg p-5">
          <p className="text-[14px] text-ink-soft m-0 mb-2">Total earned</p>
          <p className="text-[24px] font-medium m-0 leading-none">{formatPrice(balance?.earned_minor ?? 0, "NGN")}</p>
        </div>
        <div className="bg-muted rounded-md p-4">
          <p className="text-[12px] text-ink-soft m-0 mb-[6px]">Referred sales</p>
          <p className="text-[20px] font-medium m-0">{stats?.referrals ?? 0}</p>
        </div>
      </div>

      <p className="text-[12px] font-medium m-0 mb-2">Your referral link</p>
      <ShareLink url={link} message="Check out this software on DoyinSoft —" />

      {/* Withdraw */}
      <div className="mt-8">
        <p className="text-[13px] font-medium m-0 mb-2">Withdraw earnings</p>
        <div className="mb-3">
          <WithdrawButton canWithdraw={available > 0} />
        </div>
        <BankForm
          banks={banks}
          bankCode={bank?.bank_code ?? null}
          accountNumber={bank?.account_number ?? null}
          accountName={bank?.account_name ?? null}
        />
      </div>

      {/* History */}
      {payouts.length > 0 && (
        <div className="mt-8">
          <p className="text-[13px] font-medium m-0 mb-2">Payout history</p>
          {payouts.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between py-2 border-t border-line text-[13px]"
            >
              <span className="text-ink-soft">{shortDate(p.created_at)}</span>
              <span>{formatPrice(p.amount_minor, "NGN")}</span>
              <span
                className={`text-[11px] px-2 py-[2px] rounded-md ${
                  p.status === "paid" ? "bg-success-bg text-success" : "bg-info-bg text-info"
                }`}
              >
                {p.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
