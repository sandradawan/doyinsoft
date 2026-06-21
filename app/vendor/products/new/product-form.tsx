"use client";

import { startTransition, useActionState, useState } from "react";
import { uploadImage } from "@/lib/upload-media";
import { createProduct, type CreateProductState } from "./actions";

const labelCls = "block text-[12px] font-medium m-0 mb-[6px]";
const hintCls = "text-[11px] text-ink-faint mt-1";
const fileCls =
  "field w-full text-[12px] file:mr-3 file:border-0 file:bg-muted file:text-ink file:rounded-md file:px-3 file:py-1 file:text-[12px]";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ProductForm() {
  const [state, formAction, isPending] = useActionState<CreateProductState, FormData>(
    createProduct,
    {}
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    const name = String(fd.get("name") ?? "").trim();
    fd.set("slug", slugify(String(fd.get("slug") || name)));

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

      if (hasIcon || shots.length) {
        setUploading(true);
        if (hasIcon) fd.set("icon_url", await uploadImage(iconFile as File));
        const urls: string[] = [];
        for (const s of shots.slice(0, 6)) urls.push(await uploadImage(s));
        if (urls.length) fd.set("screenshots", urls.join("\n"));
        setUploading(false);
      }
    } catch (err) {
      setUploading(false);
      setUploadError(err instanceof Error ? err.message : "Image upload failed.");
      return;
    }

    startTransition(() => formAction(fd));
  }

  const busy = uploading || isPending;

  return (
    <form onSubmit={onSubmit} className="max-w-xl">
      {(state.error || uploadError) && (
        <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-4">
          {uploadError ?? state.error}
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

      {/* App icon */}
      <div className="mb-4">
        <label className={labelCls}>App icon</label>
        <input name="icon" type="file" accept="image/*" className={fileCls} />
        <p className={hintCls}>Square image (PNG/JPG/SVG). Shown on cards and the product page.</p>
      </div>

      {/* Screenshots */}
      <div className="mb-4">
        <label className={labelCls}>Screenshots</label>
        <input name="screenshots" type="file" accept="image/*" multiple className={fileCls} />
        <p className={hintCls}>Up to 6 images. The first is shown large on the product page.</p>
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
          <input name="price" type="number" min="0" step="0.01" defaultValue="0" className="field w-full" />
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

      <div className="mb-2">
        <label className={labelCls}>Download link</label>
        <input
          name="download_url"
          type="url"
          className="field w-full"
          placeholder="https://drive.google.com/uc?export=download&id=…"
        />
        <p className={hintCls}>
          Direct-download link to your installer (Drive, Dropbox, GitHub release…). Buyers
          only see it after purchase.
        </p>
      </div>

      <div className="mb-6 max-w-[200px]">
        <label className={labelCls}>File size (MB)</label>
        <input name="file_size_mb" type="number" min="0" step="1" className="field w-full" placeholder="700" />
        <p className={hintCls}>Optional — shown to buyers.</p>
      </div>

      <button type="submit" disabled={busy} className="btn-primary px-4 py-2">
        {uploading ? "Uploading images…" : isPending ? "Saving…" : "Publish product"}
      </button>
    </form>
  );
}
