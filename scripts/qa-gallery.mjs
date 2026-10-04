// Gallery quality evidence: node scripts/qa-gallery.mjs <base> <prefix> [outDir]
// 1440x900, 1440x900@2x, 1920x1080 (+ lightbox open), 1920x1080@2x and 390x844@3x: screenshots of the gallery grid, the file each
// <img> picked (currentSrc), gallery bytes downloaded, layout shifts inside #gallery, console errors.
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.argv[2] || "http://localhost:4173";
const PREFIX = process.argv[3] || "after";
const OUT = process.argv[4] || "/workspace/sereno/final/gallery";
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome" });
const VPS = [
  ["1440", { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, true],
  ["1440-dpr2", { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 }, true],
  ["1920", { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }, true],
  ["1920-dpr2", { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 }],
  ["390", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
];
const results = {};
for (const [tag, opts, lightbox] of VPS) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  const imgs = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfinished", async (r) => {
    if (!/\/images\//.test(r.url())) return;
    const s = await r.sizes().catch(() => null);
    imgs.push({ url: r.url().replace(BASE, ""), bytes: s ? s.responseBodySize : 0 });
  });
  await page.addInitScript(() => {
    window.__shifts = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (e.hadRecentInput) continue;
        const inGallery = (e.sources || []).some((s) => s.node && s.node.closest && s.node.closest("#gallery"));
        window.__shifts.push({ value: e.value, inGallery });
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(BASE, { waitUntil: "load" });
  await wait(1500);
  const preScroll = imgs.filter((i) => !/outdoor-living/.test(i.url)).reduce((a, i) => a + i.bytes, 0);
  // real-ish scroll down to the gallery so lazy images and reveals trigger
  const top = await page.evaluate(() => document.querySelector("#gallery").getBoundingClientRect().top + scrollY);
  await page.mouse.move(opts.viewport.width / 2, opts.viewport.height / 2);
  for (let y = 0; y < top; y += 700) { await page.evaluate((v) => scrollTo(0, v), y); await wait(120); }
  const listTop = await page.evaluate(() => document.querySelector("#gallery ul").getBoundingClientRect().top + scrollY);
  const listH = await page.evaluate(() => document.querySelector("#gallery ul").getBoundingClientRect().height);
  for (let y = top; y < listTop + listH; y += 400) { await page.evaluate((v) => scrollTo(0, v), y); await wait(150); }
  await page.evaluate((v) => scrollTo(0, v), listTop - 90);
  await page.waitForFunction(() => [...document.querySelectorAll("#gallery ul img")].every((i) => i.complete && i.naturalWidth > 0), null, { timeout: 20000 }).catch(() => {});
  await wait(1500);
  const info = await page.evaluate(() => [...document.querySelectorAll("#gallery ul img")].map((i) => ({
    src: i.currentSrc.replace(location.origin, ""), natural: `${i.naturalWidth}x${i.naturalHeight}`, css: `${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)}`,
    loading: i.loading, decoding: i.decoding, attr: `${i.getAttribute("width")}x${i.getAttribute("height")}`,
  })));
  const ul = await page.evaluate(() => { const r = document.querySelector("#gallery ul").getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, width: r.width, height: r.height }; });
  await page.screenshot({ path: `${OUT}/${PREFIX}-${tag}-gallery.png`, fullPage: true, clip: { x: Math.max(0, ul.x - 8), y: ul.y - 8, width: Math.min(opts.viewport.width, ul.width + 16), height: ul.height + 16 } });
  const galleryBytes = [...imgs].filter((i) => !/outdoor-living/.test(i.url));
  // CLS is measured up to here (load + scroll through the grid). The lightbox opens via synthetic clicks, which
  // Chrome does not count as recent input, so the Radix scroll lock's shifts would otherwise be counted.
  const shifts = await page.evaluate(() => window.__shifts);
  let lb = null;
  if (lightbox) {
    for (const idx of [0, 5]) {
      await page.evaluate((k) => document.querySelectorAll("#gallery ul button")[k].scrollIntoView({ block: "center" }), idx);
      await wait(400);
      await page.evaluate((k) => document.querySelectorAll("#gallery ul button")[k].click(), idx);
      await page.waitForFunction(() => { const i = document.querySelector("[role=dialog] img"); return i && i.complete && i.naturalWidth > 0; }, null, { timeout: 15000 }).catch(() => {});
      await wait(1200);
      const d = await page.evaluate(() => { const i = document.querySelector("[role=dialog] img"); const r = i.getBoundingClientRect(); return { src: i.currentSrc.replace(location.origin, ""), natural: `${i.naturalWidth}x${i.naturalHeight}`, css: `${Math.round(r.width)}x${Math.round(r.height)}`, rect: { x: r.x, y: r.y, width: r.width, height: r.height } }; });
      await page.screenshot({ path: `${OUT}/${PREFIX}-${tag}-lightbox-${idx}.png` });
      (lb ||= []).push(d);
      await page.keyboard.press("Escape");
      await wait(500);
    }
  }
  results[tag] = {
    galleryBytesBeforeScroll: preScroll, images: info, lightbox: lb,
    galleryRequests: galleryBytes.length, galleryBytes: galleryBytes.reduce((a, i) => a + i.bytes, 0), galleryFiles: galleryBytes.map((i) => `${i.url} ${i.bytes}`),
    clsTotal: +shifts.reduce((a, s) => a + s.value, 0).toFixed(4), clsGallery: +shifts.filter((s) => s.inGallery).reduce((a, s) => a + s.value, 0).toFixed(4),
    overflowX: await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), errors,
  };
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/${PREFIX}-results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
