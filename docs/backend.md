# Contact form back end

`api/contact.ts` is a Vercel serverless function. The browser posts JSON to `/api/contact`
(see `docs/api-contract.md`). The function validates with the shared schema in
`src/lib/contact-schema.ts` and emails the lead through [Resend](https://resend.com).

`npm run dev` serves the Vite site. `/api/contact` is available under `vercel dev`.

## Environment variables

Set these in the Vercel project for Production and Preview. Locally, put them in `.env.local`
(git-ignored). `.env.example` lists the names with empty values. Never commit real keys or inboxes.

| Variable | Read by | Required | Notes |
|---|---|---|---|
| `VITE_SITE_URL` | Build (prerender, canonical URL, sitemap) | Yes | Public site origin, no trailing slash. The `VITE_` prefix is intentional: Vite inlines it into the browser bundle. `npm run build` fails when it is missing. |
| `RESEND_API_KEY` | Server function | Yes | Resend API key. When it is missing the function returns 503 `not_configured` and sends nothing. |
| `CONTACT_TO_EMAIL` | Server function | Yes | Inbox that receives leads. Same 503 behavior when it is missing. |
| `CONTACT_FROM_EMAIL` | Server function | No | From address. When unset, the function uses Resend's sandbox sender `onboarding@resend.dev`. |

Leave the `VITE_` prefix off `RESEND_API_KEY`, `CONTACT_TO_EMAIL`, and `CONTACT_FROM_EMAIL`. Vite inlines every `VITE_` variable into the public JavaScript bundle.

On Vercel, set `VITE_SITE_URL` together with the three contact variables. The site URL is required at build time; the contact variables are required at request time (except `CONTACT_FROM_EMAIL`).

## Resend sandbox

Until a domain is verified in the Resend account, Resend only delivers to that account's own address, and the sender has to be `onboarding@resend.dev`. Leave `CONTACT_FROM_EMAIL` unset in that mode, and set `CONTACT_TO_EMAIL` to the account address. After the domain is verified, set `CONTACT_FROM_EMAIL` to an address on that domain and point `CONTACT_TO_EMAIL` at the business inbox.

## Run locally

```bash
cp .env.example .env.local
# Fill VITE_SITE_URL, RESEND_API_KEY, and CONTACT_TO_EMAIL.
npx vercel dev
```

`vercel dev` serves the Vite site and `/api/contact` together and loads `.env` / `.env.local`.

Handler tests mock Resend and do not send email:

```bash
npm test
```

Production build, with the site URL supplied in the shell (the prerender step rejects a missing `VITE_SITE_URL` on purpose):

```bash
VITE_SITE_URL=https://example.com npm run build
```

## Rate limit

The function allows 5 lead submissions per IP per 10 minutes. Counts live in memory on the serverless instance that handled the request.

That slows casual repeat submits. The limit is per instance:

- A cold start begins from an empty count.
- Each instance keeps its own counts, so requests spread across instances can exceed 5.
- The address is taken from `x-vercel-forwarded-for`, then `x-real-ip`, then the first `x-forwarded-for` hop, then the socket. When none of those exist, requests share an `unknown` bucket.

Swap the map for a shared store if the form starts taking real abuse.

A non-empty `company_website` (the honeypot) returns `{ ok: true }` and sends nothing. Honeypot drops and validation failures leave the counter unchanged. A lead that passes validation and then fails at Resend uses a slot.
