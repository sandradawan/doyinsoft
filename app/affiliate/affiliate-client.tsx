"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import { requestPayoutAction, saveBankAction, type AffState } from "./actions";

const labelCls = "block text-[12px] font-medium m-0 mb-[6px]";

function Notice({ state }: { state: AffState }) {
  if (state.success)
    return <p className="text-[12px] text-success bg-success-bg rounded-md px-3 py-2 mb-3">{state.success}</p>;
  if (state.error)
    return <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-3">{state.error}</p>;
  return null;
}

export function WithdrawButton({ canWithdraw }: { canWithdraw: boolean }) {
  const [state, setState] = useState<AffState>({});
  const [pending, start] = useTransition();
  return (
    <div>
      <Notice state={state} />
      <button
        className="btn-primary px-4 py-2"
        disabled={pending || !canWithdraw}
        onClick={() => start(async () => setState(await requestPayoutAction()))}
      >
        {pending ? "Requesting…" : "Withdraw to bank"}
      </button>
    </div>
  );
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary px-4 py-2">
      {pending ? "Saving…" : "Save bank details"}
    </button>
  );
}

export function BankForm({
  banks,
  bankCode,
  accountNumber,
  accountName,
}: {
  banks: { name: string; code: string }[];
  bankCode: string | null;
  accountNumber: string | null;
  accountName: string | null;
}) {
  const [state, action] = useActionState<AffState, FormData>(saveBankAction, {});
  return (
    <form action={action} className="max-w-md">
      <Notice state={state} />
      <div className="mb-3">
        <label className={labelCls}>Bank</label>
        <select name="bank_code" defaultValue={bankCode ?? ""} className="field w-full">
          <option value="">Select your bank…</option>
          {banks.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="mb-3">
        <label className={labelCls}>Account number</label>
        <input
          name="account_number"
          inputMode="numeric"
          defaultValue={accountNumber ?? ""}
          className="field w-full"
          placeholder="0123456789"
        />
      </div>
      <div className="mb-4">
        <label className={labelCls}>Account name</label>
        <input name="account_name" defaultValue={accountName ?? ""} className="field w-full" />
      </div>
      <SaveButton />
    </form>
  );
}
