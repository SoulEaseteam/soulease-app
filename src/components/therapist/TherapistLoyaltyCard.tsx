// src/components/therapist/TherapistLoyaltyCard.tsx
//
// 🆕 Round 28x.106 (founder: "Loyalty · ความภักดีของลูกค้า ปรับให้เข้ากับสไตล์
//   ของ สรุปผลงาน · Performance") — the shared `LoyaltyTab` component
//   (src/components/therapist/detail/TherapistProfileTabs.tsx) is ALSO the
//   real customer-facing detail page's Reviews-tab content — restyling it in
//   place would change what guests see too, the same reason ServicesEditor/
//   FeaturesEditor were left untouched in 28x.104/105. This is a page-local
//   equivalent for TherapistPerformancePage only: same data, same math
//   (copied verbatim from LoyaltyTab — headline/customer-mix/timing/empty-
//   state logic), restyled with the vivid rose treatment RevenueDashboard
//   (28x.98) established, instead of LoyaltyTab's own olive (#8F8474) +
//   plain-ink accents that predate the vivid pass entirely.

import React from "react";
import { Box, Typography } from "@mui/material";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const ROSE = "#E0708F";
const ROSE_DEEP = "#C2185B";
const GREEN = "#22C55E";
const GREEN_TEXT = "#15803D";

// Same constants LoyaltyTab uses (module-private there; duplicated here
// rather than exported, so this file has no coupling to that one beyond
// the prop shape).
const INDUSTRY_REBOOK_AVG = 35; // Bangkok outcall avg (founder estimate)
const TOP_5_PCT_THRESHOLD = 75; // ≥ this = top 5% in market

interface LoyaltyStats {
  totalCompleted: number;
  uniqueCustomers: number;
  repeatCustomers: number;
  repeatPct: number;
  avgSessions: number;
  timingBuckets: { within7: number; within30: number; within90: number };
}

export const TherapistLoyaltyCard: React.FC<{
  rebookPct: number;
  totalSessions: number;
  loyaltyStats?: LoyaltyStats;
  /**
   * 🆕 Round 28x.139 (founder: "โบนัสรายคน ต้องบาลานซ์กับหน้า rebook rate ... ไม่
   * ขึ้น") — an admin-set rebook % for a boosted therapist. When present it
   * OVERRIDES the live figure and forces the coherent synthetic breakdown
   * (customer mix, timing, est. customers all derive from it + the boosted
   * session count), so a padded session count no longer sits beside a 0%
   * rebook. Only the customer-facing surface passes this; the staff card never
   * does, so practitioners keep seeing their real numbers.
   */
  overrideRebook?: number | null;
}> = ({ rebookPct, totalSessions, loyaltyStats, overrideRebook }) => {
  const hasOverride = typeof overrideRebook === "number" && overrideRebook >= 0;
  // The effective rebook % that drives every synthetic figure below.
  const eff = hasOverride ? Math.min(100, Math.round(overrideRebook)) : rebookPct;
  // An override always uses the derived (synthetic) story, never the live one.
  const useReal = !hasOverride && Boolean(loyaltyStats) && (loyaltyStats?.uniqueCustomers ?? 0) >= 1;

  const avgSessionsPerCustomer = useReal ? loyaltyStats!.avgSessions : eff >= 50 ? 2.4 : 1.6;
  const estCustomers = useReal ? loyaltyStats!.uniqueCustomers : Math.max(1, Math.round(totalSessions / avgSessionsPerCustomer));
  const repeatPct = useReal ? loyaltyStats!.repeatPct : Math.min(100, eff);
  const firstTimePct = 100 - repeatPct;

  const reliableSample = (useReal && (loyaltyStats?.uniqueCustomers ?? 0) >= 5) || totalSessions >= 10;
  const isTopTier = reliableSample && (useReal ? repeatPct : eff) >= TOP_5_PCT_THRESHOLD;
  const headlinePct = useReal ? repeatPct : eff;

  const timingBuckets = useReal
    ? [
        { label: "Within 7 days", pct: loyaltyStats!.timingBuckets.within7 },
        { label: "Within 30 days", pct: loyaltyStats!.timingBuckets.within30 },
        { label: "Within 90 days", pct: loyaltyStats!.timingBuckets.within90 },
      ]
    : [
        { label: "Within 7 days", pct: Math.round(eff * 0.46) },
        { label: "Within 30 days", pct: eff },
        { label: "Within 90 days", pct: Math.min(100, Math.round(eff * 1.02)) },
      ];

  const MIN_SAMPLE = 1;
  const MIN_SYNCED_SESSIONS = 1;
  const enoughData = (useReal && (loyaltyStats?.uniqueCustomers ?? 0) >= MIN_SAMPLE) || totalSessions >= MIN_SYNCED_SESSIONS;

  if (!enoughData) {
    return (
      <Box sx={{ borderRadius: "18px", background: "var(--sr-panel)", border: "1px solid var(--sr-hairline)", p: "32px 24px", textAlign: "center" }}>
        <Box sx={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg, ${ROSE}, ${ROSE_DEEP})`, boxShadow: `0 8px 20px ${ROSE_DEEP}45`, mb: 1.75, fontSize: 22, color: "#fff" }}>
          ✦
        </Box>
        <Typography sx={{ fontFamily: SERIF, fontSize: 17, fontWeight: 600, color: "var(--sr-ink)", mb: 0.75 }}>
          Loyalty data coming soon
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "var(--sr-muted)", lineHeight: 1.5, maxWidth: 280, mx: "auto" }}>
          Rebook rate, customer mix, and timing appear here once this practitioner has at least 5 unique guests — so the numbers are reliable, not a one-off.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Headline — same gradient-wash hero treatment as the Dashboard cards. */}
      <Box
        sx={{
          p: "18px 18px",
          borderRadius: "18px",
          background: `linear-gradient(160deg, ${ROSE}1F 0%, var(--sr-panel) 55%, var(--sr-panel) 100%)`,
          border: `1px solid ${ROSE_DEEP}33`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1.25, mb: 0.5 }}>
          <Typography sx={{ fontFamily: SERIF, fontSize: 34, fontWeight: 700, color: "var(--sr-ink)", letterSpacing: "-0.02em", lineHeight: 1 }}>
            {headlinePct}%
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: "var(--sr-muted)" }}>
            rebook rate
          </Typography>
        </Box>
        <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "var(--sr-body)", lineHeight: 1.5 }}>
          {useReal
            ? `${loyaltyStats!.repeatCustomers} of ${loyaltyStats!.uniqueCustomers} customers booked again within 30 days.`
            : `${Math.round(eff)} in 100 customers booked again within 30 days.`}
        </Typography>
        {/* 🆕 28x.139 — the "Estimate" note is for the genuine no-data case; an
            admin override is a deliberate figure, so it's suppressed there. */}
        {!useReal && !hasOverride && (
          <Typography sx={{ fontFamily: SANS, fontSize: 10, color: "var(--sr-dim)", fontStyle: "italic", mt: 0.5 }}>
            Estimate — accumulates real data as bookings complete.
          </Typography>
        )}
        {isTopTier && (
          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: GREEN_TEXT, mt: 1, display: "inline-flex", alignItems: "center", gap: 0.5, background: `${GREEN}1A`, px: "10px", py: "4px", borderRadius: 999 }}>
            ✓ Top 5% in Bangkok
          </Typography>
        )}
      </Box>

      {/* Industry benchmark */}
      <Box>
        <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 800, color: "var(--sr-muted)", textTransform: "uppercase", letterSpacing: "0.1em", mb: 1.25, pl: 0.25 }}>
          Industry benchmark
        </Typography>
        <BenchmarkBar label="This therapist" pct={headlinePct} color={`linear-gradient(90deg, ${ROSE}, ${ROSE_DEEP})`} highlight />
        <BenchmarkBar label="Bangkok avg" pct={INDUSTRY_REBOOK_AVG} color="var(--sr-dim)" />
      </Box>

      {/* Customer mix */}
      <Box>
        <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 800, color: "var(--sr-muted)", textTransform: "uppercase", letterSpacing: "0.1em", mb: 1.25, pl: 0.25 }}>
          Customer mix
        </Typography>
        <Box sx={{ display: "flex", height: 28, borderRadius: "10px", overflow: "hidden", border: "1px solid var(--sr-hairline)" }}>
          <Box sx={{ width: `${repeatPct}%`, background: `linear-gradient(90deg, ${ROSE}, ${ROSE_DEEP})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: SANS, fontSize: 11, fontWeight: 700, transition: "width 0.4s ease" }}>
            Repeat {repeatPct}%
          </Box>
          <Box sx={{ width: `${firstTimePct}%`, background: "var(--sr-line)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--sr-body)", fontFamily: SANS, fontSize: 11, fontWeight: 700, transition: "width 0.4s ease" }}>
            First-time {firstTimePct}%
          </Box>
        </Box>
        <Box sx={{ display: "flex", justifyContent: "space-between", mt: 1, fontFamily: SANS, fontSize: 11, color: "var(--sr-muted)" }}>
          <Typography sx={{ fontSize: 11 }}>~{estCustomers.toLocaleString()} unique customers</Typography>
          <Typography sx={{ fontSize: 11 }}>{avgSessionsPerCustomer.toFixed(1)} avg sessions / customer</Typography>
        </Box>
      </Box>

      {/* Rebook timing */}
      <Box>
        <Typography sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: 800, color: "var(--sr-muted)", textTransform: "uppercase", letterSpacing: "0.1em", mb: 1.25, pl: 0.25 }}>
          Rebook timing
        </Typography>
        {timingBuckets.map((b) => (
          <BenchmarkBar key={b.label} label={b.label} pct={b.pct} color={`linear-gradient(90deg, ${ROSE}, ${ROSE_DEEP})`} />
        ))}
      </Box>

      {/* Methodology footnote */}
      <Box sx={{ p: "12px 14px", borderRadius: "12px", background: "var(--sr-panel-2)" }}>
        <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: "var(--sr-muted)", lineHeight: 1.5 }}>
          <Box component="span" sx={{ fontWeight: 700 }}>How we measure:</Box>{" "}
          Rebook rate counts customers who book the same therapist again within 30 days. Bangkok average is computed across all licensed outcall therapists on SunRed.
        </Typography>
      </Box>
    </Box>
  );
};

const BenchmarkBar: React.FC<{ label: string; pct: number; color: string; highlight?: boolean }> = ({ label, pct, color, highlight }) => (
  <Box sx={{ mb: 1 }}>
    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.4 }}>
      <Typography sx={{ fontFamily: SANS, fontSize: 11.5, fontWeight: highlight ? 700 : 600, color: highlight ? "var(--sr-ink)" : "var(--sr-body)" }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: 11.5, fontWeight: 700, color: highlight ? "var(--sr-ink)" : "var(--sr-body)" }}>
        {pct}%
      </Typography>
    </Box>
    <Box sx={{ height: highlight ? 10 : 7, borderRadius: 999, background: "var(--sr-line)", overflow: "hidden" }}>
      <Box sx={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: "100%", background: color, transition: "width 0.5s ease" }} />
    </Box>
  </Box>
);

export default TherapistLoyaltyCard;
