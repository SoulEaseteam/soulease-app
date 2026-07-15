// src/utils/staleChunkReload.ts
//
// 🆕 Round 28x.36 (founder saw "Something went wrong · Failed to fetch
//   dynamically imported module: …/ProfilePage-*.js" right after a deploy) —
//   the classic Vite stale-chunk problem: a tab opened BEFORE a deploy still
//   holds the old index.html, whose lazy routes point at hashed chunk files
//   (ProfilePage-BMMQK2Cz.js) that the new deploy has replaced with new
//   hashes. Navigating to that lazy route 404s the old chunk and the import
//   rejects. Nothing is actually broken — the fix is to reload once so the
//   browser fetches the fresh index.html + current chunk hashes.
//
// Shared by main.tsx (the `vite:preloadError` event, fired by Vite's preload
// helper) and ErrorBoundary (the import rejection that bubbles up through
// React.lazy render). Both funnel through the SAME one-shot guard so a
// genuinely broken deploy can't trap a guest in a reload loop: we reload at
// most once per cooldown window; if the SAME failure recurs inside it, we
// stop and let the error surface.

const RELOAD_STAMP_KEY = "sr.chunkReloadAt";
const RELOAD_COOLDOWN_MS = 30_000;

/** True when an error looks like a failed dynamic import / stale chunk, across
 *  the wording variants the different browsers use. */
export function isDynamicImportError(error: unknown): boolean {
  const msg =
    (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  if (!msg) return false;
  return (
    msg.includes("failed to fetch dynamically imported module") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes("importing a module script failed") ||
    msg.includes("failed to load module script") ||
    // Safari / older Chrome wording for the same 404-on-chunk case.
    (msg.includes("dynamically imported module") && msg.includes("failed"))
  );
}

/**
 * Reload the page once to pick up the current deploy's chunks. Guarded so we
 * never loop: if we already reloaded within the cooldown window, do nothing
 * and return false (caller shows the error UI instead).
 *
 * @returns true if a reload was triggered (caller should render a quiet
 *          placeholder — navigation is imminent).
 */
export function reloadOnceForStaleChunk(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const last = Number(window.sessionStorage.getItem(RELOAD_STAMP_KEY) ?? 0);
    const now = Date.now();
    if (!last || now - last > RELOAD_COOLDOWN_MS) {
      window.sessionStorage.setItem(RELOAD_STAMP_KEY, String(now));
      window.location.reload();
      return true;
    }
  } catch {
    /* sessionStorage blocked (private mode / iframe) — fall through, no loop
       risk because we simply won't reload. */
  }
  return false;
}
