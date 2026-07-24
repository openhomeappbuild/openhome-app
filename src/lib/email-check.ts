const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "tempmail.com",
  "guerrillamail.com",
  "10minutemail.com",
  "yopmail.com",
  "trashmail.com",
  "sharklasers.com",
  "throwawaymail.com",
]);

const TYPO_FIXES: Record<string, string> = {
  "gmial.com": "gmail.com",
  "gmal.com": "gmail.com",
  "gamil.com": "gmail.com",
  "gmali.com": "gmail.com",
  "hotmial.com": "hotmail.com",
  "hotmal.com": "hotmail.com",
  "outlok.com": "outlook.com",
  "yaho.com": "yahoo.com",
  "yahooo.com": "yahoo.com",
  "xtra.co.n": "xtra.co.nz",
  "gmail.co": "gmail.com",
};

export type EmailCheckResult =
  | { status: "bad"; reason: string }
  | { status: "suggest"; suggestion: string }
  | { status: "ok" };

export function checkEmail(raw: string): EmailCheckResult {
  const value = raw.trim().toLowerCase();
  const formatOk = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
  if (!formatOk) {
    return { status: "bad", reason: "That doesn't look like a valid email address." };
  }
  const domain = value.split("@")[1];
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return {
      status: "bad",
      reason: "This looks like a temporary/disposable email. Please use your regular email address.",
    };
  }
  if (TYPO_FIXES[domain]) {
    return { status: "suggest", suggestion: value.split("@")[0] + "@" + TYPO_FIXES[domain] };
  }
  return { status: "ok" };
}

export const NZ_MOBILE_RE = /^(\+?64|0)2\d{7,9}$/;
