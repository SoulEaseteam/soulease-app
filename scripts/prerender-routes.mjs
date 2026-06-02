// scripts/prerender-routes.mjs
// ────────────────────────────────────────────────────────────────────────
// Round 28s106 / 28s108 / 28s109 — Static per-route <head> + crawlable body
// prerender, now multilingual (en / zh / ja / ko).
//
// WHY (not full React SSG): these files are NOT server-rendered React. Each
// is a static HTML shell (route-specific <head> + crawlable <noscript>) that
// boots the exact same CSR SPA. There is no hydration step, so there is no
// SSR/CSR hydration-mismatch risk — the React app always mounts fresh on the
// client, identical to today.
//
// WHAT it produces:
//   • en  → dist/<route>/index.html              (canonical, default)
//   • zh  → dist/zh/<route>/index.html            (Baidu / 中文 tourists)
//   • ja  → dist/ja/<route>/index.html            (日本語)
//   • ko  → dist/ko/<route>/index.html            (Naver / 한국어)
// for the 5 service routes (the money pages). Therapist routes stay en-only
// (avoid thin localized duplicates). Localized files carry localized
// <title>/description/OG/JSON-LD/<noscript> + <html lang> + self canonical +
// a shared hreflang cluster (path-based — Google's recommended form).
//
// HOW it's served + reached: Vercel serves the filesystem file ahead of the
// SPA catch-all rewrite, so /zh/services/xSR-Thai serves the localized shell.
// A human landing there boots the SPA, which (via the additive /zh|/ja|/ko/*
// redirect in App.tsx) switches i18n language and navigates to the working
// de-prefixed route. Crawlers index the localized URL via its self canonical.
//
// Euphemism discipline (CLAUDE.md): the men's / B2B services are localized
// with the SAME discreet register as the English copy — never literal.
//
// Runs as a postbuild step on the built dist/index.html template. Asserts
// every head swap fires, so an index.html shape change fails the build loudly.
// ────────────────────────────────────────────────────────────────────────

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const DIST = join(ROOT, "dist");
const ORIGIN = "https://sunred.vip";
const BUSINESS_ID = `${ORIGIN}/#business`;
const AREAS_EN =
  "Sukhumvit, Silom, Asok, Thonglor, Sathorn, Phrom Phong, Ekkamai and Ratchada";

const fmt = (n) => n.toLocaleString("en-US");

// ── Service catalogue (slug + price + per-locale copy) ─────────────────────
// `name`/`blurb` are localized; euphemisms preserved (men's = discreet,
// B2B = "whole-body oil" register, never explicit).
const SERVICES = [
  {
    slug: "xSR-Thai",
    price: 1200,
    en: {
      name: "Traditional Thai Massage",
      blurb:
        "Authentic Traditional Thai massage delivered to your Bangkok hotel, residence or villa. A licensed female practitioner blends acupressure, deep stretches and rhythmic techniques to ease travel fatigue and restore mobility — in the privacy of your own room.",
    },
    zh: {
      name: "泰式按摩",
      blurb:
        "正宗泰式按摩上门服务，送达您在曼谷的酒店、公寓或别墅。专业持证女性技师融合指压、深度伸展与节奏手法，缓解旅途疲劳、舒缓肌肉、恢复身体平衡——在您私密的房间内进行。",
    },
    ja: {
      name: "タイ古式マッサージ",
      blurb:
        "本格タイ古式マッサージをバンコクのホテル・ご滞在先へ出張でお届け。経験豊富な女性セラピストが指圧・ストレッチ・リズミカルな手技で、旅の疲れと筋肉の緊張を丁寧にほぐします。",
    },
    ko: {
      name: "타이 마사지",
      blurb:
        "정통 타이 마사지를 방콕 호텔·레지던스로 출장 제공합니다. 숙련된 여성 테라피스트가 지압과 스트레칭으로 여행 피로와 근육 긴장을 풀어드립니다.",
    },
  },
  {
    slug: "SR-Aroma",
    price: 1600,
    en: {
      name: "Aromatherapy Oil Massage",
      blurb:
        "A calming aromatherapy oil massage delivered to your room in Bangkok. Premium blends — lavender, neroli or sandalwood — paired with steady, soothing strokes that quiet the nervous system and prepare you for deep, restorative sleep.",
    },
    zh: {
      name: "芳香精油按摩",
      blurb:
        "温和的芳香精油按摩，上门送达您在曼谷的房间。薰衣草、橙花或檀香高级精油，配合舒缓稳定的手法，安抚神经、助您深度放松入眠。",
    },
    ja: {
      name: "アロマオイルマッサージ",
      blurb:
        "お部屋でくつろぐアロマオイルマッサージをバンコクへ出張。ラベンダー・ネロリ・サンダルウッドの上質ブレンドと穏やかな手技で、深いリラックスと安眠へ導きます。",
    },
    ko: {
      name: "아로마 오일 마사지",
      blurb:
        "객실에서 즐기는 아로마 오일 마사지를 방콕으로 출장 제공합니다. 라벤더·네롤리·샌달우드 프리미엄 블렌드로 깊은 휴식과 숙면을 선사합니다.",
    },
  },
  {
    slug: "SR-HJ2200",
    price: 2200,
    en: {
      name: "Gentleman's Signature Therapy",
      blurb:
        "A focused aromatic-oil session crafted for men — warming aromatherapy with attentive tension-release work, performed by a trained female practitioner in your residence. Unhurried, attentive and entirely paced to your preference.",
    },
    zh: {
      name: "尊享男士理疗",
      blurb:
        "专为男士打造的温热精油理疗，由训练有素的女性技师上门服务。温和芳疗结合细致的舒压手法，节奏完全依您偏好，私密、专注、不受打扰。",
    },
    ja: {
      name: "メンズ・シグネチャートリートメント",
      blurb:
        "男性のための温かなアロマオイル施術。経験豊富な女性セラピストがご滞在先へ出張し、丁寧な疲労回復ケアを、あなたのペースに合わせてゆったりとお届けします。",
    },
    ko: {
      name: "젠틀맨 시그니처 테라피",
      blurb:
        "남성을 위한 따뜻한 아로마 오일 테라피. 숙련된 여성 테라피스트가 출장으로, 섬세한 이완 케어를 당신의 페이스에 맞춰 정성껏 제공합니다.",
    },
  },
  {
    slug: "SR-B2B3200",
    price: 3200,
    en: {
      name: "SunRed Therapeutic Experience",
      blurb:
        "SunRed's most refined ritual — a flowing whole-body oil ceremony with premium aromatic blends and gentle Thai-style stretching, reserved for specialised practitioners. A private, unhurried experience delivered to your Bangkok residence.",
    },
    zh: {
      name: "SunRed 尊享理疗体验",
      blurb:
        "SunRed 最精致的理疗仪式——流畅的全身精油护理，融合高级芳香精油与轻柔的泰式伸展，仅由资深专属技师呈现。私密、从容，上门送达您在曼谷的住所。",
    },
    ja: {
      name: "SunRed セラピー・エクスペリエンス",
      blurb:
        "SunRed の最も洗練された施術——上質なアロマと優しいタイ式ストレッチを組み合わせた全身オイルケア。専門のセラピストのみが担当する、プライベートで贅沢なひとときを出張でお届けします。",
    },
    ko: {
      name: "SunRed 테라퓨틱 익스피리언스",
      blurb:
        "SunRed의 가장 섬세한 케어 — 프리미엄 아로마와 부드러운 타이식 스트레칭을 결합한 전신 오일 케어. 전문 테라피스트가 담당하는 프라이빗한 경험을 출장으로 제공합니다.",
    },
  },
];

// ── Per-locale boilerplate ─────────────────────────────────────────────────
const LOC = {
  en: {
    htmlLang: "en",
    ogLocale: "en_US",
    durations: "60 / 90 / 120 min",
    fromPrice: (p) => `from ฿${fmt(p)}`,
    brand: "SunRed",
    servicesTitle:
      "Outcall Massage Services in Bangkok · Thai, Aromatherapy & More | SunRed",
    servicesDesc:
      "Browse SunRed's outcall massage menu delivered to your Bangkok hotel — Traditional Thai (฿1,200), Aromatherapy (฿1,600), Gentleman's Signature (฿2,200) and the premium Therapeutic Experience (฿3,200). 60/90/120 min. EN/中文/日本語/한국어, 24/7.",
    servicesOgTitle: "SunRed Bangkok — Outcall Massage Services & Pricing",
    servicesOgDesc:
      "Thai, Aromatherapy, Gentleman's Signature and Therapeutic Experience — delivered to your Bangkok hotel. Verified practitioners, live availability, 24/7.",
    serviceTitle: (n, p) =>
      `${n} (Outcall) in Bangkok — from ฿${fmt(p)} | SunRed`,
    serviceOgTitle: (n) => `${n} — Outcall Massage in Bangkok | SunRed`,
    serviceOgDesc: (n, p) =>
      `${n} from ฿${fmt(p)}, delivered to your hotel. Verified, discreet, 24/7.`,
    descTail: (p) =>
      ` 60/90/120 min, from ฿${fmt(p)}. EN/中文/日本語/한국어, 24/7 concierge.`,
    servicesH1: "Outcall Massage Services in Bangkok — SunRed",
    servicesIntro:
      "Every SunRed service is delivered to your hotel, residence or villa across central Bangkok — Sukhumvit, Silom, Asok, Thonglor, Sathorn, Phrom Phong, Ekkamai and Ratchada. Verified practitioners, discreet arrival, multilingual concierge (English, 中文, 日本語, 한국어), 24/7.",
    menuHeading: "Service menu & pricing",
    reserveHeading: "Reserve or ask the concierge",
    allServices: "All services",
    homeLink: "Home — live availability",
    deliveredLine: (p) =>
      `From ฿${fmt(p)} · 60/90/120 min · delivered to your hotel, residence or villa across central Bangkok (${AREAS_EN}). Verified practitioners, discreet arrival, multilingual concierge, 24/7.`,
  },
  zh: {
    htmlLang: "zh",
    ogLocale: "zh_CN",
    durations: "60 / 90 / 120 分钟",
    fromPrice: (p) => `฿${fmt(p)} 起`,
    brand: "SunRed",
    servicesTitle: "曼谷上门按摩服务与价格 — 泰式 / 芳疗 / 尊享理疗 | SunRed",
    servicesDesc:
      "SunRed 曼谷上门按摩菜单，送达您的酒店：泰式按摩（฿1,200）、芳香精油按摩（฿1,600）、尊享男士理疗（฿2,200）及尊享理疗体验（฿3,200）。60/90/120 分钟，全天候24小时，支持微信支付与支付宝。",
    servicesOgTitle: "SunRed 曼谷 — 上门按摩服务与价格",
    servicesOgDesc:
      "泰式、芳疗、男士理疗与尊享体验，上门送达您的曼谷酒店。已认证技师、实时空闲、全天候24小时。",
    serviceTitle: (n, p) => `${n}（上门）曼谷 — ฿${fmt(p)} 起 | SunRed`,
    serviceOgTitle: (n) => `${n} — 曼谷上门按摩 | SunRed`,
    serviceOgDesc: (n, p) =>
      `${n}，฿${fmt(p)} 起，上门送达酒店。已认证、私密、全天候24小时。`,
    descTail: (p) =>
      ` 60/90/120 分钟，฿${fmt(p)} 起。支持微信/支付宝，全天候24小时礼宾服务。`,
    servicesH1: "曼谷上门按摩服务 — SunRed",
    servicesIntro:
      "SunRed 所有服务均上门送达您在曼谷市中心的酒店、公寓或别墅——Sukhumvit、Silom、Asok、Thonglor、Sathorn、Phrom Phong、Ekkamai、Ratchada 等区域。已认证技师、私密上门、多语言礼宾（English、中文、日本語、한국어），全天候24小时。",
    menuHeading: "服务菜单与价格",
    reserveHeading: "预订或咨询礼宾",
    allServices: "全部服务",
    homeLink: "首页 — 实时空闲",
    deliveredLine: (p) =>
      `฿${fmt(p)} 起 · 60/90/120 分钟 · 上门送达您在曼谷市中心的酒店、公寓或别墅（Sukhumvit、Silom、Asok、Thonglor 等）。已认证技师、私密上门、多语言礼宾、全天候24小时。`,
  },
  ja: {
    htmlLang: "ja",
    ogLocale: "ja_JP",
    durations: "60 / 90 / 120分",
    fromPrice: (p) => `฿${fmt(p)}〜`,
    brand: "SunRed",
    servicesTitle:
      "バンコク出張マッサージ メニュー＆料金 — タイ古式 / アロマ / メンズ | SunRed",
    servicesDesc:
      "SunRed バンコク出張マッサージのメニュー。ホテルへお届け：タイ古式（฿1,200）、アロマ（฿1,600）、メンズ・シグネチャー（฿2,200）、セラピー・エクスペリエンス（฿3,200）。60/90/120分、24時間対応。",
    servicesOgTitle: "SunRed バンコク — 出張マッサージ メニュー＆料金",
    servicesOgDesc:
      "タイ古式・アロマ・メンズ・セラピーをバンコクのホテルへ出張。認定セラピスト、リアルタイム予約、24時間対応。",
    serviceTitle: (n, p) => `${n}（出張）バンコク — ฿${fmt(p)}〜 | SunRed`,
    serviceOgTitle: (n) => `${n} — バンコク出張マッサージ | SunRed`,
    serviceOgDesc: (n, p) =>
      `${n} ฿${fmt(p)}〜、ホテルへ出張。認定済・プライベート・24時間対応。`,
    descTail: (p) =>
      ` 60/90/120分、฿${fmt(p)}〜。EN/中文/日本語/한국어、24時間コンシェルジュ対応。`,
    servicesH1: "バンコク出張マッサージ — SunRed",
    servicesIntro:
      "SunRed の全サービスは、バンコク中心部のホテル・ご滞在先へ出張でお届けします（Sukhumvit、Silom、Asok、Thonglor、Sathorn、Phrom Phong、Ekkamai、Ratchada など）。認定セラピスト、プライベートな訪問、多言語コンシェルジュ（English、中文、日本語、한국어）、24時間対応。",
    menuHeading: "サービスメニューと料金",
    reserveHeading: "予約・コンシェルジュへ相談",
    allServices: "すべてのサービス",
    homeLink: "ホーム — リアルタイム空き状況",
    deliveredLine: (p) =>
      `฿${fmt(p)}〜 · 60/90/120分 · バンコク中心部のホテル・ご滞在先へ出張（Sukhumvit、Silom、Asok、Thonglor など）。認定セラピスト、プライベートな訪問、多言語コンシェルジュ、24時間対応。`,
  },
  ko: {
    htmlLang: "ko",
    ogLocale: "ko_KR",
    durations: "60 / 90 / 120분",
    fromPrice: (p) => `฿${fmt(p)}부터`,
    brand: "SunRed",
    servicesTitle: "방콕 출장 마사지 서비스 & 가격 — 타이 / 아로마 / 시그니처 | SunRed",
    servicesDesc:
      "SunRed 방콕 출장 마사지 메뉴, 호텔로 방문: 타이 마사지(฿1,200), 아로마(฿1,600), 젠틀맨 시그니처(฿2,200), 테라퓨틱 익스피리언스(฿3,200). 60/90/120분, 24시간 운영.",
    servicesOgTitle: "SunRed 방콕 — 출장 마사지 서비스 & 가격",
    servicesOgDesc:
      "타이·아로마·시그니처·테라퓨틱을 방콕 호텔로 출장. 인증 테라피스트, 실시간 예약, 24시간.",
    serviceTitle: (n, p) => `${n} (출장) 방콕 — ฿${fmt(p)}부터 | SunRed`,
    serviceOgTitle: (n) => `${n} — 방콕 출장 마사지 | SunRed`,
    serviceOgDesc: (n, p) =>
      `${n} ฿${fmt(p)}부터, 호텔로 방문. 인증·프라이빗·24시간.`,
    descTail: (p) =>
      ` 60/90/120분, ฿${fmt(p)}부터. EN/中文/日本語/한국어, 24시간 컨시어지.`,
    servicesH1: "방콕 출장 마사지 서비스 — SunRed",
    servicesIntro:
      "SunRed의 모든 서비스는 방콕 시내 호텔·레지던스로 방문합니다 — Sukhumvit, Silom, Asok, Thonglor, Sathorn, Phrom Phong, Ekkamai, Ratchada 등. 인증 테라피스트, 프라이빗한 방문, 다국어 컨시어지(English, 中文, 日本語, 한국어), 24시간.",
    menuHeading: "서비스 메뉴 & 가격",
    reserveHeading: "예약 또는 컨시어지 문의",
    allServices: "전체 서비스",
    homeLink: "홈 — 실시간 예약 가능",
    deliveredLine: (p) =>
      `฿${fmt(p)}부터 · 60/90/120분 · 방콕 시내 호텔·레지던스로 방문(Sukhumvit, Silom, Asok, Thonglor 등). 인증 테라피스트, 프라이빗한 방문, 다국어 컨시어지, 24시간.`,
  },
};

const LOCALES = ["en", "zh", "ja", "ko"];
const localePrefix = (lang) => (lang === "en" ? "" : `/${lang}`);

// ── JSON-LD ────────────────────────────────────────────────────────────────
function serviceJsonLd(s, lang, locPath) {
  const c = s[lang];
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${ORIGIN}${locPath}#service`,
    name: c.name,
    description: c.blurb,
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
      url: `${ORIGIN}${locPath}`,
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

// ── Route table builder ────────────────────────────────────────────────────
function serviceRoutes() {
  const routes = [];
  for (const lang of LOCALES) {
    const L = LOC[lang];
    const pfx = localePrefix(lang);
    // /services menu
    routes.push({
      path: `${pfx}/services`,
      canonicalPath: `${pfx}/services`,
      hreflangBase: "/services",
      htmlLang: L.htmlLang,
      ogLocale: L.ogLocale,
      title: L.servicesTitle,
      description: L.servicesDesc,
      ogTitle: L.servicesOgTitle,
      ogDescription: L.servicesOgDesc,
      jsonLd: [
        breadcrumbJsonLd([
          { name: L.brand, url: `${ORIGIN}/` },
          { name: "Services", url: `${ORIGIN}${pfx}/services` },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: L.servicesH1,
          itemListElement: SERVICES.map((s, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: s[lang].name,
            url: `${ORIGIN}${pfx}/services/${s.slug}`,
          })),
        },
      ],
      noscript: `
        <h1>${L.servicesH1}</h1>
        <p>${L.servicesIntro}</p>
        <h2>${L.menuHeading}</h2>
        <ul>
${SERVICES.map(
  (s) =>
    `          <li><a href="${ORIGIN}${pfx}/services/${s.slug}">${s[lang].name}</a> — ${L.fromPrice(
      s.price
    )} (${L.durations}). ${s[lang].blurb}</li>`
).join("\n")}
        </ul>
        <h2>${L.reserveHeading}</h2>
        <ul>
          <li><a href="${ORIGIN}${pfx}/">${L.homeLink}</a></li>
          <li><a href="https://lin.ee/uqvdwWt">LINE</a></li>
          <li><a href="https://t.me/SunRedvip_bkk">Telegram</a></li>
          <li><a href="https://wa.me/66634350987">WhatsApp</a></li>
        </ul>`,
    });
    // /services/:slug
    for (const s of SERVICES) {
      const c = s[lang];
      const locPath = `${pfx}/services/${s.slug}`;
      routes.push({
        path: locPath,
        canonicalPath: locPath,
        hreflangBase: `/services/${s.slug}`,
        htmlLang: L.htmlLang,
        ogLocale: L.ogLocale,
        title: L.serviceTitle(c.name, s.price),
        description: `${c.blurb}${L.descTail(s.price)}`,
        ogTitle: L.serviceOgTitle(c.name),
        ogDescription: L.serviceOgDesc(c.name, s.price),
        jsonLd: [
          serviceJsonLd(s, lang, locPath),
          breadcrumbJsonLd([
            { name: L.brand, url: `${ORIGIN}/` },
            { name: "Services", url: `${ORIGIN}${pfx}/services` },
            { name: c.name, url: `${ORIGIN}${locPath}` },
          ]),
        ],
        noscript: `
        <h1>${c.name} — ${L.htmlLang === "en" ? "Outcall Massage in Bangkok" : L.servicesH1}</h1>
        <p>${c.blurb}</p>
        <p><strong>${L.deliveredLine(s.price)}</strong></p>
        <h2>${L.reserveHeading}</h2>
        <ul>
          <li><a href="${ORIGIN}${pfx}/services">${L.allServices}</a></li>
          <li><a href="${ORIGIN}${pfx}/">${L.homeLink}</a></li>
          <li><a href="https://lin.ee/uqvdwWt">LINE</a></li>
          <li><a href="https://t.me/SunRedvip_bkk">Telegram</a></li>
          <li><a href="https://wa.me/66634350987">WhatsApp</a></li>
        </ul>`,
      });
    }
  }
  return routes;
}

// Practitioner roster — en only (KEEP IN SYNC with src/data/therapists.ts).
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

function therapistRoutes() {
  return THERAPISTS.map((t) => ({
    path: `/therapists/${t.id}`,
    canonicalPath: `/therapists/${t.id}`,
    hreflangBase: null, // en-only; no localized cluster
    htmlLang: "en",
    ogLocale: "en_US",
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
  }));
}

// ── Localized home pages (zh / ja / ko) ────────────────────────────────────
// The EN home is dist/index.html itself (edited at source, not generated here).
// Real visitors hitting /zh|/ja|/ko are redirected to / by App.tsx's
// LocaleEntryRedirect; these static shells exist so JS-light crawlers (Baidu,
// Naver) get a localized landing page on the most important URL, with a
// path-based hreflang cluster consistent with the localized /services pages.
const HOME_COPY = {
  zh: {
    title: "曼谷上门按摩 24小时 · 送达酒店 — 泰式 / 精油 / 尊享理疗 | SunRed",
    desc: "SunRed 曼谷高端上门按摩，认证女性技师送达您的酒店、公寓或别墅 — Sukhumvit、Silom、Asok、Thonglor 等核心地段。泰式、芳香精油、尊享男士理疗。实时空闲、全天候24小时、支持微信支付与支付宝。",
    ogTitle: "SunRed 曼谷 — 24小时上门按摩",
    ogDesc:
      "认证技师送达您的曼谷酒店、公寓或别墅。泰式·精油·尊享理疗。实时空闲、全天候24小时。",
    h1: "曼谷上门按摩 — 送达您的酒店、公寓或别墅",
    crumb: "首页",
  },
  ja: {
    title:
      "バンコク出張マッサージ 24時間 · ホテルへお届け — タイ古式 / アロマ / メンズ | SunRed",
    desc: "SunRed バンコクの高級出張マッサージ。認定女性セラピストがホテル・ご滞在先へ訪問（Sukhumvit、Silom、Asok、Thonglor など）。タイ古式・アロマ・メンズシグネチャー。リアルタイム予約、24時間対応。",
    ogTitle: "SunRed バンコク — 24時間出張マッサージ",
    ogDesc:
      "認定セラピストがバンコクのホテルへ出張。タイ古式・アロマ・メンズ。リアルタイム予約、24時間対応。",
    h1: "バンコク出張マッサージ — ホテル・ご滞在先へお届け",
    crumb: "ホーム",
  },
  ko: {
    title:
      "방콕 출장 마사지 24시간 · 호텔로 방문 — 타이 / 아로마 / 시그니처 | SunRed",
    desc: "SunRed 방콕 프리미엄 출장 마사지. 인증 여성 테라피스트가 호텔·레지던스로 방문 (Sukhumvit, Silom, Asok, Thonglor 등). 타이·아로마·젠틀맨 시그니처. 실시간 예약, 24시간 운영.",
    ogTitle: "SunRed 방콕 — 24시간 출장 마사지",
    ogDesc:
      "인증 테라피스트가 방콕 호텔·레지던스로 방문. 타이·아로마·시그니처. 실시간 예약, 24시간.",
    h1: "방콕 출장 마사지 — 호텔·레지던스로 방문",
    crumb: "홈",
  },
};

function homeRoutes() {
  return ["zh", "ja", "ko"].map((lang) => {
    const L = LOC[lang];
    const H = HOME_COPY[lang];
    const pfx = `/${lang}`;
    return {
      path: pfx,
      canonicalPath: pfx,
      hreflang: homeHreflang(),
      htmlLang: L.htmlLang,
      ogLocale: L.ogLocale,
      title: H.title,
      description: H.desc,
      ogTitle: H.ogTitle,
      ogDescription: H.ogDesc,
      jsonLd: [
        breadcrumbJsonLd([
          { name: L.brand, url: `${ORIGIN}/` },
          { name: H.crumb, url: `${ORIGIN}${pfx}` },
        ]),
      ],
      noscript: `
        <h1>${H.h1}</h1>
        <p>${L.servicesIntro}</p>
        <h2>${L.menuHeading}</h2>
        <ul>
${SERVICES.map(
  (s) =>
    `          <li><a href="${ORIGIN}${pfx}/services/${s.slug}">${s[lang].name}</a> — ${L.fromPrice(
      s.price
    )} (${L.durations})</li>`
).join("\n")}
        </ul>
        <h2>${L.reserveHeading}</h2>
        <ul>
          <li><a href="${ORIGIN}${pfx}/services">${L.allServices}</a></li>
          <li><a href="https://lin.ee/uqvdwWt">LINE</a></li>
          <li><a href="https://t.me/SunRedvip_bkk">Telegram</a></li>
          <li><a href="https://wa.me/66634350987">WhatsApp</a></li>
        </ul>`,
    };
  });
}

// ── District landing pages (28s224) ────────────────────────────────────────
// Search Console 3-month data showed our top-traffic queries were all
// English-language outcall + Bangkok permutations, with "outcall massage
// sukhumvit" specifically losing -25% MoM and "massage near me" jumping
// +300% (small base). Competitor CBODY ranks via 3 domains + 4 cities.
// We answer with district-specific landing shells targeting the exact
// long-tail phrases. Each shell is en-only (path-based hreflang would
// dilute Baidu/Naver for queries that are not natively asked in CN/JP/KR).
// Routes are 301'd to / by App.tsx so the SPA still serves the practitioner
// roster to humans — the URL exists to anchor the search snippet + JSON-LD
// targeting that district.
const DISTRICTS = [
  {
    slug: "outcall-massage-sukhumvit",
    name: "Sukhumvit",
    nearby: "Asok, Phrom Phong, Thonglor and Ekkamai",
    intro:
      "Premium outcall massage delivered to your Sukhumvit hotel, residence or villa — including the BTS belt from Nana, Asok and Phrom Phong through Thonglor and Ekkamai.",
    extra:
      "Verified Thai practitioners typically arrive within 30–45 minutes anywhere along the Sukhumvit corridor; the closest practitioner is selected automatically based on your hotel.",
  },
  {
    slug: "outcall-massage-silom",
    name: "Silom",
    nearby: "Sathorn, Sala Daeng, Surasak and Chong Nonsi",
    intro:
      "Premium outcall massage delivered to your Silom or Sathorn hotel — including the MRT/BTS interchange at Sala Daeng, Surasak and the riverside Chong Nonsi corridor.",
    extra:
      "Verified Thai practitioners typically arrive within 30–45 minutes anywhere in the Silom–Sathorn CBD; payment by cash, PromptPay, WeChat Pay or AliPay.",
  },
  {
    slug: "outcall-massage-asok",
    name: "Asok",
    nearby: "Nana, Phrom Phong, Sukhumvit and Ratchada",
    intro:
      "Premium outcall massage delivered to your Asok hotel or residence — the BTS/MRT interchange and the surrounding Sukhumvit blocks from Nana through Phrom Phong.",
    extra:
      "Verified Thai practitioners typically arrive within 20–40 minutes anywhere around Asok; multilingual concierge available 24/7.",
  },
  {
    slug: "outcall-massage-thonglor",
    name: "Thonglor",
    nearby: "Ekkamai, Phrom Phong, Sukhumvit and Phra Khanong",
    intro:
      "Premium outcall massage delivered to your Thonglor hotel, residence or condominium — including Soi 38 dining row, Ekkamai and the upper Sukhumvit corridor.",
    extra:
      "Verified Thai practitioners typically arrive within 25–45 minutes anywhere in Thonglor and Ekkamai; payment in cash on arrival or by transfer.",
  },
  {
    slug: "outcall-massage-near-me",
    name: "Bangkok (near you)",
    nearby:
      "Sukhumvit, Silom, Asok, Thonglor, Sathorn, Phrom Phong, Ekkamai and Ratchada",
    intro:
      "Premium outcall massage delivered anywhere in central Bangkok — the practitioner closest to your hotel is selected automatically. Live availability is shown on the homepage in real time so you can see who's free now.",
    extra:
      "Verified Thai practitioners typically arrive within 30–60 minutes in central Bangkok. Multilingual concierge (English, 中文, 日本語, 한국어), 24/7.",
  },
];

function districtRoutes() {
  return DISTRICTS.map((d) => {
    const url = `${ORIGIN}/${d.slug}`;
    const title = `Outcall Massage ${d.name} — Delivered to Your Hotel 24/7 | SunRed`;
    const ogTitle = `Outcall Massage ${d.name} — Delivered to Your Hotel | SunRed`;
    const description = `Premium outcall massage in ${d.name}, Bangkok, delivered to your hotel — verified Thai practitioners, live 24/7 availability, multilingual concierge. Covering ${d.nearby}.`;
    const ogDescription = `Premium outcall massage delivered to your hotel in ${d.name} — verified practitioners, live 24/7 availability. SunRed.`;
    return {
      path: `/${d.slug}`,
      canonicalPath: `/${d.slug}`,
      hreflangBase: null, // en-only, intentional
      htmlLang: "en",
      ogLocale: "en_US",
      title,
      description,
      ogTitle,
      ogDescription,
      jsonLd: [
        {
          "@context": "https://schema.org",
          "@type": "Service",
          "@id": `${url}#service`,
          name: `Outcall Massage in ${d.name}, Bangkok`,
          serviceType: "Outcall massage",
          description,
          areaServed: { "@type": "Place", name: d.name },
          provider: { "@id": BUSINESS_ID },
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "THB",
            lowPrice: "1200",
            highPrice: "3200",
            offerCount: SERVICES.length,
            url,
          },
        },
        breadcrumbJsonLd([
          { name: "SunRed", url: `${ORIGIN}/` },
          { name: `Outcall Massage ${d.name}`, url },
        ]),
      ],
      noscript: `
        <h1>Outcall Massage in ${d.name} — Delivered to Your Hotel</h1>
        <p>${d.intro}</p>
        <p>${d.extra}</p>
        <h2>Service menu &amp; pricing</h2>
        <ul>
${SERVICES.map(
  (s) =>
    `          <li><a href="${ORIGIN}/services/${s.slug}">${s.en.name}</a> — from ฿${fmt(
      s.price
    )} (60 / 90 / 120 min)</li>`
).join("\n")}
        </ul>
        <h2>Reserve or ask the concierge</h2>
        <ul>
          <li><a href="${ORIGIN}/">Home — live practitioner availability</a></li>
          <li><a href="${ORIGIN}/services">Browse all services</a></li>
          <li><a href="https://lin.ee/uqvdwWt">LINE</a></li>
          <li><a href="https://t.me/SunRedvip_bkk">Telegram</a></li>
          <li><a href="https://wa.me/66634350987">WhatsApp</a></li>
        </ul>`,
    };
  });
}

const ROUTES = [
  ...serviceRoutes(),
  ...therapistRoutes(),
  ...homeRoutes(),
  ...districtRoutes(),
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

function hreflangBlock(base) {
  // base is the EN canonical path (e.g. /services/xSR-Thai); null = en-only.
  if (!base) {
    return [
      `<link rel="alternate" hreflang="en" href="${ORIGIN}${base ?? "/"}" />`,
      `<link rel="alternate" hreflang="x-default" href="${ORIGIN}${
        base ?? "/"
      }" />`,
    ].join("\n    ");
  }
  return [
    `<link rel="alternate" hreflang="en" href="${ORIGIN}${base}" />`,
    `<link rel="alternate" hreflang="zh" href="${ORIGIN}/zh${base}" />`,
    `<link rel="alternate" hreflang="zh-CN" href="${ORIGIN}/zh${base}" />`,
    `<link rel="alternate" hreflang="zh-TW" href="${ORIGIN}/zh${base}" />`,
    `<link rel="alternate" hreflang="ja" href="${ORIGIN}/ja${base}" />`,
    `<link rel="alternate" hreflang="ko" href="${ORIGIN}/ko${base}" />`,
    `<link rel="alternate" hreflang="x-default" href="${ORIGIN}${base}" />`,
  ].join("\n    ");
}

function therapistHreflang(path) {
  return [
    `<link rel="alternate" hreflang="en" href="${ORIGIN}${path}" />`,
    `<link rel="alternate" hreflang="x-default" href="${ORIGIN}${path}" />`,
  ].join("\n    ");
}

// Home cluster — EN root + the three localized home shells. Shared verbatim
// by dist/index.html (edited at source) and the /zh|/ja|/ko home pages so the
// reciprocal cluster matches. Path-based to mirror the localized /services.
function homeHreflang() {
  return [
    `<link rel="alternate" hreflang="en" href="${ORIGIN}/" />`,
    `<link rel="alternate" hreflang="zh" href="${ORIGIN}/zh" />`,
    `<link rel="alternate" hreflang="zh-CN" href="${ORIGIN}/zh" />`,
    `<link rel="alternate" hreflang="zh-TW" href="${ORIGIN}/zh" />`,
    `<link rel="alternate" hreflang="ja" href="${ORIGIN}/ja" />`,
    `<link rel="alternate" hreflang="ko" href="${ORIGIN}/ko" />`,
    `<link rel="alternate" hreflang="x-default" href="${ORIGIN}/" />`,
  ].join("\n    ");
}

function buildRouteHtml(template, route) {
  const url = `${ORIGIN}${route.canonicalPath}`;
  let html = template;

  // <html lang="…">
  html = replaceOnce(
    html,
    /<html lang="[^"]*">/,
    `<html lang="${route.htmlLang}">`,
    "html lang"
  );
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
    /<meta property="og:locale" content="[^"]*" \/>/,
    `<meta property="og:locale" content="${route.ogLocale}" />`,
    "og:locale"
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
  // hreflang cluster
  const hl = route.hreflang
    ? route.hreflang
    : route.hreflangBase === null
      ? therapistHreflang(route.canonicalPath)
      : hreflangBlock(route.hreflangBase);
  html = replaceOnce(
    html,
    /<link rel="alternate" hreflang="en"[\s\S]*?hreflang="x-default" href="[^"]*" \/>/,
    hl,
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
  html = replaceOnce(html, /<\/head>/, `    ${ld}\n  </head>`, "</head>");
  // Swap the crawlable body <noscript> (the one wrapping <main>).
  html = replaceOnce(
    html,
    /<noscript>\s*<main[\s\S]*?<\/main>\s*<\/noscript>/,
    `<noscript>\n      <main style="max-width:680px;margin:0 auto;padding:24px;font-family:Georgia,serif;color:#2a1a14;line-height:1.6">${route.noscript}\n      </main>\n    </noscript>`,
    "body noscript"
  );

  if (!html.includes(`<title>${route.title}</title>`)) {
    throw new Error(
      `[prerender] title verification failed for ${route.path}`
    );
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
