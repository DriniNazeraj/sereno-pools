# Contact form API contract (`POST /api/contact`)

Front end: `src/lib/contact.ts` (browser) posts the form. Validation schema shared with the back end:
`src/lib/contact-schema.ts` (zod only, relative imports, no `import.meta.env`, safe to import from a Vercel
function at `api/contact.ts`: `import { contactSchema } from "../src/lib/contact-schema"`).

## Endpoint

- URL: `VITE_CONTACT_ENDPOINT` if set, otherwise same-origin `/api/contact`.
- Method: `POST`, headers `Content-Type: application/json`, `Accept: application/json`.
- Max body: 16 KB is plenty (message is capped at 2,000 chars).

## Request body

| Field | Type | Rules |
|---|---|---|
| `name` | string | trimmed, 2 to 100 chars |
| `email` | string | trimmed, valid email, max 254 |
| `phone` | string | trimmed, `[+()-. digits]`, 10 to 15 digits |
| `projectType` | enum | `new_pool`, `pool_spa`, `renovation`, `outdoor_living`, `other` |
| `budget` | enum | `under_75k`, `75k_125k`, `125k_200k`, `200k_plus` |
| `message` | string? | optional, max 2,000 chars |
| `company_website` | string? | **honeypot**. Hidden from humans. If non-empty, respond `200 {"ok":true}` and drop the submission silently |

Human labels for the enums: `PROJECT_TYPE_LABELS`, `BUDGET_LABELS` in `contact-schema.ts`.

## Responses

- Success: `200 {"ok": true}`. Only this counts as "sent" in the UI.
- Validation error: `400 {"ok": false, "error": {"code": "validation", "message": "...", "fields": {"email": "Please enter a valid email address."}}}`. Field messages are shown under the inputs.
- Rate limited: `429 {"ok": false, "error": {"code": "rate_limited", "message": "Too many requests. Please try again in a few minutes."}}`
- Server error: `500 {"ok": false, "error": {"code": "server", "message": "..."}}`

The browser treats anything that is not `2xx` + `{"ok": true}` as a failure (including 404, HTML responses,
and an unreachable host): it shows the error banner with **Retry** and keeps the typed data. It never shows
the thank-you state unless the server confirmed.

## Server-side requirements (QA-PLAN.md section 2)

- Validate with `contactSchema.safeParse(body)`; reject empty/missing/oversized bodies with 400.
- Escape all fields in the outgoing email (HTML/script in fields must arrive as plain text).
- Rate limit per IP (for example 5 posts / 10 min).
- Deliver to Drini's inbox with every field; reply-to = submitter email.

## Demo mode (not an endpoint)

`VITE_CONTACT_MOCK=true` skips the network entirely (fake success; a message containing the word "fail" fakes an
error). Off in `.env.example` (`VITE_CONTACT_MOCK=false`); only for local previews via `.env.local`. See README.
