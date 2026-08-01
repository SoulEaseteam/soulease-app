// src/utils/imageFallback.ts
//
// 🚨 Round 28x.156 HOTFIX (founder 2026-07-30: "หน้าเว็บรูป เสียหมด แก้ด่วน",
//   screenshot — every practitioner photo on the home grid rendering as a
//   broken-image glyph, alt text showing through).
//
// ROOT CAUSE CLASS: every image on this site — home cards, detail heroes,
// service tiles, map pins, the staff app — is served through ONE external
// dependency, `enhanceImage()`'s Cloudinary fetch URL
// (`res.cloudinary.com/<cloud>/image/fetch/…/<original url>`). The originals
// were never the problem: all 227 files are present in `public/images` and
// ship to Vercel normally, and `img-src` in the CSP permits both hosts.
//
// That single point of failure is the actual defect. Cloudinary's free tier is
// metered monthly, so an account that runs out of credits (or gets suspended,
// or has fetch-mode restricted) stops delivering EVERY image at once, site-
// wide, with no code change on our side and no warning — which is exactly the
// shape of what the founder photographed, and it would silently recur at the
// end of any busy month.
//
// This module makes that failure survivable instead of fatal:
//
//   1. A capture-phase `error` listener catches image load failures ANYWHERE
//      in the app — no call site has to opt in, so surfaces nobody remembered
//      (and any added later) are covered too. When a Cloudinary URL fails, the
//      original address is decoded straight back out of it and swapped in.
//      The originals live on our own domain, so they load.
//
//   2. The first failure latches `cloudinaryDown`. `enhanceImage()` reads that
//      latch and stops wrapping — so after one broken image, every image
//      rendered for the rest of the session goes direct. Without the latch a
//      guest would pay a failed request per photo and watch them pop in one by
//      one; with it, the page self-heals almost immediately.
//
// The trade-off is deliberate and small: while Cloudinary is down, photos are
// unoptimised (no WebP/AVIF, no resize, heavier bytes). A slower photo is not
// in the same universe as no photo on a site whose entire product is the
// practitioner's picture.
//
// This does NOT diagnose why Cloudinary stopped. Check the Cloudinary
// dashboard's monthly credit usage first — see the note in CLAUDE.md §9.

/** Latched true the moment any Cloudinary-proxied image fails to load. */
let cloudinaryDown = false;

/** Read by enhanceImage() so later renders skip the proxy entirely. */
export function isCloudinaryDown(): boolean {
  return cloudinaryDown;
}

/**
 * Recover the original image address from a Cloudinary fetch URL.
 *
 * Shape: https://res.cloudinary.com/<cloud>/image/fetch/<transforms>/<encoded original>
 * The original is the LAST segment and is percent-encoded by enhanceImage(),
 * so everything after the transform chain is taken as-is rather than split on
 * "/" — the original is itself a URL and contains slashes.
 */
export function rawFromCloudinary(src: string): string | null {
  const marker = "res.cloudinary.com/";
  if (!src.includes(marker)) return null;
  const m = /\/image\/fetch\/[^/]+\/(.+)$/.exec(src);
  if (!m?.[1]) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    // Not double-encoded / already plain — usable either way.
    return m[1];
  }
}

/**
 * Install the global image-failure fallback. Call once, at startup.
 *
 * Uses the CAPTURE phase because resource load errors from <img> do not
 * bubble — a listener attached the normal way never sees them.
 */
export function installImageFallback(): void {
  if (typeof window === "undefined") return;

  window.addEventListener(
    "error",
    (event: Event) => {
      const el = event.target as HTMLImageElement | null;
      if (!el || el.tagName !== "IMG") return;

      const current = el.currentSrc || el.src || "";
      const raw = rawFromCloudinary(current);
      if (!raw) return; // not ours to fix — a genuinely missing original

      // Latch first, so anything React renders after this point is already
      // pointed straight at the origin.
      cloudinaryDown = true;

      // One retry per element. Without this guard, an original that is ALSO
      // broken would re-enter this handler forever.
      if (el.dataset.rawFallback === "1") return;
      el.dataset.rawFallback = "1";

      // srcset wins over src in the browser's selection, so a stale Cloudinary
      // srcset would immediately undo the swap below (enhanceImageSrcSet emits
      // 1x/2x pairs on some surfaces).
      el.removeAttribute("srcset");
      el.src = raw;
    },
    true
  );
}
