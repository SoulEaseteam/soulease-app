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
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
// 🆕 Round 28x.108 — the blog content module the React pages also read. Both
//   consume the SAME generated file (built by scripts/buildBlogData.mjs), so
//   the crawlable prerender body can never drift from what a human sees.
import { BLOG_POSTS } from "../src/data/blogPosts.mjs";

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
    "zh-TW": {
      name: "泰式按摩",
      blurb:
        "正宗泰式按摩到府服務，送達您在曼谷的飯店、公寓或別墅。專業持證女性技師融合指壓、深度伸展與節奏手法，緩解旅途疲勞、舒緩肌肉、恢復身體平衡——在您私密的房間內進行。",
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
    "zh-TW": {
      name: "芳香精油按摩",
      blurb:
        "溫和的芳香精油按摩，到府送達您在曼谷的房間。薰衣草、橙花或檀香高級精油，配合舒緩穩定的手法，安撫神經、助您深度放鬆入眠。",
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
    "zh-TW": {
      name: "尊榮男士理療",
      blurb:
        "專為男士打造的溫熱精油理療，由訓練有素的女性技師到府服務。溫和芳療結合細緻的紓壓手法，節奏完全依您偏好，私密、專注、不受打擾。",
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
    "zh-TW": {
      name: "SunRed 尊榮理療體驗",
      blurb:
        "SunRed 最精緻的理療儀式——流暢的全身精油護理，融合高級芳香精油與輕柔的泰式伸展，僅由資深專屬技師呈現。私密、從容，到府送達您在曼谷的住所。",
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
  "zh-TW": {
    htmlLang: "zh-TW",
    ogLocale: "zh_TW",
    durations: "60 / 90 / 120 分鐘",
    fromPrice: (p) => `฿${fmt(p)} 起`,
    brand: "SunRed",
    servicesTitle: "曼谷到府按摩服務與價格 — 泰式 / 芳療 / 尊榮理療 | SunRed",
    servicesDesc:
      "SunRed 曼谷到府按摩菜單，送達您的飯店：泰式按摩（฿1,200）、芳香精油按摩（฿1,600）、尊榮男士理療（฿2,200）及尊榮理療體驗（฿3,200）。60/90/120 分鐘，全天候24小時，支援現金、PromptPay、微信支付與支付寶。",
    servicesOgTitle: "SunRed 曼谷 — 到府按摩服務與價格",
    servicesOgDesc:
      "泰式、芳療、男士理療與尊榮體驗，到府送達您的曼谷飯店。已認證技師、即時空閒、全天候24小時。",
    serviceTitle: (n, p) => `${n}（到府）曼谷 — ฿${fmt(p)} 起 | SunRed`,
    serviceOgTitle: (n) => `${n} — 曼谷到府按摩 | SunRed`,
    serviceOgDesc: (n, p) =>
      `${n}，฿${fmt(p)} 起，到府送達飯店。已認證、私密、全天候24小時。`,
    descTail: (p) =>
      ` 60/90/120 分鐘，฿${fmt(p)} 起。支援現金/PromptPay/微信/支付寶，全天候24小時禮賓服務。`,
    servicesH1: "曼谷到府按摩服務 — SunRed",
    servicesIntro:
      "SunRed 所有服務均到府送達您在曼谷市中心的飯店、公寓或別墅——Sukhumvit、Silom、Asok、Thonglor、Sathorn、Phrom Phong、Ekkamai、Ratchada 等區域。已認證技師、私密到府、多語言禮賓（English、中文、日本語、한국어），全天候24小時。",
    menuHeading: "服務菜單與價格",
    reserveHeading: "預訂或諮詢禮賓",
    allServices: "全部服務",
    homeLink: "首頁 — 即時空閒",
    deliveredLine: (p) =>
      `฿${fmt(p)} 起 · 60/90/120 分鐘 · 到府送達您在曼谷市中心的飯店、公寓或別墅（Sukhumvit、Silom、Asok、Thonglor 等）。已認證技師、私密到府、多語言禮賓、全天候24小時。`,
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

const LOCALES = ["en", "zh", "zh-TW", "ja", "ko"];
// 🆕 Round 28x.99f — zh-TW's URL prefix is /zh-tw (lowercase, matches the
// route registered in App.tsx), NOT /zh-TW.
const localePrefix = (lang) =>
  lang === "en" ? "" : lang === "zh-TW" ? "/zh-tw" : `/${lang}`;

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

// 🆕 Round 28x.110 (founder: "ไบโอพนักงาน ทำเลย") — pull the real, hand-written
// English bios out of src/data/therapists.ts and into the crawlable body. The
// bios already exist there (multi-locale) and the in-app detail page shows
// them, but the PRERENDER — the only version Google indexes — was serving a
// generic one-liner, so all 12 profile pages read near-identically. Reading
// from therapists.ts (not a hand-copy here) keeps them from drifting.
//
// Parsed from source text rather than imported because this is a .mjs and
// therapists.ts is TypeScript. Robust to block-order/whitespace: split on each
// `id: "…SunRed"` and scan that slice. A miss degrades to the generic body
// (never drops the page), and the build asserts coverage below.
function loadTherapistBios() {
  const src = readFileSync(join(ROOT, "src/data/therapists.ts"), "utf8");
  const ids = [...src.matchAll(/\bid:\s*"([A-Za-z]+SunRed)"/g)];
  const map = {};
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i][1];
    const start = ids[i].index;
    const end = i + 1 < ids.length ? ids[i + 1].index : src.length;
    const block = src.slice(start, end);
    const bioEn = block.match(/bios:\s*\{[\s\S]*?\ben:\s*"((?:[^"\\]|\\.)*)"/)?.[1];
    const role = block.match(/employmentType:\s*"([^"]+)"/)?.[1];
    if (bioEn) map[id] = { bioEn: bioEn.replace(/\\"/g, '"'), role: role ?? null };
  }
  return map;
}
const THERAPIST_BIOS = loadTherapistBios();

function therapistRoutes() {
  return THERAPISTS.map((t) => {
    const bio = THERAPIST_BIOS[t.id];
    // Description: lead with the real bio (verbatim; it's already euphemism-
    // compliant and under Google's snippet length), so each page's snippet is
    // distinct. Fall back to the generic line only if a bio wasn't parsed.
    const description = bio
      ? `${bio.bioEn} A verified SunRed outcall massage practitioner delivered to your Bangkok hotel or residence — discreet, 24/7.`
      : `Book ${t.name}, a verified SunRed outcall massage practitioner serving ${t.area} and central Bangkok. Thai, aromatherapy & signature therapies delivered to your hotel or residence — discreet, verified, available 24/7. EN/中文/日本語/한국어.`;
    const roleLine = bio?.role
      ? `<p>${t.name} is a ${bio.role.toLowerCase()} with SunRed.</p>`
      : "";
    const bioBody = bio
      ? `<p>${bio.bioEn}</p>${roleLine}`
      : `<p>${t.name} is a verified SunRed outcall massage practitioner serving
          ${t.area} and central Bangkok.</p>`;
    return {
    path: `/therapists/${t.id}`,
    canonicalPath: `/therapists/${t.id}`,
    hreflangBase: null, // en-only; no localized cluster
    htmlLang: "en",
    ogLocale: "en_US",
    title: `${t.name} — Outcall Massage Practitioner in Bangkok | SunRed`,
    description,
    ogTitle: `${t.name} — Verified Outcall Massage Practitioner, Bangkok`,
    ogDescription: bio
      ? bio.bioEn
      : `Verified SunRed practitioner serving ${t.area} & central Bangkok. Delivered to your hotel, discreet, 24/7.`,
    jsonLd: [
      breadcrumbJsonLd([
        { name: "Home", url: `${ORIGIN}/` },
        { name: "Practitioners", url: `${ORIGIN}/` },
        { name: t.name, url: `${ORIGIN}/therapists/${t.id}` },
      ]),
    ],
    noscript: `
        <h1>${t.name} — Outcall Massage Practitioner in Bangkok</h1>
        ${bioBody}
        <p>Sessions are delivered to your hotel, residence or villa across
          ${t.area} and central Bangkok — discreet arrival, verified identity,
          multilingual concierge (English, 中文, 日本語, 한국어), available 24/7.</p>
        <h2>Reserve or ask the concierge</h2>
        <ul>
          <li><a href="${ORIGIN}/services">Browse all services &amp; pricing</a></li>
          <li><a href="${ORIGIN}/">Home — live availability</a></li>
          <li><a href="https://lin.ee/uqvdwWt">LINE</a></li>
          <li><a href="https://t.me/SunRedvip_bkk">Telegram</a></li>
          <li><a href="https://wa.me/66634350987">WhatsApp</a></li>
        </ul>`,
    };
  });
}

// Assert every rostered practitioner got a real bio — a silent parse miss
// would quietly ship the generic body for someone, exactly the near-duplicate
// problem this round exists to fix.
{
  const missing = THERAPISTS.filter((t) => !THERAPIST_BIOS[t.id]).map((t) => t.id);
  if (missing.length) {
    throw new Error(
      `[prerender] no bio parsed from therapists.ts for: ${missing.join(", ")}`
    );
  }
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
  "zh-TW": {
    title: "曼谷到府按摩 24小時 · 送達飯店 — 泰式 / 精油 / 尊榮理療 | SunRed",
    desc: "SunRed 曼谷高端到府按摩，認證女性技師送達您的飯店、公寓或別墅 — Sukhumvit、Silom、Asok、Thonglor 等核心地段。泰式、芳香精油、尊榮男士理療。即時空閒、全天候24小時、支援現金、PromptPay、微信支付與支付寶。",
    ogTitle: "SunRed 曼谷 — 24小時到府按摩",
    ogDesc:
      "認證技師送達您的曼谷飯店、公寓或別墅。泰式·精油·尊榮理療。即時空閒、全天候24小時。",
    h1: "曼谷到府按摩 — 送達您的飯店、公寓或別墅",
    crumb: "首頁",
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
  return ["zh", "zh-TW", "ja", "ko"].map((lang) => {
    const L = LOC[lang];
    const H = HOME_COPY[lang];
    const pfx = localePrefix(lang);
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

// ── District landing pages (28s224 + 28s227 i18n expansion) ───────────────
// Search Console 3-month data showed our top-traffic queries were all
// English-language outcall + Bangkok permutations, with "outcall massage
// sukhumvit" specifically losing -25% MoM and "massage near me" jumping
// +300% (small base). Competitor CBODY ranks via 3 domains + 4 cities.
//
// 28s227 expansion: full zh / ja / ko localisation. Chinese, Japanese
// and Korean tourists DO search with localized phrases on Baidu, Yahoo
// JP and Naver — without a localized district page, Baidu/Naver fall
// back to ranking our generic /zh /ja /ko home shell, which is too broad
// for "曼谷素坤逸出张按摩" / "バンコク スクンビット 出張マッサージ" /
// "방콕 수쿰빗 출장 마사지" intent. Each district now ships in 4 langs.
//
// 5 districts × 4 langs = 20 prerendered shells. App.tsx 301s the en
// URLs to / (humans see the practitioner roster). Localized /zh|/ja|/ko
// URLs are caught by LocaleEntryRedirect which switches i18n then
// redirects to / — same UX, localized crawler bait.
const DISTRICTS = [
  {
    slug: "outcall-massage-sukhumvit",
    en: {
      name: "Sukhumvit",
      nearby: "Asok, Phrom Phong, Thonglor and Ekkamai",
      intro:
        "Premium outcall massage delivered to your Sukhumvit hotel, residence or villa — including the BTS belt from Nana, Asok and Phrom Phong through Thonglor and Ekkamai.",
      extra:
        "Verified Thai practitioners typically arrive within 30–45 minutes anywhere along the Sukhumvit corridor; the closest practitioner is selected automatically based on your hotel.",
    },
    zh: {
      name: "素坤逸",
      nearby: "阿索克、彭蓬、通罗、伊卡迈",
      intro:
        "高端上门按摩送达您在素坤逸的酒店、公寓或别墅——覆盖 BTS 沿线的 Nana、阿索克、彭蓬、通罗、伊卡迈整条走廊。",
      extra:
        "认证泰国女性技师通常在 30–45 分钟内抵达素坤逸任何位置，系统会自动为您匹配距离最近的技师。",
    },
    "zh-TW": {
      name: "蘇坤蔚",
      nearby: "阿索克、彭蓬、通羅、伊卡邁",
      intro:
        "高端到府按摩送達您在蘇坤蔚的飯店、公寓或別墅——涵蓋 BTS 沿線的 Nana、阿索克、彭蓬、通羅、伊卡邁整條走廊。",
      extra:
        "認證泰國女性技師通常在 30–45 分鐘內抵達蘇坤蔚任何位置，系統會自動為您配對距離最近的技師。",
    },
    ja: {
      name: "スクンビット",
      nearby: "アソーク、プロンポン、トンロー、エカマイ",
      intro:
        "スクンビットのホテル・ご滞在先へ出張高級マッサージをお届けします。BTS 沿線のナナ、アソーク、プロンポン、トンロー、エカマイの全エリアに対応。",
      extra:
        "認定タイ人女性セラピストは通常 30〜45 分以内にスクンビットエリアへ到着。最寄りのセラピストを自動で手配いたします。",
    },
    ko: {
      name: "수쿰빗",
      nearby: "아속, 프롬퐁, 통러, 에까마이",
      intro:
        "수쿰빗 호텔·레지던스·빌라로 프리미엄 출장 마사지를 제공합니다 — BTS 라인의 나나, 아속, 프롬퐁, 통러, 에까마이 전 구간 커버.",
      extra:
        "인증된 태국 여성 테라피스트가 수쿰빗 어디든 보통 30~45분 내 도착합니다. 가까운 테라피스트가 자동 배정됩니다.",
    },
  },
  {
    slug: "outcall-massage-silom",
    en: {
      name: "Silom",
      nearby: "Sathorn, Sala Daeng, Surasak and Chong Nonsi",
      intro:
        "Premium outcall massage delivered to your Silom or Sathorn hotel — including the MRT/BTS interchange at Sala Daeng, Surasak and the riverside Chong Nonsi corridor.",
      extra:
        "Verified Thai practitioners typically arrive within 30–45 minutes anywhere in the Silom–Sathorn CBD; payment by cash, PromptPay, WeChat Pay or AliPay.",
    },
    zh: {
      name: "是隆",
      nearby: "沙吞、莎拉当、苏拉萨、崇农席",
      intro:
        "高端上门按摩送达您在是隆或沙吞的酒店——覆盖 MRT/BTS 莎拉当交汇点、苏拉萨与沿河崇农席整条 CBD 走廊。",
      extra:
        "认证泰国女性技师通常在 30–45 分钟内抵达是隆—沙吞 CBD 任何位置，支持现金、PromptPay、微信支付与支付宝。",
    },
    "zh-TW": {
      name: "是隆",
      nearby: "沙吞、莎拉當、蘇拉薩、崇農席",
      intro:
        "高端到府按摩送達您在是隆或沙吞的飯店——涵蓋 MRT/BTS 莎拉當轉乘站、蘇拉薩與沿河崇農席整條 CBD 走廊。",
      extra:
        "認證泰國女性技師通常在 30–45 分鐘內抵達是隆—沙吞 CBD 任何位置，支援現金、PromptPay、微信支付與支付寶。",
    },
    ja: {
      name: "シーロム",
      nearby: "サトーン、サラデーン、スラサック、チョンノンシー",
      intro:
        "シーロムやサトーンのホテルへ出張高級マッサージをお届けします。MRT/BTS サラデーン乗換、スラサック、リバーサイドのチョンノンシー周辺をカバー。",
      extra:
        "認定タイ人女性セラピストは通常 30〜45 分以内にシーロム/サトーン CBD へ到着。現金・PromptPay・WeChat Pay・AliPay でお支払いいただけます。",
    },
    ko: {
      name: "실롬",
      nearby: "사톤, 살라댕, 수라삭, 총논시",
      intro:
        "실롬 또는 사톤의 호텔로 프리미엄 출장 마사지를 제공합니다 — MRT/BTS 살라댕 환승역, 수라삭, 강변의 총논시까지 CBD 전체 커버.",
      extra:
        "인증 태국 여성 테라피스트가 실롬-사톤 CBD 어디든 보통 30~45분 내 도착. 현금, PromptPay, WeChat Pay, AliPay 결제 지원.",
    },
  },
  {
    slug: "outcall-massage-asok",
    en: {
      name: "Asok",
      nearby: "Nana, Phrom Phong, Sukhumvit and Ratchada",
      intro:
        "Premium outcall massage delivered to your Asok hotel or residence — the BTS/MRT interchange and the surrounding Sukhumvit blocks from Nana through Phrom Phong.",
      extra:
        "Verified Thai practitioners typically arrive within 20–40 minutes anywhere around Asok; multilingual concierge available 24/7.",
    },
    zh: {
      name: "阿索克",
      nearby: "Nana、彭蓬、素坤逸、拉差达",
      intro:
        "高端上门按摩送达您在阿索克的酒店或公寓——BTS/MRT 交汇点及周边素坤逸区，从 Nana 至彭蓬。",
      extra:
        "认证泰国女性技师通常在 20–40 分钟内抵达阿索克周边，全天候 24 小时多语言客服。",
    },
    "zh-TW": {
      name: "阿索克",
      nearby: "Nana、彭蓬、蘇坤蔚、拉差達",
      intro:
        "高端到府按摩送達您在阿索克的飯店或公寓——BTS/MRT 交會點及周邊蘇坤蔚區，從 Nana 至彭蓬。",
      extra:
        "認證泰國女性技師通常在 20–40 分鐘內抵達阿索克周邊，全天候 24 小時多語言客服。",
    },
    ja: {
      name: "アソーク",
      nearby: "ナナ、プロンポン、スクンビット、ラチャダー",
      intro:
        "アソークのホテル・ご滞在先へ出張高級マッサージをお届けします。BTS/MRT 交差点と周辺のスクンビット（ナナ〜プロンポン）に対応。",
      extra:
        "認定タイ人女性セラピストは通常 20〜40 分以内にアソーク周辺へ到着。多言語コンシェルジュが 24 時間対応。",
    },
    ko: {
      name: "아속",
      nearby: "나나, 프롬퐁, 수쿰빗, 라차다",
      intro:
        "아속의 호텔이나 레지던스로 프리미엄 출장 마사지를 제공합니다 — BTS/MRT 환승역 및 주변 수쿰빗(나나~프롬퐁) 커버.",
      extra:
        "인증 태국 여성 테라피스트가 아속 인근에 보통 20~40분 내 도착. 다국어 컨시어지 24시간.",
    },
  },
  {
    slug: "outcall-massage-thonglor",
    en: {
      name: "Thonglor",
      nearby: "Ekkamai, Phrom Phong, Sukhumvit and Phra Khanong",
      intro:
        "Premium outcall massage delivered to your Thonglor hotel, residence or condominium — including Soi 38 dining row, Ekkamai and the upper Sukhumvit corridor.",
      extra:
        "Verified Thai practitioners typically arrive within 25–45 minutes anywhere in Thonglor and Ekkamai; payment in cash on arrival or by transfer.",
    },
    zh: {
      name: "通罗",
      nearby: "伊卡迈、彭蓬、素坤逸、帕卡农",
      intro:
        "高端上门按摩送达您在通罗的酒店、公寓或 condo——包括 Soi 38 餐饮街、伊卡迈与素坤逸上段走廊。",
      extra:
        "认证泰国女性技师通常在 25–45 分钟内抵达通罗与伊卡迈，支持到付现金或转账。",
    },
    "zh-TW": {
      name: "通羅",
      nearby: "伊卡邁、彭蓬、蘇坤蔚、帕卡農",
      intro:
        "高端到府按摩送達您在通羅的飯店、公寓或社區大樓——包括 Soi 38 餐飲街、伊卡邁與蘇坤蔚上段走廊。",
      extra:
        "認證泰國女性技師通常在 25–45 分鐘內抵達通羅與伊卡邁，支援到付現金或轉帳。",
    },
    ja: {
      name: "トンロー",
      nearby: "エカマイ、プロンポン、スクンビット、プラカノン",
      intro:
        "トンローのホテル・ご滞在先・コンドミニアムへ出張高級マッサージをお届けします。ソイ 38 のダイニングエリア、エカマイ、上スクンビット沿線に対応。",
      extra:
        "認定タイ人女性セラピストは通常 25〜45 分以内にトンロー・エカマイへ到着。現金または振込でお支払いいただけます。",
    },
    ko: {
      name: "통러",
      nearby: "에까마이, 프롬퐁, 수쿰빗, 프라카농",
      intro:
        "통러의 호텔·레지던스·콘도미니엄으로 프리미엄 출장 마사지를 제공합니다 — Soi 38 다이닝 거리, 에까마이, 어퍼 수쿰빗 커버.",
      extra:
        "인증 태국 여성 테라피스트가 통러·에까마이 어디든 보통 25~45분 내 도착. 현금 또는 송금 결제.",
    },
  },
  {
    slug: "outcall-massage-near-me",
    en: {
      name: "Bangkok (near you)",
      nearby:
        "Sukhumvit, Silom, Asok, Thonglor, Sathorn, Phrom Phong, Ekkamai and Ratchada",
      intro:
        "Premium outcall massage delivered anywhere in central Bangkok — the practitioner closest to your hotel is selected automatically. Live availability is shown on the homepage in real time so you can see who's free now.",
      extra:
        "Verified Thai practitioners typically arrive within 30–60 minutes in central Bangkok. Multilingual concierge (English, 中文, 日本語, 한국어), 24/7.",
    },
    zh: {
      name: "曼谷（离您最近）",
      nearby: "素坤逸、是隆、阿索克、通罗、沙吞、彭蓬、伊卡迈、拉差达",
      intro:
        "高端上门按摩送达曼谷市中心任何位置——系统自动为您匹配距离最近的技师。首页实时显示当下可订状态。",
      extra:
        "认证泰国女性技师通常在 30–60 分钟内抵达曼谷市中心。多语言客服（English / 中文 / 日本語 / 한국어），全天候 24 小时。",
    },
    "zh-TW": {
      name: "曼谷（離您最近）",
      nearby: "蘇坤蔚、是隆、阿索克、通羅、沙吞、彭蓬、伊卡邁、拉差達",
      intro:
        "高端到府按摩送達曼谷市中心任何位置——系統自動為您配對距離最近的技師。首頁即時顯示當下可訂狀態。",
      extra:
        "認證泰國女性技師通常在 30–60 分鐘內抵達曼谷市中心。多語言客服（English / 中文 / 日本語 / 한국어），全天候 24 小時。",
    },
    ja: {
      name: "バンコク（お近く）",
      nearby:
        "スクンビット、シーロム、アソーク、トンロー、サトーン、プロンポン、エカマイ、ラチャダー",
      intro:
        "バンコク中心部のどこへでも出張高級マッサージをお届けします。ホテルに最も近いセラピストを自動で手配。トップページにはリアルタイムの空き状況を表示します。",
      extra:
        "認定タイ人女性セラピストは通常 30〜60 分以内にバンコク中心部へ到着。多言語コンシェルジュ（English / 中文 / 日本語 / 한국어）、24 時間対応。",
    },
    ko: {
      name: "방콕(가까운 위치)",
      nearby: "수쿰빗, 실롬, 아속, 통러, 사톤, 프롬퐁, 에까마이, 라차다",
      intro:
        "방콕 시내 어디든 프리미엄 출장 마사지를 제공합니다 — 호텔에서 가장 가까운 테라피스트가 자동 배정됩니다. 홈페이지에서 실시간 예약 가능 상태를 확인할 수 있습니다.",
      extra:
        "인증 태국 여성 테라피스트가 방콕 시내 어디든 보통 30~60분 내 도착. 다국어 컨시어지 (English / 中文 / 日本語 / 한국어), 24시간 운영.",
    },
  },
];

// Per-locale wrappers for the district shell (title, h2, links).
const DISTRICT_COPY = {
  en: {
    title: (name) => `Outcall Massage ${name} — Delivered to Your Hotel 24/7 | SunRed`,
    ogTitle: (name) => `Outcall Massage ${name} — Delivered to Your Hotel | SunRed`,
    description: (name, nearby) =>
      `Premium outcall massage in ${name}, Bangkok, delivered to your hotel — verified Thai practitioners, live 24/7 availability, multilingual concierge. Covering ${nearby}.`,
    ogDescription: (name) =>
      `Premium outcall massage delivered to your hotel in ${name} — verified practitioners, live 24/7 availability. SunRed.`,
    h1: (name) => `Outcall Massage in ${name} — Delivered to Your Hotel`,
    menuHeading: "Service menu &amp; pricing",
    reserveHeading: "Reserve or ask the concierge",
    homeLink: "Home — live practitioner availability",
    allServices: "Browse all services",
    minutesLabel: "min",
    fromLabel: (p) => `from ฿${fmt(p)}`,
  },
  zh: {
    title: (name) => `${name}上门按摩 24小时 · 送达酒店 | SunRed`,
    ogTitle: (name) => `${name}上门按摩 · 送达酒店 | SunRed`,
    description: (name, nearby) =>
      `${name}（曼谷）高端上门按摩送达您的酒店——认证泰国女性技师、全天候 24 小时实时空闲、多语言客服。覆盖 ${nearby}。`,
    ogDescription: (name) =>
      `${name}高端上门按摩，送达您的酒店——认证技师，24小时实时可订。SunRed。`,
    h1: (name) => `${name}上门按摩 — 送达您的酒店`,
    menuHeading: "服务菜单与价格",
    reserveHeading: "预订或咨询礼宾",
    homeLink: "首页 — 实时空闲",
    allServices: "全部服务",
    minutesLabel: "分钟",
    fromLabel: (p) => `฿${fmt(p)} 起`,
  },
  "zh-TW": {
    title: (name) => `${name}到府按摩 24小時 · 送達飯店 | SunRed`,
    ogTitle: (name) => `${name}到府按摩 · 送達飯店 | SunRed`,
    description: (name, nearby) =>
      `${name}（曼谷）高端到府按摩送達您的飯店——認證泰國女性技師、全天候 24 小時即時空閒、多語言客服。涵蓋 ${nearby}。`,
    ogDescription: (name) =>
      `${name}高端到府按摩，送達您的飯店——認證技師，24小時即時可訂。SunRed。`,
    h1: (name) => `${name}到府按摩 — 送達您的飯店`,
    menuHeading: "服務菜單與價格",
    reserveHeading: "預訂或諮詢禮賓",
    homeLink: "首頁 — 即時空閒",
    allServices: "全部服務",
    minutesLabel: "分鐘",
    fromLabel: (p) => `฿${fmt(p)} 起`,
  },
  ja: {
    title: (name) =>
      `${name}出張マッサージ 24時間 · ホテルへお届け | SunRed`,
    ogTitle: (name) => `${name}出張マッサージ · ホテルへお届け | SunRed`,
    description: (name, nearby) =>
      `${name}（バンコク）の高級出張マッサージをホテルへお届け——認定タイ人女性セラピスト、24 時間リアルタイム予約、多言語コンシェルジュ。${nearby} に対応。`,
    ogDescription: (name) =>
      `${name}の高級出張マッサージをホテルへお届け——認定セラピスト、24 時間予約可。SunRed。`,
    h1: (name) => `${name}出張マッサージ — ホテルへお届け`,
    menuHeading: "サービスメニューと料金",
    reserveHeading: "予約・コンシェルジュへ相談",
    homeLink: "ホーム — リアルタイム空き状況",
    allServices: "すべてのサービス",
    minutesLabel: "分",
    fromLabel: (p) => `฿${fmt(p)}〜`,
  },
  ko: {
    title: (name) => `${name} 출장 마사지 24시간 · 호텔로 방문 | SunRed`,
    ogTitle: (name) => `${name} 출장 마사지 · 호텔로 방문 | SunRed`,
    description: (name, nearby) =>
      `${name}(방콕) 프리미엄 출장 마사지를 호텔로 — 인증 태국 여성 테라피스트, 24시간 실시간 예약, 다국어 컨시어지. ${nearby} 커버.`,
    ogDescription: (name) =>
      `${name} 프리미엄 출장 마사지를 호텔로 — 인증 테라피스트, 24시간 예약 가능. SunRed.`,
    h1: (name) => `${name} 출장 마사지 — 호텔로 방문`,
    menuHeading: "서비스 메뉴 & 가격",
    reserveHeading: "예약 또는 컨시어지 문의",
    homeLink: "홈 — 실시간 예약 가능",
    allServices: "전체 서비스",
    minutesLabel: "분",
    fromLabel: (p) => `฿${fmt(p)}부터`,
  },
};

function districtRoutes() {
  const routes = [];
  for (const lang of LOCALES) {
    const L = LOC[lang];
    const C = DISTRICT_COPY[lang];
    const pfx = localePrefix(lang);
    for (const d of DISTRICTS) {
      const c = d[lang];
      const path = `${pfx}/${d.slug}`;
      const url = `${ORIGIN}${path}`;
      const title = C.title(c.name);
      const ogTitle = C.ogTitle(c.name);
      const description = C.description(c.name, c.nearby);
      const ogDescription = C.ogDescription(c.name);
      routes.push({
        path,
        canonicalPath: path,
        hreflangBase: `/${d.slug}`, // shared base across all 4 langs
        htmlLang: L.htmlLang,
        ogLocale: L.ogLocale,
        title,
        description,
        ogTitle,
        ogDescription,
        jsonLd: [
          {
            "@context": "https://schema.org",
            "@type": "Service",
            "@id": `${url}#service`,
            name: `${c.name} — Outcall Massage`,
            serviceType: "Outcall massage",
            description,
            areaServed: { "@type": "Place", name: c.name },
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
            { name: L.brand, url: `${ORIGIN}/` },
            { name: c.name, url },
          ]),
        ],
        noscript: `
        <h1>${C.h1(c.name)}</h1>
        <p>${c.intro}</p>
        <p>${c.extra}</p>
        <h2>${C.menuHeading}</h2>
        <ul>
${SERVICES.map(
  (s) =>
    `          <li><a href="${ORIGIN}${pfx}/services/${s.slug}">${s[lang].name}</a> — ${C.fromLabel(
      s.price
    )} (60 / 90 / 120 ${C.minutesLabel})</li>`
).join("\n")}
        </ul>
        <h2>${C.reserveHeading}</h2>
        <ul>
          <li><a href="${ORIGIN}${pfx}/">${C.homeLink}</a></li>
          <li><a href="${ORIGIN}${pfx}/services">${C.allServices}</a></li>
          <li><a href="https://lin.ee/uqvdwWt">LINE</a></li>
          <li><a href="https://t.me/SunRedvip_bkk">Telegram</a></li>
          <li><a href="https://wa.me/66634350987">WhatsApp</a></li>
        </ul>`,
      });
    }
  }
  return routes;
}

// ── /pricing (Round 28r70 · Rebrand Phase 1) ───────────────────────────────
// New "Core Experiences" money page introduced with the Nordic rebrand.
// Phase 1 ships a Nordic-styled placeholder (see src/pages/PricingPage.tsx);
// Phase 2 will populate a real rate card. This prerendered shell exists so
// external / social / crawler visits hit a titled page with correct hreflang
// and a crawlable body listing the current pricing anchors — even before the
// full page is built.
const PRICING_COPY = {
  en: {
    title: "Core Experiences · Outcall Massage Pricing in Bangkok | SunRed",
    description:
      "SunRed Core Experiences — full pricing for our Bangkok outcall massage menu (Traditional Thai, Aromatherapy, Gentleman's Signature, Therapeutic). Verified practitioners, delivered to your hotel. 24/7 concierge in EN/中文/日本語/한국어.",
    ogTitle: "Core Experiences — Outcall Massage Pricing | SunRed",
    ogDescription:
      "Full service pricing for SunRed's Bangkok outcall massage menu. Delivered to your hotel, verified practitioners, 24/7 concierge.",
    h1: "Core Experiences · Service Pricing",
    intro:
      "SunRed's Core Experiences menu delivers our full outcall massage catalogue to your Bangkok hotel, residence or villa — verified Thai practitioners, discreet arrival, multilingual concierge (English, 中文, 日本語, 한국어), 24/7.",
    menuHeading: "Service menu & starting prices",
    reserveHeading: "Ask the concierge",
    homeLink: "Home — live availability",
    allServices: "All services",
    contactLine:
      "The full rate card is being finalised as part of the SunRed brand refresh. Our concierge can answer any question about services, session lengths, and rates — usually within a few minutes.",
  },
  zh: {
    title: "尊享体验 · 曼谷上门按摩价格 | SunRed",
    description:
      "SunRed 尊享体验 — 曼谷上门按摩全套服务与价格（泰式、芳疗、尊享男士理疗、尊享理疗体验）。认证技师、上门送达酒店、全天候24小时多语言客服。",
    ogTitle: "尊享体验 — 上门按摩价格 | SunRed",
    ogDescription:
      "SunRed 曼谷上门按摩全套服务与价格。认证技师、上门送达、24 小时客服。",
    h1: "尊享体验 · 服务价格",
    intro:
      "SunRed 尊享体验菜单，将全套上门按摩服务送达您在曼谷的酒店、公寓或别墅——认证泰国女性技师、私密上门、多语言客服（English / 中文 / 日本語 / 한국어），全天候24小时。",
    menuHeading: "服务菜单与起始价格",
    reserveHeading: "咨询礼宾",
    homeLink: "首页 — 实时空闲",
    allServices: "全部服务",
    contactLine:
      "完整的价目表将随 SunRed 品牌焕新一并推出。如需咨询服务、时长与价格，我们的礼宾团队通常在几分钟内回复。",
  },
  "zh-TW": {
    title: "尊榮體驗 · 曼谷到府按摩價格 | SunRed",
    description:
      "SunRed 尊榮體驗 — 曼谷到府按摩全套服務與價格（泰式、芳療、尊榮男士理療、尊榮理療體驗）。認證技師、到府送達飯店、全天候24小時多語言客服。",
    ogTitle: "尊榮體驗 — 到府按摩價格 | SunRed",
    ogDescription:
      "SunRed 曼谷到府按摩全套服務與價格。認證技師、到府送達、24 小時客服。",
    h1: "尊榮體驗 · 服務價格",
    intro:
      "SunRed 尊榮體驗菜單，將全套到府按摩服務送達您在曼谷的飯店、公寓或別墅——認證泰國女性技師、私密到府、多語言客服（English / 中文 / 日本語 / 한국어），全天候24小時。",
    menuHeading: "服務菜單與起始價格",
    reserveHeading: "諮詢禮賓",
    homeLink: "首頁 — 即時空閒",
    allServices: "全部服務",
    contactLine:
      "完整的價目表將隨 SunRed 品牌煥新一併推出。如需諮詢服務、時長與價格，我們的禮賓團隊通常在幾分鐘內回覆。",
  },
  ja: {
    title:
      "コア・エクスペリエンス · バンコク出張マッサージ料金 | SunRed",
    description:
      "SunRed コア・エクスペリエンス — バンコク出張マッサージ全メニューの料金（タイ古式・アロマ・メンズ シグネチャー・セラピー）。認定セラピスト、ホテルへ出張、24 時間多言語コンシェルジュ。",
    ogTitle: "コア・エクスペリエンス — 出張マッサージ料金 | SunRed",
    ogDescription:
      "SunRed バンコク出張マッサージの全メニューと料金。認定セラピスト、ホテルへ出張、24 時間コンシェルジュ。",
    h1: "コア・エクスペリエンス · サービス料金",
    intro:
      "SunRed コア・エクスペリエンスは、バンコクのホテル・ご滞在先へ全メニューを出張でお届けします。認定タイ人女性セラピスト、プライベートな訪問、多言語コンシェルジュ（English / 中文 / 日本語 / 한국어）、24 時間対応。",
    menuHeading: "サービスメニューと料金（〜から）",
    reserveHeading: "コンシェルジュへ相談",
    homeLink: "ホーム — リアルタイム空き状況",
    allServices: "すべてのサービス",
    contactLine:
      "完全な料金表は SunRed のブランドリニューアルに合わせて公開予定です。サービス内容・時間・料金についてのご質問は、コンシェルジュへお気軽にどうぞ（通常数分でご返信）。",
  },
  ko: {
    title: "코어 익스피리언스 · 방콕 출장 마사지 가격 | SunRed",
    description:
      "SunRed 코어 익스피리언스 — 방콕 출장 마사지 전체 메뉴 가격 (타이, 아로마, 젠틀맨 시그니처, 테라퓨틱). 인증 테라피스트, 호텔로 방문, 24시간 다국어 컨시어지.",
    ogTitle: "코어 익스피리언스 — 출장 마사지 가격 | SunRed",
    ogDescription:
      "SunRed 방콕 출장 마사지 전체 메뉴와 가격. 인증 테라피스트, 호텔 방문, 24시간 컨시어지.",
    h1: "코어 익스피리언스 · 서비스 가격",
    intro:
      "SunRed 코어 익스피리언스 메뉴는 방콕 호텔·레지던스·빌라로 전체 출장 마사지 카탈로그를 제공합니다 — 인증 태국 여성 테라피스트, 프라이빗 방문, 다국어 컨시어지 (English / 中文 / 日本語 / 한국어), 24시간 운영.",
    menuHeading: "서비스 메뉴 & 시작 가격",
    reserveHeading: "컨시어지 문의",
    homeLink: "홈 — 실시간 예약 가능",
    allServices: "전체 서비스",
    contactLine:
      "전체 가격표는 SunRed 브랜드 리뉴얼에 맞춰 공개됩니다. 서비스·시간·요금 문의는 컨시어지에게 부탁드리며, 보통 몇 분 안에 답변드립니다.",
  },
};

function pricingRoutes() {
  return LOCALES.map((lang) => {
    const L = LOC[lang];
    const P = PRICING_COPY[lang];
    const pfx = localePrefix(lang);
    const path = `${pfx}/pricing`;
    const url = `${ORIGIN}${path}`;
    return {
      path,
      canonicalPath: path,
      hreflangBase: "/pricing", // shared base across all 4 langs
      htmlLang: L.htmlLang,
      ogLocale: L.ogLocale,
      title: P.title,
      description: P.description,
      ogTitle: P.ogTitle,
      ogDescription: P.ogDescription,
      jsonLd: [
        breadcrumbJsonLd([
          { name: L.brand, url: `${ORIGIN}/` },
          { name: "Pricing", url },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "OfferCatalog",
          "@id": `${url}#offers`,
          name: P.h1,
          itemListElement: SERVICES.map((s) => ({
            "@type": "Offer",
            url: `${ORIGIN}${pfx}/services/${s.slug}`,
            itemOffered: {
              "@type": "Service",
              name: s[lang].name,
              serviceType: "Outcall massage",
              provider: { "@id": BUSINESS_ID },
            },
            priceCurrency: "THB",
            price: String(s.price),
            priceSpecification: {
              "@type": "PriceSpecification",
              priceCurrency: "THB",
              minPrice: String(s.price),
            },
          })),
        },
      ],
      noscript: `
        <h1>${P.h1}</h1>
        <p>${P.intro}</p>
        <h2>${P.menuHeading}</h2>
        <ul>
${SERVICES.map(
  (s) =>
    `          <li><a href="${ORIGIN}${pfx}/services/${s.slug}">${s[lang].name}</a> — ${L.fromPrice(
      s.price
    )} (${L.durations})</li>`
).join("\n")}
        </ul>
        <p>${P.contactLine}</p>
        <h2>${P.reserveHeading}</h2>
        <ul>
          <li><a href="${ORIGIN}${pfx}/">${P.homeLink}</a></li>
          <li><a href="${ORIGIN}${pfx}/services">${P.allServices}</a></li>
          <li><a href="https://lin.ee/uqvdwWt">LINE</a></li>
          <li><a href="https://t.me/SunRedvip_bkk">Telegram</a></li>
          <li><a href="https://wa.me/66634350987">WhatsApp</a></li>
        </ul>`,
    };
  });
}

// ── /therapists + /payment-methods (Round 28x.107) ────────────────────────
// Founder security/SEO audit: "เว็บเรา โดน ปิดกั้นหรือ ตาบอดบ้างไหม".
//
// Both of these sit in public/sitemap.xml — we tell Google to crawl them —
// but neither had a prerender entry, so both were served the untouched
// dist/index.html: the HOME PAGE's <title>, description, canonical and
// JSON-LD. Verified live before the fix: curl -A Googlebot on each returned
// "Outcall Massage Bangkok — Delivered to Your Hotel 24/7 | SunRed", byte-for-
// byte the homepage's. Two submitted URLs, zero unique signal — Google files
// that as duplicate and drops them, which is why brand queries are the only
// thing ranking.
//
// /therapists is a redirect-to-/ route in App.tsx (same shape as the five
// district keyword pages), so its shell is the whole SEO surface — the
// noscript body below is the only crawlable roster listing on the site.
// EN-only, matching the deliberate en-only policy on therapist detail pages
// (see therapistRoutes: "avoid thin localized duplicates").
function staticPageRoutes() {
  return [
    {
      path: "/therapists",
      canonicalPath: "/therapists",
      hreflangBase: null,
      htmlLang: "en",
      ogLocale: "en_US",
      title:
        "Our Practitioners — Verified Outcall Massage Therapists in Bangkok | SunRed",
      description: `Meet SunRed's verified female outcall massage practitioners in Bangkok — ${THERAPISTS.length} specialised therapists across ${AREAS_EN}. Live availability, discreet arrival to your hotel or residence, 24/7 concierge in EN/中文/日本語/한국어.`,
      ogTitle: "Our Practitioners — Verified Outcall Massage Therapists, Bangkok",
      ogDescription:
        "Verified SunRed practitioners across central Bangkok. Live availability, discreet arrival to your hotel, 24/7 concierge.",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "SunRed", url: `${ORIGIN}/` },
          { name: "Practitioners", url: `${ORIGIN}/therapists` },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "SunRed verified practitioners",
          itemListElement: THERAPISTS.map((t, i) => ({
            "@type": "ListItem",
            position: i + 1,
            name: t.name,
            url: `${ORIGIN}/therapists/${t.id}`,
          })),
        },
      ],
      noscript: `
        <h1>Our Practitioners — Verified Outcall Massage Therapists in Bangkok</h1>
        <p>Every SunRed practitioner is a licensed Thai female therapist, identity-verified
          by our concierge before her first session. Sessions are delivered to your hotel,
          residence or villa across ${AREAS_EN} — discreet arrival, multilingual concierge
          (English, 中文, 日本語, 한국어), available 24/7.</p>
        <h2>Practitioners</h2>
        <ul>
${THERAPISTS.map(
  (t) =>
    `          <li><a href="${ORIGIN}/therapists/${t.id}">${t.name}</a> — serving ${t.area} &amp; central Bangkok</li>`
).join("\n")}
        </ul>
        <h2>Reserve or ask the concierge</h2>
        <ul>
          <li><a href="${ORIGIN}/">Home — live availability</a></li>
          <li><a href="${ORIGIN}/services">Browse all services &amp; pricing</a></li>
          <li><a href="https://lin.ee/uqvdwWt">LINE</a></li>
          <li><a href="https://t.me/SunRedvip_bkk">Telegram</a></li>
          <li><a href="https://wa.me/66634350987">WhatsApp</a></li>
        </ul>`,
    },
    {
      path: "/payment-methods",
      canonicalPath: "/payment-methods",
      hreflangBase: null,
      htmlLang: "en",
      ogLocale: "en_US",
      title:
        "Payment, Travel Fee & Booking Policy — Outcall Massage Bangkok | SunRed",
      description:
        "How to pay SunRed: cash (THB), PromptPay QR, WeChat Pay and Alipay — settled with your practitioner on arrival, never in advance. Travel fee, arrival window, cancellation and privacy policy for outcall massage in Bangkok.",
      ogTitle: "Payment & Booking Policy | SunRed Bangkok",
      ogDescription:
        "Cash, PromptPay, WeChat Pay or Alipay — paid on arrival, never upfront. Travel fee, arrival window and cancellation policy.",
      jsonLd: [
        breadcrumbJsonLd([
          { name: "SunRed", url: `${ORIGIN}/` },
          { name: "Payment & Policy", url: `${ORIGIN}/payment-methods` },
        ]),
      ],
      noscript: `
        <h1>Payment, Travel Fee &amp; Booking Policy</h1>
        <p>SunRed is an outcall service: your practitioner travels to your hotel, residence
          or villa in Bangkok, and payment is settled with her on arrival — never in advance,
          never by bank transfer to a stranger.</p>
        <h2>Accepted payment methods</h2>
        <ul>
          <li>Cash — Thai Baht only</li>
          <li>PromptPay QR — no additional fee</li>
          <li>WeChat Pay / Alipay — carries a transfer fee (5% + &#3647;200 handling)</li>
        </ul>
        <h2>Before you reserve</h2>
        <ul>
          <li>A travel fee applies, calculated from your pin to the practitioner's dispatch point.</li>
          <li>Your address and pin are used for dispatch only, and are never shared publicly.</li>
          <li>The concierge confirms every reservation in chat before a practitioner is dispatched.</li>
        </ul>
        <h2>Reserve or ask the concierge</h2>
        <ul>
          <li><a href="${ORIGIN}/">Home — live availability</a></li>
          <li><a href="${ORIGIN}/services">Services &amp; pricing</a></li>
          <li><a href="https://lin.ee/uqvdwWt">LINE</a></li>
          <li><a href="https://t.me/SunRedvip_bkk">Telegram</a></li>
          <li><a href="https://wa.me/66634350987">WhatsApp</a></li>
        </ul>`,
    },
  ];
}

// ── /blog + /blog/:slug (Round 28x.108) ───────────────────────────────────
// Founder: "บลอค … เผื่อจะมีเนื้อหาไหน … ไปติดคำค้นหา" · "เจาะทุกกลุ่ม". The
// whole point of the blog is SEO, so the crawlable body IS the deliverable —
// each article's full semantic HTML goes straight into <noscript>, and the
// head carries a BlogPosting with the real keywords + word count. EN-only,
// same policy as therapist detail pages (no thin localized duplicates).
function blogRoutes() {
  const routes = [];

  // Index
  routes.push({
    path: "/blog",
    canonicalPath: "/blog",
    hreflangBase: null,
    htmlLang: "en",
    ogLocale: "en_US",
    title:
      "The SunRed Journal — Outcall Massage Guides for Bangkok Travellers | SunRed",
    description:
      "Practical, no-nonsense guides to outcall massage in Bangkok — how to choose a service, late-night options, after-flight recovery, and travel-specific advice for international visitors.",
    ogTitle: "The SunRed Journal — Outcall Massage Guides, Bangkok",
    ogDescription:
      "Guides to outcall massage in Bangkok for international travellers — choosing a service, late-night options, and recovery.",
    jsonLd: [
      breadcrumbJsonLd([
        { name: "SunRed", url: `${ORIGIN}/` },
        { name: "Journal", url: `${ORIGIN}/blog` },
      ]),
      {
        "@context": "https://schema.org",
        "@type": "Blog",
        "@id": `${ORIGIN}/blog#blog`,
        name: "The SunRed Journal",
        url: `${ORIGIN}/blog`,
        publisher: { "@id": BUSINESS_ID },
        blogPost: BLOG_POSTS.map((p) => ({
          "@type": "BlogPosting",
          headline: p.title,
          url: p.url,
          description: p.metaDescription,
        })),
      },
    ],
    noscript: `
        <h1>The SunRed Journal</h1>
        <p>Practical guides to outcall massage in Bangkok, written for
          international travellers.</p>
        <ul>
${BLOG_POSTS.map(
  (p) =>
    `          <li><a href="${p.url}">${p.title}</a> — ${p.readingMinutes} min read. ${p.metaDescription}</li>`
).join("\n")}
        </ul>
        <p><a href="${ORIGIN}/">Home — live availability</a></p>`,
  });

  // One route per article — the full HTML body is the crawlable payload.
  for (const p of BLOG_POSTS) {
    routes.push({
      path: `/blog/${p.slug}`,
      canonicalPath: `/blog/${p.slug}`,
      hreflangBase: null,
      htmlLang: "en",
      ogLocale: "en_US",
      title: `${p.title} | SunRed Journal`,
      description: p.metaDescription,
      ogTitle: p.title,
      ogDescription: p.metaDescription,
      jsonLd: [
        breadcrumbJsonLd([
          { name: "SunRed", url: `${ORIGIN}/` },
          { name: "Journal", url: `${ORIGIN}/blog` },
          { name: p.title, url: p.url },
        ]),
        {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "@id": `${p.url}#article`,
          headline: p.title,
          description: p.metaDescription,
          url: p.url,
          inLanguage: "en",
          keywords: p.keywords.join(", "),
          wordCount: p.words,
          isPartOf: { "@id": `${ORIGIN}/blog#blog` },
          publisher: { "@id": BUSINESS_ID },
          mainEntityOfPage: p.url,
        },
      ],
      noscript: `
        <article>
          <h1>${p.title}</h1>
          ${p.html}
          <hr />
          <p><a href="${ORIGIN}/">See tonight's live availability</a> ·
             <a href="${ORIGIN}/blog">More from the SunRed Journal</a></p>
        </article>`,
    });
  }
  return routes;
}

const ROUTES = [
  ...serviceRoutes(),
  ...therapistRoutes(),
  ...homeRoutes(),
  ...districtRoutes(),
  ...pricingRoutes(),
  ...staticPageRoutes(),
  ...blogRoutes(),
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
    // 🆕 Round 28x.99f — zh-TW now has its own real page at /zh-tw, so it
    // gets its own hreflang entry instead of pointing at the Simplified
    // /zh URL (previously an intentional alias — see i18n.ts history).
    `<link rel="alternate" hreflang="zh-TW" href="${ORIGIN}/zh-tw${base}" />`,
    `<link rel="alternate" hreflang="zh-HK" href="${ORIGIN}/zh-tw${base}" />`,
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
    `<link rel="alternate" hreflang="zh-TW" href="${ORIGIN}/zh-tw" />`,
    `<link rel="alternate" hreflang="zh-HK" href="${ORIGIN}/zh-tw" />`,
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
