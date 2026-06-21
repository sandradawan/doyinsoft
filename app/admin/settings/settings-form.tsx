"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { updateSettingsAction, type SettingsState } from "../actions";

const labelCls = "block text-[12px] font-medium m-0 mb-[6px]";
const hintCls = "text-[11px] text-ink-faint mt-1";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary px-4 py-2">
      {pending ? "Saving…" : "Save settings"}
    </button>
  );
}

export function SettingsForm({
  commission,
  usd,
  affiliate,
}: {
  commission: number;
  usd: number;
  affiliate: number;
}) {
  const [state, action] = useActionState<SettingsState, FormData>(updateSettingsAction, {});

  return (
    <form action={action} className="max-w-sm">
      {state.success && (
        <p className="text-[12px] text-success bg-success-bg rounded-md px-3 py-2 mb-4">
          {state.success}
        </p>
      )}
      {state.error && (
        <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-4">{state.error}</p>
      )}

      <div className="mb-4">
        <label className={labelCls}>Platform commission (%)</label>
        <input
          name="commission_percent"
          type="number"
          min="0"
          max="99"
          step="1"
          defaultValue={commission}
          className="field w-32"
        />
        <p className={hintCls}>Applies to vendors who connect their bank after this change.</p>
      </div>

      <div className="mb-4">
        <label className={labelCls}>USD → NGN rate</label>
        <input
          name="usd_to_ngn"
          type="number"
          min="1"
          step="1"
          defaultValue={usd}
          className="field w-32"
        />
        <p className={hintCls}>Used to charge USD-priced products in NGN at checkout.</p>
      </div>

      <div className="mb-5">
        <label className={labelCls}>Affiliate commission (%)</label>
        <input
          name="affiliate_percent"
          type="number"
          min="0"
          max="99"
          step="1"
          defaultValue={affiliate}
          className="field w-32"
        />
        <p className={hintCls}>Share of each referred sale paid to the affiliate.</p>
      </div>

      <SaveButton />
    </form>
  );
}
