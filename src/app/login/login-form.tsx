"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="w-full max-w-sm rounded-lg border border-[#e7e2d4] bg-white p-8">
      <b className="font-display block text-[19px] font-semibold tracking-tight text-[#14130f]">
        Open Home App
      </b>
      <div className="mt-3 h-px bg-[#e7e2d4]" />
      <div className="mt-1 h-px bg-[#f0ede2]" />
      <h1 className="font-display mt-4 mb-1 text-lg font-semibold">Agent workspace</h1>
      <p className="mb-5 text-sm text-[#837c6c]">Enter the dashboard password to continue.</p>

      <input type="hidden" name="next" value={next} />
      <input
        type="password"
        name="password"
        autoFocus
        placeholder="Password"
        className="field-input mb-3"
      />
      {state.error && <p className="mb-3 text-sm text-[#b23b2e]">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-[#14130f] py-3 text-sm font-bold text-white disabled:bg-[#c9c3b3]"
      >
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
