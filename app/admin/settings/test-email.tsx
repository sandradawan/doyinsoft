"use client";

import { useState, useTransition } from "react";
import { sendTestEmail, type TestEmailState } from "../actions";

export function TestEmail({ configured }: { configured: boolean }) {
  const [state, setState] = useState<TestEmailState>({});
  const [pending, start] = useTransition();

  return (
    <div>
      <p className="text-[12px] m-0 mb-2">
        Status:{" "}
        {configured ? (
          <span className="text-success font-medium">Configured ✓</span>
        ) : (
          <span className="text-info font-medium">Not configured</span>
        )}
      </p>
      {state.success && (
        <p className="text-[12px] text-success bg-success-bg rounded-md px-3 py-2 mb-3">{state.success}</p>
      )}
      {state.error && (
        <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-3">{state.error}</p>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => setState(await sendTestEmail()))}
        className="btn-primary px-4 py-2"
      >
        {pending ? "Sending…" : "Send test email"}
      </button>
    </div>
  );
}
