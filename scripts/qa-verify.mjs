// QA verification against the running preview(s). Usage: node scripts/qa-verify.mjs [base] [noMockBase] [unreachableBase]
import { chromium } from "playwright";
const BASE = process.argv[2] || "http://localhost:4173";
const NOMOCK = process.argv[3];
const UNREACH = process.argv[4];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome" });
const errors = [];
const results = {};
function watch(page, tag) {
  page.on("console", (m) => m.type() === "error" && errors.push(`[${tag}] console: ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`[${tag}] pageerror: ${e.message}`));
  page.on("requestfailed", (r) => !r.url().includes(":9/") && errors.push(`[${tag}] requestfailed: ${r.url()} ${r.failure()?.errorText}`));
  page.on("response", (r) => r.status() >= 400 && !r.url().includes("/api/contact") && errors.push(`[${tag}] HTTP ${r.status()}: ${r.url()}`));
}
async function heroTo(page, f, ms = 1300) {
  await page.evaluate((f) => { const t = document.querySelector(".hero-track"); scrollTo(0, t.offsetTop + (t.offsetHeight - innerHeight) * f); }, f);
  await wait(ms);
}

// ---- 1. network: which frames load when (desktop + phone), no interaction (stage 01 only; see qa-frames.mjs for scroll/flick)
for (const [tag, vp, mobile] of [["desktop", { width: 1440, height: 900 }, false], ["phone", { width: 390, height: 844 }, true]]) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 3 : 1 });
  const page = await ctx.newPage();
  watch(page, `net-${tag}`);
  const t0 = Date.now();
  const reqs = [];
  page.on("requestfinished", async (r) => {
    const m = r.url().match(/\/frames\/(desktop|mobile)\/frame_(\d+)\.webp/);
    if (!m) return;
    const s = await r.sizes().catch(() => null);
    reqs.push({ set: m[1], n: +m[2], t: Date.now() - t0, start: r.timing().startTime - (t0 - 0), bytes: s ? s.responseBodySize + s.responseHeadersSize : 0 });
  });
  await page.goto(BASE, { waitUntil: "load" });
  const loadAt = Date.now() - t0;
  const atLoad = reqs.length;
  const bytesAtLoad = reqs.reduce((a, r) => a + r.bytes, 0);
  await wait(6000);
  const marks = await page.evaluate(() => performance.getEntriesByType("mark").filter((m) => m.name.startsWith("frames-rest")).map((m) => ({ name: m.name, t: Math.round(m.startTime) })));
  const nav = await page.evaluate(() => { const n = performance.getEntriesByType("navigation")[0]; return { loadEventEnd: Math.round(n.loadEventEnd) }; });
  const count = mobile ? 60 : 120, per = count / 4;
  const s1 = reqs.filter((r) => r.n <= per), rest = reqs.filter((r) => r.n > per);
  const lastS1 = Math.max(...s1.map((r) => r.t)), firstRest = rest.length ? Math.min(...rest.map((r) => r.t)) : null;
  results[`network-${tag}`] = {
    set: [...new Set(reqs.map((r) => r.set))],
    framesFinishedByLoadEvent: atLoad, bytesByLoadEvent: bytesAtLoad, loadEventAtMs: loadAt, perfLoadEventEnd: nav.loadEventEnd,
    stage1: { frames: s1.length, bytes: s1.reduce((a, r) => a + r.bytes, 0), lastFinishedMs: lastS1 },
    stages2to4: { frames: rest.length, bytes: rest.reduce((a, r) => a + r.bytes, 0), firstFinishedMs: firstRest },
    restTrigger: marks,
    // stages 02-04 are deferred until the first real scroll (no idle/timer trigger): expect none here
    expectNoStage2to4WithoutScroll: rest.length === 0 && marks.length === 0 ? "PASS" : "FAIL",
  };
  await ctx.close();
}

// ---- 2. overflow + header fit
for (const w of [320, 390, 768, 1280, 1440]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 800 } });
  const page = await ctx.newPage();
  watch(page, `w${w}`);
  await page.goto(BASE, { waitUntil: "load" });
  await wait(800);
  const r = { overflow: [] };
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= H; y += 700) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await wait(60);
    const o = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    if (o > 0) r.overflow.push({ y, o });
  }
  await page.evaluate(() => scrollTo(0, 0));
  await wait(300);
  if (w < 900) {
    r.menuButton = await page.evaluate(() => { const b = document.querySelector('button[aria-label="Open menu"]').getBoundingClientRect(); return { left: b.left, right: b.right, width: b.width, height: b.height, vw: innerWidth }; });
    r.menuFits = r.menuButton.right <= r.menuButton.vw && r.menuButton.width >= 44 && r.menuButton.height >= 44;
  }
  results[`layout-${w}`] = r;
  await ctx.close();
}

// ---- 3. mobile menu scroll lock
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  watch(page, "menu");
  await page.goto(BASE, { waitUntil: "load" });
  await wait(800);
  await page.evaluate(() => scrollTo(0, document.querySelector("#process").offsetTop + 300));
  await wait(400);
  const y0 = await page.evaluate(() => scrollY);
  await page.click('button[aria-label="Open menu"]');
  await page.waitForSelector('[role="dialog"]');
  await wait(500);
  await page.mouse.move(200, 600);
  for (let i = 0; i < 5; i++) { await page.mouse.wheel(0, 600); await wait(80); }
  await page.keyboard.press("PageDown");
  await page.keyboard.press("Space");
  await wait(400);
  const yOpen = await page.evaluate(() => scrollY);
  const lockedStyles = await page.evaluate(() => ({ html: getComputedStyle(document.documentElement).overflow, body: getComputedStyle(document.body).overflow }));
  await page.keyboard.press("Escape");
  await wait(500);
  const yClosed = await page.evaluate(() => scrollY);
  const dialogGone = (await page.$('[role="dialog"]')) === null;
  // link navigation from the menu
  await page.click('button[aria-label="Open menu"]');
  await page.waitForSelector('[role="dialog"]');
  await wait(400);
  await page.click('nav[aria-label="Mobile"] a[href="#contact"]');
  await wait(800);
  const contactTop = await page.evaluate(() => Math.round(document.querySelector("#contact").getBoundingClientRect().top));
  results.menuLock = { y0, yOpen, yClosed, lockedStyles, dialogGone, bodyScrollLocked: y0 === yOpen, restored: y0 === yClosed, linkNavContactTop: contactTop };
  await ctx.close();
}

// ---- 4. hero scrub both ways (desktop)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  watch(page, "scrub");
  await page.goto(BASE, { waitUntil: "load" });
  await wait(2500);
  await page.mouse.wheel(0, 40); // real first scroll -> stream stages 02-04
  await wait(4000);
  const seq = [];
  for (const f of [0.05, 0.3, 0.55, 0.8, 1, 0.8, 0.55, 0.3, 0.05]) {
    await heroTo(page, f, 1200);
    seq.push({ f, frame: await page.evaluate(() => +document.querySelector(".hero-media canvas").dataset.frame), caption: await page.evaluate(() => document.querySelector(".caption.is-active .eyebrow").textContent) });
  }
  const fwd = seq.slice(0, 5).map((s) => s.frame), back = seq.slice(4).map((s) => s.frame);
  results.scrub = { seq, forwardIncreasing: fwd.every((v, i) => i === 0 || v > fwd[i - 1]), backwardDecreasing: back.every((v, i) => i === 0 || v < back[i - 1]) };
  await ctx.close();
}

// ---- 5. contact form
async function fillForm(page, message) {
  await page.locator("#contact").scrollIntoViewIfNeeded();
  await page.waitForSelector('form[aria-label="Request a design consult"] [role="combobox"]', { timeout: 15000 });
  await page.getByLabel("Name").fill("Test Person");
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("Phone").fill("(512) 555-0100");
  await page.getByRole("combobox", { name: "Project type" }).click();
  await page.getByRole("option", { name: "New pool" }).click();
  await page.getByRole("combobox", { name: "Budget" }).click();
  await page.getByRole("option", { name: "$125k–$200k" }).click();
  await page.getByLabel(/Message/).fill(message);
  await page.getByRole("button", { name: "Request my design consult" }).click();
  await wait(2500);
  const s = await page.evaluate(() => ({
    thanks: !!document.body.innerText.match(/Thanks, we.ll be in touch/),
    alert: document.querySelector('#contact [role="alert"]')?.innerText.replace(/\s+/g, " ") || null,
    retry: !!document.querySelector('#contact [role="alert"] button'),
    demoNote: !!document.querySelector("[data-demo-form]"),
    nameKept: document.querySelector('#contact input[autocomplete="name"]')?.value || null,
  }));
  return s;
}
for (const [tag, base, msg] of [["mock-success", BASE, "Hello, we want a pool."], ["mock-fail", BASE, "this should fail please"], ...(NOMOCK ? [["real-no-endpoint", NOMOCK, "Hello"]] : []), ...(UNREACH ? [["real-unreachable", UNREACH, "Hello"]] : [])]) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const warns = [];
  page.on("console", (m) => m.type() === "warning" && warns.push(m.text()));
  watch(page, tag);
  await page.goto(base, { waitUntil: "load" });
  await wait(500);
  const r = await fillForm(page, msg);
  if (r.retry) {
    await page.click('#contact [role="alert"] button');
    await wait(2500);
    r.afterRetry = await page.evaluate(() => ({ thanks: !!document.body.innerText.match(/Thanks, we.ll be in touch/), alert: !!document.querySelector('#contact [role="alert"]') }));
  }
  r.consoleWarnings = warns.filter((w) => w.includes("Sereno"));
  results[`form-${tag}`] = r;
  await ctx.close();
}

results.consoleErrors = errors.filter((e) => !/api\/contact/.test(e));
results.expectedContactErrors = errors.filter((e) => /api\/contact/.test(e));
console.log(JSON.stringify(results, null, 2));
await browser.close();
