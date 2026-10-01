# Sereno Pools: QA test plan (v1)

Tested against the build on each pull request, before Drini merges. Source of truth: the brief's "Done means" + /workspace/sereno/DESIGN.md.
Viewports: 390x844 (iPhone), 412x915 (Android), 768x1024 (tablet), 1280x800 and 1920x1080 (desktop). Chromium + WebKit.

## 1. Scroll-to-build hero (blocker if any fail)
- [ ] No loading screen: the first frame paints immediately; the thin progress line fills while stage 01 loads. Stages 02-04 are not requested until the first real scroll (`scripts/qa-frames.mjs`).
- [ ] Scrolling down plays frames forward 01 to 04; scrolling up plays them backward. No blank canvas, no flashing, no stretched image at any viewport.
- [ ] Fast flick scroll and scrollbar drag both ways: frame keeps up, ends on the right frame for the scroll position.
- [ ] Captions: exactly one visible at a time, correct text per stage, switch at stage boundaries. Progress bar segments match the stage.
- [ ] "SCROLL ↓" hint fades out after scrolling starts. Heading stays for the whole pin.
- [ ] Phones load the lighter 60-frame portrait set only after first paint (per SEO-PERF.md); desktop loads the 120-frame landscape set. Resize and rotate phone mid-scroll: canvas redraws, no distortion.
- [ ] Pin releases cleanly into the Intro section, no jump or gap. Reloading mid-page restores correctly.
- [ ] Mobile: iOS address bar showing/hiding doesn't make the hero jump (100svh).
- [ ] Frame rate while scrubbing measured with a performance trace (target: no long frames on desktop, smooth on mobile emulation with 4x CPU throttle).
- [ ] prefers-reduced-motion: no pin, final frame static, all four captions listed.
- [ ] Canvas is aria-hidden; captions are real DOM text.

## 2. Contact form (blocker)
- [ ] Required fields validate on blur with the error text shown; bad email and bad phone rejected.
- [ ] Submit shows "Sending…" and disables the button (no double submits on double click).
- [ ] Success: swaps to the thank-you state, and the email actually arrives at Drini's address with every field correct.
- [ ] Failure (endpoint down or 500): banner with retry, typed data kept.
- [ ] Server side: empty body, huge message, HTML/script in fields, missing fields all rejected cleanly; honeypot filled gets dropped; rate limit kicks in after repeated posts.
- [ ] PR preview is reachable by me (Vercel preview protection off, or a bypass token shared via secure secret). Preview pages carry noindex.
- [ ] Endpoint URL comes from env; preview build points at a working endpoint (otherwise the form is untestable on the PR).

## 3. Sections and layout
- [ ] All 8 sections present in order, copy matches the brief, placeholders visibly marked.
- [ ] No horizontal scroll at any viewport. Nothing overlaps or clips at 320px wide.
- [ ] Header: sticky, transparent over hero then cream after; nav links scroll to the right sections; "Get a quote" goes to Contact. Mobile menu opens, locks scroll, closes on Esc and on link tap.
- [ ] Stats count up once. Process timeline goes horizontal then vertical on mobile. Gallery masonry 3/2/1 columns, lightbox works with Esc, arrows, swipe. Testimonials snap carousel on mobile.
- [ ] Section fade-ups fire once, nothing stays invisible if you scroll fast or jump via a nav link.

## 4. Speed and quality
- [ ] No console errors or failed network requests on load and through a full scroll.
- [ ] Hero frames stream after first paint; total first load weight noted. (Full Lighthouse audit is seo + performance's job; I only flag obvious regressions.)
- [ ] No layout shift from fonts or images. Keyboard: tab through everything with a visible focus ring, form usable with keyboard only.

## Report format
Each bug: section, viewport/browser, steps, expected vs actual, screenshot or video. Posted as a review comment on the PR, marked blocker or minor.
