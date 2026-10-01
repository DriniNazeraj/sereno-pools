# Sereno Pools — SEO + performance requirements

Adds to DESIGN.md. Front end dev builds to this; I check the PR preview against it before merge.

## Performance budget (mobile, throttled 4G, Lighthouse + real Chrome trace)
- LCP < 2.5s, CLS < 0.1, INP < 200ms. Lighthouse mobile Performance >= 90, SEO = 100, Accessibility >= 95.
- Initial JS < 150 KB gzipped (GSAP core + ScrollTrigger only; no full GSAP bundle, no extra animation libs).
- Weight before first scroll < 1 MB: HTML, CSS, fonts, JS, and stage-01 frames only.

## Hero frames
- 120 frames x 60 KB = ~7 MB. Fine on desktop, too much on phones.
- Mobile set: 60 frames (every other frame), 1080x1350 WebP, aim < 40 KB each (~2.4 MB total).
- Load order: first frame first, then the rest of stage 01. Stream stages 02-04 only after the visitor's first real scroll (wheel, touch drag, scroll key, or > 24 px of page movement); no idle/timer fallback. Fetch the frames nearest the current scroll position first.
- Render the first frame as a real `<img>` behind the canvas with `fetchpriority="high"` and explicit width/height, then hide it once the canvas draws. The canvas is never counted as the largest paint, so this keeps LCP honest and gives a fallback if JS fails.
- Respect Save-Data / slow connections (`navigator.connection.saveData` or effectiveType 2g/3g): show the reduced-motion static version instead of streaming frames.
- Draw with requestAnimationFrame only; no work in the scroll handler beyond setting the target frame. Decode with `createImageBitmap` where supported.

## Images and fonts
- Gallery, outdoor-living, and service images: AVIF with WebP fallback via `<picture>`, responsive `srcset`/`sizes`, `loading="lazy"` + `decoding="async"` below the fold, explicit width/height.
- Fonts: as DESIGN.md (self-hosted, swap, two preloads). Subset to Latin.

## Crawlable content
- The whole page's text must be in the HTML the server sends, not only after JS runs. Prerender the single page at build time (static HTML output). A blank `<div id="root">` is a fail.
- Stat numbers: final values in the HTML; the count-up animates from 0 visually only.
- Hero captions are real text (already in DESIGN.md).

## Head tags
- `<title>`: "Custom Pool Builder in Austin, TX | Sereno Pools" (placeholder name)
- Meta description (~150 chars): "Sereno Pools designs and builds custom pools, spas, and outdoor living spaces across Austin, TX. Request your free design consult."
- `<link rel="canonical">`, `lang="en"`, viewport, theme-color = forest-900.
- Open Graph + Twitter card: title, description, 1200x630 OG image (final hero frame).
- Favicon set + apple-touch-icon.

## Structured data (JSON-LD in the HTML)
- `HomeAndConstructionBusiness` (LocalBusiness): name, url, logo, image, telephone, address (Austin, TX), areaServed, openingHours, priceRange, sameAs. Placeholders until Drini gives real details.
- Do NOT add `aggregateRating` or `Review` markup with the placeholder 4.9 rating or placeholder reviews. Only add it once real, verifiable reviews exist (fake review markup risks a Google penalty).

## Files
- `robots.txt` (allow all, point to sitemap), `sitemap.xml` (single URL for now).
- Preview deploys (Vercel PR previews) must send `X-Robots-Tag: noindex` so previews never get indexed. Production indexable.

## Headings and links
- One h1 ("Scroll to build your backyard"), section h2s in order (already in DESIGN.md). Consider an h2/intro line that says "custom pool builder in Austin" in plain words, since the h1 has no keyword.
- Header anchor links point to real section ids.
