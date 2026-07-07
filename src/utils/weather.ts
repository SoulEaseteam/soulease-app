// src/utils/weather.ts
//
// 🌧 Weather check for the taxi-fare surcharge layer.
//
// Bangkok rain pattern is bursty — short heavy storms followed by clear
// skies. Drivers raise prices during rain (Grab does this automatically
// via surge multipliers). We mirror that on the booking page so the
// quoted fare reflects what the therapist actually pays the driver.
//
// Surcharge tiers:
//   none     0%
//   light   +15%   (drizzle, light rain)
//   heavy   +30%   (storm, thunderstorm, monsoon)
//
// 🚧 Implementation: stub that returns the cached value if recent;
//    otherwise polls a free public weather endpoint (wttr.in) for
//    Bangkok and classifies. Falls back to 'none' on any error so a
//    failed check never blocks a booking.
//
// ⚠️ Production swap: replace fetchWeatherFromApi() with OpenWeatherMap
//    or a Cloud Function proxy that holds the API key. The client
//    interface (cache + tier classification) doesn't change.

const CACHE_KEY = "sunred_weather_v1";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export type RainTier = "none" | "light" | "heavy";

export interface RainStatus {
  tier: RainTier;
  /** Multiplier to apply on top of base fare (0 / 0.15 / 0.30). */
  surchargePct: number;
  /** Human label shown on the pricing card. */
  label: string;
  /** When this status was determined (ms epoch). */
  fetchedAt: number;
}

const NO_RAIN: RainStatus = {
  tier: "none",
  surchargePct: 0,
  label: "Clear",
  fetchedAt: Date.now(),
};

const TIER_MAP: Record<RainTier, { surcharge: number; label: string }> = {
  none: { surcharge: 0, label: "Clear" },
  light: { surcharge: 0.15, label: "Light rain (+15%)" },
  heavy: { surcharge: 0.3, label: "Heavy rain (+30%)" },
};

// Classify a weather description from wttr.in into our 3 tiers.
function classifyWeather(desc: string): RainTier {
  const d = desc.toLowerCase();
  if (
    d.includes("thunder") ||
    d.includes("storm") ||
    d.includes("heavy rain") ||
    d.includes("torrential")
  ) {
    return "heavy";
  }
  if (
    d.includes("drizzle") ||
    d.includes("light rain") ||
    d.includes("shower") ||
    d.includes("rain")
  ) {
    return "light";
  }
  return "none";
}

async function fetchWeatherFromApi(): Promise<RainTier> {
  // wttr.in returns plain JSON for ?format=j1 — we just need current
  // condition's text. No key required, no CORS hassle for client-side.
  try {
    const r = await fetch(
      "https://wttr.in/Bangkok?format=%C&lang=en",
      { method: "GET", signal: AbortSignal.timeout(4000) }
    );
    if (!r.ok) return "none";
    const text = (await r.text()).trim();
    return classifyWeather(text);
  } catch {
    return "none";
  }
}

function readCache(): RainStatus | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RainStatus;
    if (Date.now() - parsed.fetchedAt < CACHE_TTL_MS) return parsed;
  } catch {
    // ignore
  }
  return null;
}

function writeCache(status: RainStatus) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(status));
  } catch {
    // ignore (private mode)
  }
}

/**
 * Fetch the current Bangkok rain status. Caches for 30 minutes so the
 * component tree can call this freely without spamming the network.
 */
export async function getRainStatus(): Promise<RainStatus> {
  const cached = readCache();
  if (cached) return cached;

  const tier = await fetchWeatherFromApi();
  const meta = TIER_MAP[tier];
  const status: RainStatus = {
    tier,
    surchargePct: meta.surcharge,
    label: meta.label,
    fetchedAt: Date.now(),
  };
  writeCache(status);
  return status;
}

/**
 * Synchronous accessor — returns the cached status if fresh, else
 * NO_RAIN as a safe default. Used by the pricing UI which can't await.
 */
export function getCachedRainStatus(): RainStatus {
  return readCache() ?? NO_RAIN;
}

/**
 * Force-refresh the cache. Useful when admin wants to recompute or
 * when the user opens the booking page after a long idle.
 */
export async function refreshRainStatus(): Promise<RainStatus> {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(CACHE_KEY);
    } catch {
      // ignore
    }
  }
  return getRainStatus();
}

// ─────────────────────────────────────────────────────────────────────
// 🆕 Round 28s310 (founder: "คำนวนสภาพอากาศ ช่วงฝนตก จาก พยากรณ์อากาศ จริง
//   ตามเวลานั้นๆ") — the surcharge used the CURRENT Bangkok weather for
//   every booking regardless of when the appointment is. Now we pull the
//   real hourly FORECAST (wttr.in j1 = 3 days, every 3 h) and price the
//   rain from the forecast at the booking's scheduled date + hour.
// ─────────────────────────────────────────────────────────────────────

const FORECAST_CACHE_KEY = "sunred_forecast_v1";
const FORECAST_TTL_MS = 2 * 60 * 60 * 1000; // 2h — forecasts move slowly

/** date "YYYY-MM-DD" → { 3-hour slot (0,3,…,21) → tier }. */
export type RainForecast = Record<string, Record<number, RainTier>>;

/** Forecast slots carry a rain-chance %, so a "cloudy but 80% rain" slot
 *  still prices as rain even when the text label is mild. */
function classifyForecastSlot(desc: string, chanceOfRainPct: number): RainTier {
  const base = classifyWeather(desc);
  if (base === "heavy") return "heavy";
  if (chanceOfRainPct >= 80 && /(thunder|storm)/i.test(desc)) return "heavy";
  if (base === "light" || chanceOfRainPct >= 60) return "light";
  return "none";
}

async function fetchForecastFromApi(): Promise<RainForecast | null> {
  try {
    const r = await fetch("https://wttr.in/Bangkok?format=j1", {
      method: "GET",
      signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as {
      weather?: Array<{
        date?: string;
        hourly?: Array<{
          time?: string;
          weatherDesc?: Array<{ value?: string }>;
          chanceofrain?: string;
        }>;
      }>;
    };
    const map: RainForecast = {};
    for (const day of j?.weather ?? []) {
      if (typeof day?.date !== "string") continue;
      const slots: Record<number, RainTier> = {};
      for (const h of day?.hourly ?? []) {
        const t = parseInt(h?.time ?? "", 10);
        if (!Number.isFinite(t)) continue;
        const slot = Math.floor(t / 100); // "2100" → 21
        const desc = h?.weatherDesc?.[0]?.value ?? "";
        const chance = parseInt(h?.chanceofrain ?? "0", 10) || 0;
        slots[slot] = classifyForecastSlot(desc, chance);
      }
      map[day.date] = slots;
    }
    return Object.keys(map).length ? map : null;
  } catch {
    return null;
  }
}

function readForecastCache(): RainForecast | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(FORECAST_CACHE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { at: number; map: RainForecast };
    if (Date.now() - p.at < FORECAST_TTL_MS) return p.map;
  } catch {
    // ignore
  }
  return null;
}

/** Fetch (cached 2h) the Bangkok hourly rain forecast. Null on any error
 *  so the caller falls back to current weather. */
export async function getRainForecast(): Promise<RainForecast | null> {
  const cached = readForecastCache();
  if (cached) return cached;
  const map = await fetchForecastFromApi();
  if (map && typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        FORECAST_CACHE_KEY,
        JSON.stringify({ at: Date.now(), map })
      );
    } catch {
      // ignore
    }
  }
  return map;
}

/**
 * Rain status for a specific scheduled date ("YYYY-MM-DD") + hour (0–23),
 * read from a fetched forecast. Returns null when the slot isn't covered
 * (unknown date / beyond the ~3-day horizon) so the caller can fall back
 * to the current-weather status.
 */
export function rainStatusFromForecast(
  forecast: RainForecast | null,
  dateISO: string | null | undefined,
  hour: number | null | undefined
): RainStatus | null {
  if (!forecast || !dateISO || hour == null || !Number.isFinite(hour)) return null;
  const day = forecast[dateISO];
  if (!day) return null;
  // Snap the scheduled hour to the nearest 3-hour forecast slot (0–21).
  const slot = Math.min(21, Math.max(0, Math.round(hour / 3) * 3));
  const tier: RainTier = day[slot] ?? "none";
  const meta = TIER_MAP[tier];
  return {
    tier,
    surchargePct: meta.surcharge,
    label: meta.label,
    fetchedAt: Date.now(),
  };
}
