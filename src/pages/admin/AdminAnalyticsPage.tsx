// src/pages/admin/AdminAnalyticsPage.tsx
//
// 🆕 Round 28r15 (founder 2026-05-07) — Admin analytics dashboard.
//
// Reads from `analytics_events` collection (populated by Round 28r13)
// and renders the funnel as scannable cards. Client-side aggregation
// is intentional — at our traffic scale (10s–1000s of events/day) it
// stays well under 100ms; once we exceed 50K events/day we'll move
// aggregation to a Cloud Function + cached daily rollups.
//
// What it shows:
//   1. Funnel summary — home → service → booking start → booking complete
//   2. Conversion rate (overall + by concierge mode)
//   3. Top services viewed
//   4. Concierge channel ranking (LINE / WhatsApp / WeChat / TG / X / Hero CTAs)
//   5. Daily trend bars (last 7 days)
//
// What it deliberately doesn't do:
//   • Per-user / session-level drill-down (privacy + scope creep)
//   • Real-time live counter (refresh every 30s is fine)
//
// 🆕 Round 28s243 (founder: "เพิ่มตัวกรอง" — "ทั้งหมด", i.e. all 3 filter
//   ideas offered) — added a custom date-range picker (was locked to preset
//   7d/30d), a concierge-mode filter, and a language filter. All three
//   compose: the Firestore query narrows by date range server-side, then
//   mode/lang narrow `events` client-side before the existing aggregation
//   runs — so every widget on the page (funnel, by-mode, top services,
//   channels, daily trend) reflects the combined filter, not just one.

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
} from "@mui/material";
import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import dayjs, { type Dayjs } from "dayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

import { db } from "@/lib/firebase";
// 🆕 Round 28s242 (founder: "analytics" — bring the last un-restyled admin
//   page onto the shared Ocean Study tokens, same "fix the shared
//   subcomponents" pattern used for AdminEarningsPage in 28s236).
import { adminColor, adminFont } from "@/theme/adminTheme";

const SERIF = adminFont.serif;
const SANS = adminFont.sans;

interface AnalyticsEvent {
  event: string;
  sid?: string | null;
  mode?: string | null;
  referrer?: string | null;
  lang?: string | null;
  path?: string | null;
  props?: Record<string, unknown> | null;
  ts?: Timestamp | null;
}

type Range = "7d" | "30d" | "custom";

const LANG_OPTIONS = ["en", "th", "zh", "ja", "ko"] as const;
const MODE_OPTIONS = ["prime", "evening", "day", "off"] as const;
const MODE_FILTER_LABEL: Record<(typeof MODE_OPTIONS)[number], string> = {
  prime: "🌙 Prime (22:00–04:00)",
  evening: "🌅 Evening (17:00–22:00)",
  day: "☀ Day (09:00–17:00)",
  off: "☕ Off-hours (04:00–09:00)",
};

// 🆕 Round 28s303 (founder: "ทำครบ" — build all 3 offered add-ons:
//   daily visitor totals, traffic-source breakdown, peak hours). Maps a
//   raw referrer hostname (from document.referrer, stored per event) to a
//   friendly channel bucket. Unknown hosts fall through to the raw
//   hostname so nothing is silently dropped. null/own-domain = "Direct".
function classifyReferrer(ref?: string | null): string {
  if (!ref) return "Direct";
  const h = ref.toLowerCase();
  if (h.includes("sunred")) return "Direct"; // internal navigation
  if (h.includes("google")) return "Google";
  if (h.includes("bing")) return "Bing";
  if (h.includes("duckduckgo")) return "DuckDuckGo";
  if (h.includes("yahoo")) return "Yahoo";
  if (h.includes("instagram")) return "Instagram";
  if (h.includes("facebook") || h.includes("fb.me") || h === "fb.com") return "Facebook";
  if (h.includes("line.me") || h.startsWith("line.") || h.includes("liff.line")) return "LINE";
  if (h.includes("tiktok")) return "TikTok";
  if (h.includes("t.co") || h.includes("twitter") || h === "x.com" || h.endsWith(".x.com")) return "X / Twitter";
  if (h.includes("whatsapp") || h.includes("wa.me")) return "WhatsApp";
  if (h.includes("t.me") || h.includes("telegram")) return "Telegram";
  if (h.includes("youtube")) return "YouTube";
  if (h.includes("reddit")) return "Reddit";
  return ref; // unknown → keep raw hostname
}

const REF_LABEL: Record<string, string> = {
  Direct: "🔗 Direct · เข้าตรง",
  Google: "🔍 Google",
  Bing: "🔍 Bing",
  DuckDuckGo: "🔍 DuckDuckGo",
  Yahoo: "🔍 Yahoo",
  Instagram: "📸 Instagram",
  Facebook: "📘 Facebook",
  LINE: "💚 LINE",
  TikTok: "🎵 TikTok",
  "X / Twitter": "𝕏 Twitter",
  WhatsApp: "💬 WhatsApp",
  Telegram: "✈️ Telegram",
  YouTube: "▶️ YouTube",
  Reddit: "👽 Reddit",
};

// 🆕 Round 28s304 — district SEO landing pages (App.tsx keyword routes).
//   The `area` prop rides on home_view when a visitor arrived via one of
//   these pages; absent = they opened the home URL directly.
const AREA_LABEL: Record<string, string> = {
  sukhumvit: "🏙 Sukhumvit · สุขุมวิท",
  silom: "🏙 Silom · สีลม",
  asok: "🏙 Asok · อโศก",
  thonglor: "🏙 Thonglor · ทองหล่อ",
  "near-me": "📍 Near me · ใกล้ฉัน",
  __direct__: "🔗 Direct to homepage · เข้าตรง",
};

const selectSx = {
  minWidth: 150, fontSize: 13,
  "& .MuiOutlinedInput-notchedOutline": { borderColor: adminColor.line2 },
};
// 🆕 Round 28r45 — soft ink-tinted popover shadow (was dark-theme
//   rgba(0,0,0,0.4), overly heavy on the light Ocean Study surface —
//   same lesson as AdminEarningsPage 28s245).
const selectMenuProps = {
  PaperProps: { sx: { background: adminColor.panel, color: adminColor.text, borderRadius: "12px", boxShadow: "0 8px 24px rgba(31,41,51,0.10)" } },
};

const AdminAnalyticsPage: React.FC = () => {
  const [range, setRange] = useState<Range>("7d");
  const [customStart, setCustomStart] = useState<Dayjs>(dayjs().subtract(7, "day"));
  const [customEnd, setCustomEnd] = useState<Dayjs>(dayjs());
  const [modeFilter, setModeFilter] = useState("__ALL__");
  const [langFilter, setLangFilter] = useState("__ALL__");
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to events in the chosen window. Filters server-side by
  // `ts >= cutoff` (and `ts <= upper` for a custom range) so we don't pull
  // more than necessary.
  useEffect(() => {
    setLoading(true);
    let cutoff: Timestamp;
    let upper: Timestamp | null = null;
    if (range === "custom") {
      cutoff = Timestamp.fromDate(customStart.startOf("day").toDate());
      upper = Timestamp.fromDate(customEnd.endOf("day").toDate());
    } else {
      const days = range === "7d" ? 7 : 30;
      cutoff = Timestamp.fromDate(dayjs().subtract(days, "day").toDate());
    }
    const filters: Parameters<typeof query>[1][] = [where("ts", ">=", cutoff)];
    if (upper) filters.push(where("ts", "<=", upper));
    const q = query(collection(db, "analytics_events"), ...filters);
    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr: AnalyticsEvent[] = [];
        snap.forEach((doc) => {
          const d = doc.data() as DocumentData;
          arr.push({
            event: d.event ?? "",
            sid: d.sid ?? null,
            mode: d.mode ?? null,
            referrer: d.referrer ?? null,
            lang: d.lang ?? null,
            path: d.path ?? null,
            props: d.props ?? null,
            ts: d.ts ?? null,
          });
        });
        setEvents(arr);
        setLoading(false);
      },
      (err) => {
        console.error("[analytics] snapshot error:", err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, [range, customStart, customEnd]);

  // 🆕 Round 28s243 — mode/lang filters narrow client-side, after the
  //   date-range query already narrowed server-side.
  const filteredEvents = useMemo(() => {
    if (modeFilter === "__ALL__" && langFilter === "__ALL__") return events;
    return events.filter((ev) => {
      if (modeFilter !== "__ALL__" && (ev.mode ?? "day") !== modeFilter) return false;
      if (langFilter !== "__ALL__" && ev.lang !== langFilter) return false;
      return true;
    });
  }, [events, modeFilter, langFilter]);

  // ── Aggregations (memoised, recomputed on filtered events change) ──
  const stats = useMemo(() => {
    const byEvent: Record<string, number> = {};
    const sessionsByEvent: Record<string, Set<string>> = {};
    const byMode: Record<string, Record<string, number>> = {
      prime: {},
      evening: {},
      day: {},
      off: {},
    };
    const serviceViews: Record<string, number> = {};
    // 🆕 28t.14 — profile opens per practitioner. Keyed by display name
    //   when the event carried one (falls back to the raw therapistId).
    const therapistViews: Record<string, number> = {};
    const channels: Record<string, number> = {};
    const dailyByEvent: Record<string, Record<string, number>> = {
      home_view: {},
      booking_complete: {},
    };
    // 🆕 Round 28s303 — visitors-per-day (unique sessions, not raw
    //   events), traffic-source per session, and a 24-slot BKK-hour
    //   histogram. All keyed off home_view (the landing signal).
    const dailySessions: Record<string, Set<string>> = {};
    const sessionRef: Record<string, string> = {};
    const hourly: number[] = new Array(24).fill(0);
    // 🆕 Round 28s304 — which district SEO page pulled the visitor.
    const landingAreas: Record<string, number> = {};

    for (const ev of filteredEvents) {
      byEvent[ev.event] = (byEvent[ev.event] ?? 0) + 1;

      // Traffic source per session: first seen wins, but a known source
      // always upgrades a "Direct" placeholder (a visitor who arrived via
      // LINE then navigated internally still counts as LINE).
      if (ev.sid) {
        const cat = classifyReferrer(ev.referrer);
        if (sessionRef[ev.sid] === undefined) sessionRef[ev.sid] = cat;
        else if (sessionRef[ev.sid] === "Direct" && cat !== "Direct") sessionRef[ev.sid] = cat;
      }

      // Unique visitors per day + peak-hour histogram, both from the
      // home_view landing event (BKK = UTC+7, matching analytics.ts).
      if (ev.event === "home_view") {
        const area = (ev.props?.area as string) || "__direct__";
        landingAreas[area] = (landingAreas[area] ?? 0) + 1;
        if (ev.ts?.toDate) {
          const dt = ev.ts.toDate();
          if (ev.sid) {
            const date = dayjs(dt).format("YYYY-MM-DD");
            (dailySessions[date] ??= new Set()).add(ev.sid);
          }
          const bkkHour = (((dt.getUTCHours() + 7) % 24) + 24) % 24;
          hourly[bkkHour] += 1;
        }
      }

      if (ev.sid) {
        if (!sessionsByEvent[ev.event]) {
          sessionsByEvent[ev.event] = new Set();
        }
        sessionsByEvent[ev.event].add(ev.sid);
      }

      const mode = (ev.mode ?? "day") as keyof typeof byMode;
      if (byMode[mode]) {
        byMode[mode][ev.event] = (byMode[mode][ev.event] ?? 0) + 1;
      }

      if (ev.event === "service_view") {
        const sid = (ev.props?.serviceId as string) ?? "(unknown)";
        serviceViews[sid] = (serviceViews[sid] ?? 0) + 1;
      }

      // 🆕 28t.14 — practitioner profile opens, ranked in their own card.
      if (ev.event === "therapist_view") {
        const key =
          (ev.props?.name as string) ||
          (ev.props?.therapistId as string) ||
          "(unknown)";
        therapistViews[key] = (therapistViews[key] ?? 0) + 1;
      }

      if (ev.event === "concierge_chat_open") {
        const ch = (ev.props?.channel as string) ?? "(unknown)";
        channels[ch] = (channels[ch] ?? 0) + 1;
      }

      // Daily bucketing for the trend chart.
      if (ev.event === "home_view" || ev.event === "booking_complete") {
        const date = ev.ts?.toDate
          ? dayjs(ev.ts.toDate()).format("YYYY-MM-DD")
          : null;
        if (date) {
          dailyByEvent[ev.event][date] =
            (dailyByEvent[ev.event][date] ?? 0) + 1;
        }
      }
    }

    // Conversion rate: unique sessions with home_view → unique sessions with booking_complete
    const sessionsHome = sessionsByEvent.home_view?.size ?? 0;
    const sessionsBooked = sessionsByEvent.booking_complete?.size ?? 0;
    const conversionRate =
      sessionsHome > 0 ? (sessionsBooked / sessionsHome) * 100 : 0;

    // Per-mode conversion
    const modeConv: Record<string, { home: number; booked: number; pct: number }> = {};
    for (const m of Object.keys(byMode) as Array<keyof typeof byMode>) {
      const h = byMode[m].home_view ?? 0;
      const b = byMode[m].booking_complete ?? 0;
      modeConv[m] = {
        home: h,
        booked: b,
        pct: h > 0 ? (b / h) * 100 : 0,
      };
    }

    // Collapse per-session referrer map → counts per source bucket.
    const referrers: Record<string, number> = {};
    for (const cat of Object.values(sessionRef)) {
      referrers[cat] = (referrers[cat] ?? 0) + 1;
    }

    // Unique visitors per day (Set → size).
    const dailyVisitors: Record<string, number> = {};
    for (const [date, set] of Object.entries(dailySessions)) {
      dailyVisitors[date] = set.size;
    }

    // Peak hour = the busiest BKK hour of day (0 if no traffic).
    let peakHour = 0;
    let peakHourCount = 0;
    for (let h = 0; h < 24; h++) {
      if (hourly[h] > peakHourCount) {
        peakHourCount = hourly[h];
        peakHour = h;
      }
    }

    return {
      byEvent,
      conversionRate,
      sessionsHome,
      sessionsBooked,
      modeConv,
      serviceViews,
      therapistViews,
      channels,
      dailyByEvent,
      referrers,
      dailyVisitors,
      hourly,
      peakHour,
      peakHourCount,
      landingAreas,
    };
  }, [filteredEvents]);

  // Build the x-axis (newest first → oldest). Custom ranges are capped at
  // 60 days so the bar-per-day trend chart doesn't degrade into hairlines.
  const trendDates = useMemo(() => {
    let days: number;
    if (range === "custom") {
      days = Math.min(60, Math.max(1, customEnd.startOf("day").diff(customStart.startOf("day"), "day") + 1));
    } else {
      days = range === "7d" ? 7 : 30;
    }
    const anchor = range === "custom" ? customEnd : dayjs();
    const out: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      out.push(anchor.subtract(i, "day").format("YYYY-MM-DD"));
    }
    return out;
  }, [range, customStart, customEnd]);

  const trendMaxHome = useMemo(
    () =>
      Math.max(
        1,
        ...trendDates.map((d) => stats.dailyByEvent.home_view[d] ?? 0)
      ),
    [stats.dailyByEvent.home_view, trendDates]
  );

  // 🆕 Round 28s303 — headline "how many people visited" numbers, plus
  //   the busiest-hour label for the peak-hours card.
  const todayKey = dayjs().format("YYYY-MM-DD");
  const yesterdayKey = dayjs().subtract(1, "day").format("YYYY-MM-DD");
  const visitorsToday = stats.dailyVisitors[todayKey] ?? 0;
  const visitorsYesterday = stats.dailyVisitors[yesterdayKey] ?? 0;
  const hourlyMax = Math.max(1, ...stats.hourly);
  const peakHourLabel = `${String(stats.peakHour).padStart(2, "0")}:00–${String(
    (stats.peakHour + 1) % 24
  ).padStart(2, "0")}:00`;

  return (
    <Box sx={{ padding: { xs: 2, md: 3 }, maxWidth: 1200, margin: "0 auto" }}>
      {/* Header — 🆕 Round 28r45 bilingual (English primary + Thai
          subtitle). Same operator-scan pattern as Dashboard (28r35). */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: { xs: 24, md: 30 },
            fontWeight: 600,
            color: adminColor.text,
            letterSpacing: "-0.02em",
            lineHeight: 1,
            "& em": { fontStyle: "italic", color: adminColor.accent },
          }}
        >
          Funnel <em>Analytics</em>
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.5, letterSpacing: "0.02em" }}>
          การวิเคราะห์เส้นทางลูกค้า
        </Typography>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 13,
            color: adminColor.muted,
            marginTop: "10px",
          }}
        >
          Self-hosted event tracking · 100% privacy-friendly · refreshes
          live as new events come in
        </Typography>
      </Box>

      {/* 🆕 Round 28s243 — filter bar: date range (with custom From/To) +
           concierge-mode filter + language filter. All three narrow every
           widget below via `filteredEvents`. */}
      <Box
        sx={{
          borderRadius: "16px", background: adminColor.panel, border: `1px solid ${adminColor.line}`,
          p: "14px 16px", display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", mb: 3,
          "& .MuiInputBase-root": { color: adminColor.text },
          "& .MuiInputLabel-root": { color: adminColor.muted },
          "& .MuiOutlinedInput-notchedOutline": { borderColor: adminColor.line2 },
          "& .MuiSvgIcon-root": { color: adminColor.muted },
        }}
      >
        <ToggleButtonGroup
          value={range}
          exclusive
          size="small"
          onChange={(_, v) => v && setRange(v as Range)}
          sx={{
            "& .MuiToggleButton-root": {
              fontFamily: SANS, fontSize: 12.5, fontWeight: 600, textTransform: "none",
              color: adminColor.muted, borderColor: adminColor.line, padding: "6px 16px",
              "&.Mui-selected": { color: "#fff", background: adminColor.accent, "&:hover": { background: adminColor.accentDeep } },
            },
          }}
        >
          <ToggleButton value="7d">7 days</ToggleButton>
          <ToggleButton value="30d">30 days</ToggleButton>
          <ToggleButton value="custom">Custom</ToggleButton>
        </ToggleButtonGroup>

        {range === "custom" && (
          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <DatePicker
              label="From"
              value={customStart}
              maxDate={customEnd}
              onChange={(v) => v && setCustomStart(v)}
              slotProps={{ textField: { size: "small", sx: { width: 130 } } }}
            />
            <DatePicker
              label="To"
              value={customEnd}
              minDate={customStart}
              maxDate={dayjs()}
              onChange={(v) => v && setCustomEnd(v)}
              slotProps={{ textField: { size: "small", sx: { width: 130 } } }}
            />
          </LocalizationProvider>
        )}

        <Select size="small" value={modeFilter} onChange={(e) => setModeFilter(e.target.value)} sx={selectSx} MenuProps={selectMenuProps}>
          <MenuItem value="__ALL__">All modes</MenuItem>
          {MODE_OPTIONS.map((m) => (
            <MenuItem key={m} value={m}>{MODE_FILTER_LABEL[m]}</MenuItem>
          ))}
        </Select>

        <Select size="small" value={langFilter} onChange={(e) => setLangFilter(e.target.value)} sx={selectSx} MenuProps={selectMenuProps}>
          <MenuItem value="__ALL__">All languages</MenuItem>
          {LANG_OPTIONS.map((l) => (
            <MenuItem key={l} value={l}>{l.toUpperCase()}</MenuItem>
          ))}
        </Select>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <CircularProgress size={28} sx={{ color: adminColor.accent }} />
        </Box>
      ) : filteredEvents.length === 0 ? (
        <Card>
          <Typography
            sx={{ fontFamily: SANS, fontSize: 14, color: adminColor.muted }}
          >
            {events.length === 0 ? (
              <>
                No events yet · ยังไม่มีข้อมูล. Make sure{" "}
                <code>firestore.rules</code> have been published with the{" "}
                <code>analytics_events</code> rule, and that the site is
                being viewed on a non-localhost domain.
              </>
            ) : (
              "No events match this mode/language filter for the selected range · ไม่มีข้อมูลตรงกับตัวกรอง"
            )}
          </Typography>
        </Card>
      ) : (
        <>
        {/* 🆕 Round 28s303 — headline visitor counter. Directly answers
             "คนเข้าเว็บกี่คน": unique sessions that opened the home page,
             for the selected range + today + yesterday. */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" },
            gap: 2,
            mb: 2,
          }}
        >
          <HeroStat
            label="Visitors · Selected Range"
            sub="คนเข้าเว็บ · ช่วงที่เลือก"
            value={stats.sessionsHome}
            hint="Unique sessions · นับ 1 ต่อ 1 คน"
            big
          />
          <HeroStat
            label="Today"
            sub="วันนี้"
            value={visitorsToday}
            hint={visitorsYesterday > 0
              ? `${visitorsToday >= visitorsYesterday ? "▲" : "▼"} vs yesterday ${visitorsYesterday}`
              : "vs yesterday —"}
          />
          <HeroStat
            label="Yesterday"
            sub="เมื่อวาน"
            value={visitorsYesterday}
            hint={`Bookings ${stats.byEvent.booking_complete ?? 0} · ยอดจอง · ช่วงที่เลือก`}
          />
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
            gap: 2,
          }}
        >
          {/* Funnel summary */}
          <Card>
            <Eyebrow>Funnel</Eyebrow>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: 18,
                fontWeight: 600,
                color: adminColor.text,
                mb: 0.25,
                lineHeight: 1.2,
              }}
            >
              Where guests go
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, mb: 2 }}>
              เส้นทางลูกค้า
            </Typography>
            <FunnelStep
              label="Home views"
              value={stats.byEvent.home_view ?? 0}
              of={null}
            />
            <FunnelStep
              label="Service views"
              value={stats.byEvent.service_view ?? 0}
              of={stats.byEvent.home_view ?? 0}
            />
            {/* 🆕 28t.14 — practitioner profile opens: the browse→pick step. */}
            <FunnelStep
              label="Profile views"
              value={stats.byEvent.therapist_view ?? 0}
              of={stats.byEvent.home_view ?? 0}
            />
            <FunnelStep
              label="Booking start"
              value={stats.byEvent.booking_start ?? 0}
              of={stats.byEvent.home_view ?? 0}
            />
            <FunnelStep
              label="Booking complete"
              value={stats.byEvent.booking_complete ?? 0}
              of={stats.byEvent.home_view ?? 0}
              accent
            />
            <Box sx={{ mt: 2, fontSize: 12, color: adminColor.muted }}>
              Conversion (home → booking):{" "}
              <Box component="span" sx={{ fontWeight: 700, color: adminColor.accent }}>
                {stats.conversionRate.toFixed(1)}%
              </Box>{" "}
              ({stats.sessionsBooked} of {stats.sessionsHome} sessions)
            </Box>
          </Card>

          {/* Conversion by mode */}
          <Card>
            <Eyebrow>By concierge mode</Eyebrow>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: 18,
                fontWeight: 600,
                color: adminColor.text,
                mb: 0.25,
                lineHeight: 1.2,
              }}
            >
              When guests book most
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, mb: 2 }}>
              แยกตามช่วงเวลา
            </Typography>
            {(["prime", "evening", "day", "off"] as const).map((m) => {
              const row = stats.modeConv[m];
              return (
                <ModeRow
                  key={m}
                  mode={m}
                  home={row.home}
                  booked={row.booked}
                  pct={row.pct}
                />
              );
            })}
          </Card>

          {/* Top services */}
          <Card>
            <Eyebrow>Service interest</Eyebrow>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: 18,
                fontWeight: 600,
                color: adminColor.text,
                mb: 0.25,
                lineHeight: 1.2,
              }}
            >
              Top services viewed
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, mb: 2 }}>
              บริการที่ถูกดูมากสุด
            </Typography>
            <RankedList
              entries={Object.entries(stats.serviceViews)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)}
              emptyHint="No service_view events yet · ยังไม่มีข้อมูล"
            />
          </Card>

          {/* 🆕 28t.14 — Top practitioners viewed */}
          <Card>
            <Eyebrow>Practitioner interest</Eyebrow>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: 18,
                fontWeight: 600,
                color: adminColor.text,
                mb: 0.25,
                lineHeight: 1.2,
              }}
            >
              Top practitioners viewed
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, mb: 2 }}>
              โปรไฟล์ที่ถูกเปิดมากสุด
            </Typography>
            <RankedList
              entries={Object.entries(stats.therapistViews)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)}
              emptyHint="No therapist_view events yet · ยังไม่มีข้อมูล (forward-only; new sessions since 28t.14)"
            />
          </Card>

          {/* Concierge channels */}
          <Card>
            <Eyebrow>Concierge taps</Eyebrow>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: 18,
                fontWeight: 600,
                color: adminColor.text,
                mb: 0.25,
                lineHeight: 1.2,
              }}
            >
              Where guests reach out
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, mb: 2 }}>
              การกดติดต่อ
            </Typography>
            <RankedList
              entries={Object.entries(stats.channels)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)}
              emptyHint="No concierge_chat_open events yet · ยังไม่มีข้อมูล"
            />
          </Card>

          {/* 🆕 Round 28s303 — Traffic sources (referrer breakdown) */}
          <Card>
            <Eyebrow>Traffic sources</Eyebrow>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: 18,
                fontWeight: 600,
                color: adminColor.text,
                mb: 0.25,
                lineHeight: 1.2,
              }}
            >
              Where visitors came from
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, mb: 2 }}>
              คนมาจากไหน
            </Typography>
            <RankedList
              entries={Object.entries(stats.referrers)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([k, v]) => [REF_LABEL[k] ?? k, v] as [string, number])}
              emptyHint="No traffic source data yet · ยังไม่มีข้อมูลที่มา"
            />
          </Card>

          {/* 🆕 Round 28s304 — District SEO landing pages */}
          <Card>
            <Eyebrow>SEO landing pages</Eyebrow>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: 18,
                fontWeight: 600,
                color: adminColor.text,
                mb: 0.25,
                lineHeight: 1.2,
              }}
            >
              Which landing page pulled visitors
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, mb: 1 }}>
              คนมาจากหน้าไหน
            </Typography>
            <Box sx={{ mb: 1.5, fontFamily: SANS, fontSize: 11.5, color: adminColor.dim, fontStyle: "italic" }}>
              proxy for search terms — actual Google queries live in Search Console · proxy ของคำค้น
            </Box>
            <RankedList
              entries={Object.entries(stats.landingAreas)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => [AREA_LABEL[k] ?? k, v] as [string, number])}
              emptyHint="No data yet · ยังไม่มีข้อมูล (forward-only; new sessions since 28s304)"
            />
          </Card>

          {/* 🆕 Round 28s303 — Peak hours (24-slot BKK-hour histogram) */}
          <Card>
            <Eyebrow>Peak hours · BKK time</Eyebrow>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: 18,
                fontWeight: 600,
                color: adminColor.text,
                mb: 0.25,
                lineHeight: 1.2,
              }}
            >
              Busiest time of day
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, mb: 1 }}>
              คนเข้าเยอะช่วงไหน · เวลาไทย
            </Typography>
            <Box sx={{ mb: 1.5, fontFamily: SANS, fontSize: 12, color: adminColor.muted }}>
              {stats.peakHourCount > 0 ? (
                <>
                  Peak{" "}
                  <Box component="span" sx={{ fontWeight: 700, color: adminColor.accent }}>
                    {peakHourLabel}
                  </Box>{" "}
                  ({stats.peakHourCount.toLocaleString()} views · เข้าชม)
                </>
              ) : (
                "No hourly data yet · ยังไม่มีข้อมูล"
              )}
            </Box>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(24, 1fr)",
                gap: "2px",
                alignItems: "end",
                height: 90,
              }}
            >
              {stats.hourly.map((count, h) => (
                <Box
                  key={h}
                  title={`${String(h).padStart(2, "0")}:00 — ${count} เข้าชม`}
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                  }}
                >
                  <Box
                    sx={{
                      height: `${Math.max(count > 0 ? 6 : 0, (count / hourlyMax) * 100)}%`,
                      background: h === stats.peakHour && stats.peakHourCount > 0
                        ? adminColor.accent
                        : adminColor.panel3,
                      borderRadius: "2px 2px 0 0",
                    }}
                  />
                </Box>
              ))}
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "6px",
                fontFamily: SANS,
                fontSize: 10,
                color: adminColor.dim,
              }}
            >
              <span>00:00</span>
              <span>06:00</span>
              <span>12:00</span>
              <span>18:00</span>
              <span>23:00</span>
            </Box>
          </Card>

          {/* Daily trend — full row */}
          <Card sx={{ gridColumn: { md: "span 2" } }}>
            <Eyebrow>Daily trend</Eyebrow>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: 18,
                fontWeight: 600,
                color: adminColor.text,
                mb: 0.25,
                lineHeight: 1.2,
              }}
            >
              Home views vs Bookings · {trendDates.length} days
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim, mb: 2 }}>
              แนวโน้มรายวัน
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: `repeat(${trendDates.length}, 1fr)`,
                gap: "3px",
                alignItems: "end",
                height: 120,
              }}
            >
              {trendDates.map((d) => {
                const home = stats.dailyByEvent.home_view[d] ?? 0;
                const booked =
                  stats.dailyByEvent.booking_complete[d] ?? 0;
                const homePct = (home / trendMaxHome) * 100;
                const bookedPct = (booked / trendMaxHome) * 100;
                return (
                  <Box
                    key={d}
                    sx={{
                      position: "relative",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "flex-end",
                    }}
                    title={`${d}: ${home} views · ${booked} bookings`}
                  >
                    <Box
                      sx={{
                        height: `${homePct}%`,
                        background: adminColor.panel3,
                        borderRadius: "3px 3px 0 0",
                        position: "relative",
                      }}
                    />
                    <Box
                      sx={{
                        height: `${bookedPct}%`,
                        background: adminColor.accent,
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        right: 0,
                        borderRadius: "3px 3px 0 0",
                      }}
                    />
                  </Box>
                );
              })}
            </Box>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "8px",
                fontFamily: SANS,
                fontSize: 10,
                color: adminColor.dim,
              }}
            >
              <span>{dayjs(trendDates[0]).format("D MMM")}</span>
              <span>{dayjs(trendDates[trendDates.length - 1]).format("D MMM")}</span>
            </Box>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                marginTop: "8px",
                fontFamily: SANS,
                fontSize: 11,
                color: adminColor.muted,
              }}
            >
              <Legend color={adminColor.panel3} label="Home views · เข้าชม" />
              <Legend color={adminColor.accent} label="Bookings completed · จองสำเร็จ" />
            </Box>
          </Card>
        </Box>
        </>
      )}
    </Box>
  );
};

// ─── Subcomponents ─────────────────────────────────────────────────────

// 🆕 Round 28s303 — headline number tile for the visitor counter.
// 🆕 Round 28r45 — added Thai `sub` slot (bilingual pattern) + soft
//   ink-tinted depth shadow (was dark-theme rgba(0,0,0,0.25) — same
//   light-theme lesson as Earnings 28s245).
const HeroStat: React.FC<{
  label: string;
  sub?: string;
  value: number;
  hint?: string;
  big?: boolean;
}> = ({ label, sub, value, hint, big }) => (
  <Box
    sx={{
      padding: "18px 20px",
      borderRadius: "16px",
      background: big ? adminColor.accent : adminColor.panel,
      border: `1px solid ${big ? adminColor.accent : adminColor.line}`,
      boxShadow: big
        ? `0 8px 22px ${adminColor.accent}33, 0 2px 6px rgba(31,41,51,0.06)`
        : "0 2px 10px rgba(31,41,51,0.05)",
    }}
  >
    <Box
      sx={{
        fontFamily: SANS,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: big ? "rgba(255,255,255,0.9)" : adminColor.muted,
        mb: 0.3,
      }}
    >
      {label}
    </Box>
    {sub && (
      <Box
        sx={{
          fontFamily: SANS,
          fontSize: 10,
          fontWeight: 600,
          color: big ? "rgba(255,255,255,0.72)" : adminColor.dim,
          mb: 0.7,
        }}
      >
        {sub}
      </Box>
    )}
    <Box
      sx={{
        fontFamily: SERIF,
        fontSize: big ? 40 : 30,
        fontWeight: 700,
        lineHeight: 1,
        color: big ? "#fff" : adminColor.text,
        fontVariantNumeric: "lining-nums tabular-nums",
      }}
    >
      {value.toLocaleString()}
    </Box>
    {hint && (
      <Box
        sx={{
          fontFamily: SANS,
          fontSize: 11.5,
          color: big ? "rgba(255,255,255,0.85)" : adminColor.dim,
          mt: 0.75,
        }}
      >
        {hint}
      </Box>
    )}
  </Box>
);

// 🆕 Round 28r45 — soft ink-tinted depth shadow (was dark-theme
//   rgba(0,0,0,0.25); on the light Ocean Study palette that read as a
//   near-black smudge — same fix pattern as Earnings 28s245's Card
//   subcomponent). Radius bumped 16→18 to match Bookings/Dashboard cards.
const Card: React.FC<{
  children: React.ReactNode;
  sx?: React.ComponentProps<typeof Box>["sx"];
}> = ({ children, sx }) => (
  <Box
    sx={{
      padding: "20px 22px",
      borderRadius: "18px",
      background: adminColor.panel,
      border: `1px solid ${adminColor.line}`,
      boxShadow: "0 2px 10px rgba(31,41,51,0.05)",
      ...sx,
    }}
  >
    {children}
  </Box>
);

const Eyebrow: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      fontSize: 10,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: adminColor.muted,
      fontWeight: 700,
      mb: 0.5,
      fontFamily: SANS,
    }}
  >
    {children}
  </Box>
);

const FunnelStep: React.FC<{
  label: string;
  value: number;
  of: number | null;
  accent?: boolean;
}> = ({ label, value, of, accent }) => {
  const pct = of && of > 0 ? (value / of) * 100 : null;
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
      <Box
        sx={{
          width: 100,
          fontFamily: SANS,
          fontSize: 12,
          color: adminColor.muted,
        }}
      >
        {label}
      </Box>
      <Box sx={{ flex: 1, position: "relative", height: 8 }}>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: adminColor.line,
            borderRadius: "999px",
          }}
        />
        <Box
          sx={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: 0,
            width: `${pct ?? 100}%`,
            background: accent
              ? adminColor.accent
              : adminColor.dim,
            borderRadius: "999px",
            transition: "width 0.35s ease",
          }}
        />
      </Box>
      <Box
        sx={{
          minWidth: 70,
          textAlign: "right",
          fontFamily: SANS,
          fontSize: 13,
          fontWeight: 700,
          color: accent ? adminColor.accent : adminColor.text,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value.toLocaleString()}
        {pct != null && (
          <Box
            component="span"
            sx={{
              fontSize: 10,
              fontWeight: 500,
              color: adminColor.dim,
              ml: 0.5,
            }}
          >
            ({pct.toFixed(1)}%)
          </Box>
        )}
      </Box>
    </Box>
  );
};

const ModeRow: React.FC<{
  mode: "prime" | "evening" | "day" | "off";
  home: number;
  booked: number;
  pct: number;
}> = ({ mode, home, booked, pct }) => {
  const labels: Record<typeof mode, string> = {
    prime: "🌙 Prime (22:00–04:00)",
    evening: "🌅 Evening (17:00–22:00)",
    day: "☀ Day (09:00–17:00)",
    off: "☕ Off-hours (04:00–09:00)",
  };
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        py: 0.75,
        borderBottom: `1px solid ${adminColor.line}`,
        "&:last-of-type": { borderBottom: "none" },
      }}
    >
      <Box sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.text }}>
        {labels[mode]}
      </Box>
      <Box sx={{ fontFamily: SANS, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
        <Box component="span" sx={{ color: adminColor.muted }}>
          {booked}/{home}
        </Box>
        <Box
          component="span"
          sx={{
            fontWeight: 700,
            color: adminColor.accent,
            ml: 1,
          }}
        >
          {pct.toFixed(1)}%
        </Box>
      </Box>
    </Box>
  );
};

const RankedList: React.FC<{
  entries: [string, number][];
  emptyHint?: string;
}> = ({ entries, emptyHint }) => {
  if (entries.length === 0) {
    return (
      <Typography
        sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.dim, fontStyle: "italic" }}
      >
        {emptyHint ?? "No data."}
      </Typography>
    );
  }
  const max = Math.max(1, ...entries.map((e) => e[1]));
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {entries.map(([key, count]) => (
        <Box key={key} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              fontFamily: SANS,
              fontSize: 12.5,
              color: adminColor.text,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {key}
          </Box>
          <Box sx={{ flex: 2, position: "relative", height: 6 }}>
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                background: adminColor.panel3,
                borderRadius: "999px",
              }}
            />
            <Box
              sx={{
                position: "absolute",
                top: 0,
                bottom: 0,
                left: 0,
                width: `${(count / max) * 100}%`,
                background: adminColor.accent,
                borderRadius: "999px",
              }}
            />
          </Box>
          <Box
            sx={{
              minWidth: 40,
              textAlign: "right",
              fontFamily: SANS,
              fontSize: 12,
              fontWeight: 700,
              color: adminColor.text,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {count.toLocaleString()}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

const Legend: React.FC<{ color: string; label: string }> = ({ color, label }) => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
    <Box
      sx={{
        width: 10,
        height: 10,
        borderRadius: "2px",
        background: color,
      }}
    />
    {label}
  </Box>
);

export default AdminAnalyticsPage;
