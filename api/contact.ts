/**
 * POST /api/contact. Vercel serverless function.
 * Contract: docs/api-contract.md. Env vars and local runs: docs/backend.md.
 */
import { Resend } from "resend";
import {
  BUDGET_LABELS,
  PROJECT_TYPE_LABELS,
  contactSchema,
  type ContactPayload,
  type ContactResponse,
} from "../src/lib/contact-schema";

/** 16 KB. The contract's cap; message text is already limited to 2,000 characters. */
export const MAX_BODY_BYTES = 16 * 1024;

/** Accepted lead emails per IP on this instance. Validation failures and honeypots are not counted. */
export const RATE_LIMIT_MAX = 5;
export const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;

/** Resend's public sandbox sender. Used when CONTACT_FROM_EMAIL is unset. */
export const DEFAULT_FROM_EMAIL = "onboarding@resend.dev";

/**
 * Platform backstop above our own 16 KB check, so a modestly oversized JSON body still reaches
 * the handler and can return the contract's JSON error instead of a platform 413.
 */
export const config = {
  api: {
    bodyParser: {
      sizeLimit: "32kb",
    },
  },
};

export type HeaderMap = { [key: string]: string | string[] | undefined };

export type ContactEnv = {
  RESEND_API_KEY?: string;
  CONTACT_TO_EMAIL?: string;
  CONTACT_FROM_EMAIL?: string;
};

export type ContactRequest = {
  method?: string;
  headers: HeaderMap;
  body: unknown;
  /** Raw byte length when known (Content-Length, or the number of bytes read from the stream). */
  bodyBytes?: number;
  ip: string;
  now?: number;
  env: ContactEnv;
};

export type HandlerResult = {
  status: number;
  headers?: Record<string, string>;
  body: ContactResponse;
};

type NodeRequest = AsyncIterable<Uint8Array | string> & {
  method?: string;
  headers: HeaderMap;
  socket?: { remoteAddress?: string | null };
  body?: unknown;
  destroy?: () => void;
};

type NodeResponse = {
  statusCode: number;
  setHeader: (name: string, value: string | number) => void;
  end: (chunk?: string) => void;
};

const FIELD_KEYS: ReadonlySet<string> = new Set([
  "name",
  "email",
  "phone",
  "projectType",
  "budget",
  "message",
  "company_website",
]);

// Per warm instance only. Serverless isolates do not share this map; see docs/backend.md.
const hits = new Map<string, number[]>();

export function resetContactRateLimit(): void {
  hits.clear();
}

export function headerValue(headers: HeaderMap, name: string): string | undefined {
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== target) continue;
    if (Array.isArray(value)) return value[0];
    return value;
  }
  return undefined;
}

function firstIp(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const first = value.split(",")[0]?.trim();
  return first || undefined;
}

/** Prefer the platform-set client IP. x-vercel-forwarded-for is not client-spoofable. */
export function clientAddress(headers: HeaderMap, remoteAddress?: string | null): string {
  return (
    firstIp(headerValue(headers, "x-vercel-forwarded-for")) ||
    firstIp(headerValue(headers, "x-real-ip")) ||
    firstIp(headerValue(headers, "x-forwarded-for")) ||
    remoteAddress?.trim() ||
    "unknown"
  );
}

function fail(
  status: number,
  code: string,
  message: string,
  extra?: { fields?: Partial<Record<keyof ContactPayload, string>>; headers?: Record<string, string> },
): HandlerResult {
  if (extra?.fields) {
    return { status, headers: extra.headers, body: { ok: false, error: { code, message, fields: extra.fields } } };
  }
  return { status, headers: extra?.headers, body: { ok: false, error: { code, message } } };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function singleLine(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function isJsonContentType(headers: HeaderMap): boolean {
  const raw = headerValue(headers, "content-type");
  if (!raw) return false;
  return raw.split(";")[0]?.trim().toLowerCase() === "application/json";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function tooLarge(body: unknown, bodyBytes: number | undefined): boolean {
  if (bodyBytes !== undefined && bodyBytes > MAX_BODY_BYTES) return true;
  if (typeof body === "string") return Buffer.byteLength(body) > MAX_BODY_BYTES;
  if (isRecord(body)) {
    try {
      return Buffer.byteLength(JSON.stringify(body)) > MAX_BODY_BYTES;
    } catch {
      return true;
    }
  }
  return false;
}

function parseJson(body: unknown): { ok: true; value: unknown } | { ok: false } {
  if (typeof body === "string") {
    if (body.trim() === "") return { ok: false };
    try {
      return { ok: true, value: JSON.parse(body) as unknown };
    } catch {
      return { ok: false };
    }
  }
  if (body === null || body === undefined) return { ok: false };
  if (typeof body === "object") return { ok: true, value: body };
  return { ok: false };
}

function honeypotFilled(body: Record<string, unknown>): boolean {
  const value = body.company_website;
  return typeof value === "string" && value.length > 0;
}

function fieldErrors(error: { issues: { path: PropertyKey[]; message: string }[] }): Partial<Record<keyof ContactPayload, string>> {
  const fields: Partial<Record<keyof ContactPayload, string>> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== "string" || !FIELD_KEYS.has(key) || key in fields) continue;
    fields[key as keyof ContactPayload] = issue.message;
  }
  return fields;
}

function renderContactEmail(payload: ContactPayload): { subject: string; html: string; text: string } {
  const name = singleLine(payload.name);
  const email = singleLine(payload.email);
  const phone = singleLine(payload.phone);
  const project = PROJECT_TYPE_LABELS[payload.projectType];
  const budget = BUDGET_LABELS[payload.budget];
  const message = payload.message?.trim() ? payload.message.trim() : "(none)";
  const subject = `New design consult request: ${name}`;
  const text = [
    "New design consult request",
    "",
    `Name: ${name}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    `Project type: ${project}`,
    `Budget: ${budget}`,
    "",
    "Message:",
    message,
  ].join("\n");
  const row = (label: string, value: string) =>
    `<tr><th align="left" style="padding:4px 12px 4px 0;vertical-align:top">${escapeHtml(label)}</th><td style="padding:4px 0">${escapeHtml(value)}</td></tr>`;
  const html = [
    "<!DOCTYPE html>",
    '<html lang="en"><body>',
    "<h1>New design consult request</h1>",
    "<table>",
    row("Name", name),
    row("Email", email),
    row("Phone", phone),
    row("Project type", project),
    row("Budget", budget),
    "</table>",
    "<h2>Message</h2>",
    `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
    "</body></html>",
  ].join("");
  return { subject, html, text };
}

type ResolvedEnv = { apiKey: string; to: string; from: string };

function resolveEnv(env: ContactEnv): { ok: true; value: ResolvedEnv } | { ok: false; missing: string[] } {
  const missing: string[] = [];
  const apiKey = env.RESEND_API_KEY?.trim() ?? "";
  const to = singleLine(env.CONTACT_TO_EMAIL ?? "");
  if (!apiKey) missing.push("RESEND_API_KEY");
  if (!to) missing.push("CONTACT_TO_EMAIL");
  if (missing.length > 0) return { ok: false, missing };
  const from = singleLine(env.CONTACT_FROM_EMAIL ?? "") || DEFAULT_FROM_EMAIL;
  return { ok: true, value: { apiKey, to, from } };
}

function registerHit(ip: string, now: number): { allowed: true } | { allowed: false; retryAfter: number } {
  const threshold = now - RATE_LIMIT_WINDOW_MS;
  const recent = (hits.get(ip) ?? []).filter((stamp) => stamp > threshold);
  if (recent.length >= RATE_LIMIT_MAX) {
    hits.set(ip, recent);
    const retryAfter = Math.max(1, Math.ceil((recent[0] + RATE_LIMIT_WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfter };
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [key, stamps] of hits) {
      const live = stamps.filter((stamp) => stamp > threshold);
      if (live.length === 0) hits.delete(key);
      else hits.set(key, live);
    }
  }
  return { allowed: true };
}

async function deliver(payload: ContactPayload, env: ResolvedEnv): Promise<void> {
  const resend = new Resend(env.apiKey);
  const message = renderContactEmail(payload);
  const result = await resend.emails.send({
    from: env.from,
    to: env.to,
    replyTo: singleLine(payload.email),
    subject: message.subject,
    html: message.html,
    text: message.text,
  });
  if (result.error) {
    const failure = new Error("Resend rejected the lead email") as Error & { cause?: unknown };
    failure.cause = result.error;
    throw failure;
  }
}

export async function handleContact(input: ContactRequest): Promise<HandlerResult> {
  if ((input.method ?? "").toUpperCase() !== "POST") {
    return fail(405, "method_not_allowed", "Method not allowed.", { headers: { Allow: "POST" } });
  }
  if (!isJsonContentType(input.headers)) {
    return fail(415, "unsupported_media_type", "Content-Type must be application/json.");
  }
  if (tooLarge(input.body, input.bodyBytes)) {
    return fail(400, "payload_too_large", "Request body is too large.");
  }

  const parsed = parseJson(input.body);
  if (!parsed.ok || !isRecord(parsed.value)) {
    return fail(400, "invalid_json", "Request body must be a JSON object.");
  }
  if (honeypotFilled(parsed.value)) {
    return { status: 200, body: { ok: true } };
  }

  const validated = contactSchema.safeParse(parsed.value);
  if (!validated.success) {
    const fields = fieldErrors(validated.error);
    return fail(
      400,
      "validation",
      "Please check the highlighted fields.",
      Object.keys(fields).length > 0 ? { fields } : undefined,
    );
  }

  const resolved = resolveEnv(input.env);
  if (!resolved.ok) {
    console.error(`[contact] Not configured. Missing environment variable(s): ${resolved.missing.join(", ")}`);
    return fail(503, "not_configured", "The contact form is temporarily unavailable. Please try again later.");
  }

  const limit = registerHit(input.ip || "unknown", input.now ?? Date.now());
  if (!limit.allowed) {
    return fail(429, "rate_limited", "Too many requests. Please try again in a few minutes.", {
      headers: { "Retry-After": String(limit.retryAfter) },
    });
  }

  try {
    await deliver(validated.data, resolved.value);
  } catch (err) {
    console.error("[contact] Failed to send lead email", err);
    return fail(502, "email_failed", "Something went wrong on our side. Please try again in a moment.");
  }
  return { status: 200, body: { ok: true } };
}

async function readRaw(req: NodeRequest): Promise<{ body: unknown; bodyBytes?: number }> {
  const declared = Number(headerValue(req.headers, "content-length"));
  const declaredBytes = Number.isFinite(declared) && declared >= 0 ? declared : undefined;
  if (declaredBytes !== undefined && declaredBytes > MAX_BODY_BYTES) {
    req.destroy?.();
    return { body: "", bodyBytes: declaredBytes };
  }
  if ("body" in req && req.body !== undefined) {
    const measured = typeof req.body === "string" ? Buffer.byteLength(req.body) : undefined;
    const bodyBytes = declaredBytes !== undefined ? Math.max(declaredBytes, measured ?? 0) : measured;
    return { body: req.body, bodyBytes };
  }
  if (typeof req[Symbol.asyncIterator] !== "function") {
    return { body: "", bodyBytes: declaredBytes ?? 0 };
  }

  const chunks: Buffer[] = [];
  let size = 0;
  let oversized = false;
  try {
    for await (const chunk of req) {
      const buf = typeof chunk === "string" ? Buffer.from(chunk) : Buffer.from(chunk);
      size += buf.length;
      if (size > MAX_BODY_BYTES) {
        oversized = true;
        req.destroy?.();
        break;
      }
      chunks.push(buf);
    }
  } catch (err) {
    if (!oversized) throw err;
  }
  if (oversized) return { body: "", bodyBytes: size };
  return { body: Buffer.concat(chunks).toString("utf8"), bodyBytes: size };
}

function writeJson(res: NodeResponse, result: HandlerResult): void {
  res.statusCode = result.status;
  if (result.headers) {
    for (const [name, value] of Object.entries(result.headers)) {
      res.setHeader(name, value);
    }
  }
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(result.body));
}

export default async function handler(req: NodeRequest, res: NodeResponse): Promise<void> {
  try {
    const { body, bodyBytes } = await readRaw(req);
    const result = await handleContact({
      method: req.method,
      headers: req.headers,
      body,
      bodyBytes,
      ip: clientAddress(req.headers, req.socket?.remoteAddress),
      env: {
        RESEND_API_KEY: process.env.RESEND_API_KEY,
        CONTACT_TO_EMAIL: process.env.CONTACT_TO_EMAIL,
        CONTACT_FROM_EMAIL: process.env.CONTACT_FROM_EMAIL,
      },
    });
    writeJson(res, result);
  } catch (err) {
    console.error("[contact] Unhandled error", err);
    writeJson(res, fail(500, "server", "Something went wrong on our side. Please try again in a moment."));
  }
}
