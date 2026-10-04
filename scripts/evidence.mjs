// Owner evidence: node scripts/evidence.mjs [base] [outDir]
import { chromium } from "playwright";
import fs from "node:fs";
const BASE = process.argv[2] || "http://localhost:4173";
const OUT = process.argv[3] || "/workspace/sereno/final";
const only = process.env.ONLY || "all";
fs.mkdirSync(OUT, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "/usr/bin/google-chrome" });
const errors = [];
const watch = (page, tag) => {
  page.on("console", (m) => m.type() === "error" && errors.push(`[${tag}] ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`[${tag}] ${e.message}`));
};
async function ready(page) {
  await page.goto(BASE, { waitUntil: "load" });
  await page.waitForSelector(".hero-progress.is-done", { state: "attached" }); // stage 01 loaded
  await page.mouse.move(10, 10);
  await page.mouse.wheel(0, 40); // a real first scroll: stages 02-04 stream only after this
  await wait(300);
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForFunction(() => performance.getEntriesByType("resource").filter((r) => r.name.includes("/frames/")).length >= (innerWidth < 900 ? 60 : 120), null, { timeout: 30000 });
  await wait(800);
}
async function heroTo(page, f, ms = 1600) {
  await page.evaluate((f) => { const t = document.querySelector(".hero-track"); scrollTo(0, t.offsetTop + (t.offsetHeight - innerHeight) * f); }, f);
  await wait(ms);
}
async function sectionShots(page, prefix, sections, hideHeader = true) {
  for (const [name, sel] of sections) {
    await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: "start" }), sel);
    await wait(1600);
    if (hideHeader) await page.addStyleTag({ content: "header{visibility:hidden!important}" });
    await page.locator(sel).first().screenshot({ path: `${OUT}/${prefix}-${name}.png`, animations: "disabled" });
    if (hideHeader) await page.evaluate(() => document.querySelectorAll("style").forEach((s) => s.textContent.includes("header{visibility:hidden") && s.remove()));
  }
}
const STAGES = [["01-start", 0.12], ["02-dig", 0.37], ["03-build", 0.62], ["04-finish", 0.86]];
const SECTIONS = [["01-intro", "#intro"], ["02-stats", 'section[aria-label="Sereno Pools in numbers"]'], ["03-process", "#process"], ["04-gallery", "#gallery"], ["05-outdoor-living", "#outdoor-living"], ["06-services", "#services"], ["07-reviews", "#reviews"], ["08-contact", "#contact"], ["09-footer", "footer"]];

if (only === "all" || only === "desktop") {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  watch(page, "desktop");
  await ready(page);
  for (const [n, f] of STAGES) {
    await heroTo(page, f);
    await page.screenshot({ path: `${OUT}/desktop-1440-hero-stage-${n}.png` });
  }
  await sectionShots(page, "desktop-1440-section", SECTIONS);
  // tall full page below the hero (reveals are already in; lazy images loaded by the pass above)
  const top = await page.evaluate(() => document.querySelector("#intro").getBoundingClientRect().top + scrollY);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await wait(800);
  await page.addStyleTag({ content: "header{visibility:hidden!important}" });
  await page.screenshot({ path: `${OUT}/desktop-1440-fullpage-below-hero.jpg`, type: "jpeg", quality: 85, fullPage: true, clip: { x: 0, y: top, width: 1440, height: h - top } });
  await ctx.close();
}

if (only === "all" || only === "mobile") {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  watch(page, "mobile");
  await ready(page);
  await heroTo(page, 0.08);
  await page.screenshot({ path: `${OUT}/mobile-390-hero-stage-01-start.png` });
  await heroTo(page, 0.86);
  await page.screenshot({ path: `${OUT}/mobile-390-hero-stage-04-finish.png` });
  // open menu over the page
  await page.evaluate(() => document.querySelector("#process").scrollIntoView());
  await wait(1200);
  await page.click('button[aria-label="Open menu"]');
  await page.waitForSelector('[role="dialog"]');
  await wait(1200);
  await page.screenshot({ path: `${OUT}/mobile-390-menu-open.png` });
  await page.keyboard.press("Escape");
  await wait(600);
  for (const [name, sel] of [["01-intro-stats", "#intro"], ["02-process", "#process"], ["03-gallery", "#gallery"], ["04-services", "#services"], ["05-reviews", "#reviews"]]) {
    await page.evaluate((sel) => { const e = document.querySelector(sel); scrollTo(0, e.getBoundingClientRect().top + scrollY - 64); }, sel);
    await wait(1600);
    await page.screenshot({ path: `${OUT}/mobile-390-section-${name}.png` });
  }
  // contact form: the whole form card, partly filled in, header hidden
  await page.evaluate(() => { const e = document.querySelector("#contact form"); scrollTo(0, e.getBoundingClientRect().top + scrollY - 140); });
  await page.waitForSelector('#contact [role="combobox"]', { timeout: 15000 });
  await wait(1200);
  await page.getByLabel("Name").fill("Jordan Rivera");
  await page.getByLabel("Email").fill("jordan@example.com");
  await page.getByRole("combobox", { name: "Project type" }).click();
  await page.getByRole("option", { name: "Pool + spa" }).click();
  await wait(400);
  await page.addStyleTag({ content: "header{visibility:hidden!important}" });
  await page.locator("#contact .rounded-lg").first().screenshot({ path: `${OUT}/mobile-390-contact-form.png` });
  await page.evaluate(() => document.querySelectorAll("style").forEach((s) => s.textContent.includes("header{visibility:hidden") && s.remove()));
  await page.locator("#contact").screenshot({ path: `${OUT}/mobile-390-section-06-contact-full.png` });
  await ctx.close();
}

if (only === "all" || only === "video") {
  const vdir = "/tmp/sereno-video";
  fs.rmSync(vdir, { recursive: true, force: true });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: vdir, size: { width: 1440, height: 900 } } });
  const page = await ctx.newPage();
  watch(page, "video");
  const t0 = Date.now();
  await ready(page);
  await page.evaluate(() => scrollTo(0, 0));
  await wait(1500);
  const startAt = (Date.now() - t0) / 1000;
  // eased scroll helper (rAF, easeInOutCubic)
  const glide = (to, ms) => page.evaluate(({ to, ms }) => new Promise((res) => {
    const from = scrollY, t1 = performance.now();
    const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
    const step = (now) => { const p = Math.min(1, (now - t1) / ms); scrollTo(0, from + (to - from) * ease(p)); p < 1 ? requestAnimationFrame(step) : res(); };
    requestAnimationFrame(step);
  }), { to, ms });
  const heroY = (f) => page.evaluate((f) => { const t = document.querySelector(".hero-track"); return t.offsetTop + (t.offsetHeight - innerHeight) * f; }, f);
  await wait(1000);
  await glide(await heroY(1), 8500); // through all four stages
  await wait(700);
  await glide(await heroY(0.55), 2400); // back up a bit
  await wait(700);
  const ys = await page.evaluate(() => ["#intro", "#process", "#gallery", "#outdoor-living", "#services", "#contact"].map((s) => document.querySelector(s).getBoundingClientRect().top + scrollY));
  await glide(ys[0] - 40, 2600);
  await wait(400);
  await glide(ys[2] + 120, 3000);
  await wait(400);
  await glide(ys[5] - 40, 3800);
  await wait(1100);
  const endAt = (Date.now() - t0) / 1000;
  await ctx.close();
  const f = fs.readdirSync(vdir).find((x) => x.endsWith(".webm"));
  fs.writeFileSync(`${vdir}/cut.json`, JSON.stringify({ file: `${vdir}/${f}`, startAt, endAt }));
  console.log("video", f, startAt, endAt);
}
console.log("errors:", JSON.stringify(errors));
await browser.close();
