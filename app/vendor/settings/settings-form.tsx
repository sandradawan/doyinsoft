"use client";

import { startTransition, useActionState, useState } from "react";
import Link from "next/link";
import { uploadImage } from "@/lib/upload-media";
import type { SessionVendor } from "@/lib/auth";
import { updateVendor, type SettingsState } from "./actions";

const labelCls = "block text-[12px] font-medium m-0 mb-[6px]";
const hintCls = "text-[11px] text-ink-faint mt-1";
const fileCls =
  "field w-full text-[12px] file:mr-3 file:border-0 file:bg-muted file:text-ink file:rounded-md file:px-3 file:py-1 file:text-[12px]";

export function SettingsForm({
  vendor,
  bio,
  coverUrl,
}: {
  vendor: SessionVendor;
  bio: string | null;
  coverUrl: string | null;
}) {
  const [state, action, isPending] = useActionState<SettingsState, FormData>(updateVendor, {});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const cover = fd.get("cover");
    fd.delete("cover");
    if (cover instanceof File && cover.size > 0) {
      setUploading(true);
      setUploadError(null);
      try {
        fd.set("cover_url", await uploadImage(cover));
      } catch (err) {
        setUploading(false);
        setUploadError(err instanceof Error ? err.message : "Cover upload failed.");
        return;
      }
      setUploading(false);
    }
    startTransition(() => action(fd));
  }

  const busy = uploading || isPending;

  return (
    <form onSubmit={onSubmit} className="max-w-md">
      {state.success && (
        <p className="text-[12px] text-success bg-success-bg rounded-md px-3 py-2 mb-4">
          {state.success}
        </p>
      )}
      {(state.error || uploadError) && (
        <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-4">
          {uploadError ?? state.error}
        </p>
      )}

      <div className="mb-4">
        <label className={labelCls}>Business / vendor name</label>
        <input name="name" required defaultValue={vendor.name} className="field w-full" />
        <p className={hintCls}>Shown to buyers on your products and store.</p>
      </div>

      <div className="mb-4">
        <label className={labelCls}>Store bio</label>
        <textarea
          name="bio"
          rows={3}
          defaultValue={bio ?? ""}
          className="field w-full resize-y"
          placeholder="Tell buyers who you are and what you sell…"
        />
        <p className={hintCls}>Shown at the top of your store page.</p>
      </div>

      <div className="mb-4">
        <label className={labelCls}>Store cover image</label>
        <input name="cover" type="file" accept="image/*" className={fileCls} />
        <p className={hintCls}>
          Wide banner at the top of your store.{" "}
          <Link href={`/store/${vendor.slug}`} className="text-brand">
            View your store →
          </Link>
        </p>
      </div>

      <div className="mb-4">
        <label className={labelCls}>Avatar initials</label>
        <input name="initials" maxLength={2} defaultValue={vendor.initials} className="field w-28 uppercase" />
        <p className={hintCls}>Up to 2 letters. Leave blank to derive from the name.</p>
      </div>

      <div className="mb-4">
        <label className={labelCls}>WhatsApp number</label>
        <input
          name="whatsapp"
          defaultValue={vendor.whatsapp ?? ""}
          className="field w-full"
          placeholder="+234 801 234 5678"
        />
        <p className={hintCls}>Shown as a &ldquo;Chat vendor&rdquo; button. Include the country code.</p>
      </div>

      <div className="mb-5">
        <label className={labelCls}>Email</label>
        <input value={vendor.email} disabled className="field w-full opacity-70" />
        <p className={hintCls}>Your login email can't be changed here.</p>
      </div>

      <button type="submit" disabled={busy} className="btn-primary px-4 py-2">
        {uploading ? "Uploading…" : isPending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
