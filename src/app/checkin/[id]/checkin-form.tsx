"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { checkIn, type CheckInState } from "../actions";
import { checkEmail } from "@/lib/email-check";

const INTEREST_OPTIONS = [
  { value: "Family home", label: "Looking for a family home" },
  { value: "Townhouse / unit", label: "Townhouse or unit" },
  { value: "Investment", label: "Investment property" },
  { value: "Just looking", label: "Just looking" },
];

const SUBURBS = [
  "Frankton",
  "Lake Hayes Estate",
  "Shotover Country",
  "Hanley's Farm",
  "Jack's Point",
  "Kelvin Heights",
  "Arrowtown",
  "Arthurs Point",
  "Fernhill",
  "Sunshine Bay",
  "Quail Rise",
  "Queenstown Central",
];

type EmailStatus = "unchecked" | "checking" | "ok" | "bad" | "suggest";

const initialState: CheckInState = { ok: false };

export function CheckInForm({ listingId, kiosk }: { listingId: string; kiosk: boolean }) {
  const [formKey, setFormKey] = useState(0);
  return (
    <CheckInFormInner
      key={formKey}
      listingId={listingId}
      kiosk={kiosk}
      onKioskReset={() => setFormKey((k) => k + 1)}
    />
  );
}

function CheckInFormInner({
  listingId,
  kiosk,
  onKioskReset,
}: {
  listingId: string;
  kiosk: boolean;
  onKioskReset: () => void;
}) {
  const boundAction = checkIn.bind(null, listingId);
  const [state, formAction, pending] = useActionState(boundAction, initialState);

  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<EmailStatus>("unchecked");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSuggestion, setEmailSuggestion] = useState("");
  const [isLocal, setIsLocal] = useState<"yes" | "no" | null>(null);
  const [suburb, setSuburb] = useState("");
  const [interest, setInterest] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(6);
  const [clientError, setClientError] = useState("");

  const checkSeq = useRef(0);

  useEffect(() => {
    if (!email) {
      setEmailStatus("unchecked");
      setEmailMessage("");
      setEmailSuggestion("");
      return;
    }
    setEmailStatus("checking");
    setEmailSuggestion("");
    const seq = ++checkSeq.current;
    const t = setTimeout(() => {
      if (seq !== checkSeq.current) return;
      const result = checkEmail(email);
      if (result.status === "ok") {
        setEmailStatus("ok");
        setEmailMessage("Email verified — looks good.");
      } else if (result.status === "suggest") {
        setEmailStatus("suggest");
        setEmailSuggestion(result.suggestion);
        setEmailMessage("");
      } else {
        setEmailStatus("bad");
        setEmailMessage(result.reason);
      }
    }, 700);
    return () => clearTimeout(t);
  }, [email]);

  useEffect(() => {
    if (!state.ok || !kiosk) return;
    setCountdown(6);
    const interval = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(interval);
          onKioskReset();
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ok, kiosk]);

  if (state.ok) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 py-10 text-center">
        <div className="mb-5 flex h-[70px] w-[70px] items-center justify-center rounded-full bg-[#1e8e5a] text-3xl text-white">
          ✓
        </div>
        <h2 className="mb-2 text-xl font-semibold text-[#1c2530]">
          You&apos;re signed in, {state.firstName}!
        </h2>
        <p className="max-w-[340px] text-sm leading-relaxed text-[#6b7787]">
          Thanks for coming through. We&apos;ll email you the property details shortly.
        </p>
        <div className="mt-5 max-w-[340px] rounded-xl border border-[#dde3ea] bg-white p-4 text-left text-[13px] leading-relaxed text-[#43505e]">
          <b>What happens next</b>
          <br />
          Property details &amp; area info sent to your email
          <br />
          Similar Wakatipu Basin listings included in your follow-up
          <br />
          The agent will be in touch if you&apos;d like a private viewing
        </div>
        {kiosk && (
          <p className="mt-6 text-[13px] text-[#93a0ae]">
            Resetting for the next visitor in {countdown}s…
          </p>
        )}
      </div>
    );
  }

  const submitDisabled = emailStatus !== "ok" || pending;

  return (
    <form
      action={formAction}
      className="flex-1 px-6 py-5"
      onSubmit={(e) => {
        if (!isLocal) {
          e.preventDefault();
          setClientError("Please let us know if you're local.");
        } else if (isLocal === "yes" && !suburb.trim()) {
          e.preventDefault();
          setClientError("Please tell us which part of town you're from.");
        } else if (!interest) {
          e.preventDefault();
          setClientError("Please pick the option that fits best.");
        } else {
          setClientError("");
        }
      }}
    >
      <p className="mb-4 text-sm leading-relaxed text-[#6b7787]">
        Welcome! Please sign in so we can send you the info pack for this property.
      </p>

      <Field label="Full name" required>
        <input
          name="fullName"
          type="text"
          placeholder="e.g. Jane Wilson"
          autoComplete="name"
          className="field-input"
        />
      </Field>

      <Field label="Mobile" required>
        <input
          name="mobile"
          type="tel"
          placeholder="e.g. 021 234 5678"
          autoComplete="tel"
          className="field-input"
        />
      </Field>

      <Field
        label="Email"
        required
        hint={
          emailStatus === "suggest" ? (
            <>
              Did you mean{" "}
              <button
                type="button"
                onClick={() => setEmail(emailSuggestion)}
                className="font-semibold text-[#111] underline"
              >
                {emailSuggestion}
              </button>
              ?
            </>
          ) : (
            emailMessage
          )
        }
        hintTone={emailStatus}
      >
        <input
          name="email"
          type="email"
          placeholder="e.g. jane@gmail.com"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`field-input ${
            emailStatus === "ok" ? "border-[#1e8e5a]" : emailStatus === "bad" ? "border-[#c0392b]" : ""
          }`}
        />
      </Field>

      <div className="mb-4">
        <label className="mb-1.5 block text-[12.5px] font-semibold text-[#33404f]">
          Are you local to the area? <span className="text-[#c0392b]">*</span>
        </label>
        <input type="hidden" name="isLocal" value={isLocal === "yes" ? "yes" : "no"} />
        <div className="flex gap-2.5">
          <SegButton selected={isLocal === "yes"} onClick={() => setIsLocal("yes")}>
            Yes, I live nearby
          </SegButton>
          <SegButton selected={isLocal === "no"} onClick={() => setIsLocal("no")}>
            No, from elsewhere
          </SegButton>
        </div>
        {isLocal === "yes" && (
          <div className="mt-3">
            <label className="mb-1.5 block text-[12.5px] font-semibold text-[#33404f]">
              Which part of town are you from? <span className="text-[#c0392b]">*</span>
            </label>
            <input
              name="suburb"
              list="suburbs"
              value={suburb}
              onChange={(e) => setSuburb(e.target.value)}
              placeholder="e.g. Frankton"
              className="field-input"
            />
            <datalist id="suburbs">
              {SUBURBS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
        )}
      </div>

      <div className="mb-4">
        <label className="mb-1.5 block text-[12.5px] font-semibold text-[#33404f]">
          What best describes you? <span className="text-[#c0392b]">*</span>
        </label>
        <input type="hidden" name="interest" value={interest ?? ""} />
        <div className="grid grid-cols-2 gap-2.5">
          {INTEREST_OPTIONS.map((opt) => (
            <SegButton
              key={opt.value}
              selected={interest === opt.value}
              onClick={() => setInterest(opt.value)}
            >
              {opt.label}
            </SegButton>
          ))}
        </div>
      </div>

      <label className="mb-4 flex cursor-pointer gap-2.5 rounded-xl border border-[#d8e6e2] bg-[#f4f8f7] p-3.5">
        <input type="checkbox" name="consent" className="mt-0.5 h-[17px] w-[17px] accent-[#111]" />
        <span className="text-[12.5px] leading-relaxed text-[#43505e]">
          <b>Keep me in the loop</b> — I&apos;m happy for the agent to add me to their database and
          send me new listings and their monthly newsletter. Unsubscribe any time.
        </span>
      </label>

      {(clientError || state.error) && (
        <p className="mb-3 text-sm text-[#c0392b]">{clientError || state.error}</p>
      )}

      <button
        type="submit"
        disabled={submitDisabled}
        className="w-full rounded-xl bg-[#111] py-3.5 text-[16.5px] font-bold tracking-wide text-white disabled:cursor-not-allowed disabled:bg-[#a8b6b3]"
      >
        {emailStatus === "ok" ? "Sign in to open home" : "Enter a valid email to sign in"}
      </button>
      <p className="mt-3 text-center text-[11px] leading-relaxed text-[#93a0ae]">
        Your details go only to the listing agent and are handled under the NZ Privacy Act 2020.
      </p>
    </form>
  );
}

function Field({
  label,
  required,
  hint,
  hintTone,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: React.ReactNode;
  hintTone?: EmailStatus;
  children: React.ReactNode;
}) {
  const toneClass =
    hintTone === "bad"
      ? "text-[#c0392b]"
      : hintTone === "suggest"
        ? "text-[#b7791f]"
        : hintTone === "ok"
          ? "text-[#1e8e5a]"
          : "text-[#6b7787]";
  return (
    <div className="mb-4">
      <label className="mb-1.5 block text-[12.5px] font-semibold text-[#33404f]">
        {label} {required && <span className="text-[#c0392b]">*</span>}
      </label>
      {children}
      {hint && <div className={`mt-1 text-xs leading-snug ${toneClass}`}>{hint}</div>}
    </div>
  );
}

function SegButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded-xl border px-3 py-3 text-center text-[14.5px] transition-colors ${
        selected
          ? "border-[#111] bg-[#111] font-semibold text-white"
          : "border-[#dde3ea] bg-white text-[#33404f]"
      }`}
    >
      {children}
    </button>
  );
}
