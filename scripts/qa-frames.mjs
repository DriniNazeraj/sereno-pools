// Frame-loading evidence: node scripts/qa-frames.mjs [base] [outDir]
// 1) phone + desktop: load, wait 8 s with NO scrolling -> only stage-01 frames; then a real scroll -> stages 02-04.
// 2) phone: fast touch flick to the end of the hero right after load (throttled network) -> canvas never blank.
// 3) reduced motion: static final frame, no canvas, no frame streaming.
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.argv[2] || "http://localhost:4173";
const OUT = process.argv[3] || "/workspace/sereno/final/frame-loading";
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome" });
const out = {};
const errors = [];
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 };
const DESK = { viewport: { width: 1440, height: 900 } };

function track(page, t0) {
  const reqs = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("requestfinished", async (r) => {
    const m = r.url().match(/\/frames\/(desktop|mobile)\/frame_(\d+)\.webp/);
    if (!m) return;
    const s = await r.sizes().catch(() => null);
    reqs.push({ set: m[1], n: +m[2], t: Date.now() - t0(), bytes: s ? s.responseBodySize + s.responseHeadersSize : 0 });
  });
  return reqs;
}
// Trusted touch drag via CDP touch events (Input.synthesizeScrollGesture only emits touchstart in headless Chrome).
async function swipe(cdp, dy, steps = 8, stepMs = 12, midFingerDown, x = 200, y0 = 760) {
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y: y0 }] });
  for (let i = 1; i <= steps; i++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x, y: y0 - (dy * i) / steps }] });
    await wait(stepMs);
    if (midFingerDown && i === steps - 1) await midFingerDown();
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}
const sum = (a) => a.reduce((x, r) => x + r.bytes, 0);
const canvasState = (page) => page.evaluate(() => {
  const c = document.querySelector(".hero-media canvas");
  if (!c) return null;
  const ctx = c.getContext("2d");
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  let s = 0, n = 0;
  for (let i = 0; i < d.length; i += 4 * 997) { s += d[i] + d[i + 1] + d[i + 2]; n++; }
  const img = document.querySelector(".hero-media img");
  return { frame: +(c.dataset.frame ?? -1), meanRGB: Math.round(s / n / 3), imgOpacity: getComputedStyle(img).opacity, scrollY: Math.round(scrollY) };
});

// ---- 1. no scroll, then a real scroll
for (const [tag, opts, count] of [["phone", PHONE, 60], ["desktop", DESK, 120]]) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  let start = Date.now();
  const reqs = track(page, () => start);
  start = Date.now();
  await page.goto(BASE, { waitUntil: "load" });
  const loadMs = Date.now() - start;
  await wait(8000); // idle, no input at all
  const per = count / 4;
  const before = [...reqs];
  const marksBefore = await page.evaluate(() => performance.getEntriesByType("mark").map((m) => m.name));
  // real scroll: trusted touch scroll gesture on phone, mouse wheel on desktop
  const scrollAt = Date.now() - start;
  if (tag === "phone") {
    const cdp = await ctx.newCDPSession(page);
    await swipe(cdp, 300, 10, 16);
  } else {
    await page.mouse.move(700, 450);
    await page.mouse.wheel(0, 300);
  }
  await wait(8000);
  const marksAfter = await page.evaluate(() => performance.getEntriesByType("mark").map((m) => m.name));
  const after = reqs.filter((r) => !before.includes(r));
  out[`${tag}-no-scroll-then-scroll`] = {
    set: [...new Set(reqs.map((r) => r.set))],
    loadEventMs: loadMs,
    duringFirst8sNoScroll: { frames: before.length, stage1Frames: before.filter((r) => r.n <= per).length, stage2to4Frames: before.filter((r) => r.n > per).length, bytes: sum(before), lastAtMs: Math.max(...before.map((r) => r.t)) },
    marksBeforeScroll: marksBefore.filter((m) => m.startsWith("frames")),
    realScrollAtMs: scrollAt,
    afterRealScroll: { frames: after.length, stage2to4Frames: after.filter((r) => r.n > per).length, bytes: sum(after), firstAtMs: after.length ? Math.min(...after.map((r) => r.t)) : null, lastAtMs: after.length ? Math.max(...after.map((r) => r.t)) : null },
    marksAfterScroll: marksAfter.filter((m) => m.startsWith("frames")),
    totalUnique: new Set(reqs.map((r) => r.n)).size,
  };
  // scrub fully both ways now that all frames are in
  const seq = [];
  for (const f of [0, 0.33, 0.66, 1, 0.66, 0.33, 0]) {
    await page.evaluate((f) => { const t = document.querySelector(".hero-track"); scrollTo(0, t.offsetTop + (t.offsetHeight - innerHeight) * f); }, f);
    await wait(1100);
    seq.push((await canvasState(page)).frame);
  }
  out[`${tag}-scrub`] = { frames: seq, reachesLast: seq.includes(count - 1), backToFirst: seq[seq.length - 1] === 0 };
  await ctx.close();
}

// ---- 2. phone: fast flick to the end of the hero right after load, slow network
{
  const ctx = await browser.newContext(PHONE);
  const page = await ctx.newPage();
  let start = Date.now();
  const reqs = track(page, () => start);
  const cdp = await ctx.newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 });
  start = Date.now();
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForFunction(() => document.querySelector(".hero-media canvas")?.dataset.frame !== undefined, null, { timeout: 15000 });
  const end = await page.evaluate(() => { const t = document.querySelector(".hero-track"); return t.offsetTop + t.offsetHeight - innerHeight; });
  const top = await page.evaluate(() => document.querySelector(".hero-track").offsetTop);
  const samples = [];
  const sample = async (label) => { const st = await canvasState(page); st.label = label; st.atMs = Date.now() - start; st.targetFrame = Math.round(Math.min(1, Math.max(0, (st.scrollY - top) / (end - top))) * 59); st.framesLoaded = reqs.length; samples.push(st); return st; };
  // in-page sampler: every animation frame record the drawn frame + a sparse canvas mean, so a blank frame between our samples would show up
  await page.evaluate(() => {
    const c = document.querySelector(".hero-media canvas"), g = c.getContext("2d");
    window.__trace = [];
    const t0 = performance.now();
    const loop = () => {
      const d = g.getImageData(0, 0, c.width, c.height).data;
      let s = 0, n = 0;
      for (let i = 0; i < d.length; i += 4 * 4999) { s += d[i] + d[i + 1] + d[i + 2]; n++; }
      window.__trace.push([Math.round(performance.now() - t0), +(c.dataset.frame ?? -1), Math.round(s / n / 3), Math.round(scrollY)]);
      if (!window.__stopTrace) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
  await sample("before flick");
  // fast flick: rapid successive ~600 px swipes (momentum included) until the end of the pinned hero
  let k = 0;
  while ((await page.evaluate(() => scrollY)) < end - 5 && k < 12) {
    // mid-flick screenshot: taken during swipe 2 with the finger still down (a capture during the
    // momentum fling shows a compositor/main-thread offset artifact in headless Chrome, not a real page state)
    const mid = k === 1 ? async () => {
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      await sample("MID-FLICK (finger down, swipe 2)");
      samples[samples.length - 1].screenshot = "phone-flick-mid.png";
      await page.screenshot({ path: `${OUT}/phone-flick-mid.png` });
    } : undefined;
    await swipe(cdp, 600, 5, 8, mid);
    k++;
    await sample(`after swipe ${k}`);
  }
  // stop the fling (finger down/up) and settle exactly on the last hero position
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: 30, y: 300 }] });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await page.evaluate((end) => scrollTo(0, end), end);
  await wait(100);
  await sample("settled at hero end");
  await page.screenshot({ path: `${OUT}/phone-flick-end-before-catch-up.png` });
  for (let i = 0; i < 8; i++) { await wait(500); await sample(`at end +${(i + 1) * 500}ms (throttled)`); }
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  await page.waitForFunction(() => +document.querySelector(".hero-media canvas").dataset.frame >= 55, null, { timeout: 60000 }).catch(() => {});
  await wait(1500);
  const final = await sample("caught up (network unthrottled)");
  await page.screenshot({ path: `${OUT}/phone-flick-caught-up.png` });
  const trace = await page.evaluate(() => { window.__stopTrace = true; return window.__trace; });
  out["phone-fast-flick"] = { heroEndScrollY: end, swipes: k, rafTrace: { n: trace.length, blankOrUndrawn: trace.filter((t) => t[1] < 0 || t[2] <= 20).length, minMean: Math.min(...trace.map((t) => t[2])), framesSeen: [...new Set(trace.map((t) => t[1]))] }, samples, minMeanRGB: Math.min(...samples.map((s) => s.meanRGB)), neverBlank: samples.every((s) => s.frame >= 0 && s.meanRGB > 20), final };
  await ctx.close();
}

// ---- 3. reduced motion (phone + desktop)
for (const [tag, opts] of [["phone", PHONE], ["desktop", DESK]]) {
  const ctx = await browser.newContext({ ...opts, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  let start = Date.now();
  const reqs = track(page, () => start);
  start = Date.now();
  await page.goto(BASE, { waitUntil: "load" });
  await wait(2000);
  await page.mouse.wheel(0, 400);
  await wait(3000);
  await page.evaluate(() => scrollTo(0, 0));
  await wait(500);
  await page.screenshot({ path: `${OUT}/${tag}-reduced-motion.png` });
  out[`${tag}-reduced-motion`] = await page.evaluate(() => ({ static: !!document.querySelector(".hero-static"), canvas: !!document.querySelector(".hero-media canvas"), captionsListed: document.querySelectorAll("#top ol li").length, img: document.querySelector(".hero-media img").currentSrc.split("/frames/")[1] }));
  out[`${tag}-reduced-motion`].frameRequests = reqs.map((r) => `${r.set}/${r.n}`);
  await ctx.close();
}
out.consoleErrors = errors;
fs.writeFileSync(`${OUT}/qa-frames-results.json`, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await browser.close();
