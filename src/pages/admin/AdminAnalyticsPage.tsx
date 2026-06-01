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
//   • Date range pickers — sticking to last 7 / 30 days for v1

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import {
  collection,
  onSnapshot,
  query,
  where,
  Timestamp,
  type DocumentData,
} from "firebase/firestore";
import dayjs from "dayjs";

import { db } from "@/lib/firebase";

const SERIF = '"Federo", "Italiana", "Cinzel", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

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

type Range = "7d" | "30d";

const AdminAnalyticsPage: React.FC = () => {
  const [range, setRange] = useState<Range>("7d");
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to events in the chosen window. Filters server-side by
  // `ts >= cutoff` so we don't pull more than necessary.
  useEffect(() => {
    setLoading(true);
    const days = range === "7d" ? 7 : 30;
    const cutoff = Timestamp.fromDate(
      dayjs().subtract(days, "day").toDate()
    );
    const q = query(
      collection(db, "analytics_events"),
      where("ts", ">=", cutoff)
    );
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
  }, [range]);

  // ── Aggregations (memoised, recomputed on event/range change) ──
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
    const channels: Record<string, number> = {};
    const dailyByEvent: Record<string, Record<string, number>> = {
      home_view: {},
      booking_complete: {},
    };

    for (const ev of events) {
      byEvent[ev.event] = (byEvent[ev.event] ?? 0) + 1;

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

    return {
      byEvent,
      conversionRate,
      sessionsHome,
      sessionsBooked,
      modeConv,
      serviceViews,
      channels,
      dailyByEvent,
    };
  }, [events]);

  // Build the 7/30-day x-axis (newest first → oldest)
  const trendDates = useMemo(() => {
    const days = range === "7d" ? 7 : 30;
    const out: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      out.push(dayjs().subtract(i, "day").format("YYYY-MM-DD"));
    }
    return out;
  }, [range]);

  const trendMaxHome = useMemo(
    () =>
      Math.max(
        1,
        ...trendDates.map((d) => stats.dailyByEvent.home_view[d] ?? 0)
      ),
    [stats.dailyByEvent.home_view, trendDates]
  );

  return (
    <Box sx={{ padding: { xs: 2, md: 3 }, maxWidth: 1200, margin: "0 auto" }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: { xs: 24, md: 30 },
            fontWeight: 600,
            color: "#1A2B2E",
            letterSpacing: "-0.02em",
            "& em": { fontStyle: "italic", color: "#B4000A" },
          }}
        >
          Funnel <em>Analytics</em>
        </Typography>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: 13,
            color: "rgba(15, 23, 42, 0.65)",
            marginTop: "4px",
          }}
        >
          Self-hosted event tracking · 100% privacy-friendly · refreshes
          live as new events come in
        </Typography>
      </Box>

      {/* Range toggle */}
      <ToggleButtonGroup
        value={range}
        exclusive
        size="small"
        onChange={(_, v) => v && setRange(v as Range)}
        sx={{ mb: 3 }}
      >
        <ToggleButton value="7d">Last 7 days</ToggleButton>
        <ToggleButton value="30d">Last 30 days</ToggleButton>
      </ToggleButtonGroup>

      {loading ? (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <CircularProgress size={28} sx={{ color: "#B4000A" }} />
        </Box>
      ) : events.length === 0 ? (
        <Card>
          <Typography
            sx={{ fontFamily: SANS, fontSize: 14, color: "rgba(15, 23, 42,0.6)" }}
          >
            No events yet. Make sure <code>firestore.rules</code> have been
            published with the <code>analytics_events</code> rule, and that
            the site is being viewed on a non-localhost domain.
          </Typography>
        </Card>
      ) : (
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
                color: "#1A2B2E",
                mb: 2,
              }}
            >
              Where guests go
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
            <Box sx={{ mt: 2, fontSize: 12, color: "rgba(15, 23, 42,0.6)" }}>
              Conversion (home → booking):{" "}
              <Box component="span" sx={{ fontWeight: 700, color: "#B4000A" }}>
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
                color: "#1A2B2E",
                mb: 2,
              }}
            >
              When guests book most
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
                color: "#1A2B2E",
                mb: 2,
              }}
            >
              Top services viewed
            </Typography>
            <RankedList
              entries={Object.entries(stats.serviceViews)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 6)}
              emptyHint="No service_view events yet."
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
                color: "#1A2B2E",
                mb: 2,
              }}
            >
              Where guests reach out
            </Typography>
            <RankedList
              entries={Object.entries(stats.channels)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)}
              emptyHint="No concierge_chat_open events yet."
            />
          </Card>

          {/* Daily trend — full row */}
          <Card sx={{ gridColumn: { md: "span 2" } }}>
            <Eyebrow>Daily trend</Eyebrow>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: 18,
                fontWeight: 600,
                color: "#1A2B2E",
                mb: 2,
              }}
            >
              Home views vs Bookings · {range === "7d" ? "7" : "30"} days
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
                        background:
                          "rgba(15, 23, 42, 0.25)",
                        borderRadius: "3px 3px 0 0",
                        position: "relative",
                      }}
                    />
                    <Box
                      sx={{
                        height: `${bookedPct}%`,
                        background: "#B4000A",
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
                color: "rgba(15, 23, 42,0.55)",
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
                color: "rgba(15, 23, 42,0.7)",
              }}
            >
              <Legend color="rgba(15, 23, 42, 0.30)" label="Home views" />
              <Legend color="#B4000A" label="Bookings completed" />
            </Box>
          </Card>
        </Box>
      )}
    </Box>
  );
};

// ─── Subcomponents ─────────────────────────────────────────────────────

const Card: React.FC<{
  children: React.ReactNode;
  sx?: React.ComponentProps<typeof Box>["sx"];
}> = ({ children, sx }) => (
  <Box
    sx={{
      padding: "20px 22px",
      borderRadius: "16px",
      background: "#FFFFFF",
      border: "1px solid rgba(15, 23, 42, 0.06)",
      boxShadow:
        "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 14px rgba(15, 23, 42, 0.05)",
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
      color: "#4A5568",
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
          color: "rgba(15, 23, 42,0.7)",
        }}
      >
        {label}
      </Box>
      <Box sx={{ flex: 1, position: "relative", height: 8 }}>
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: "rgba(15, 23, 42, 0.06)",
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
              ? "#B4000A"
              : "rgba(15, 23, 42, 0.40)",
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
          color: accent ? "#B4000A" : "#1A2B2E",
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
              color: "rgba(15, 23, 42,0.55)",
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
        borderBottom: "1px solid rgba(184, 92, 60, 0.10)",
        "&:last-of-type": { borderBottom: "none" },
      }}
    >
      <Box sx={{ fontFamily: SANS, fontSize: 13, color: "#1A2B2E" }}>
        {labels[mode]}
      </Box>
      <Box sx={{ fontFamily: SANS, fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
        <Box component="span" sx={{ color: "rgba(15, 23, 42,0.6)" }}>
          {booked}/{home}
        </Box>
        <Box
          component="span"
          sx={{
            fontWeight: 700,
            color: "#B4000A",
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
        sx={{ fontFamily: SANS, fontSize: 12, color: "rgba(15, 23, 42,0.55)", fontStyle: "italic" }}
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
              color: "#1A2B2E",
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
                background: "rgba(15, 23, 42, 0.05)",
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
                background: "rgba(15, 23, 42, 0.55)",
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
              color: "#1A2B2E",
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
