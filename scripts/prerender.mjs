// Prerender the single page to static HTML (react-dom/server renderToString),
// inject font preloads + JSON-LD, and write robots.txt / sitemap.xml.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadEnv } from "vite";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dist = path.join(root, "dist");
const ssrDir = path.join(root, "dist-ssr");
// The ONE source of the site URL: VITE_SITE_URL, resolved exactly like Vite does (.env, .env.local,
// .env.[mode], .env.[mode].local, then process env). No hardcoded fallback: a missing value fails the build.
const MODE = process.env.MODE || "production";
const env = loadEnv(MODE, root, "VITE_");
const SITE_URL = (process.env.VITE_SITE_URL || env.VITE_SITE_URL || "").trim().replace(/\/$/, "");
if (!/^https?:\/\/[^/]+/.test(SITE_URL)) throw new Error("VITE_SITE_URL is missing or invalid (see .env.example)");

const { render } = await import(pathToFileURL(path.join(ssrDir, "entry-server.js")).href);
const appHtml = render();

let html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const assets = fs.readdirSync(path.join(dist, "assets"));
const font = (re) => assets.find((f) => re.test(f));
const preloads = [font(/^fraunces-latin-400-normal.*\.woff2$/), font(/^inter-latin-400-normal.*\.woff2$/)]
  .filter(Boolean)
  .map((f) => `<link rel="preload" href="/assets/${f}" as="font" type="font/woff2" crossorigin />`)
  .join("\n    ");

// PLACEHOLDER business data. No aggregateRating / Review markup until real, verifiable reviews exist.
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "HomeAndConstructionBusiness",
  "@id": `${SITE_URL}/#business`,
  name: "Sereno Pools",
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/apple-touch-icon.png`,
  image: `${SITE_URL}/og-image.jpg`,
  description:
    "Sereno Pools designs and builds custom pools, spas, and outdoor living spaces across Austin, TX.",
  telephone: "+1-512-555-0142",
  email: "hello@serenopools.com",
  priceRange: "$$$",
  address: {
    "@type": "PostalAddress",
    streetAddress: "1100 Placeholder Ave, Suite 200",
    addressLocality: "Austin",
    addressRegion: "TX",
    postalCode: "78701",
    addressCountry: "US",
  },
  areaServed: [
    { "@type": "City", name: "Austin" },
    { "@type": "City", name: "Westlake Hills" },
    { "@type": "City", name: "Lakeway" },
    { "@type": "City", name: "Bee Cave" },
    { "@type": "City", name: "Dripping Springs" },
  ],
  openingHoursSpecification: [
    { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "08:00", closes: "18:00" },
    { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "09:00", closes: "14:00" },
  ],
  sameAs: ["https://www.instagram.com/serenopools", "https://www.facebook.com/serenopools"],
};

// Inline the (small) stylesheet to remove the render-blocking request.
html = html.replace(/<link rel="stylesheet"[^>]*href="\/assets\/([^"]+\.css)"[^>]*>/, (_m, file) => {
  const css = fs.readFileSync(path.join(dist, "assets", file), "utf8");
  return `<style>${css}</style>`;
});

html = html
  .replace("<!--app-html-->", appHtml)
  .replace("<!--preload-fonts-->", preloads)
  .replace("<!--json-ld-->", `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`)
  .replaceAll("__SITE_URL__", SITE_URL);

if (!appHtml || appHtml.length < 1000) throw new Error("Prerender produced empty HTML");
fs.writeFileSync(path.join(dist, "index.html"), html);
fs.writeFileSync(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
fs.writeFileSync(
  path.join(dist, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>${SITE_URL}/</loc>\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n  </url>\n</urlset>\n`,
);
fs.rmSync(ssrDir, { recursive: true, force: true });
console.log(`prerendered index.html (${(html.length / 1024).toFixed(1)} KB), robots.txt, sitemap.xml`);
