"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signUpBuyer, type AuthState } from "../actions";

const labelCls = "block text-[12px] font-medium m-0 mb-[6px]";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="btn-primary w-full py-[10px]">
      {pending ? "Creating account…" : "Create account"}
    </button>
  );
}

export function RegisterForm({ next }: { next: string }) {
  const [state, action] = useActionState<AuthState, FormData>(signUpBuyer, {});

  return (
    <form action={action}>
      {state.error && (
        <p className="text-[12px] text-info bg-info-bg rounded-md px-3 py-2 mb-4">{state.error}</p>
      )}
      <input type="hidden" name="next" value={next} />

      <div className="mb-4">
        <label className={labelCls}>Email</label>
        <input name="email" type="email" required autoComplete="email" className="field w-full" />
      </div>

      <div className="mb-5">
        <label className={labelCls}>Password</label>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete="new-password"
          className="field w-full"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
