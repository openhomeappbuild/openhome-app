"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="w-full max-w-sm rounded-2xl border border-[#e2e7ed] bg-white p-8">
      <div className="mb-6 flex items-center gap-2.5">
        <span className="h-2 w-2 rounded-full bg-[#111]" />
        <b className="text-base">Open Home App</b>
      </div>
      <h1 className="mb-1 text-lg font-bold">Agent workspace</h1>
      <p className="mb-5 text-sm text-[#6b7787]">Enter the dashboard password to continue.</p>

      <input type="hidden" name="next" value={next} />
      <input
        type="password"
        name="password"
        autoFocus
        placeholder="Password"
        className="field-input mb-3"
      />
      {state.error && <p className="mb-3 text-sm text-[#c0392b]">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-xl bg-[#111] py-3 text-sm font-bold text-white disabled:bg-[#a8b6b3]"
      >
        {pending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}
