"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { createProduct, type CreateProductState } from "./actions";

const labelCls = "block text-[12px] font-medium m-0 mb-[6px]";
const hintCls = "text-[11px] text-ink-faint mt-1";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary px-4 py-2">
      {pending ? "Saving…" : "Publish product"}
    </button>
  );
}

export function ProductForm() {
  const [state, action] = useActionState<CreateProductState, FormData>(
    createProduct,
    {}
  );

  return (
    <form action={action} className="max-w-xl">
      {state.error && (
        <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-4">
          {state.error}
        </p>
      )}

      <div className="mb-4">
        <label className={labelCls}>Product name</label>
        <input name="name" required className="field w-full" placeholder="VectorForge" />
      </div>

      <div className="mb-4">
        <label className={labelCls}>Slug</label>
        <input name="slug" className="field w-full" placeholder="vectorforge" />
        <p className={hintCls}>Used in the URL. Leave blank to generate from the name.</p>
      </div>

      <div className="mb-4">
        <label className={labelCls}>Tagline</label>
        <input
          name="tagline"
          className="field w-full"
          placeholder="Vector illustration, offline-first"
        />
      </div>

      <div className="mb-4">
        <label className={labelCls}>Description</label>
        <textarea
          name="description"
          rows={3}
          className="field w-full resize-y"
          placeholder="What it does, who it's for…"
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
            defaultValue="0"
            className="field w-full"
          />
          <p className={hintCls}>0 = free.</p>
        </div>
        <div>
          <label className={labelCls}>Currency</label>
          <select name="currency" className="field w-full" defaultValue="NGN">
            <option value="NGN">NGN (₦)</option>
            <option value="USD">USD ($)</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelCls}>Platform</label>
          <select name="platform" className="field w-full" defaultValue="desktop">
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="web">Web app</option>
          </select>
        </div>
        <div>
          <label className={labelCls}>Category</label>
          <input name="category" className="field w-full" placeholder="Design tools" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <label className={labelCls}>Version</label>
          <input name="version" className="field w-full" defaultValue="1.0.0" />
        </div>
        <div>
          <label className={labelCls}>Platform badges</label>
          <input name="os_badges" className="field w-full" placeholder="Windows, macOS" />
          <p className={hintCls}>Comma-separated.</p>
        </div>
      </div>

      <div className="mb-4">
        <label className={labelCls}>System requirements</label>
        <input
          name="system_requirements"
          className="field w-full"
          placeholder="Windows 10+, 4GB RAM, 500MB disk"
        />
      </div>

      <div className="mb-6">
        <label className={labelCls}>Software file</label>
        <input
          name="file"
          type="file"
          className="field w-full text-[12px] file:mr-3 file:border-0 file:bg-muted file:text-ink file:rounded-md file:px-3 file:py-1 file:text-[12px]"
        />
        <p className={hintCls}>
          The installer or archive buyers download. Stored privately; delivered via a
          signed link only after purchase.
        </p>
      </div>

      <SubmitButton />
    </form>
  );
}
