"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Ticket, X } from "lucide-react";

export interface CouponView {
  id: string;
  code: string;
  label: string; // "20% off" / "₦500 off"
  active: boolean;
  used_count: number;
  max_uses: number | null;
  expires: string | null; // pre-formatted date or null
  expired: boolean;
}

export type CreateState = { error?: string; success?: string };

const labelCls = "block text-[12px] font-medium m-0 mb-[6px]";

function CreateButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary px-4 py-2">
      {pending ? "Creating…" : "Create code"}
    </button>
  );
}

export function CouponManager({
  coupons,
  scopeNote,
  createAction,
  toggleAction,
  deleteAction,
}: {
  coupons: CouponView[];
  scopeNote: string;
  createAction: (s: CreateState, fd: FormData) => Promise<CreateState>;
  toggleAction: (fd: FormData) => Promise<void>;
  deleteAction: (fd: FormData) => Promise<void>;
}) {
  const [state, action] = useActionState<CreateState, FormData>(createAction, {});
  const [type, setType] = useState<"percent" | "fixed">("percent");

  return (
    <div>
      <h1 className="text-[22px] font-medium m-0 mb-1">Coupons</h1>
      <p className="text-[13px] text-ink-soft m-0 mb-5">{scopeNote}</p>

      {/* Create */}
      <form action={action} className="border border-line rounded-md p-4 mb-6 max-w-xl">
        {state.success && (
          <p className="text-[12px] text-success bg-success-bg rounded-md px-3 py-2 mb-3">
            {state.success}
          </p>
        )}
        {state.error && (
          <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-3">{state.error}</p>
        )}

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className={labelCls}>Code</label>
            <input
              name="code"
              required
              placeholder="LAUNCH20"
              className="field w-full uppercase"
              maxLength={24}
            />
          </div>
          <div>
            <label className={labelCls}>Type</label>
            <select
              name="discount_type"
              value={type}
              onChange={(e) => setType(e.target.value as "percent" | "fixed")}
              className="field w-full"
            >
              <option value="percent">Percentage off</option>
              <option value="fixed">Fixed ₦ off</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <div>
            <label className={labelCls}>{type === "percent" ? "Percent (%)" : "Amount (₦)"}</label>
            <input
              name="discount_value"
              type="number"
              required
              min={1}
              max={type === "percent" ? 100 : undefined}
              placeholder={type === "percent" ? "20" : "500"}
              className="field w-full"
            />
          </div>
          <div>
            <label className={labelCls}>Max uses</label>
            <input
              name="max_uses"
              type="number"
              min={1}
              placeholder="Unlimited"
              className="field w-full"
            />
          </div>
          <div>
            <label className={labelCls}>Expires</label>
            <input name="expires_at" type="date" className="field w-full" />
          </div>
        </div>

        <CreateButton />
      </form>

      {/* List */}
      {coupons.length === 0 ? (
        <div className="text-center text-ink-soft text-[13px] border border-dashed border-line rounded-md py-10">
          <Ticket size={20} className="mx-auto mb-2 text-ink-faint" />
          No coupons yet. Create one above to run a promo.
        </div>
      ) : (
        <div className="border border-line rounded-md overflow-hidden">
          {coupons.map((c, i) => (
            <div
              key={c.id}
              className={[
                "flex items-center gap-3 px-4 py-3 text-[13px]",
                i > 0 ? "border-t border-line" : "",
              ].join(" ")}
            >
              <span className="font-mono font-medium tracking-wide">{c.code}</span>
              <span className="text-ink-soft">{c.label}</span>

              <span className="ml-auto text-[11px] text-ink-faint hidden sm:inline">
                {c.used_count}
                {c.max_uses != null ? `/${c.max_uses}` : ""} used
                {c.expires ? ` · exp ${c.expires}` : ""}
              </span>

              <span
                className={[
                  "text-[11px] px-2 py-[2px] rounded-md w-16 text-center shrink-0",
                  c.expired
                    ? "bg-muted text-ink-faint"
                    : c.active
                      ? "bg-success-bg text-success"
                      : "bg-muted text-ink-soft",
                ].join(" ")}
              >
                {c.expired ? "Expired" : c.active ? "Active" : "Off"}
              </span>

              {/* Toggle */}
              <form action={toggleAction}>
                <input type="hidden" name="id" value={c.id} />
                <input type="hidden" name="active" value={c.active ? "0" : "1"} />
                <button
                  className="text-[11px] text-ink-soft hover:text-ink bg-transparent border border-line rounded-md px-2 py-[3px] cursor-pointer"
                  title={c.active ? "Deactivate" : "Activate"}
                >
                  {c.active ? "Pause" : "Enable"}
                </button>
              </form>

              {/* Delete */}
              <form action={deleteAction}>
                <input type="hidden" name="id" value={c.id} />
                <button
                  aria-label={`Delete ${c.code}`}
                  className="text-ink-faint hover:text-info bg-transparent border-0 cursor-pointer p-1 leading-none"
                >
                  <X size={14} />
                </button>
              </form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
