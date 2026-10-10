# Contact form API contract (`POST /api/contact`)

Front end: `src/lib/contact.ts` (browser) posts the form. Validation schema shared with the back end:
`src/lib/contact-schema.ts` (zod only, relative imports, no `import.meta.env`, safe to import from a Vercel
function at `api/contact.ts`: `import { contactSchema } from "../src/lib/contact-schema"`).

Server setup, env vars, and the in-memory rate limit: `docs/backend.md`.

## Endpoint

- URL: `VITE_CONTACT_ENDPOINT` if set, otherwise same-origin `/api/contact`.
- Method: `POST`, headers `Content-Type: application/json`, `Accept: application/json`.
- Max body: 16 KB (16,384 bytes). A larger body is rejected with `400` `payload_too_large`.

## Request body

| Field | Type | Rules |
|---|---|---|
| `name` | string | trimmed, 2 to 100 chars |
| `email` | string | trimmed, valid email, max 254 |
| `phone` | string | trimmed, `[+()-. digits]`, 10 to 15 digits |
| `projectType` | enum | `new_pool`, `pool_spa`, `renovation`, `outdoor_living`, `other` |
| `budget` | enum | `under_75k`, `75k_125k`, `125k_200k`, `200k_plus` |
| `message` | string? | optional, max 2,000 chars |
| `company_website` | string? | **honeypot**. Hidden from humans. Any non-empty string (including whitespace) responds `200 {"ok":true}` and drops the submission. Nothing is emailed. |

Human labels for the enums: `PROJECT_TYPE_LABELS`, `BUDGET_LABELS` in `contact-schema.ts`. Field error strings come from that same schema.

## Responses

Every response is JSON: `{ "ok": true }` or `{ "ok": false, "error": { "code", "message", "fields"? } }`.

| Status | `error.code` | When |
|---|---|---|
| 200 | (none) | Lead accepted and handed to Resend, or honeypot dropped. Body is `{ "ok": true }`. Only this counts as "sent" in the UI. |
| 400 | `validation` | Body failed `contactSchema`. `fields` maps each bad input to the schema message, for example `{ "email": "Please enter a valid email address." }`. Banner message: "Please check the highlighted fields." |
| 400 | `invalid_json` | Missing, empty, or unparseable body, or JSON that is not an object. |
| 400 | `payload_too_large` | Body larger than 16,384 bytes. |
| 405 | `method_not_allowed` | Not `POST`. Response includes `Allow: POST`. |
| 415 | `unsupported_media_type` | `Content-Type` is missing or not `application/json` (a `charset` parameter is fine). |
| 429 | `rate_limited` | More than 5 lead submissions from one IP in 10 minutes. Message: "Too many requests. Please try again in a few minutes." Includes `Retry-After` (seconds). Honeypot drops and validation failures are not counted. |
| 502 | `email_failed` | Resend failed. The response message is generic; Resend's error is written to the server log. |
| 503 | `not_configured` | `RESEND_API_KEY` or `CONTACT_TO_EMAIL` is missing. The server log names the missing variables. |
| 500 | `server` | Unexpected failure inside the handler. Message is generic. |

The browser treats anything that is not `2xx` + `{"ok": true}` as a failure (including 404, HTML responses,
and an unreachable host): it shows the error banner with **Retry** and keeps the typed data. It never shows
the thank-you state unless the server confirmed. It displays `error.message` and, when present, `error.fields`.

## Server-side requirements (QA-PLAN.md section 2)

- Validate with `contactSchema.safeParse(body)`. Empty or unparseable JSON is `400 invalid_json`. Oversized bodies are `400 payload_too_large`. Schema failures are `400 validation` with `fields`.
- Escape every visitor field in the HTML email. Also send a plain-text part. Subject: `New design consult request: <name>` (newlines stripped). Reply-To is the visitor's email.
- Rate limit per IP: 5 accepted submissions / 10 minutes, in memory on each serverless instance (see `docs/backend.md`).
- Deliver every field to the inbox in `CONTACT_TO_EMAIL`. The honeypot is not included in the email.

## Demo mode (not an endpoint)

`VITE_CONTACT_MOCK=true` skips the network entirely (fake success; a message containing the word "fail" fakes an
error). Off in `.env.example` (`VITE_CONTACT_MOCK=false`); only for local previews via `.env.local`. See README.
