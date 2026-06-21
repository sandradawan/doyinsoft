import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Star } from "lucide-react";
import { adminProductById } from "@/lib/data";
import { formatBytes, formatPrice } from "@/lib/format";
import { approveProduct, deleteProduct, rejectProduct, toggleFeatured } from "../../actions";

export default async function AdminProductReview({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await adminProductById(id);
  if (!p) notFound();

  return (
    <div className="max-w-3xl">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-1 text-[12px] text-ink-soft no-underline hover:text-ink mb-3"
      >
        <ChevronLeft size={14} /> Products
      </Link>

      <div className="flex items-start gap-3 mb-4">
        {p.icon_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.icon_url} alt="" className="w-12 h-12 rounded-lg object-cover bg-muted shrink-0" />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-muted shrink-0" />
        )}
        <div>
          <h1 className="text-[22px] font-medium m-0">{p.name}</h1>
          <p className="text-[12px] text-ink-soft m-0">
            by {p.vendor.name} · {p.category || "—"} · {formatPrice(p.price_minor, p.currency)} ·
            status: <span className="font-medium">{p.status}</span>
            {p.featured && (
              <span className="text-brand inline-flex items-center gap-1 ml-1">
                <Star size={11} className="fill-current" /> featured
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Screenshots */}
      {p.screenshots.length > 0 ? (
        <div className="flex gap-2 flex-wrap mb-4">
          {p.screenshots.map((s) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={s} src={s} alt="" className="rounded-md w-40 h-28 object-cover bg-muted border border-line" />
          ))}
        </div>
      ) : (
        <p className="text-[12px] text-ink-faint mb-4">No screenshots uploaded.</p>
      )}

      <p className="text-[13px] text-ink-soft leading-[1.7] mb-3">{p.description || "No description."}</p>

      <dl className="text-[12px] mb-5 grid grid-cols-[120px_1fr] gap-y-1">
        <dt className="text-ink-faint">Version</dt>
        <dd className="m-0">{p.version}</dd>
        <dt className="text-ink-faint">Requirements</dt>
        <dd className="m-0">{p.system_requirements || "—"}</dd>
        <dt className="text-ink-faint">Platforms</dt>
        <dd className="m-0">{p.os_badges.join(", ") || "—"}</dd>
        <dt className="text-ink-faint">File size</dt>
        <dd className="m-0">{p.file_size ? formatBytes(p.file_size) : "—"}</dd>
        <dt className="text-ink-faint">Download link</dt>
        <dd className="m-0 break-all">
          {p.file_path ? (
            <a href={p.file_path} target="_blank" rel="noreferrer" className="text-brand hover:underline">
              {p.file_path}
            </a>
          ) : (
            "— (none provided)"
          )}
        </dd>
      </dl>

      {/* Moderation actions */}
      <div className="flex items-center gap-2 flex-wrap pt-4 border-t border-line">
        {p.status !== "approved" && (
          <form action={approveProduct}>
            <input type="hidden" name="id" value={p.id} />
            <button className="btn-primary text-[13px] px-4 py-2">Approve</button>
          </form>
        )}
        <form action={rejectProduct} className="flex items-center gap-2">
          <input type="hidden" name="id" value={p.id} />
          <input name="reason" placeholder="Reason (optional)" className="field text-[12px] py-[6px] w-48" />
          <button className="text-[13px] text-info bg-info-bg rounded-md px-3 py-2 border-0 cursor-pointer">
            {p.status === "approved" ? "Unpublish" : "Reject"}
          </button>
        </form>
        <form action={toggleFeatured}>
          <input type="hidden" name="id" value={p.id} />
          <input type="hidden" name="featured" value={String(p.featured)} />
          <button className="text-[13px] text-ink-soft border border-line rounded-md px-3 py-2 bg-transparent cursor-pointer hover:border-brand hover:text-brand">
            {p.featured ? "Unfeature" : "Feature"}
          </button>
        </form>
        <form
          action={deleteProduct}
          className="ml-auto"
        >
          <input type="hidden" name="id" value={p.id} />
          <button className="text-[13px] text-ink-faint border border-line rounded-md px-3 py-2 bg-transparent cursor-pointer hover:border-line-strong hover:text-ink">
            Delete
          </button>
        </form>
      </div>
    </div>
  );
}
