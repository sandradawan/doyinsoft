"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { processPaymentByReference, type RecoverState } from "../actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary px-4 py-2 whitespace-nowrap">
      {pending ? "Processing…" : "Issue + email"}
    </button>
  );
}

export function RecoverPayment() {
  const [state, action] = useActionState<RecoverState, FormData>(processPaymentByReference, {});

  return (
    <div className="border border-line rounded-lg p-4 mb-6 bg-muted/40">
      <p className="text-[13px] font-medium m-0 mb-1">Recover a payment</p>
      <p className="text-[12px] text-ink-soft m-0 mb-3">
        Enter a Paystack reference to verify it and email the buyer their license + branded receipt —
        for payments that came in before the webhook was set up.
      </p>
      {state.success && (
        <p className="text-[12px] text-success bg-success-bg rounded-md px-3 py-2 mb-3">{state.success}</p>
      )}
      {state.error && (
        <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-3">{state.error}</p>
      )}
      <form action={action} className="flex gap-2 max-w-md">
        <input
          name="reference"
          placeholder="Paystack reference (e.g. 56ota60oyq)"
          className="field flex-1"
        />
        <Submit />
      </form>
    </div>
  );
}
