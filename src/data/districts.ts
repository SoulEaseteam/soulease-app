// src/data/districts.ts
//
// 🆕 Round 28x.7 (audit fix #3) — district SEO landing content, now
//   consumed by the SPA at runtime (not just the prerender).
//
// Background: the /outcall-massage-* routes used to render a bare
//   `<Navigate to="/" replace>`. The prerendered static shell carried
//   rich district copy + a self-referential canonical, but the moment
//   Googlebot executed JS the page redirected to `/`. Rendered DOM ≠
//   canonical → Google treated these as soft-redirect / thin pages and
//   demoted the exact district keywords the strategy targets ("outcall
//   massage sukhumvit", "massage near me"). Since paid ads are banned
//   for this vertical, these organic pages ARE the acquisition channel.
//
// Fix: KeywordLanding now renders the real home experience with a
//   district-specific hero band + district meta, so the hydrated page
//   matches its canonical and stays a genuine, indexable localized page.
//
// ⚠️ KEEP IN SYNC with scripts/prerender-routes.mjs (DISTRICTS +
//   DISTRICT_COPY). Same names/intro/extra + same title/description
//   builders, so the static shell and the hydrated SPA never disagree.

export type DistrictLang = "en" | "zh" | "zh-TW" | "ja" | "ko";

export interface DistrictContent {
  name: string;
  nearby: string;
  intro: string;
  extra: string;
}

export interface District {
  /** short key used in the route element, e.g. "sukhumvit" */
  area: string;
  /** full URL slug, e.g. "outcall-massage-sukhumvit" */
  slug: string;
  en: DistrictContent;
  zh: DistrictContent;
  "zh-TW": DistrictContent;
  ja: DistrictContent;
  ko: DistrictContent;
}

export const DISTRICTS: District[] = [
  {
    area: "sukhumvit",
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
    area: "silom",
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
    area: "asok",
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
    area: "thonglor",
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
    area: "near-me",
    slug: "outcall-massage-near-me",
    en: {
      name: "Bangkok (near you)",
      nearby:
        "Sukhumvit, Silom, Asok, Thonglor, Sathorn, Phrom Phong, Ekkamai and Ratchada",
      intro:
        "Premium outcall massage delivered anywhere in central Bangkok — the practitioner closest to your hotel is selected automatically. Live availability is shown below in real time so you can see who's free now.",
      extra:
        "Verified Thai practitioners typically arrive within 30–60 minutes in central Bangkok. Multilingual concierge (English, 中文, 日本語, 한국어), 24/7.",
    },
    zh: {
      name: "曼谷（离您最近）",
      nearby: "素坤逸、是隆、阿索克、通罗、沙吞、彭蓬、伊卡迈、拉差达",
      intro:
        "高端上门按摩送达曼谷市中心任何位置——系统自动为您匹配距离最近的技师。下方实时显示当下可订状态。",
      extra:
        "认证泰国女性技师通常在 30–60 分钟内抵达曼谷市中心。多语言客服（English / 中文 / 日本語 / 한국어），全天候 24 小时。",
    },
    "zh-TW": {
      name: "曼谷（離您最近）",
      nearby: "蘇坤蔚、是隆、阿索克、通羅、沙吞、彭蓬、伊卡邁、拉差達",
      intro:
        "高端到府按摩送達曼谷市中心任何位置——系統自動為您配對距離最近的技師。下方即時顯示當下可訂狀態。",
      extra:
        "認證泰國女性技師通常在 30–60 分鐘內抵達曼谷市中心。多語言客服（English / 中文 / 日本語 / 한국어），全天候 24 小時。",
    },
    ja: {
      name: "バンコク（お近く）",
      nearby:
        "スクンビット、シーロム、アソーク、トンロー、サトーン、プロンポン、エカマイ、ラチャダー",
      intro:
        "バンコク中心部のどこへでも出張高級マッサージをお届けします。ホテルに最も近いセラピストを自動で手配。下にはリアルタイムの空き状況を表示します。",
      extra:
        "認定タイ人女性セラピストは通常 30〜60 分以内にバンコク中心部へ到着。多言語コンシェルジュ（English / 中文 / 日本語 / 한국어）、24 時間対応。",
    },
    ko: {
      name: "방콕(가까운 위치)",
      nearby: "수쿰빗, 실롬, 아속, 통러, 사톤, 프롬퐁, 에까마이, 라차다",
      intro:
        "방콕 시내 어디든 프리미엄 출장 마사지를 제공합니다 — 호텔에서 가장 가까운 테라피스트가 자동 배정됩니다. 아래에서 실시간 예약 가능 상태를 확인할 수 있습니다.",
      extra:
        "인증 태국 여성 테라피스트가 방콕 시내 어디든 보통 30~60분 내 도착. 다국어 컨시어지 (English / 中文 / 日本語 / 한국어), 24시간 운영.",
    },
  },
];

/** Resolve the district record for a given area key (from the route). */
export function districtByArea(area: string): District | undefined {
  return DISTRICTS.find((d) => d.area === area);
}

/** Pick the best language block for a district given the active i18n lang. */
export function districtContent(d: District, lang: string): DistrictContent {
  const full = (lang || "en").toLowerCase();
  // zh-TW must resolve before the split("-")[0] fallback, or it collapses
  // to "zh" and a Traditional-Chinese guest reads Simplified copy.
  if (full === "zh-tw") return d["zh-TW"];
  const base = full.split("-")[0];
  if (base === "zh" || base === "ja" || base === "ko") return d[base];
  return d.en; // th visitors + everything else read the English district copy
}

// ── SEO title/description builders — mirror DISTRICT_COPY in prerender ──
type CopyLang = "en" | "zh" | "zh-TW" | "ja" | "ko";

const TITLE: Record<CopyLang, (name: string) => string> = {
  en: (n) => `Outcall Massage ${n} — Delivered to Your Hotel 24/7 | SunRed`,
  zh: (n) => `${n}上门按摩 24小时 · 送达酒店 | SunRed`,
  "zh-TW": (n) => `${n}到府按摩 24小時 · 送達飯店 | SunRed`,
  ja: (n) => `${n}出張マッサージ 24時間 · ホテルへお届け | SunRed`,
  ko: (n) => `${n} 출장 마사지 24시간 · 호텔로 방문 | SunRed`,
};

const DESCRIPTION: Record<CopyLang, (name: string, nearby: string) => string> = {
  en: (n, nb) =>
    `Premium outcall massage in ${n}, Bangkok, delivered to your hotel — verified Thai practitioners, live 24/7 availability, multilingual concierge. Covering ${nb}.`,
  zh: (n, nb) =>
    `${n}（曼谷）高端上门按摩送达您的酒店——认证泰国女性技师、全天候 24 小时实时空闲、多语言客服。覆盖 ${nb}。`,
  "zh-TW": (n, nb) =>
    `${n}（曼谷）高端到府按摩送達您的飯店——認證泰國女性技師、全天候 24 小時即時空閒、多語言客服。涵蓋 ${nb}。`,
  ja: (n, nb) =>
    `${n}（バンコク）の高級出張マッサージをホテルへお届け——認定タイ人女性セラピスト、24 時間リアルタイム予約、多言語コンシェルジュ。${nb} に対応。`,
  ko: (n, nb) =>
    `${n}(방콕) 프리미엄 출장 마사지를 호텔로 — 인증 태국 여성 테라피스트, 24시간 실시간 예약, 다국어 컨시어지. ${nb} 커버.`,
};

const H1: Record<CopyLang, (name: string) => string> = {
  en: (n) => `Outcall Massage in ${n} — Delivered to Your Hotel`,
  zh: (n) => `${n}上门按摩 — 送达您的酒店`,
  "zh-TW": (n) => `${n}到府按摩 — 送達您的飯店`,
  ja: (n) => `${n}出張マッサージ — ホテルへお届け`,
  ko: (n) => `${n} 출장 마사지 — 호텔로 방문`,
};

function copyLang(lang: string): CopyLang {
  const full = (lang || "en").toLowerCase();
  if (full === "zh-tw") return "zh-TW";
  const base = full.split("-")[0];
  return base === "zh" || base === "ja" || base === "ko" ? base : "en";
}

export function districtMeta(d: District, lang: string) {
  const cl = copyLang(lang);
  // Meta always uses the SAME language block as the copy builders so the
  // localized name and the localized sentence template agree.
  const c = cl === "en" ? d.en : d[cl];
  return {
    title: TITLE[cl](c.name),
    description: DESCRIPTION[cl](c.name, c.nearby),
    h1: H1[cl](c.name),
    url: `https://sunred.vip/${d.slug}`,
  };
}
