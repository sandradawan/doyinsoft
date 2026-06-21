import Link from "next/link";
import { Logo } from "@/components/logo";
import { ShareLink } from "@/components/share-link";
import { requireUser } from "@/lib/auth";
import { getAffiliateStats, getOrCreateAffiliate } from "@/lib/affiliate";
import { getSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/format";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function AffiliatePage() {
  const user = await requireUser();
  const affiliate = await getOrCreateAffiliate(user.id, user.email);
  const [stats, settings] = await Promise.all([
    affiliate ? getAffiliateStats(affiliate.id) : null,
    getSettings(),
  ]);

  const code = affiliate?.code ?? "";
  const link = `${SITE_URL}/?ref=${code}`;

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

      {/* Earnings */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-muted rounded-md p-4">
          <p className="text-[13px] text-ink-soft m-0 mb-[6px]">Total earned</p>
          <p className="text-[22px] font-medium m-0">
            {formatPrice(stats?.earned_minor ?? 0, "NGN")}
          </p>
        </div>
        <div className="bg-muted rounded-md p-4">
          <p className="text-[13px] text-ink-soft m-0 mb-[6px]">Referred sales</p>
          <p className="text-[22px] font-medium m-0">{stats?.referrals ?? 0}</p>
        </div>
      </div>

      {/* Referral link */}
      <p className="text-[12px] font-medium m-0 mb-2">Your referral link</p>
      <ShareLink
        url={link}
        message="Check out this software on DoyinSoft —"
      />

      <div className="mt-8 border-t border-line pt-5">
        <p className="text-[13px] font-medium m-0 mb-2">How it works</p>
        <ol className="text-[13px] text-ink-soft leading-[1.8] pl-4 m-0">
          <li>Share your link anywhere — WhatsApp, X, groups, your blog.</li>
          <li>Anyone who clicks it is tagged to you for 30 days.</li>
          <li>When they buy, you earn {settings.affiliate_percent}% of the sale.</li>
          <li>Earnings are paid out to your bank (contact support to withdraw).</li>
        </ol>
      </div>
    </main>
  );
}
