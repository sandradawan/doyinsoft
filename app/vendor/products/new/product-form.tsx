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

type ProductType = "digital" | "physical" | "service";

const TYPE_OPTIONS: { value: ProductType; label: string; hint: string }[] = [
  { value: "digital", label: "Digital", hint: "Software, files, license keys — delivered instantly on payment." },
  { value: "physical", label: "Physical", hint: "Goods you ship. Buyer's delivery address is collected at checkout." },
  { value: "service", label: "Service", hint: "Work you fulfil. Buyer's contact is collected at checkout." },
];

export function ProductForm({ categories = [] }: { categories?: string[] }) {
  const [state, formAction, isPending] = useActionState<CreateProductState, FormData>(
    createProduct,
    {}
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [type, setType] = useState<ProductType>("digital");

  const isDigital = type === "digital";

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
  const typeMeta = TYPE_OPTIONS.find((t) => t.value === type)!;

  return (
    <form onSubmit={onSubmit} className="max-w-xl">
      {(state.error || uploadError) && (
        <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-4">
          {uploadError ?? state.error}
        </p>
      )}

      {/* What are you selling? — drives the rest of the form */}
      <div className="mb-5">
        <label className={labelCls}>What are you selling?</label>
        <input type="hidden" name="product_type" value={type} />
        <div className="inline-flex rounded-md border border-line overflow-hidden">
          {TYPE_OPTIONS.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setType(t.value)}
              className={[
                "text-[13px] px-4 py-2 border-r border-line last:border-r-0 cursor-pointer transition-colors",
                type === t.value ? "bg-brand text-white font-medium" : "bg-transparent text-ink-soft hover:bg-muted",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className={hintCls}>{typeMeta.hint}</p>
      </div>

      <div className="mb-4">
        <label className={labelCls}>{isDigital ? "Product name" : "Title"}</label>
        <input name="name" required className="field w-full" placeholder={isDigital ? "VectorForge" : "Ankara two-piece set"} />
      </div>

      <div className="mb-4">
        <label className={labelCls}>Slug</label>
        <input name="slug" className="field w-full" placeholder="auto-generated from the title" />
        <p className={hintCls}>Used in the URL. Leave blank to generate from the title.</p>
      </div>

      {/* Images */}
      <div className="mb-4">
        <label className={labelCls}>{isDigital ? "App icon" : "Cover photo"}</label>
        <input name="icon" type="file" accept="image/*" className={fileCls} />
        <p className={hintCls}>Square image. Shown on cards and at the top of the page.</p>
      </div>

      <div className="mb-4">
        <label className={labelCls}>{isDigital ? "Screenshots" : "Photos"}</label>
        <input name="screenshots" type="file" accept="image/*" multiple className={fileCls} />
        <p className={hintCls}>Up to 6 images. The first is shown large. Good photos sell — add several.</p>
      </div>

      <div className="mb-4">
        <label className={labelCls}>Tagline</label>
        <input
          name="tagline"
          className="field w-full"
          placeholder={isDigital ? "Vector illustration, offline-first" : "Handmade, ships nationwide"}
        />
      </div>

      <div className="mb-4">
        <label className={labelCls}>Description</label>
        <textarea
          name="description"
          rows={4}
          className="field w-full resize-y"
          placeholder={
            isDigital
              ? "What it does, who it's for…"
              : type === "physical"
                ? "Materials, sizes/colours available, what's in the box, delivery time…"
                : "What's included, turnaround time, how you deliver…"
          }
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

      <div className="mb-4">
        <label className={labelCls}>Category</label>
        <input name="category" list="category-list" className="field w-full" placeholder="e.g. Design tools, Fashion" />
        <datalist id="category-list">
          {categories.map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </div>

      {/* Digital-only fields */}
      {isDigital ? (
        <>
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
              <label className={labelCls}>Version</label>
              <input name="version" className="field w-full" defaultValue="1.0.0" />
            </div>
          </div>

          <div className="mb-4">
            <label className={labelCls}>Platform badges</label>
            <input name="os_badges" className="field w-full" placeholder="Windows, macOS" />
            <p className={hintCls}>Comma-separated.</p>
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
              Direct-download link to your file (Drive, Dropbox, GitHub release…). Buyers only see it
              after purchase.
            </p>
          </div>

          <div className="mb-6 max-w-[200px]">
            <label className={labelCls}>File size (MB)</label>
            <input name="file_size_mb" type="number" min="0" step="1" className="field w-full" placeholder="700" />
            <p className={hintCls}>Optional — shown to buyers.</p>
          </div>
        </>
      ) : (
        <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-6">
          {type === "physical"
            ? "After payment, you'll get the buyer's delivery address in Orders, and can mark it shipped/delivered. No download or version needed."
            : "After payment, you'll get the buyer's contact in Orders to fulfil the service. No download or version needed."}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-primary px-4 py-2">
        {uploading ? "Uploading images…" : isPending ? "Saving…" : "Publish"}
      </button>
    </form>
  );
}
