"use client";

import { startTransition, useActionState, useState } from "react";
import { uploadImage } from "@/lib/upload-media";
import type { Product } from "@/lib/types";
import { deleteProduct, updateProduct, type EditProductState } from "./actions";

const labelCls = "block text-[12px] font-medium m-0 mb-[6px]";
const hintCls = "text-[11px] text-ink-faint mt-1";
const fileCls =
  "field w-full text-[12px] file:mr-3 file:border-0 file:bg-muted file:text-ink file:rounded-md file:px-3 file:py-1 file:text-[12px]";

export function EditProductForm({ product }: { product: Product }) {
  const [state, formAction, isPending] = useActionState<EditProductState, FormData>(
    updateProduct,
    {}
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const currentUrl =
    product.file_path && /^https?:\/\//i.test(product.file_path) ? product.file_path : "";
  const currentSizeMb = product.file_size
    ? Math.round(product.file_size / (1024 * 1024))
    : "";

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const iconFile = fd.get("icon");
    const shotFiles = fd.getAll("screenshots");
    fd.delete("icon");
    fd.delete("screenshots");

    try {
      setUploadError(null);
      const hasIcon = iconFile instanceof File && iconFile.size > 0;
      const shots = (shotFiles as unknown[]).filter(
        (f): f is File => f instanceof File && f.size > 0
      );

      if (hasIcon || shots.length) setUploading(true);
      // Icon: new upload replaces, else keep existing.
      fd.set("icon_url", hasIcon ? await uploadImage(iconFile as File) : product.icon_url ?? "");
      // Screenshots: new uploads replace the set, else keep existing.
      if (shots.length) {
        const urls: string[] = [];
        for (const s of shots.slice(0, 6)) urls.push(await uploadImage(s));
        fd.set("screenshots", urls.join("\n"));
      } else {
        fd.set("screenshots", product.screenshots.join("\n"));
      }
      setUploading(false);
    } catch (err) {
      setUploading(false);
      setUploadError(err instanceof Error ? err.message : "Image upload failed.");
      return;
    }

    startTransition(() => formAction(fd));
  }

  const busy = uploading || isPending;

  return (
    <div className="max-w-xl">
      <form onSubmit={onSubmit}>
        {(state.error || uploadError) && (
          <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-4">
            {uploadError ?? state.error}
          </p>
        )}

        <input type="hidden" name="id" value={product.id} />

        <div className="mb-4">
          <label className={labelCls}>Product name</label>
          <input name="name" required defaultValue={product.name} className="field w-full" />
        </div>

        {/* App icon */}
        <div className="mb-4">
          <label className={labelCls}>App icon</label>
          {product.icon_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.icon_url}
              alt=""
              className="w-12 h-12 rounded-md object-cover border border-line mb-2"
            />
          )}
          <input name="icon" type="file" accept="image/*" className={fileCls} />
          <p className={hintCls}>Upload to replace the current icon.</p>
        </div>

        {/* Screenshots */}
        <div className="mb-4">
          <label className={labelCls}>Screenshots</label>
          {product.screenshots.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-2">
              {product.screenshots.map((s) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={s}
                  src={s}
                  alt=""
                  className="w-20 h-14 rounded-md object-cover border border-line"
                />
              ))}
            </div>
          )}
          <input name="screenshots" type="file" accept="image/*" multiple className={fileCls} />
          <p className={hintCls}>Uploading new images replaces the current set (up to 6).</p>
        </div>

        <div className="mb-4">
          <label className={labelCls}>Tagline</label>
          <input name="tagline" defaultValue={product.tagline} className="field w-full" />
        </div>

        <div className="mb-4">
          <label className={labelCls}>Description</label>
          <textarea
            name="description"
            rows={3}
            defaultValue={product.description}
            className="field w-full resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className={labelCls}>Price</label>
            <input
              name="price"
              type="number"
              min="0"
              step="0.01"
              defaultValue={(product.price_minor / 100).toString()}
              className="field w-full"
            />
          </div>
          <div>
            <label className={labelCls}>Currency</label>
            <select name="currency" defaultValue={product.currency} className="field w-full">
              <option value="NGN">NGN (₦)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className={labelCls}>Platform</label>
            <select name="platform" defaultValue={product.platform} className="field w-full">
              <option value="desktop">Desktop</option>
              <option value="mobile">Mobile</option>
              <option value="web">Web app</option>
            </select>
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <input name="category" defaultValue={product.category} className="field w-full" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className={labelCls}>Version</label>
            <input name="version" defaultValue={product.version} className="field w-full" />
          </div>
          <div>
            <label className={labelCls}>Platform badges</label>
            <input
              name="os_badges"
              defaultValue={product.os_badges.join(", ")}
              className="field w-full"
            />
            <p className={hintCls}>Comma-separated.</p>
          </div>
        </div>

        <div className="mb-4">
          <label className={labelCls}>System requirements</label>
          <input
            name="system_requirements"
            defaultValue={product.system_requirements}
            className="field w-full"
          />
        </div>

        <div className="mb-2">
          <label className={labelCls}>Download link</label>
          <input
            name="download_url"
            type="url"
            defaultValue={currentUrl}
            className="field w-full"
            placeholder="https://…"
          />
          <p className={hintCls}>Direct-download link. Buyers see it only after purchase.</p>
        </div>

        <div className="mb-6 max-w-[200px]">
          <label className={labelCls}>File size (MB)</label>
          <input
            name="file_size_mb"
            type="number"
            min="0"
            step="1"
            defaultValue={currentSizeMb}
            className="field w-full"
            placeholder="700"
          />
        </div>

        <button type="submit" disabled={busy} className="btn-primary px-4 py-2">
          {uploading ? "Uploading images…" : isPending ? "Saving…" : "Save changes"}
        </button>
      </form>

      {/* Delete — separate form, with a confirm guard. */}
      <form
        action={deleteProduct}
        className="mt-8 pt-5 border-t border-line"
        onSubmit={(e) => {
          if (!confirm(`Delete "${product.name}"? This can't be undone.`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={product.id} />
        <p className="text-[12px] text-ink-soft m-0 mb-2">Remove this product permanently.</p>
        <button
          type="submit"
          className="text-[13px] text-info bg-info-bg rounded-md px-3 py-2 border-0 cursor-pointer hover:opacity-90"
        >
          Delete product
        </button>
      </form>
    </div>
  );
}
