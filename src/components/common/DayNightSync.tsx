// src/components/common/DayNightSync.tsx
//
// 🕯️ Round 28t (founder 2026-07-12) — auto day/night theme.
//
// Founder direction: the site should wear a warm LIGHT "day" palette
// (cream/ivory grounds) in daylight and a DARK "night" palette (espresso
// grounds) after dark — matching SunRed's 22:00–04:00 prime hours and the
// existing time-aware concierge mode. This component is the single runtime
// that flips `html.sr-day` on/off; all colours are CSS variables defined in
// index.css (`:root` = night · `html.sr-day` = day), so the switch is
// instant and paint-cheap. Accents (dusty rose · soft gold) are identical
// in both modes — only surfaces + text flip.
//
// Mode is derived from Bangkok local hour (day = 06:00–17:59). A manual
// override is supported for review + founder preference:
//   • ?theme=day | night | auto   (persists to localStorage)
//   • localStorage "sr-theme" = "day" | "night" | "auto"
// "auto" (default) follows the clock and re-checks every few minutes so the
// look crosses the dawn/dusk boundary without a reload.

import { useEffect } from "react";
import { nowBKK } from "@/utils/time";

type ThemeChoice = "day" | "night" | "auto";
const STORAGE_KEY = "sr-theme";
const DAY_START = 6; // 06:00 BKK
const DAY_END = 18; // 18:00 BKK (night from 18:00 to 05:59)

/** Is it daytime in Bangkok right now? (`nowBKK()` returns a Dayjs.) */
function isDaytimeBKK(): boolean {
  const h = nowBKK().hour();
  return h >= DAY_START && h < DAY_END;
}

function readChoice(): ThemeChoice {
  // URL override wins and is remembered.
  try {
    const q = new URLSearchParams(window.location.search).get("theme");
    if (q === "day" || q === "night" || q === "auto") {
      localStorage.setItem(STORAGE_KEY, q);
      return q;
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "day" || stored === "night" || stored === "auto") return stored;
  } catch {
    /* private-mode / SSR-safe no-op */
  }
  return "auto";
}

function applyMode() {
  const choice = readChoice();
  const day = choice === "auto" ? isDaytimeBKK() : choice === "day";
  document.documentElement.classList.toggle("sr-day", day);
}

const DayNightSync: React.FC = () => {
  useEffect(() => {
    applyMode();
    // Re-evaluate every 5 min so the dawn/dusk crossover happens live,
    // and whenever the tab regains focus (laptop wake / tab return).
    const id = window.setInterval(applyMode, 5 * 60 * 1000);
    const onVis = () => applyMode();
    window.addEventListener("focus", onVis);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onVis);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);
  return null;
};

export default DayNightSync;
