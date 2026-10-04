# Sereno Pools: one-page site

Vite + React 18 + TypeScript + Tailwind + shadcn-style Radix components + GSAP ScrollTrigger.
Premium pool-builder landing page with a scroll-scrubbed canvas hero ("Scroll to build your backyard").
Specs: `docs/design.md`, `docs/seo-perf.md`, `docs/qa-plan.md`, `docs/api-contract.md`.

> All imagery is **AI-generated placeholder** material from the designer (hero frames, gallery, outdoor
> living, OG image). None of it shows real Sereno projects. Business details, stats and testimonials are
> placeholders too.

## Setup

```bash
cp .env.example .env
npm ci
```

`.env` is git-ignored and is not in the repo. `.env.example` is the source of the non-secret defaults (`VITE_SITE_URL`, `VITE_CONTACT_ENDPOINT`, `VITE_CONTACT_MOCK=false`).

## Commands

| | |
|---|---|
| `cp .env.example .env` | create the local env file (not committed) |
| `npm install` | install |
| `npm run dev` | dev server |
| `npm run build` | `tsc -b` + client build + SSR build + prerender (static HTML with full page text, JSON-LD, `robots.txt`, `sitemap.xml`) into `dist/` |
| `npm run preview` | serve `dist/` on :4173 |
| `npm run frames:encode` | re-encode the desktop hero frames (<= 60 KB each) from `design/hero-stages/` |
| `npm run images` | regenerate gallery + outdoor-living placeholders (finished-pool / night grades only) |
| `npm run og` | regenerate `public/og-image.jpg` (1200x630) from the final hero frame |

## Configuration (`.env.example`, `.env`, `.env.local`)

Vite env files. There is no committed `.env`. Create one with `cp .env.example .env`. It holds **non-secret defaults only**; put local overrides in `.env.local` (git-ignored). `VITE_*` values end up in the public JS bundle, so never put secrets in them.

| Variable | Default (`.env.example`) | Purpose |
|---|---|---|
| `VITE_SITE_URL` | `https://www.serenopools.com` (**placeholder domain we don't own**) | The one source for canonical, Open Graph/Twitter URLs, JSON-LD, `sitemap.xml` and the `robots.txt` Sitemap line, all written at build time. The build fails if it is missing. |
| `VITE_CONTACT_ENDPOINT` | empty = same-origin `/api/contact` | Where the contact form POSTs (contract: `docs/api-contract.md`). |
| `VITE_CONTACT_MOCK` | `false` | **Demo switch, not an endpoint.** See below. |

### Contact form demo mode (`VITE_CONTACT_MOCK`)

- `false` (default, production): the form POSTs to the endpoint. Only a `2xx` with `{"ok": true}` shows the
  thank-you state. A missing endpoint, a 404/500, an HTML response or an unreachable host shows the error
  banner with **Retry** and keeps what the visitor typed. It never pretends a message was sent.
- `true`: no network at all. After ~1 s it fakes success; a message containing the word `fail` fakes the error
  banner (QA hook). If a production build is made with mock on, the browser console logs a warning and the
  form shows a visible "Demo form: messages are not sent" note.
- Use it only locally: `echo VITE_CONTACT_MOCK=true > .env.local`, then `npm run build && npm run preview`.
  Never set it in Vercel project settings for Production.

The zod schema (`src/lib/contact-schema.ts`, with the honeypot field) has no browser or Vite dependencies,
so the back end (`api/contact.ts`) can import and reuse it.

## Hero frames

- `public/frames/desktop/`: 120 x 1280x720 WebP (<= 60 KB each). `public/frames/mobile/`: 60 x 720x900 WebP.
- Source: `design/hero-stages/` (designer's four AI-generated stage renders + `make_frames.py`).
- Loading (`src/lib/frameLoader.ts`): the first frame is a real `<img fetchpriority="high">` (LCP-safe, no-JS
  fallback); the rest of stage 01 loads after first paint, shown by a thin progress line (no loading screen).
  The HD set is the exception: before scroll it loads six frames spread across stage 1 (1, 6, 12, 18, 24, 30,
  about 1.2 MB) and streams the other 114 on the first real scroll. Desktop and mobile still prefetch all of
  stage 01. Stages 02 to 04 (and, for HD, the rest of stage 1) load only after the visitor's first real scroll:
  a wheel, a touch drag, a scroll key, or the page moving more than 24 px (a nav-link jump or a scripted
  `scrollTo` also counts). There is no idle or timer fallback, so visitors who never scroll download only that
  upfront set. A reload that restores the page part-way down
  loads them straight away. A small worker pool always fetches the not-yet-loaded frame nearest the current
  scroll position, so a fast flick to the end fetches the end frames first. The canvas always draws the nearest
  loaded frame and never goes blank. Save-Data, 2g/3g and `prefers-reduced-motion` get the static final frame
  with all captions.
- GSAP + ScrollTrigger are a lazy chunk requested after the first paint (`src/lib/gsap.ts`), which keeps them
  out of the mobile LCP path.
- QA: `node scripts/qa-frames.mjs` (frame requests without/with scroll, fast flick on a throttled phone,
  reduced motion) and `node scripts/qa-verify.mjs` (layout, menu, scrub, form).
- Config: `src/config/hero.ts` (counts, real dimensions, captions).

## Screenshots

`docs/screenshots/`: desktop hero stage 1 and stage 4, the gallery, the mobile menu, the mobile contact form, and
a phone captured mid-flick (stages 2-4 still loading; the canvas holds the nearest loaded frame). All imagery is
AI-generated placeholder art.
