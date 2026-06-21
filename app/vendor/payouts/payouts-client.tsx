"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import type { PayoutDetails } from "@/lib/types";
import { requestPayout, updatePayoutDetails, type PayoutState } from "./actions";

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
      <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-3">
        {state.error}
      </p>
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

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary px-4 py-2">
      {pending ? "Saving…" : "Save details"}
    </button>
  );
}

export function PayoutDetailsForm({ details }: { details: PayoutDetails }) {
  const [state, action] = useActionState<PayoutState, FormData>(updatePayoutDetails, {});

  return (
    <form action={action} className="max-w-md">
      <Notice state={state} />
      <div className="mb-3">
        <label className={labelCls}>Bank</label>
        <input name="bank" defaultValue={details.bank} className="field w-full" placeholder="GTBank" />
      </div>
      <div className="mb-3">
        <label className={labelCls}>Account name</label>
        <input
          name="account_name"
          defaultValue={details.account_name}
          className="field w-full"
          placeholder="Your registered account name"
        />
      </div>
      <div className="mb-4">
        <label className={labelCls}>Account number</label>
        <input
          name="account_number"
          defaultValue={details.account_number}
          inputMode="numeric"
          className="field w-full"
          placeholder="0123456789"
        />
      </div>
      <SaveButton />
    </form>
  );
}
