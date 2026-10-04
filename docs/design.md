# Sereno Pools: design spec (v1)

Reference: /workspace/reels/DaHIsoBxxEo.mp4 (Raman Studios). Contact sheet: /workspace/sereno/ref/sheet.png
One-page site. Premium, calm, lots of air. Motion is slow and quiet, never bouncy.

## 1. Tokens

```css
:root {
  /* colour */
  --forest-950: #0B2019;  /* hero overlay tint, footer */
  --forest-900: #0E2A22;  /* stats bar, contact section bg */
  --forest-700: #1F4D3D;  /* primary button bg */
  --forest-500: #3E7A62;  /* hover, focus ring, small accents */
  --cream-50:  #FBF9F4;   /* page bg */
  --cream-100: #F4EFE5;   /* alternating section bg, cards on white */
  --white:     #FFFFFF;
  --ink:       #17201B;   /* body text on light */
  --ink-muted: #5B635E;   /* secondary text (6:1 on cream-50) */
  --line:      #E3DCCF;   /* hairlines, card borders, input borders */
  --on-dark:   #F4EFE5;   /* text on forest */
  --on-dark-muted: rgba(244,239,229,.72);
  --error:     #B3261E;

  /* type */
  --font-serif: "Fraunces", Georgia, serif;          /* headings, stat numbers, captions */
  --font-sans:  "Inter", system-ui, sans-serif;      /* body, UI, labels */

  /* radius, shadow */
  --r-sm: 6px; --r-md: 12px; --r-lg: 20px; --r-pill: 999px;
  --shadow-card: 0 1px 2px rgba(14,42,34,.04), 0 8px 24px rgba(14,42,34,.06);
  --shadow-lift: 0 2px 4px rgba(14,42,34,.06), 0 16px 40px rgba(14,42,34,.10);

  /* motion */
  --ease-out: cubic-bezier(.22,1,.36,1);
  --dur-fast: 180ms; --dur-base: 320ms; --dur-reveal: 900ms;
}
```

Fonts: self-host with @fontsource (Fraunces 400 + 400 italic, Inter 400/500/600), `font-display: swap`, preload only Fraunces 400 and Inter 400. Fraunces uses `font-optical-sizing: auto`, letter-spacing -0.02em on display sizes.

## 2. Type scale (fluid, clamp)

| Role | Font | Size | Line height | Notes |
|---|---|---|---|---|
| Display (hero h1) | serif 400 | clamp(44px, 7vw, 104px) | 1.0 | white, max 9ch per line |
| H2 section title | serif 400 | clamp(34px, 4.6vw, 64px) | 1.08 | centered on light sections |
| H3 card title | serif 400 | 24px | 1.2 | |
| Stat number | serif 400 | clamp(40px, 5vw, 64px) | 1 | tabular figures |
| Hero caption | serif 400 | clamp(20px, 2.2vw, 30px) | 1.25 | max 22ch |
| Eyebrow | sans 600 | 12px | 1 | uppercase, letter-spacing .16em, forest-500 (on-dark-muted on dark) |
| Body L | sans 400 | 18px | 1.6 | intro paragraph, max 60ch |
| Body | sans 400 | 16px | 1.6 | |
| Small / label | sans 500 | 14px | 1.4 | |

## 3. Layout

- Container max 1240px, side padding clamp(20px, 5vw, 64px). 12-col grid, 24px gutter.
- Section vertical padding clamp(96px, 12vw, 176px). Stats bar is the exception: 72px.
- Breakpoints: 640 / 900 / 1200. Design mobile first.
- Section order and backgrounds: Hero (image) → Intro (cream-50) → Stats (forest-900) → Process (cream-50) → Gallery (white) → Outdoor living (full-bleed photo) → Services (cream-100) → Testimonials (cream-50) → Contact (forest-900) → Footer (forest-950).

## 4. Header

- Sticky, 72px tall (64 mobile). Over the hero: transparent, white logo and links. After scrolling past the hero: cream-50 at 85% opacity + `backdrop-filter: blur(12px)` + 1px bottom hairline, ink text. Crossfade over --dur-base.
- Left: wordmark "Sereno" in serif 24px + small "POOLS" eyebrow. Centre-right: Projects, Gallery, Services, Reviews (sans 500 15px, 32px gap; hover = 1px underline sliding in from left). Right: "Get a quote" pill button (primary; on the transparent state use white bg + forest-900 text).
- Mobile (<900): logo + "Get a quote" (small) + menu icon. Menu opens a full-screen forest-900 sheet with links in serif 36px, staggered fade-up 60ms apart. Lock body scroll while open, Esc closes.

## 5. Hero: scroll to build (main feature)

- Pinned section, 100svh tall, pinned for ~400vh of scroll (tune so each stage gets about one screen of scroll).
- `<canvas>` fills the viewport, frames drawn with object-fit: cover logic (crop, never stretch; keep the pool centred horizontally). Scale for devicePixelRatio, capped at 2.
- Frames: target 120 frames total (30 per stage), WebP, 1920×1080 desktop set and 1080×1350 portrait set for <900px (pick set on load). Quality ~70, aim < 60KB each. Preload stage 01 frames before revealing, then stream the rest in order; draw the nearest loaded frame if the exact one isn't ready. Placeholder frames for now.
- Scrub: GSAP ScrollTrigger `scrub: 0.5` so it glides instead of stepping. Reverse works automatically.
- Readability overlay on top of canvas: linear-gradient(to bottom, rgba(11,32,25,.45) 0%, transparent 35%, transparent 60%, rgba(11,32,25,.55) 100%).
- Heading "Scroll to build your backyard" top-left, starts 20vh from top on desktop (like the reference), white display serif, stays for the whole pin.
- Caption block bottom-left, 48px from bottom/side (24 mobile): eyebrow "01 — THE START" + caption line. Only one caption visible at a time; switch at stage boundaries with a 400ms crossfade + 12px rise. Small 4-segment progress bar above the eyebrow (each segment fills as its stage plays).
- "SCROLL ↓" bottom-right, eyebrow style, arrow bobbing 6px on a 2s loop; fades out after 5% progress.
- Loading state: no loading screen. The server-rendered first frame shows at once, and a thin 2 px cream progress line at the bottom of the hero fills while stage 01 loads, then fades out.
- prefers-reduced-motion: no pin, show the final frame as a static image with all four captions stacked as a simple list below the heading.

## 6. Sections

1. Intro: centred. Eyebrow "SERENO POOLS · AUSTIN, TX". H2 "We build backyards you never want to leave." Body L paragraph, max 60ch, ink-muted.
2. Stats (forest-900): 4 columns desktop, 2×2 mobile, thin on-dark hairline dividers between columns. Number (serif, on-dark) + label (sans 14 on-dark-muted). Numbers count up once on first view over 1.2s. Placeholder values, clearly marked as placeholders until Drini confirms: 18 years, 600+ pools, 25 awards, 4.9 Google rating.
3. Process: eyebrow "HOW WE BUILD" + H2. Horizontal timeline, 5 steps: numbered circle (40px, 1px forest-700 border, serif numeral) on a 1px line, title (H3 20px), one-line description. The line draws left to right as the section scrolls in. Mobile: vertical timeline, line on the left.
4. Gallery: eyebrow + H2 "A few we're proud of." CSS columns masonry (3 / 2 / 1 columns), 16px gap, r-md corners. Hover: image scales 1.03 over 600ms inside its frame, caption (location) fades in on a bottom gradient. Click opens a lightbox (Esc, arrows, swipe). Lazy-load everything, explicit width/height to avoid layout shift.
5. Outdoor living: full-bleed night photo, min-height 90svh, subtle parallax (image moves 10% slower). Bottom-left overlay text: H2 "More than a pool. A place to gather." in white + one line of body + text link "See outdoor living →".
6. Services (cream-100): eyebrow + H2. 3×2 grid (2×3 tablet, 1 col mobile). Cards: white, r-lg, 32px padding, 1px line border, thin-line 28px icon in forest-700, H3, 2-line description, "Learn more →" link. Hover: lift 4px + shadow-lift over --dur-base.
7. Testimonials: H2 "Word travels in the cul-de-sac." 3 cards (carousel with snap on mobile). 5 small stars in forest-500, quote in serif italic 20px, name + neighbourhood in sans 14. Placeholder quotes marked as placeholders.
8. Contact (forest-900): 2 columns desktop. Left: eyebrow "START YOUR PROJECT", H2 "Let's design your backyard.", short paragraph, 3 checklist lines (free 3D design, fixed-price quote, reply within 1 business day). Right: form card, forest-950 bg at 60% + 1px rgba(244,239,229,.14) border, r-lg, 32px padding.
   - Fields: Name, Email, Phone (2-col row with email on desktop), Project type (select: New pool, Pool + spa, Renovation, Outdoor living, Other), Budget (select: Under $75k, $75k–$125k, $125k–$200k, $200k+), Message (textarea, 4 rows).
   - Inputs: 48px tall, r-sm, transparent bg, 1px rgba(244,239,229,.24) border, labels above in small/label. Focus: border forest-500 + 3px ring rgba(62,122,98,.35). Error: border --error, message below in 13px. Validate on blur, not on every keystroke.
   - Button "Request my design consult": full width, 52px, pill, cream-50 bg, forest-900 text. Hover: white bg. Loading: spinner + "Sending…", disabled. Success: form swaps to a check icon + "Thanks, we'll be in touch within one business day." Failure: inline banner above the button with a retry.
9. Footer (forest-950): wordmark, address/phone/email placeholders, nav links, small copyright line.

## 7. Buttons and links

- Primary: forest-700 bg, cream-50 text, pill, 48px tall, 24px side padding, sans 500 15px. Hover forest-900. Active scale .98. Focus-visible: 2px cream-50 outline offset 2px + 4px forest-500 ring.
- Secondary: transparent, 1px current-colour border, same size.
- Text link: underline offset 4px, 1px, appears on hover.
- Minimum tap target 44×44 everywhere.

## 8. Motion rules

- Section reveal: elements fade up from 24px, --dur-reveal, --ease-out, 80ms stagger, triggered once at 15% in view. Don't animate full paragraphs word by word.
- Only animate transform and opacity. No scroll-jacking outside the hero.
- Everything honours prefers-reduced-motion (reveals become instant, parallax and count-up off).

## 9. Accessibility and quality bar

- Text contrast AA minimum (all pairs above pass). Visible focus on every control.
- One h1 (hero heading). Section h2s in order. Canvas has aria-hidden; captions are real text in the DOM.
- Every image has alt text; gallery images get real descriptions when final photos arrive.
- No layout shift: reserve image and font space. Hero frames are the heaviest asset, so they must stream, not block first paint.

## 10. Tailwind + shadcn mapping

Tailwind theme (extend):
- colors: `forest: {950:'#0B2019',900:'#0E2A22',700:'#1F4D3D',500:'#3E7A62'}`, `cream: {50:'#FBF9F4',100:'#F4EFE5'}`, `ink: {DEFAULT:'#17201B', muted:'#5B635E'}`, `line:'#E3DCCF'`
- fontFamily: `serif: ['Fraunces','Georgia','serif']`, `sans: ['Inter','system-ui','sans-serif']`
- borderRadius: `sm:6px, md:12px, lg:20px`
- transitionTimingFunction: `out-expo: cubic-bezier(.22,1,.36,1)`
- boxShadow: `card`, `lift` as in section 1

shadcn CSS variables (HSL of the hex values above): background = cream-50, foreground = ink, card = white, primary = forest-700, primary-foreground = cream-50, secondary = cream-100, muted-foreground = ink-muted, border/input = line, ring = forest-500, destructive = #B3261E, radius = 0.75rem. In the contact section wrap in a `.dark`-style scope: background = forest-900, foreground = cream-100, input border = cream-100/24, ring = forest-500.

shadcn components to use:
- Button (variants: default = primary pill `rounded-full h-12 px-6`, outline = secondary, link = text link)
- Sheet (mobile menu, side="top" full screen, forest-900)
- Form + Input + Textarea + Select + Label (contact form, react-hook-form + zod, errors via FormMessage)
- Card (services, testimonials)
- Dialog (gallery lightbox)
- Carousel (testimonials on mobile)
- Sonner toast only as a fallback; primary success/failure feedback is inline in the form card.
