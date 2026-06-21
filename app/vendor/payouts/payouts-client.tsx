"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { connectPayouts, requestPayout, type PayoutState } from "./actions";

const labelCls = "block text-[12px] font-medium m-0 mb-[6px]";

function Notice({ state }: { state: PayoutState }) {
  if (state.success)
    return (
      <p className="text-[12px] text-success bg-success-bg rounded-md px-3 py-2 mb-3">
        {state.success}
      </p>
    );
  if (state.error)
    return (
      <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-3">{state.error}</p>
    );
  return null;
}

export function RequestPayoutButton({ canWithdraw }: { canWithdraw: boolean }) {
  const [state, setState] = useState<PayoutState>({});
  const [pending, start] = useTransition();
  return (
    <div>
      <Notice state={state} />
      <button
        className="btn-primary px-4 py-2"
        disabled={pending || !canWithdraw}
        onClick={() => start(async () => setState(await requestPayout()))}
      >
        {pending ? "Requesting…" : "Withdraw available balance"}
      </button>
    </div>
  );
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary px-4 py-2">
      {pending ? "Connecting…" : label}
    </button>
  );
}

export function ConnectPayoutsForm({
  banks,
  connected,
  accountNumber,
  bankCode,
  commission,
}: {
  banks: { name: string; code: string }[];
  connected: boolean;
  accountNumber: string | null;
  bankCode: string | null;
  commission: number;
}) {
  const [state, action] = useActionState<PayoutState, FormData>(connectPayouts, {});
  const [bankName, setBankName] = useState(
    banks.find((b) => b.code === bankCode)?.name ?? ""
  );

  return (
    <form action={action} className="max-w-md">
      {connected && !state.error && (
        <p className="text-[12px] text-success bg-success-bg rounded-md px-3 py-2 mb-3">
          ✓ Bank connected — sales settle to you automatically (platform keeps {commission}%).
          Re-submit to change the account.
        </p>
      )}
      <Notice state={state} />

      <div className="mb-3">
        <label className={labelCls}>Bank</label>
        <select
          name="bank_code"
          required
          defaultValue={bankCode ?? ""}
          onChange={(e) => setBankName(e.target.selectedOptions[0]?.text ?? "")}
          className="field w-full"
        >
          <option value="">Select your bank…</option>
          {banks.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
        <input type="hidden" name="bank_name" value={bankName} />
        {banks.length === 0 && (
          <p className="text-[11px] text-ink-faint mt-1">
            Bank list unavailable — check your Paystack keys.
          </p>
        )}
      </div>

      <div className="mb-3">
        <label className={labelCls}>Account number</label>
        <input
          name="account_number"
          inputMode="numeric"
          required
          defaultValue={accountNumber ?? ""}
          className="field w-full"
          placeholder="0123456789"
        />
      </div>

      <div className="mb-4">
        <label className={labelCls}>Account name</label>
        <input
          name="account_name"
          className="field w-full"
          placeholder="Your registered account name"
        />
      </div>

      <SaveButton label={connected ? "Update bank" : "Connect bank"} />
    </form>
  );
}
