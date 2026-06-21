"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { Product } from "@/lib/types";
import { deleteProduct, updateProduct, type EditProductState } from "./actions";

const labelCls = "block text-[12px] font-medium m-0 mb-[6px]";
const hintCls = "text-[11px] text-ink-faint mt-1";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary px-4 py-2">
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

export function EditProductForm({ product }: { product: Product }) {
  const [state, action] = useActionState<EditProductState, FormData>(updateProduct, {});

  const currentUrl = product.file_path && /^https?:\/\//i.test(product.file_path)
    ? product.file_path
    : "";
  const currentSizeMb = product.file_size
    ? Math.round(product.file_size / (1024 * 1024))
    : "";

  return (
    <div className="max-w-xl">
      <form action={action}>
        {state.error && (
          <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-4">
            {state.error}
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

        <div className="mb-2">
          <label className={labelCls}>Download link</label>
          <input
            name="download_url"
            type="url"
            defaultValue={currentUrl}
            className="field w-full"
            placeholder="https://…"
          />
          <p className={hintCls}>
            Direct-download link to your installer. Buyers see it only after purchase.
          </p>
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
          <p className={hintCls}>Optional — shown to buyers.</p>
        </div>

        <SaveButton />
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
