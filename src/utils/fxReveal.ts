// 🪄 Round 28x.218 — scroll-reveal driver for `.sr-reveal` landmarks
// (styles in src/styles/fx.css). Vanilla on purpose, like the rest of
// the polish layer: components opt in by className only and this
// module does all the observing, so there's no per-component hook to
// wire (or forget). A rAF-debounced MutationObserver catches lazily
// mounted routes. Never put `sr-reveal` on elements that already run
// their own whileInView (therapist cards) — double-animating them was
// the main thing this design avoids.
export function initFxReveal(): void {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
    return; // html.sr-fx never set → CSS keeps every .sr-reveal visible
  }

  // Opt the document into hidden-until-revealed styling only now that
  // the observer is confirmed to run (see fx.css: `html.sr-fx`).
  document.documentElement.classList.add("sr-fx");

  // Inline style, not only the class: React owns className on these MUI
  // Boxes, so any re-render (e.g. Firestore data landing) reconciles the
  // attribute back to its JSX value and silently wipes a classList-added
  // `sr-in` — leaving the element stuck at opacity 0 after we already
  // unobserved it. Inline style survives reconciliation (no style prop).
  const revealNow = (el: HTMLElement) => {
    el.classList.add("sr-in");
    el.style.opacity = "1";
    el.style.transform = "none";
    io.unobserve(el);
  };

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          revealNow(entry.target as HTMLElement);
        }
      }
    },
    { threshold: 0.05, rootMargin: "0px 0px -40px" }
  );

  // Belt-and-braces: IO entries only deliver on rendering frames, which
  // some embedded/hidden webviews suspend even while the page scrolls.
  // A passive manual bounds check on scroll + visibilitychange reveals
  // anything IO hasn't gotten to; it no-ops the moment nothing is
  // pending, so steady-state scrolling costs one querySelectorAll.
  const manualCheck = () => {
    const pending = document.querySelectorAll(".sr-reveal:not(.sr-in)");
    if (!pending.length) return;
    const vh = window.innerHeight;
    pending.forEach((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh - 40 && r.bottom > 0) revealNow(el as HTMLElement);
    });
  };
  window.addEventListener("scroll", manualCheck, { passive: true });
  document.addEventListener("visibilitychange", manualCheck);

  const seen = new WeakSet<Element>();
  const scan = () => {
    document.querySelectorAll(".sr-reveal:not(.sr-in)").forEach((el) => {
      if (seen.has(el)) return;
      seen.add(el);
      io.observe(el);
    });
  };

  scan();

  let queued = false;
  const mo = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scan();
    });
  });
  mo.observe(document.body, { childList: true, subtree: true });
}
