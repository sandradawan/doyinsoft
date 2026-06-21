import Link from "next/link";
import { cookies } from "next/headers";
import { ChevronUp, Star } from "lucide-react";
import { TopNav } from "@/components/top-nav";
import { Footer } from "@/components/footer";
import { getLaunches, getMyUpvotes, type LaunchPeriod } from "@/lib/data";
import { formatPrice } from "@/lib/format";
import { toggleUpvote } from "./actions";

const TABS: { label: string; value: LaunchPeriod }[] = [
  { label: "Today", value: "today" },
  { label: "This week", value: "week" },
  { label: "All time", value: "all" },
];

export const metadata = {
  title: "Launches — new software on DoyinSoft",
  description: "Discover and upvote the newest software launches from African developers.",
};

export default async function LaunchesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = (["today", "week", "all"].includes(periodParam ?? "")
    ? periodParam
    : "week") as LaunchPeriod;

  const launches = await getLaunches(period);
  const voter = (await cookies()).get("voter")?.value ?? "";
  const voted = await getMyUpvotes(voter);

  return (
    <main className="max-w-3xl mx-auto px-5 py-6">
      <TopNav />

      <div className="mb-4">
        <h1 className="text-[22px] font-medium m-0 mb-1">🚀 Launches</h1>
        <p className="text-[14px] text-ink-soft m-0">
          The newest software from African developers — upvote your favourites.
        </p>
      </div>

      <div className="flex gap-2 flex-wrap mb-5">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/launches?period=${t.value}`}
            className={[
              "text-[12px] px-3 py-[5px] rounded-md no-underline border transition-colors",
              t.value === period
                ? "border-brand text-brand bg-brand-tint font-medium"
                : "border-line text-ink-soft hover:border-line-strong hover:text-ink",
            ].join(" ")}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {launches.length === 0 ? (
        <p className="text-[13px] text-ink-soft">No launches in this period yet.</p>
      ) : (
        <div className="flex flex-col">
          {launches.map((p, i) => (
            <div
              key={p.id}
              className="flex items-center gap-3 py-3 border-t border-line first:border-t-0"
            >
              <span className="w-5 text-[13px] text-ink-faint text-right shrink-0">{i + 1}</span>

              {p.icon_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.icon_url} alt="" className="w-10 h-10 rounded-md object-cover bg-muted shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-md bg-muted shrink-0" />
              )}

              <Link href={`/products/${p.slug}`} className="flex-1 min-w-0 no-underline text-ink">
                <p className="text-[13px] font-medium m-0 truncate">{p.name}</p>
                <p className="text-[12px] text-ink-soft m-0 truncate">
                  {p.tagline || p.category} · {formatPrice(p.price_minor, p.currency)}
                  {p.rating_count > 0 && (
                    <span className="text-ink-faint">
                      {" "}
                      · <Star size={10} className="inline fill-current text-brand" /> {p.rating_avg.toFixed(1)}
                    </span>
                  )}
                </p>
              </Link>

              <form action={toggleUpvote}>
                <input type="hidden" name="id" value={p.id} />
                <button
                  className={[
                    "flex flex-col items-center justify-center w-12 h-12 rounded-md border cursor-pointer transition-colors",
                    voted.has(p.id)
                      ? "border-brand text-brand bg-brand-tint"
                      : "border-line text-ink-soft hover:border-brand hover:text-brand",
                  ].join(" ")}
                  aria-label="Upvote"
                >
                  <ChevronUp size={16} />
                  <span className="text-[12px] font-medium leading-none">{p.upvotes}</span>
                </button>
              </form>
            </div>
          ))}
        </div>
      )}

      <Footer />
    </main>
  );
}
