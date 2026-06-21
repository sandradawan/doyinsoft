import Link from "next/link";
import { Logo } from "@/components/logo";
import { ShareLink } from "@/components/share-link";
import { requireUser } from "@/lib/auth";
import {
  getAffiliateBalance,
  getAffiliateBank,
  getAffiliatePayouts,
  getAffiliateStats,
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

  const [stats, settings, balance, bank, payouts, banks] = await Promise.all([
    affiliate ? getAffiliateStats(affiliate.id) : null,
    getSettings(),
    affiliate ? getAffiliateBalance(affiliate.id) : null,
    affiliate ? getAffiliateBank(affiliate.id) : null,
    affiliate ? getAffiliatePayouts(affiliate.id) : [],
    listPaystackBanks(),
  ]);

  const code = affiliate?.code ?? "";
  const link = `${SITE_URL}/?ref=${code}`;
  const available = balance?.available_minor ?? 0;

  return (
    <main className="max-w-2xl mx-auto px-5 py-8">
      <div className="flex items-center justify-between mb-6">
        <Logo />
        <Link href="/" className="text-[13px] text-ink-soft no-underline hover:text-ink">
          ← Store
        </Link>
      </div>

      <h1 className="text-[22px] font-medium m-0 mb-1">Earn with DoyinSoft</h1>
      <p className="text-[13px] text-ink-soft m-0 mb-6">
        Share your link. When someone buys through it, you earn{" "}
        <span className="font-medium text-ink">{settings.affiliate_percent}%</span> of the sale.
      </p>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="bg-muted rounded-md p-4">
          <p className="text-[12px] text-ink-soft m-0 mb-[6px]">Available</p>
          <p className="text-[20px] font-medium m-0">{formatPrice(available, "NGN")}</p>
        </div>
        <div className="bg-muted rounded-md p-4">
          <p className="text-[12px] text-ink-soft m-0 mb-[6px]">Total earned</p>
          <p className="text-[20px] font-medium m-0">{formatPrice(balance?.earned_minor ?? 0, "NGN")}</p>
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
