// Hero h1 "highlight" check: node scripts/qa-h1.mjs <base> <prefix> [outDir]
// At 1440x900, for scroll progress 0..90% of the hero pin: screenshot the h1, double-click "backyard" (what paints a
// selection highlight), screenshot again, and report the selection + how many pixels changed in the h1 box.
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.argv[2] || "http://localhost:4173";
const PREFIX = process.argv[3] || "after";
const OUT = process.argv[4] || "/workspace/sereno/final/sharpness";
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome" });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(BASE, { waitUntil: "load" });
await p.waitForTimeout(2500);
await p.mouse.move(700, 500);
for (let i = 0; i < 3; i++) { await p.mouse.wheel(0, 200); await p.waitForTimeout(50); }
const rows = [];
for (const prog of [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]) {
  await p.evaluate((g) => { const t = document.querySelector(".hero-track"); scrollTo(0, (t.offsetHeight - innerHeight) * g); getSelection().removeAllRanges(); }, prog);
  await p.waitForTimeout(1200);
  const r = await p.evaluate(() => {
    const s = document.querySelectorAll(".hero-line")[1]; const t = s.firstChild; const i = t.textContent.indexOf("backyard");
    const range = document.createRange(); range.setStart(t, i); range.setEnd(t, i + 8); const q = range.getBoundingClientRect();
    const h = document.querySelector("#hero-title").getBoundingClientRect();
    return { x: q.x + q.width / 2, y: q.y + q.height / 2, clip: { x: Math.max(0, h.x - 10), y: Math.max(0, h.y + h.height - 230), width: 640, height: 230 } };
  });
  const a = await p.screenshot({ clip: r.clip });
  await p.mouse.dblclick(r.x, r.y);
  await p.waitForTimeout(250);
  const sel = await p.evaluate(() => String(getSelection()));
  const c = await p.screenshot({ clip: r.clip });
  const diff = await p.evaluate(async ([A, C]) => {
    const load = (s) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = "data:image/png;base64," + s; });
    const [ia, ic] = await Promise.all([load(A), load(C)]);
    const cv = new OffscreenCanvas(ia.width, ia.height), x = cv.getContext("2d");
    x.drawImage(ia, 0, 0); const da = x.getImageData(0, 0, ia.width, ia.height).data;
    x.drawImage(ic, 0, 0); const dc = x.getImageData(0, 0, ia.width, ia.height).data;
    let n = 0; for (let i = 0; i < da.length; i += 4) if (Math.abs(da[i] - dc[i]) + Math.abs(da[i + 1] - dc[i + 1]) + Math.abs(da[i + 2] - dc[i + 2]) > 12) n++;
    return n;
  }, [a.toString("base64"), c.toString("base64")]);
  if (prog === 0 || prog === 0.5) fs.writeFileSync(`${OUT}/${PREFIX}-1440-h1-dblclick-${Math.round(prog * 100)}pct.png`, c);
  rows.push({ progress: prog, selection: sel, changedPixelsAfterDblclick: diff });
}
await b.close();
fs.writeFileSync(`${OUT}/${PREFIX}-h1-check.json`, JSON.stringify(rows, null, 2));
console.log(JSON.stringify(rows));
