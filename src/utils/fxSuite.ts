// 🪄 Round 28x.219 — the FULL heartitude effect suite, SunRed-cut.
// Founder re-issued "เอาลูกเล่นทั้งหมดไปปรับแต่งให้ sunred" after the
// selective 28x.218 port — so this time everything comes over, restyled
// from studio-mint to Moko magenta + candlelight gold: twinkle
// starfield (28x.224), pointer stardust trail, click sparks, magnetic CTAs, 3D card
// tilt, floating hearts from the concierge FAB, and a heart cursor
// (CSS, in fx.css). The silk curtain shipped here in 28x.219 and was
// removed in 28x.220 — founder: "ไม่เอาพรึ่บตอนเปลี่ยนหน้า". Vanilla on
// purpose — zero React component surgery; everything attaches by
// selector/event so a revert is "remove two imports".
//
// Guardrails, all deliberate:
// - prefers-reduced-motion → the whole module no-ops.
// - Admin/staff routes → canvas hidden, hearts + cursor skipped
//   (speed over ceremony in the back office).
// - One shared canvas + one rAF loop, DPR capped at 1.5, paused while
//   document.hidden — first paint pays nothing (idle-loaded, main.tsx).
// - Tilt/magnetic use the INDIVIDUAL css `rotate`/`translate` props so
//   they compose with (and never fight) framer-motion's inline
//   `transform` on the therapist cards.

const REDUCE =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const FINE =
  typeof window !== "undefined" &&
  window.matchMedia("(hover: hover) and (pointer: fine)").matches;

const MAGENTA = "230,25,126";
const GOLD = "215,181,109";
const BLUSH = "240,80,160";

const isCustomerPath = (p: string) =>
  !p.startsWith("/admin") && !p.startsWith("/staff");

type Spark = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  ember?: boolean;
};

export function initFxSuite(): void {
  if (typeof window === "undefined" || REDUCE) return;
  if (document.getElementById("sr-fx-canvas")) return; // once

  let customer = isCustomerPath(location.pathname);

  /* ── shared canvas: ember dust + pointer trail + click sparks ── */
  const canvas = document.createElement("canvas");
  canvas.id = "sr-fx-canvas";
  canvas.className = "sr-fx-canvas";
  document.body.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  let W = 0;
  let H = 0;
  const resize = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  };
  // (stars reseed below once seedStars exists — see resize listener swap)
  resize();
  window.addEventListener("resize", () => {
    resize();
    seedStars();
  });

  // ambient field — 28x.224, founder: "เอาลูกเล่นแบบเว็บ heartitude".
  // The rising ember dust (tuned 28x.221→222) is replaced by heartitude's
  // signature: a fixed twinkle STARFIELD — small dots on 3 parallax depth
  // layers + a few 4-point sparkles, breathing in place, drifting with
  // scroll. Gold/magenta instead of heartitude's mint, same soul.
  type Star = {
    x: number; y: number; size: number; color: string;
    phase: number; speed: number; depth: number; sparkle: boolean;
  };
  const stars: Star[] = [];
  const seedStars = () => {
    stars.length = 0;
    for (let i = 0; i < 34; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        size: 0.8 + Math.random() * 1.4,
        color: Math.random() < 0.5 ? GOLD : MAGENTA,
        phase: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.9,
        depth: [0.04, 0.09, 0.16][i % 3],
        sparkle: false,
      });
    }
    for (let i = 0; i < 9; i++) {
      stars.push({
        x: Math.random() * W, y: Math.random() * H,
        size: 3 + Math.random() * 4.5,
        color: Math.random() < 0.7 ? GOLD : MAGENTA,
        phase: Math.random() * Math.PI * 2,
        speed: 0.25 + Math.random() * 0.5,
        depth: 0.1 + Math.random() * 0.08,
        sparkle: true,
      });
    }
  };
  seedStars();
  const drawSparkle = (x: number, y: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.quadraticCurveTo(x, y, x, y + r);
    ctx.quadraticCurveTo(x, y, x - r, y);
    ctx.quadraticCurveTo(x, y, x, y - r);
    ctx.fill();
  };

  const sparks: Spark[] = [];
  const spawnTrail = (x: number, y: number) => {
    if (!customer || sparks.length > 90) return;
    sparks.push({
      x: x + (Math.random() - 0.5) * 6,
      y: y + (Math.random() - 0.5) * 6,
      vx: (Math.random() - 0.5) * 0.5,
      vy: -0.3 - Math.random() * 0.6,
      life: 0,
      max: 34 + Math.random() * 18,
      size: 1.2 + Math.random() * 1.8,
      color: Math.random() < 0.5 ? GOLD : BLUSH,
    });
  };
  const burst = (x: number, y: number, n: number) => {
    if (!customer) return;
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.6;
      sparks.push({
        x,
        y,
        vx: Math.cos(a) * (0.8 + Math.random() * 1.4),
        vy: Math.sin(a) * (0.8 + Math.random() * 1.4) - 0.5,
        life: 0,
        max: 26 + Math.random() * 14,
        size: 1.2 + Math.random() * 1.4,
        color: Math.random() < 0.6 ? GOLD : MAGENTA,
      });
    }
  };

  let lastX = 0;
  let lastY = 0;
  let dist = 0;
  window.addEventListener(
    "pointermove",
    (e) => {
      dist += Math.hypot(e.clientX - lastX, e.clientY - lastY);
      lastX = e.clientX;
      lastY = e.clientY;
      if (dist > 26) {
        dist = 0;
        spawnTrail(e.clientX, e.clientY);
      }
    },
    { passive: true }
  );
  window.addEventListener(
    "pointerdown",
    (e) => {
      const btn = (e.target as Element | null)?.closest?.(
        ".MuiButtonBase-root, .sr-fx-tap, .sr-fx-spark"
      );
      if (btn) burst(e.clientX, e.clientY, 7);
    },
    { passive: true }
  );

  let running = true;
  const tick = () => {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);
    if (customer) {
      const t0 = performance.now() / 1000;
      const sy = window.scrollY;
      for (const s of stars) {
        const tw = Math.abs(Math.sin(s.phase + t0 * s.speed)); // 0..1 twinkle
        // parallax: deeper layers slide more as the guest scrolls
        const py = (((s.y - sy * s.depth) % (H + 40)) + H + 40) % (H + 40) - 20;
        if (s.sparkle) {
          const a = 0.12 + 0.4 * tw;
          ctx.fillStyle = `rgba(${s.color},${a.toFixed(3)})`;
          drawSparkle(s.x, py, s.size * (0.7 + 0.5 * tw));
        } else {
          const a = 0.08 + 0.3 * tw;
          ctx.fillStyle = `rgba(${s.color},${a.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(s.x, py, s.size, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.01;
        const t = 1 - p.life / p.max;
        if (t <= 0) {
          sparks.splice(i, 1);
          continue;
        }
        ctx.fillStyle = `rgba(${p.color},${0.6 * t})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * t, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  document.addEventListener("visibilitychange", () => {
    const wasRunning = running;
    running = !document.hidden;
    if (running && !wasRunning) requestAnimationFrame(tick);
  });

  /* ── magnetic CTAs (fine pointers only) ── */
  if (FINE) {
    let magnet: HTMLElement | null = null;
    document.addEventListener(
      "pointermove",
      (e) => {
        const el = (e.target as Element | null)?.closest?.(
          ".MuiButton-root, .MuiFab-root, .sr-fx-tap"
        ) as HTMLElement | null;
        if (magnet && magnet !== el) {
          magnet.style.translate = "";
          magnet = null;
        }
        if (!el || !customer) return;
        magnet = el;
        const r = el.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width;
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        el.style.translate = `${dx * 5}px ${dy * 4}px`;
      },
      { passive: true }
    );
    document.addEventListener(
      "pointerout",
      (e) => {
        if (magnet && !(e.relatedTarget as Element | null)?.closest?.(".MuiButton-root, .MuiFab-root, .sr-fx-tap")) {
          magnet.style.translate = "";
          magnet = null;
        }
      },
      { passive: true }
    );

    /* ── 3D tilt on cards (fine pointers only) — individual `rotate`
       prop + parent perspective, so framer's transform is untouched ── */
    document.addEventListener(
      "pointermove",
      (e) => {
        const card = (e.target as Element | null)?.closest?.(
          ".MuiCard-root"
        ) as HTMLElement | null;
        if (!card || !customer) return;
        const r = card.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width / 2)) / r.width; // -0.5..0.5
        const dy = (e.clientY - (r.top + r.height / 2)) / r.height;
        const ax = -dy; // rotateX from vertical offset
        const ay = dx; // rotateY from horizontal offset
        const theta = Math.min(Math.hypot(ax, ay) * 7, 4.5);
        const len = Math.hypot(ax, ay) || 1;
        if (card.parentElement && !card.parentElement.style.perspective) {
          card.parentElement.style.perspective = "900px";
        }
        card.style.rotate = `${(ax / len).toFixed(3)} ${(ay / len).toFixed(3)} 0 ${theta.toFixed(2)}deg`;
        card.style.transition = "rotate .18s ease-out";
      },
      { passive: true }
    );
    document.addEventListener(
      "pointerout",
      (e) => {
        const card = (e.target as Element | null)?.closest?.(
          ".MuiCard-root"
        ) as HTMLElement | null;
        if (card && !(e.relatedTarget as Element | null)?.closest?.(".MuiCard-root")) {
          card.style.rotate = "0 0 1 0deg";
        }
      },
      { passive: true }
    );
  }

  /* ── route tracking (RouteFx dispatches sr:route) — gates the canvas
     and cursor per route. The silk curtain that used to play here was
     REMOVED by founder direction 28x.220 ("ไม่เอาพรึ่บตอนเปลี่ยนหน้า");
     page changes keep only RouteFx's soft 220ms opacity fade. ── */
  window.addEventListener("sr:route", ((e: CustomEvent<string>) => {
    customer = isCustomerPath(e.detail || location.pathname);
    canvas.style.display = customer ? "" : "none";
  }) as EventListener);
  canvas.style.display = customer ? "" : "none";

  /* ── floating hearts from the concierge FAB ── */
  const FAB_SEL = '[aria-label="Concierge contact options"]';
  const heart = (x: number, y: number) => {
    const h = document.createElement("i");
    h.className = "sr-heart";
    h.style.left = `${x + (Math.random() - 0.5) * 18}px`;
    h.style.top = `${y}px`;
    h.style.setProperty("--drift", `${(Math.random() - 0.5) * 60}px`);
    document.body.appendChild(h);
    window.setTimeout(() => h.remove(), 1900);
  };
  const fabHearts = (n: number) => {
    if (!customer) return;
    const fab = document.querySelector(FAB_SEL);
    if (!fab) return;
    const r = fab.getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      window.setTimeout(() => heart(r.left + r.width / 2, r.top), i * 140);
    }
  };
  window.setInterval(() => {
    if (!document.hidden) fabHearts(1);
  }, 16000);
  document.addEventListener(
    "pointerdown",
    (e) => {
      if ((e.target as Element | null)?.closest?.(FAB_SEL)) fabHearts(4);
    },
    { passive: true }
  );

  /* ── heart cursor on customer routes (CSS class, styles in fx.css) ── */
  const syncCursor = () => {
    document.documentElement.classList.toggle("sr-heart-cursor", customer && FINE);
  };
  syncCursor();
  window.addEventListener("sr:route", syncCursor);
}
