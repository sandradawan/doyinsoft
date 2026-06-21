"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { SessionVendor } from "@/lib/auth";
import { updateVendor, type SettingsState } from "./actions";

const labelCls = "block text-[12px] font-medium m-0 mb-[6px]";
const hintCls = "text-[11px] text-ink-faint mt-1";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary px-4 py-2">
      {pending ? "Saving…" : "Save changes"}
    </button>
  );
}

export function SettingsForm({ vendor }: { vendor: SessionVendor }) {
  const [state, action] = useActionState<SettingsState, FormData>(updateVendor, {});

  return (
    <form action={action} className="max-w-md">
      {state.success && (
        <p className="text-[12px] text-success bg-success-bg rounded-md px-3 py-2 mb-4">
          {state.success}
        </p>
      )}
      {state.error && (
        <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-4">
          {state.error}
        </p>
      )}

      <div className="mb-4">
        <label className={labelCls}>Business / vendor name</label>
        <input name="name" required defaultValue={vendor.name} className="field w-full" />
        <p className={hintCls}>Shown to buyers on your products.</p>
      </div>

      <div className="mb-4">
        <label className={labelCls}>Avatar initials</label>
        <input
          name="initials"
          maxLength={2}
          defaultValue={vendor.initials}
          className="field w-28 uppercase"
        />
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
        <p className={hintCls}>
          Shown as a &ldquo;Chat vendor&rdquo; button on your products. Include the country code.
        </p>
      </div>

      <div className="mb-5">
        <label className={labelCls}>Email</label>
        <input value={vendor.email} disabled className="field w-full opacity-70" />
        <p className={hintCls}>Your login email can't be changed here.</p>
      </div>

      <SubmitButton />
    </form>
  );
}
