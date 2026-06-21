"use client";

import { startTransition, useActionState, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatBytes } from "@/lib/format";
import type { Product } from "@/lib/types";
import { deleteProduct, updateProduct, type EditProductState } from "./actions";

const labelCls = "block text-[12px] font-medium m-0 mb-[6px]";
const hintCls = "text-[11px] text-ink-faint mt-1";

export function EditProductForm({
  product,
  vendorId,
}: {
  product: Product;
  vendorId: string;
}) {
  const [state, formAction, isPending] = useActionState<EditProductState, FormData>(
    updateProduct,
    {}
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file");
    fd.delete("file");

    if (file instanceof File && file.size > 0) {
      setUploading(true);
      setUploadError(null);
      try {
        const supabase = createClient();
        const path = `${vendorId}/${product.slug}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage
          .from("software")
          .upload(path, file, { upsert: false, contentType: file.type || undefined });
        if (error) {
          setUploading(false);
          setUploadError(`Upload failed: ${error.message}`);
          return;
        }
        fd.set("file_path", path);
        fd.set("file_name", file.name);
        fd.set("file_size", String(file.size));
      } catch (err) {
        setUploading(false);
        setUploadError(err instanceof Error ? err.message : "Upload failed.");
        return;
      }
      setUploading(false);
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

        <div className="mb-6">
          <label className={labelCls}>Replace software file (optional)</label>
          <input
            name="file"
            type="file"
            className="field w-full text-[12px] file:mr-3 file:border-0 file:bg-muted file:text-ink file:rounded-md file:px-3 file:py-1 file:text-[12px]"
          />
          <p className={hintCls}>
            {product.file_name
              ? `Current: ${product.file_name} (${formatBytes(product.file_size)}). Upload to publish a new version.`
              : "No file uploaded yet. Add one so buyers can download."}
          </p>
        </div>

        <button type="submit" disabled={busy} className="btn-primary px-4 py-2">
          {uploading ? "Uploading file…" : isPending ? "Saving…" : "Save changes"}
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
        <p className="text-[12px] text-ink-soft m-0 mb-2">
          Remove this product and its file permanently.
        </p>
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
