// Hero sharpness evidence: node scripts/qa-sharpness.mjs <base> <prefix> [outDir]
// Screenshots hero stage 1 (top) and stage 4 (end of the pin) at 1440x900, 1920x1080, 1920x1080@2x and 390x844@3x,
// records canvas backing size, frame set + bytes fetched before any scroll, overflow, console errors, and
// checks the scrub goes forward and back.
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.argv[2] || "http://localhost:4173";
const PREFIX = process.argv[3] || "after";
const OUT = process.argv[4] || "/workspace/sereno/final/sharpness";
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome" });
const VPS = [
  ["1440", { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }],
  ["1920", { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 }],
  ["1920-dpr2", { viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 }],
  ["390", { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }],
];
const results = {};
for (const [tag, opts] of VPS) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  const errors = [];
  const frames = [];
  let scrolled = false;
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfinished", async (r) => {
    const m = r.url().match(/\/frames\/([\w-]+)\/frame_(\d+)\.(webp|avif)/);
    if (!m) return;
    const s = await r.sizes().catch(() => null);
    frames.push({ set: m[1], n: +m[2], beforeScroll: !scrolled, bytes: s ? s.responseBodySize : 0 });
  });
  await page.goto(BASE, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await wait(6000); // stage 1 streams after first paint; no scrolling yet
  const pre = frames.filter((f) => f.beforeScroll);
  const info = await page.evaluate(() => {
    const c = document.querySelector(".hero-media canvas");
    const img = document.querySelector(".hero-media img");
    const ctx = c?.getContext("2d");
    return {
      dpr: devicePixelRatio, vw: innerWidth,
      canvas: c ? { w: c.width, h: c.height, cssW: c.clientWidth, cssH: c.clientHeight, smoothing: ctx.imageSmoothingQuality, frame: c.dataset.frame } : null,
      imgCurrentSrc: img?.currentSrc,
      overflowX: document.documentElement.scrollWidth > innerWidth,
    };
  });
  await page.screenshot({ path: `${OUT}/${PREFIX}-${tag}-stage1.png` });
  // real scroll to the end of the hero pin
  scrolled = true;
  const end = await page.evaluate(() => { const t = document.querySelector(".hero-track"); return t.offsetTop + t.offsetHeight - innerHeight; });
  if (opts.hasTouch) { await page.evaluate(() => window.dispatchEvent(new Event("touchmove"))); }
  await page.mouse.move(opts.viewport.width / 2, opts.viewport.height / 2);
  for (let i = 0; i < 6; i++) { await page.mouse.wheel(0, 400); await wait(60); }
  await page.evaluate((y) => window.scrollTo(0, y), end - 2);
  const last = await page.evaluate(() => (innerWidth < 900 ? 60 : 120) - 1);
  await page.waitForFunction((l) => +document.querySelector(".hero-media canvas")?.dataset.frame === l, last, { timeout: 30000 }).catch(() => {});
  await wait(1500);
  const f4 = await page.evaluate(() => document.querySelector(".hero-media canvas")?.dataset.frame);
  await page.screenshot({ path: `${OUT}/${PREFIX}-${tag}-stage4.png` });
  // scrub back to the top
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => +document.querySelector(".hero-media canvas")?.dataset.frame === 0, null, { timeout: 15000 }).catch(() => {});
  await wait(800);
  const fBack = await page.evaluate(() => document.querySelector(".hero-media canvas")?.dataset.frame);
  const overflowEnd = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  results[tag] = {
    ...info, stage4Frame: f4, backToTopFrame: fBack, overflowAny: info.overflowX || overflowEnd,
    beforeScroll: { sets: [...new Set(pre.map((f) => f.set))], count: pre.length, bytes: pre.reduce((a, f) => a + f.bytes, 0) },
    totalFrameBytes: frames.reduce((a, f) => a + f.bytes, 0), totalFrames: frames.length,
    errors,
  };
  await ctx.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/${PREFIX}-results.json`, JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
