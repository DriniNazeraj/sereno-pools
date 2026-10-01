import type { ContactPayload, ContactResponse } from "./contact-schema";

export { PROJECT_TYPES, BUDGETS, PROJECT_TYPE_LABELS, BUDGET_LABELS, contactSchema } from "./contact-schema";
export type { ContactPayload, ContactResponse } from "./contact-schema";
export type ContactInput = ContactPayload;

/** POST endpoint. Unset -> same-origin /api/contact (the Vercel function). */
const ENDPOINT = import.meta.env.VITE_CONTACT_ENDPOINT || "/api/contact";

/**
 * DEMO SWITCH, NOT A REAL ENDPOINT. VITE_CONTACT_MOCK=true makes the form fake a reply without any network
 * call (a message containing the word "fail" fakes an error). It is OFF in .env.example and must stay
 * off for production; use it only via an uncommitted .env.local for local previews. If a production build
 * is made with it on, we warn in the console and the form shows a visible "Demo form" note.
 */
export const CONTACT_MOCK = import.meta.env.VITE_CONTACT_MOCK === "true";
if (CONTACT_MOCK && import.meta.env.PROD && typeof window !== "undefined") {
  console.warn("[Sereno] VITE_CONTACT_MOCK=true: the contact form is in DEMO mode and does NOT send messages. Turn it off before shipping.");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function submitContact(payload: ContactPayload): Promise<ContactResponse> {
  if (CONTACT_MOCK) {
    await sleep(1000);
    if (/\bfail\b/i.test(payload.message ?? "")) {
      return { ok: false, error: { code: "mock_failure", message: "Simulated failure (demo mode: message contained “fail”)." } };
    }
    return { ok: true };
  }
  // Real mode: only a 2xx response with { ok: true } counts as sent. Anything else (404, 500, HTML from a
  // static host, unreachable endpoint) is reported as an error so the visitor can retry; never fake success.
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => null)) as ContactResponse | null;
    if (res.ok && data && data.ok === true) return { ok: true };
    if (data && data.ok === false && data.error) return data;
    return { ok: false, error: { code: `http_${res.status}`, message: "Something went wrong on our side. Please try again in a moment." } };
  } catch {
    return { ok: false, error: { code: "network", message: "We couldn't reach the server. Check your connection and try again." } };
  }
}
