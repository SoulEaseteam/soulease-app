// scripts/prerender-routes.mjs
// ────────────────────────────────────────────────────────────────────────
// Round 28s106 — Static per-route <head> + crawlable body prerender.
//
// WHY (not full React SSG): the app is time-aware (concierge mode flips by
// hour) and locale-auto-detecting, so server-rendering the React tree would
// risk hydration mismatches on a live booking site — and we can't hydration-
// test in CI. Instead we bake the SEO payload that actually matters (per-route
// <title>/<meta description>/canonical/OG/Twitter/hreflang + Service &
// Breadcrumb JSON-LD + a crawlable <noscript> body) into static HTML files,
// while the body still boots the exact same SPA. Zero hydration risk.
//
// HOW Vercel serves these: a filesystem file (dist/services/index.html) takes
// precedence over the catch-all rewrite to /index.html, so /services serves
// the tailored file and the SPA still mounts normally. Non-JS crawlers
// (Baidu / Naver / Bing / social unfurlers) — which matter for our CN/JP/KR
// audience — finally get route-specific titles instead of the home default.
//
// Runs as a postbuild step. Operates ONLY on the built dist/index.html as a
// template. Asserts every replacement actually fired, so if index.html ever
// changes shape this fails the build loudly instead of shipping stale meta.
// ────────────────────────────────────────────────────────────────────────

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const ORIGIN = "https://sunred.vip";
const OG_IMAGE =
  "https://res.cloudinary.com/dhzvzvatb/image/fetch/w_1200,h_630,c_fit,b_white,f_jpg,q_auto:best/https://sunred.vip/images/og/sunred-share.svg";

const BUSINESS_ID = `${ORIGIN}/#business`;

// ── Per-route SEO config ──────────────────────────────────────────────────
// Home ("/") keeps the hand-tuned dist/index.html as-is; we only generate the
// service-menu and the four service-detail routes.
const SERVICES = [
  {
    slug: "xSR-Thai",
    name: "Traditional Thai Massage",
    price: 1200,
    short: "Deep muscle tension relief with authentic Thai techniques.",
    long:
      "Authentic Traditional Thai massage delivered to your Bangkok hotel, residence or villa. A licensed female practitioner blends acupressure, deep stretches and rhythmic techniques to ease travel fatigue and restore mobility — in the privacy of your own room.",
  },
  {
    slug: "SR-Aroma",
    name: "Aromatherapy Oil Massage",
    price: 1600,
    short: "Aromatic oil massage for deep body and mind relaxation.",
    long:
      "A calming aromatherapy oil massage delivered to your room in Bangkok. Premium blends — lavender, neroli or sandalwood — paired with steady, soothing strokes that quiet the nervous system and prepare you for deep, restorative sleep.",
  },
  {
    slug: "SR-HJ2200",
    name: "Gentleman's Signature Therapy",
    price: 2200,
    short: "Deep-tissue therapy tailored for active men.",
    long:
      "A focused aromatic-oil session crafted for men — warming aromatherapy with attentive tension-release work, performed by a trained female practitioner in your residence. Unhurried, attentive and entirely paced to your preference.",
  },
  {
    slug: "SR-B2B3200",
    name: "SunRed Therapeutic Experience",
    price: 3200,
    short: "Our premium signature ritual by specialised practitioners.",
    long:
      "SunRed's most refined ritual — a flowing whole-body oil ceremony with premium aromatic blends and gentle Thai-style stretching, reserved for specialised practitioners. A private, unhurried experience delivered to your Bangkok residence.",
  },
];

const DURATIONS = "60 / 90 / 120 min";

// Practitioner roster — KEEP IN SYNC with src/data/therapists.ts (id/name/area).
// Discreet on purpose: name + service area only (no age/body/ethnicity), the
// same register already public on the live profile page + sitemap.
const THERAPISTS = [
  { id: "YuriSunRed", name: "Yuri", area: "Din Daeng · Ratchada" },
  { id: "JimmySunRed", name: "Jimmy", area: "Huai Khwang · RCA" },
  { id: "HamiSunRed", name: "Hami", area: "Huai Khwang" },
  { id: "XingXingSunRed", name: "XingXing", area: "Din Daeng · Ratchada" },
  { id: "BarbieSunRed", name: "Barbie", area: "Lat Phrao · Wang Thonglang" },
  { id: "MiniSunRed", name: "Mini", area: "Huai Khwang · RCA" },
  { id: "JiASunRed", name: "Ji A", area: "Huai Khwang · RCA" },
  { id: "VivianSunRed", name: "Vivian", area: "Huai Khwang · RCA" },
  { id: "NannySunRed", name: "Nanny", area: "Huai Khwang · RCA" },
  { id: "YaYaSunRed", name: "YaYa", area: "Huai Khwang · RCA" },
  { id: "NickySunRed", name: "Nicky", area: "Rama 4 · Silom" },
  { id: "RichieSunRed", name: "Richie", area: "Rama 9" },
];

function serviceJsonLd(s) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${ORIGIN}/services/${s.slug}#service`,
    name: `${s.name} (Outcall) in Bangkok`,
    description: s.long,
    serviceType: "Outcall massage",
    areaServed: { "@type": "City", name: "Bangkok" },
    provider: { "@id": BUSINESS_ID },
    offers: {
      "@type": "Offer",
      priceCurrency: "THB",
      price: String(s.price),
      priceSpecification: {
        "@type": "PriceSpecification",
        priceCurrency: "THB",
        minPrice: String(s.price),
      },
      availability: "https://schema.org/InStock",
      url: `${ORIGIN}/services/${s.slug}`,
    },
  };
}

function breadcrumbJsonLd(items) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}

// ── Route table ─────────────────────────────────────────────────────────
const ROUTES = [
  {
    path: "/services",
    title:
      "Outcall Massage Services in Bangkok · Thai, Aromatherapy & More | SunRed",
    description:
      "Browse SunRed's outcall massage menu delivered to your Bangkok hotel — Traditional Thai (฿1,200), Aromatherapy (฿1,600), Gentleman's Signature (฿2,200) and the premium Therapeutic Experience (฿3,200). 60/90/120 min. EN/中文/日本語/한국어, 24/7.",
    ogTitle: "SunRed Bangkok — Outcall Massage Services & Pricing",
    ogDescription:
      "Thai, Aromatherapy, Gentleman's Signature and Therapeutic Experience — delivered to your Bangkok hotel. Verified practitioners, live availability, 24/7.",
    jsonLd: [
      breadcrumbJsonLd([
        { name: "Home", url: `${ORIGIN}/` },
        { name: "Services", url: `${ORIGIN}/services` },
      ]),
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "SunRed Outcall Massage Services",
        itemListElement: SERVICES.map((s, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `${s.name} (Outcall) in Bangkok`,
          url: `${ORIGIN}/services/${s.slug}`,
        })),
      },
    ],
    noscript: `
        <h1>Outcall Massage Services in Bangkok — SunRed</h1>
        <p>
          Every SunRed service is delivered to your hotel, residence or villa
          across central Bangkok — Sukhumvit, Silom, Asok, Thonglor, Sathorn,
          Phrom Phong, Ekkamai and Ratchada. Verified practitioners, discreet
          arrival, multilingual concierge (English, 中文, 日本語, 한국어), 24/7.
        </p>
        <h2>Service menu &amp; pricing</h2>
        <ul>
${SERVICES.map(
  (s) =>
    `          <li><a href="${ORIGIN}/services/${s.slug}">${s.name}</a> — from ฿${s.price.toLocaleString(
      "en-US"
    )} (${DURATIONS}). ${s.short}</li>`
).join("\n")}
        </ul>
        <h2>Book or ask the concierge</h2>
        <ul>
          <li><a href="${ORIGIN}/">Home — live availability</a></li>
          <li><a href="https://lin.ee/uqvdwWt">LINE</a></li>
          <li><a href="https://t.me/SunRedvip_bkk">Telegram</a></li>
          <li><a href="https://wa.me/66634350987">WhatsApp</a></li>
        </ul>`,
  },
  ...SERVICES.map((s) => ({
    path: `/services/${s.slug}`,
    title: `${s.name} (Outcall) in Bangkok — from ฿${s.price.toLocaleString(
      "en-US"
    )} | SunRed`,
    description: `${s.long} ${DURATIONS}, from ฿${s.price.toLocaleString(
      "en-US"
    )}. EN/中文/日本語/한국어, 24/7 concierge.`,
    ogTitle: `${s.name} — Outcall Massage in Bangkok | SunRed`,
    ogDescription: `${s.short} From ฿${s.price.toLocaleString(
      "en-US"
    )} (${DURATIONS}). Delivered to your hotel, 24/7.`,
    jsonLd: [
      serviceJsonLd(s),
      breadcrumbJsonLd([
        { name: "Home", url: `${ORIGIN}/` },
        { name: "Services", url: `${ORIGIN}/services` },
        { name: s.name, url: `${ORIGIN}/services/${s.slug}` },
      ]),
    ],
    noscript: `
        <h1>${s.name} (Outcall) in Bangkok — SunRed</h1>
        <p>${s.long}</p>
        <p><strong>From ฿${s.price.toLocaleString(
          "en-US"
        )}</strong> · ${DURATIONS} · delivered to your hotel, residence or villa
          across central Bangkok (Sukhumvit, Silom, Asok, Thonglor, Sathorn,
          Phrom Phong, Ekkamai, Ratchada). Verified practitioners, discreet
          arrival, multilingual concierge, 24/7.</p>
        <h2>Reserve or ask the concierge</h2>
        <ul>
          <li><a href="${ORIGIN}/services">All services</a></li>
          <li><a href="${ORIGIN}/">Home — live availability</a></li>
          <li><a href="https://lin.ee/uqvdwWt">LINE</a></li>
          <li><a href="https://t.me/SunRedvip_bkk">Telegram</a></li>
          <li><a href="https://wa.me/66634350987">WhatsApp</a></li>
        </ul>`,
  })),
  ...THERAPISTS.map((t) => ({
    path: `/therapists/${t.id}`,
    title: `${t.name} — Outcall Massage Practitioner in Bangkok | SunRed`,
    description: `Book ${t.name}, a verified SunRed outcall massage practitioner serving ${t.area} and central Bangkok. Thai, aromatherapy & signature therapies delivered to your hotel or residence — discreet, verified, available 24/7. EN/中文/日本語/한국어.`,
    ogTitle: `${t.name} — Verified Outcall Massage Practitioner, Bangkok`,
    ogDescription: `Verified SunRed practitioner serving ${t.area} & central Bangkok. Delivered to your hotel, discreet, 24/7.`,
    jsonLd: [
      breadcrumbJsonLd([
        { name: "Home", url: `${ORIGIN}/` },
        { name: "Practitioners", url: `${ORIGIN}/` },
        { name: t.name, url: `${ORIGIN}/therapists/${t.id}` },
      ]),
    ],
    noscript: `
        <h1>${t.name} — Outcall Massage Practitioner in Bangkok</h1>
        <p>${t.name} is a verified SunRed outcall massage practitioner serving
          ${t.area} and central Bangkok. Sessions are delivered to your hotel,
          residence or villa — discreet arrival, verified identity, multilingual
          concierge (English, 中文, 日本語, 한국어), available 24/7.</p>
        <h2>Reserve or ask the concierge</h2>
        <ul>
          <li><a href="${ORIGIN}/services">Browse all services &amp; pricing</a></li>
          <li><a href="${ORIGIN}/">Home — live availability</a></li>
          <li><a href="https://lin.ee/uqvdwWt">LINE</a></li>
          <li><a href="https://t.me/SunRedvip_bkk">Telegram</a></li>
          <li><a href="https://wa.me/66634350987">WhatsApp</a></li>
        </ul>`,
  })),
];

// ── Replacement helpers (assert every swap fires) ──────────────────────────
function replaceOnce(html, regex, replacement, label) {
  if (!regex.test(html)) {
    throw new Error(
      `[prerender] anchor not found for "${label}" — index.html shape changed; update scripts/prerender-routes.mjs`
    );
  }
  return html.replace(regex, () => replacement);
}

function hreflangBlock(routePath) {
  // Localized variants use ?lang=; canonical/x-default point at the bare route.
  const base = `${ORIGIN}${routePath}`;
  return [
    `<link rel="alternate" hreflang="en" href="${base}" />`,
    `<link rel="alternate" hreflang="th" href="${base}?lang=th" />`,
    `<link rel="alternate" hreflang="zh" href="${base}?lang=zh" />`,
    `<link rel="alternate" hreflang="zh-CN" href="${base}?lang=zh" />`,
    `<link rel="alternate" hreflang="zh-TW" href="${base}?lang=zh" />`,
    `<link rel="alternate" hreflang="ja" href="${base}?lang=ja" />`,
    `<link rel="alternate" hreflang="ko" href="${base}?lang=ko" />`,
    `<link rel="alternate" hreflang="x-default" href="${base}" />`,
  ].join("\n    ");
}

function buildRouteHtml(template, route) {
  const url = `${ORIGIN}${route.path}`;
  let html = template;

  html = replaceOnce(
    html,
    /<title>[\s\S]*?<\/title>/,
    `<title>${route.title}</title>`,
    "title"
  );
  html = replaceOnce(
    html,
    /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/>/,
    `<meta name="description" content="${route.description}" />`,
    "meta description"
  );
  html = replaceOnce(
    html,
    /<link rel="canonical" href="[^"]*" \/>/,
    `<link rel="canonical" href="${url}" />`,
    "canonical"
  );
  html = replaceOnce(
    html,
    /<meta property="og:url" content="[^"]*" \/>/,
    `<meta property="og:url" content="${url}" />`,
    "og:url"
  );
  html = replaceOnce(
    html,
    /<meta property="og:title" content="[^"]*" \/>/,
    `<meta property="og:title" content="${route.ogTitle}" />`,
    "og:title"
  );
  html = replaceOnce(
    html,
    /<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/>/,
    `<meta property="og:description" content="${route.ogDescription}" />`,
    "og:description"
  );
  html = replaceOnce(
    html,
    /<meta name="twitter:title" content="[^"]*" \/>/,
    `<meta name="twitter:title" content="${route.ogTitle}" />`,
    "twitter:title"
  );
  html = replaceOnce(
    html,
    /<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/>/,
    `<meta name="twitter:description" content="${route.ogDescription}" />`,
    "twitter:description"
  );
  // hreflang block — from the first `hreflang="en"` link through x-default.
  html = replaceOnce(
    html,
    /<link rel="alternate" hreflang="en"[\s\S]*?hreflang="x-default" href="[^"]*" \/>/,
    hreflangBlock(route.path),
    "hreflang block"
  );
  // Inject route JSON-LD just before </head>.
  const ld = route.jsonLd
    .map(
      (obj) =>
        `<script type="application/ld+json">\n${JSON.stringify(
          obj,
          null,
          2
        )}\n</script>`
    )
    .join("\n    ");
  html = replaceOnce(
    html,
    /<\/head>/,
    `    ${ld}\n  </head>`,
    "</head>"
  );
  // Swap the crawlable body <noscript> (the one wrapping <main>).
  html = replaceOnce(
    html,
    /<noscript>\s*<main[\s\S]*?<\/main>\s*<\/noscript>/,
    `<noscript>\n      <main style="max-width:680px;margin:0 auto;padding:24px;font-family:Georgia,serif;color:#2a1a14;line-height:1.6">${route.noscript}\n      </main>\n    </noscript>`,
    "body noscript"
  );

  // Final sanity: the new title must be present.
  if (!html.includes(`<title>${route.title}</title>`)) {
    throw new Error(`[prerender] title swap verification failed for ${route.path}`);
  }
  return html;
}

async function main() {
  const templatePath = join(DIST, "index.html");
  if (!existsSync(templatePath)) {
    throw new Error(
      `[prerender] ${templatePath} not found — run "vite build" first`
    );
  }
  const template = await readFile(templatePath, "utf8");

  let count = 0;
  for (const route of ROUTES) {
    const html = buildRouteHtml(template, route);
    const outDir = join(DIST, route.path.replace(/^\//, ""));
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, "index.html"), html, "utf8");
    count++;
    // eslint-disable-next-line no-console
    console.log(`  ✓ ${route.path}/index.html`);
  }
  // eslint-disable-next-line no-console
  console.log(`[prerender] wrote ${count} static route file(s).`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err.message || err);
  process.exit(1);
});
