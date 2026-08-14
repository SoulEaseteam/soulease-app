// src/utils/useDocumentMeta.ts
//
// 🪶 Lightweight per-page meta hook (no react-helmet dep required)
//
// อัพเดต <title>, <meta name="description">, og:* และ <link rel="canonical">
// แบบ idempotent — ทุกครั้งที่ component mount/changes จะ patch ค่าเดิมแทน

import { useEffect } from "react";

interface DocumentMetaInput {
  /** <title> — ถ้ามีค่า จะ update <title> ทันที */
  title?: string;
  /** <meta name="description"> */
  description?: string;
  /** og:image (URL absolute) */
  image?: string;
  /** og:url + canonical (default: window.location.href) */
  url?: string;
  /** og:type (default: 'website') */
  type?: string;
  /** language code for og:locale (e.g. en_US, th_TH, zh_CN, ja_JP, ko_KR) */
  locale?: string;
  /** Optional JSON-LD structured data — จะ inject ใต้ <head> และ remove ตอน unmount */
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /**
   * 🆕 28x.162 — emit `<meta name="robots" content="noindex, nofollow">` and
   * SKIP the canonical / og:url tags entirely.
   *
   * Needed for capability URLs like `/review/b/:id?t=<token>`: the query
   * string IS a bearer secret, and this hook's default behaviour would
   * otherwise copy the full href — token included — straight into a
   * `<link rel="canonical">` and an `og:url`, i.e. publish it. Set this on
   * ANY page whose URL carries a token.
   */
  noIndex?: boolean;
}

/** ตัวช่วย — set/upsert <meta> by name หรือ property */
function upsertMeta(
  selector: string,
  attr: "name" | "property",
  key: string,
  content: string
) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Hook สำหรับ inject per-page meta + JSON-LD
 *
 * @example
 *   useDocumentMeta({
 *     title: "Yuri • SUNRED Bangkok",
 *     description: "Yuri — Thai/Aroma therapist in Bangkok. Outcall bookings.",
 *     image: "https://res.cloudinary.com/.../yurie.jpeg",
 *     jsonLd: { "@context": "https://schema.org", "@type": "Person", ... }
 *   })
 */
export function useDocumentMeta(meta: DocumentMetaInput) {
  const {
    title,
    description,
    image,
    url,
    type = "website",
    locale,
    jsonLd,
    noIndex = false,
  } = meta;

  useEffect(() => {
    if (typeof document === "undefined") return;

    // 🆕 28x.162 — on a noIndex page the URL may carry a secret, so it must
    //   never be echoed into canonical/og:url below.
    const finalUrl = noIndex
      ? undefined
      : (url ??
        (typeof window !== "undefined" ? window.location.href : undefined));

    if (title) {
      document.title = title;
      upsertMeta('meta[property="og:title"]', "property", "og:title", title);
      upsertMeta(
        'meta[name="twitter:title"]',
        "name",
        "twitter:title",
        title
      );
    }

    if (description) {
      upsertMeta(
        'meta[name="description"]',
        "name",
        "description",
        description
      );
      upsertMeta(
        'meta[property="og:description"]',
        "property",
        "og:description",
        description
      );
      upsertMeta(
        'meta[name="twitter:description"]',
        "name",
        "twitter:description",
        description
      );
    }

    if (image) {
      upsertMeta('meta[property="og:image"]', "property", "og:image", image);
      upsertMeta(
        'meta[name="twitter:image"]',
        "name",
        "twitter:image",
        image
      );
    }

    if (finalUrl) {
      upsertMeta('meta[property="og:url"]', "property", "og:url", finalUrl);
      setLink("canonical", finalUrl);
    }

    upsertMeta('meta[property="og:type"]', "property", "og:type", type);

    // 🆕 28x.162 — robots. Written on EVERY render, not only when noIndex is
    //   true: this is a single-page app, so a stale "noindex" left behind by
    //   the previous route would otherwise follow the guest onto a page we do
    //   want indexed.
    upsertMeta(
      'meta[name="robots"]',
      "name",
      "robots",
      noIndex ? "noindex, nofollow" : "index, follow"
    );

    if (locale) {
      upsertMeta(
        'meta[property="og:locale"]',
        "property",
        "og:locale",
        locale
      );
    }

    // JSON-LD — inject + remove ตอน unmount
    let scriptEl: HTMLScriptElement | null = null;
    if (jsonLd) {
      scriptEl = document.createElement("script");
      scriptEl.type = "application/ld+json";
      scriptEl.dataset.dynamic = "true";
      scriptEl.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(scriptEl);
    }

    return () => {
      if (scriptEl?.parentNode) {
        scriptEl.parentNode.removeChild(scriptEl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, image, url, type, locale, noIndex, JSON.stringify(jsonLd)]);
}

/** Helper: map i18n short code → og:locale */
export function langToLocale(lang: string): string {
  const full = (lang || "en").toLowerCase();
  // zh-TW must be checked BEFORE the split("-")[0] fallback below, or it
  // collapses to "zh" and reports Simplified (zh_CN) og:locale for a
  // Traditional-Chinese page (Round 28x.99f).
  if (full === "zh-tw") return "zh_TW";
  const code = full.split("-")[0];
  const map: Record<string, string> = {
    en: "en_US",
    th: "th_TH",
    zh: "zh_CN",
    ja: "ja_JP",
    ko: "ko_KR",
  };
  return map[code] ?? "en_US";
}

export default useDocumentMeta;
