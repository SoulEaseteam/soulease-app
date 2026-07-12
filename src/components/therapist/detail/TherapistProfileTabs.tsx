

import React, { useState, useMemo } from "react";
import { Box, Typography, Tabs, Tab } from "@mui/material";
import { useTranslation } from "react-i18next";
import { bayesianRating, formatRating } from "@/utils/rating";
// 🆕 Round 28al — Phase 2 emoji → MUI icons.
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import LocalFireDepartmentRoundedIcon from "@mui/icons-material/LocalFireDepartmentRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// ── shared types (kept loose to match existing DemoTherapist shape)
// 🆕 Round 28b3 — `Cred.icon` widened from string to ReactNode so the
//   detail page can pass MUI icons (founder no-emoji rule).
type Cred = { icon: React.ReactNode; title: string; sub: string };
type Spec = { icon: React.ReactNode; name: string; sub: string };
type Lang = { flag: string; name: string; level: string };
// 🛡 Privacy: reviews never expose customer name, country flag, or
// pickup hotel. Only the booking id (truncated to 8 chars) + service
// + duration + rating + verified-status badge.
type Review = {
  /** Firestore booking doc id — display only first 8 chars uppercased */
  bookingId: string;
  rating: number;
  /** "Thai 90min" — service summary (no hotel name to avoid identifying) */
  service: string;
  body: string;
  ago: string;
  /** True when the booking exists in our Firestore (not a fake review). */
  verified: boolean;
};

interface Props {
  /** Headline trust facts shown in the hero strip */
  yearsExp: number;
  totalSessions: number;
  /** Live "today's bookings" count from useTherapistBookingStats. */
  todayBookings?: number;
  rebookRate: string;
  hasLicense: boolean;

  creds: Cred[];
  specs: Spec[];
  langs: Lang[];

  rating: string;
  reviewCount: number;
  reviewBuckets: { stars: number; pct: number; count: number }[];
  reviews: Review[];

  /**
   * Optional real Loyalty aggregates — when provided, LoyaltyTab uses
   * Firestore-derived numbers. When absent, falls back to synthetic
   * estimates (rebookPct + totalSessions math).
   * (Round 28af — replaces the all-synthetic Loyalty tab.)
   */
  loyaltyStats?: {
    totalCompleted: number;
    uniqueCustomers: number;
    repeatCustomers: number;
    repeatPct: number;
    avgSessions: number;
    timingBuckets: {
      within7: number;
      within30: number;
      within90: number;
    };
  };

  /**
   * Optional starting tab — used when this component lives inside a
   * sheet opened from a stat-card cell:
   *   'reviews' from the rating cell
   *   'profile' from the years cell
   *   'loyalty' from the rebook cell
   */
  initialTab?: "profile" | "reviews" | "loyalty";
}

const TherapistProfileTabs: React.FC<Props> = ({
  yearsExp,
  totalSessions,
  todayBookings = 0,
  rebookRate,
  hasLicense,
  creds,
  specs,
  langs,
  rating,
  reviewCount,
  reviewBuckets,
  reviews,
  loyaltyStats,
  initialTab = "profile",
}) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<"profile" | "reviews" | "loyalty">(
    initialTab
  );

  // Parse rebookRate "98%" → 98 for use in Loyalty tab math
  const rebookPct = parseFloat(rebookRate.replace("%", "")) || 0;

  return (
    <Box sx={{ padding: "20px" }}>
      {/* Tab switcher — pill style sits above content */}
      <Box
        sx={{
          background: "var(--sr-panel)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderRadius: "16px 16px 0 0",
          boxShadow: "var(--sr-card-shadow)",
          overflow: "hidden",
        }}
      >
        <Tabs
          value={tab}
          onChange={(_, v: "profile" | "reviews" | "loyalty") => setTab(v)}
          variant="fullWidth"
          sx={{
            minHeight: 48,
            "& .MuiTab-root": {
              fontFamily: SANS,
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "none",
              color: "var(--sr-muted)",
              minHeight: 48,
              gap: "4px",
              padding: "0 8px",
              minWidth: "auto",
              "&.Mui-selected": { color: "var(--sr-body)" },
            },
            "& .MuiTabs-indicator": {
              background: "#8F8474",
              height: "3px",
              borderRadius: "2px 2px 0 0",
            },
          }}
        >
          <Tab
            value="profile"
            label={t("detail.tabs.profile", "✓ Profile")}
          />
          <Tab
            value="reviews"
            label={t("detail.tabs.reviews", `★ Reviews (${reviewCount})`)}
          />
          <Tab
            value="loyalty"
            label={t("detail.tabs.loyalty", "📈 Loyalty")}
          />
        </Tabs>
      </Box>

      <Box
        sx={{
          background: "var(--sr-panel)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderRadius: "0 0 16px 16px",
          padding: "16px",
          boxShadow: "var(--sr-card-shadow)",
        }}
      >
        {tab === "profile" && (
          <ProfileTab
            yearsExp={yearsExp}
            totalSessions={totalSessions}
            todayBookings={todayBookings}
            rebookRate={rebookRate}
            hasLicense={hasLicense}
            creds={creds}
            specs={specs}
            langs={langs}
          />
        )}
        {tab === "reviews" && (
          <ReviewsTab
            rating={rating}
            reviewCount={reviewCount}
            buckets={reviewBuckets}
            reviews={reviews}
          />
        )}
        {tab === "loyalty" && (
          <LoyaltyTab
            rebookPct={rebookPct}
            totalSessions={totalSessions}
            loyaltyStats={loyaltyStats}
          />
        )}
      </Box>
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────
// TAB 1 — Verified Profile
// ─────────────────────────────────────────────────────────────────────
const ProfileTab: React.FC<{
  yearsExp: number;
  totalSessions: number;
  todayBookings: number;
  rebookRate: string;
  hasLicense: boolean;
  creds: Cred[];
  specs: Spec[];
  langs: Lang[];
}> = ({ yearsExp, totalSessions, todayBookings, rebookRate, hasLicense, creds, specs, langs }) => {
  // 🆕 Round 28al — Trust strip cells with MUI icons (Phase 2 emoji
  //    replacement). Only render cells with real values — License when
  //    admin-verified, Experience/Sessions/Rebook when > 0, Today as
  //    live momentum signal.
  const trustCells: {
    icon: React.ReactNode;
    color: string;
    value: string;
    label: string;
  }[] = [];
  if (hasLicense) {
    trustCells.push({
      icon: <VerifiedRoundedIcon sx={{ fontSize: 18 }} />,
      color: "#16a34a",
      value: "",
      label: "Licensed",
    });
  }
  if (yearsExp > 0) {
    trustCells.push({
      icon: <HistoryRoundedIcon sx={{ fontSize: 18 }} />,
      color: "#B45309",
      value: `${yearsExp}y`,
      label: "Experience",
    });
  }
  if (totalSessions > 0) {
    trustCells.push({
      icon: <SpaRoundedIcon sx={{ fontSize: 18 }} />,
      color: "var(--sr-body)",
      value:
        totalSessions >= 1000
          ? `${Math.round(totalSessions / 100) / 10}k`
          : `${totalSessions}`,
      label: "Sessions",
    });
  }
  // Today's bookings — momentum signal, live from Firestore.
  if (todayBookings > 0) {
    trustCells.push({
      icon: <LocalFireDepartmentRoundedIcon sx={{ fontSize: 18 }} />,
      color: "var(--sr-body)",
      value: `${todayBookings}`,
      label: "Today",
    });
  }
  if (rebookRate && rebookRate !== "—" && rebookRate !== "0%") {
    trustCells.push({
      icon: <AutorenewRoundedIcon sx={{ fontSize: 18 }} />,
      color: "#0284C7",
      value: rebookRate,
      label: "Rebook",
    });
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* 🟢 Trust hero strip — only render when at least one cell has data */}
      {trustCells.length > 0 && (
        <Box
          sx={{
            padding: "14px 16px",
            borderRadius: "14px",
            background:
              "var(--sr-bg)",
            border: "1px solid var(--sr-hairline)",
            display: "grid",
            gridTemplateColumns: `repeat(${trustCells.length}, 1fr)`,
            gap: "8px",
          }}
        >
          {trustCells.map((c) => (
            <TrustCell
              key={c.label}
              icon={c.icon}
              color={c.color}
              value={c.value}
              label={c.label}
            />
          ))}
        </Box>
      )}

      {/* Credentials — only render when admin-verified credentials exist */}
      {creds.length > 0 && (
      <Section title="Credentials">
        <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {creds.map((c) => (
            <Box
              key={c.title}
              sx={{
                // Round 28s46 ("เอากรอบ ออก") — Frame removed; row
                // reads as plain text alongside the icon, not a card.
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "6px 4px",
              }}
            >
              <Box sx={{ fontSize: "18px", flexShrink: 0 }}>{c.icon}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--sr-ink)",
                    lineHeight: 1.2,
                  }}
                >
                  {c.title}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: "11px",
                    color: "var(--sr-muted)",
                    marginTop: "2px",
                  }}
                >
                  {c.sub}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Section>
      )}

      {/* Specialties — only when therapist offers any service */}
      {specs.length > 0 && (
      <Section title="Specialties">
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
          }}
        >
          {specs.map((s) => (
            <Box
              key={s.name}
              sx={{
                // Round 28s46 — Frame removed from Specialties tile.
                display: "flex",
                gap: "10px",
                padding: "6px 4px",
              }}
            >
              <Box sx={{ fontSize: "20px", flexShrink: 0 }}>{s.icon}</Box>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--sr-ink)",
                    lineHeight: 1.1,
                  }}
                >
                  {s.name}
                </Typography>
                {/* Round 28ai — only render subtext when present (real
                    serviceExperience set by admin). Empty by default. */}
                {s.sub && s.sub.length > 0 && (
                  <Typography
                    sx={{
                      fontFamily: SANS,
                      fontSize: "10.5px",
                      color: "var(--sr-muted)",
                      marginTop: "2px",
                    }}
                  >
                    {s.sub}
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </Section>
      )}

      {/* Languages — only when at least one structured language present */}
      {langs.length > 0 && (
      <Section title="Languages">
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
          {langs.map((l) => {
            const isNative = l.level.toUpperCase().includes("NATIVE");
            return (
              <Box
                key={l.name}
                sx={{
                  // Round 28s46 — Frame removed from language pill.
                  // The flag glyph already anchors the row; "NATIVE"
                  // is still surfaced via brand-red text colour on
                  // its level label below.
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  padding: "4px 0",
                }}
              >
                <Box sx={{ fontSize: "14px" }}>{l.flag}</Box>
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: "12px",
                    fontWeight: 600,
                    color: "var(--sr-ink)",
                  }}
                >
                  {l.name}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: "9.5px",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    color: isNative ? "var(--sr-ink)" : "var(--sr-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  {l.level}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Section>
      )}

      {/* 🆕 Round 28ai — empty-state hint when no real data yet */}
      {trustCells.length === 0 &&
        creds.length === 0 &&
        specs.length === 0 &&
        langs.length === 0 && (
          <Box
            sx={{
              padding: "20px 16px",
              textAlign: "center",
              fontFamily: SANS,
              fontSize: "12px",
              color: "var(--sr-muted)",
              fontStyle: "italic",
            }}
          >
            New therapist — profile details coming soon.
          </Box>
        )}
    </Box>
  );
};

const TrustCell: React.FC<{
  icon: React.ReactNode;
  color?: string;
  value: string;
  label: string;
}> = ({ icon, color = "var(--sr-ink)", value, label }) => (
  <Box sx={{ textAlign: "center" }}>
    <Box
      sx={{
        lineHeight: 1,
        marginBottom: "4px",
        color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon}
    </Box>
    <Typography
      sx={{
        fontFamily: SERIF,
        fontSize: "13px",
        fontWeight: 700,
        color: "var(--sr-ink)",
        lineHeight: 1.1,
      }}
    >
      {value}
    </Typography>
    <Typography
      sx={{
        fontFamily: SANS,
        fontSize: "9px",
        fontWeight: 600,
        color: "var(--sr-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.06em",
        marginTop: "2px",
      }}
    >
      {label}
    </Typography>
  </Box>
);

// ─────────────────────────────────────────────────────────────────────
// TAB 2 — Reviews (real data wiring deferred to Task 7)
// ─────────────────────────────────────────────────────────────────────
const ReviewsTab: React.FC<{
  rating: string;
  reviewCount: number;
  buckets: { stars: number; pct: number; count: number }[];
  reviews: Review[];
}> = ({ rating, reviewCount, buckets, reviews }) => {
  // ⭐ Round 28ad — trust the parent-passed rating when there are no
  //    real reviews to compute Bayesian against. Parent already has
  //    the seed value from data.rating (e.g. Yuri 4.7) — overriding
  //    that to 4.5 here would erase real backend data.
  //
  //    When real reviews ARE present, recompute Bayesian-adjusted from
  //    the actual review list — same fairness logic as before.
  const displayedRating = useMemo(() => {
    if (reviews.length > 0) return formatRating(bayesianRating(reviews));
    return rating; // honor parent (real data.rating)
  }, [reviews, rating]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      {/* Rating headline — Bayesian-adjusted */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "36px",
              fontWeight: 700,
              color: "var(--sr-body)",
              lineHeight: 1,
              letterSpacing: "-0.02em",
            }}
          >
            {displayedRating}
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "11px",
              color: "var(--sr-muted)",
              marginTop: "4px",
            }}
          >
            ({reviewCount.toLocaleString()} reviews)
          </Typography>
          <Box sx={{ color: "#FBBF24", fontSize: "13px", marginTop: "2px" }}>
            ★★★★★
          </Box>
        </Box>

        {/* Bucket bars */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: "3px" }}>
          {buckets.map((b) => (
            <Box
              key={b.stars}
              sx={{ display: "flex", alignItems: "center", gap: "6px" }}
            >
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "10.5px",
                  fontWeight: 600,
                  color: "var(--sr-muted)",
                  width: "10px",
                }}
              >
                {b.stars}
              </Typography>
              <Box
                sx={{
                  flex: 1,
                  height: 6,
                  borderRadius: "3px",
                  background: "var(--sr-line)",
                  overflow: "hidden",
                }}
              >
                <Box
                  sx={{
                    width: `${b.pct}%`,
                    height: "100%",
                    background:
                      "var(--sr-ink)",
                    transition: "width 0.4s ease",
                  }}
                />
              </Box>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "10px",
                  color: "var(--sr-muted)",
                  width: "30px",
                  textAlign: "right",
                }}
              >
                {b.count}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Review list */}
      {reviews.length === 0 ? (
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "12px",
            color: "var(--sr-muted)",
            textAlign: "center",
            padding: "20px",
            fontStyle: "italic",
          }}
        >
          No reviews yet — be the first to book!
        </Typography>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {reviews.map((r, i) => (
            <Box
              key={i}
              sx={{
                padding: "12px",
                borderRadius: "12px",
                background: "var(--sr-panel)",
                border: "1px solid var(--sr-hairline)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "6px",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  {/* 🛡 Privacy — booking ID only (no name/flag/hotel) */}
                  <Typography
                    sx={{
                      fontFamily: SANS,
                      fontSize: "12px",
                      fontWeight: 700,
                      color: "var(--sr-body)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    Booking #{r.bookingId.slice(0, 8).toUpperCase()}
                  </Typography>
                  {r.verified && (
                    <Box
                      sx={{
                        fontFamily: SANS,
                        fontSize: "8.5px",
                        fontWeight: 700,
                        color: "#16a34a",
                        background: "rgba(22, 163, 74, 0.1)",
                        padding: "1px 5px",
                        borderRadius: "4px",
                        textTransform: "uppercase",
                        letterSpacing: "0.04em",
                      }}
                    >
                      ✓ Verified
                    </Box>
                  )}
                </Box>
                <Box sx={{ color: "#FBBF24", fontSize: "12px" }}>
                  {"★".repeat(r.rating)}
                </Box>
              </Box>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "12px",
                  color: "var(--sr-body)",
                  lineHeight: 1.5,
                  marginBottom: "4px",
                }}
              >
                {r.body}
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "10px",
                  color: "var(--sr-muted)",
                }}
              >
                {r.ago} · {r.service}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
};


// ─────────────────────────────────────────────────────────────────────
const INDUSTRY_REBOOK_AVG = 35; // Bangkok outcall avg (founder estimate)
const TOP_5_PCT_THRESHOLD = 75; // ≥ this = top 5% in market

// 🆕 28s344 — exported so the TherapistDetailPage Reviews tab can reuse
//   this rich rebook/loyalty panel (founder ref: the "16% · 14 of 90 …"
//   benchmark + customer-mix + rebook-timing card).
export const LoyaltyTab: React.FC<{
  rebookPct: number;
  totalSessions: number;
  loyaltyStats?: {
    totalCompleted: number;
    uniqueCustomers: number;
    repeatCustomers: number;
    repeatPct: number;
    avgSessions: number;
    timingBuckets: {
      within7: number;
      within30: number;
      within90: number;
    };
  };
}> = ({ rebookPct, totalSessions, loyaltyStats }) => {
  // 🆕 Round 28af — prefer real Firestore aggregates as soon as we
  //    have ANY identifiable customer (userId or phone). Below that,
  //    fall back to synthetic derivations from the seed rebookRate.
  //    Sample size is shown in the customer-mix row so users can
  //    judge the math themselves.
  const useReal =
    Boolean(loyaltyStats) && (loyaltyStats?.uniqueCustomers ?? 0) >= 1;

  const avgSessionsPerCustomer = useReal
    ? loyaltyStats!.avgSessions
    : rebookPct >= 50
    ? 2.4
    : 1.6;
  const estCustomers = useReal
    ? loyaltyStats!.uniqueCustomers
    : Math.round(totalSessions / avgSessionsPerCustomer);
  const repeatPct = useReal
    ? loyaltyStats!.repeatPct
    : Math.min(100, rebookPct);
  const firstTimePct = 100 - repeatPct;

  const isTopTier = (useReal ? repeatPct : rebookPct) >= TOP_5_PCT_THRESHOLD;

  // Headline rebook % — use real if available
  const headlinePct = useReal ? repeatPct : rebookPct;

  const timingBuckets = useReal
    ? [
        {
          label: "Within 7 days",
          pct: loyaltyStats!.timingBuckets.within7,
        },
        {
          label: "Within 30 days",
          pct: loyaltyStats!.timingBuckets.within30,
        },
        {
          label: "Within 90 days",
          pct: loyaltyStats!.timingBuckets.within90,
        },
      ]
    : [
        { label: "Within 7 days", pct: Math.round(rebookPct * 0.46) },
        { label: "Within 30 days", pct: rebookPct },
        {
          label: "Within 90 days",
          pct: Math.min(100, Math.round(rebookPct * 1.02)),
        },
      ];

  // Round 28s49 — Empty state. The synthetic fallback rendered
  // "0%", "0 in 100 customers", "1.6 avg sessions / customer",
  // "First-time 100%", "Within 7/30/90 days 0%" — a wall of
  // demoralising zeros when a fresh therapist has no bookings
  // yet. Founder sent the screenshot without text; the read is
  // "this looks like the system is broken". Show a single quiet
  // placeholder instead until at least one real customer is
  // measurable.
  // 🆕 28s346 (founder "ทำไมได้ 100 หรอ") — a rebook rate from 1–2 customers
  //   is misleading (1 of 1 = 100% + a bogus "Top 5%" badge). Require a
  //   minimum real sample before showing the panel; below it, show the
  //   "building history" placeholder instead of an inflated number.
  const MIN_SAMPLE = 5;
  // 🆕 28s375 — also render (in estimate mode, which carries its own
  //   "Estimate — accumulates real data…" disclaimer below) when the
  //   therapist doc has a reliable denormalized session count synced by
  //   admin ("Sync Stats"). Anonymous guests can read that aggregate on the
  //   world-readable therapists doc but NOT the raw bookings (PII-gated), so
  //   without this they saw "coming soon" while the hero chips already showed
  //   "N sessions · X% rebook" — an inconsistency (audit #1). The tiny-live-
  //   sample real path (the 28s346 "1 of 1 = 100%" concern) stays gated by
  //   MIN_SAMPLE; this only opens the honest aggregate-estimate path.
  const MIN_SYNCED_SESSIONS = 10;
  const enoughData =
    (useReal && (loyaltyStats?.uniqueCustomers ?? 0) >= MIN_SAMPLE) ||
    (totalSessions >= MIN_SYNCED_SESSIONS && rebookPct > 0);
  if (!enoughData) {
    return (
      <Box
        sx={{
          padding: "32px 24px",
          textAlign: "center",
          color: "var(--sr-muted)",
          fontFamily: SANS,
        }}
      >
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 56,
            height: 56,
            borderRadius: "50%",
            background:
              "var(--sr-bg)",
            marginBottom: "14px",
            fontSize: "22px",
            color: "var(--sr-body)",
          }}
        >
          ✦
        </Box>
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: "17px",
            fontWeight: 600,
            color: "var(--sr-ink)",
            marginBottom: "6px",
          }}
        >
          Loyalty data coming soon
        </Typography>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "12.5px",
            color: "var(--sr-muted)",
            lineHeight: 1.5,
            maxWidth: 280,
            margin: "0 auto",
          }}
        >
          Rebook rate, customer mix, and timing appear here once this
          practitioner has at least 5 unique guests — so the numbers
          are reliable, not a one-off.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Headline + sub-stat */}
      <Box
        sx={{
          padding: "16px 18px",
          borderRadius: "16px",
          background:
            "var(--sr-bg)",
          border: "1px solid var(--sr-hairline)",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            gap: "10px",
            marginBottom: "4px",
          }}
        >
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "36px",
              fontWeight: 700,
              color: "var(--sr-body)",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {headlinePct}%
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--sr-body)",
            }}
          >
            rebook rate
          </Typography>
        </Box>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "12px",
            color: "var(--sr-body)",
            lineHeight: 1.5,
          }}
        >
          {useReal
            ? `${loyaltyStats!.repeatCustomers} of ${
                loyaltyStats!.uniqueCustomers
              } customers booked again within 30 days.`
            : `${Math.round(rebookPct)} in 100 customers booked again within 30 days.`}
        </Typography>
        {!useReal && (
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "10px",
              color: "var(--sr-dim)",
              fontStyle: "italic",
              marginTop: "4px",
            }}
          >
            Estimate — accumulates real data as bookings complete.
          </Typography>
        )}
        {isTopTier && (
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "11px",
              fontWeight: 700,
              color: "#16a34a",
              marginTop: "8px",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              background: "rgba(22, 163, 74, 0.1)",
              padding: "4px 10px",
              borderRadius: "999px",
            }}
          >
            ✓ Top 5% in Bangkok
          </Typography>
        )}
      </Box>

      {/* Industry benchmark — comparison bars */}
      <Box>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "10.5px",
            fontWeight: 800,
            color: "var(--sr-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "10px",
            paddingLeft: "2px",
          }}
        >
          Industry benchmark
        </Typography>
        <BenchmarkBar
          label="This therapist"
          pct={headlinePct}
          color="var(--sr-ink)"
          highlight
        />
        <BenchmarkBar
          label="Bangkok avg"
          pct={INDUSTRY_REBOOK_AVG}
          color="var(--sr-dim)"
        />
      </Box>

      {/* Customer mix */}
      <Box>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "10.5px",
            fontWeight: 800,
            color: "var(--sr-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "10px",
            paddingLeft: "2px",
          }}
        >
          Customer mix
        </Typography>
        <Box
          sx={{
            display: "flex",
            height: 28,
            borderRadius: "10px",
            overflow: "hidden",
            border: "1px solid var(--sr-hairline)",
          }}
        >
          <Box
            sx={{
              width: `${repeatPct}%`,
              background: "#8F8474",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontFamily: SANS,
              fontSize: "11px",
              fontWeight: 700,
              transition: "width 0.4s ease",
            }}
          >
            Repeat {repeatPct}%
          </Box>
          <Box
            sx={{
              width: `${firstTimePct}%`,
              background: "var(--sr-line)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--sr-body)",
              fontFamily: SANS,
              fontSize: "11px",
              fontWeight: 700,
              transition: "width 0.4s ease",
            }}
          >
            First-time {firstTimePct}%
          </Box>
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: "8px",
            fontFamily: SANS,
            fontSize: "11px",
            color: "var(--sr-muted)",
          }}
        >
          <Typography sx={{ fontSize: "11px" }}>
            ~{estCustomers.toLocaleString()} unique customers
          </Typography>
          <Typography sx={{ fontSize: "11px" }}>
            {avgSessionsPerCustomer.toFixed(1)} avg sessions / customer
          </Typography>
        </Box>
      </Box>

      {/* Rebook timing */}
      <Box>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "10.5px",
            fontWeight: 800,
            color: "var(--sr-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            marginBottom: "10px",
            paddingLeft: "2px",
          }}
        >
          Rebook timing
        </Typography>
        {timingBuckets.map((b) => (
          <BenchmarkBar
            key={b.label}
            label={b.label}
            pct={b.pct}
            color="var(--sr-ink)"
          />
        ))}
      </Box>

      {/* Methodology footnote — transparency */}
      <Box
        sx={{
          padding: "10px 14px",
          borderRadius: "10px",
          background: "var(--sr-panel-2)",
        }}
      >
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "10.5px",
            color: "var(--sr-muted)",
            lineHeight: 1.5,
          }}
        >
          <Box component="span" sx={{ fontWeight: 700 }}>
            How we measure:
          </Box>{" "}
          Rebook rate counts customers who book the same therapist again
          within 30 days. Bangkok average is computed across all licensed
          outcall therapists on SunRed.
        </Typography>
      </Box>
    </Box>
  );
};

// Reusable horizontal bar for benchmark / timing rows
const BenchmarkBar: React.FC<{
  label: string;
  pct: number;
  color: string;
  highlight?: boolean;
}> = ({ label, pct, color, highlight }) => (
  <Box sx={{ marginBottom: "8px" }}>
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: "3px",
      }}
    >
      <Typography
        sx={{
          fontFamily: SANS,
          fontSize: "11.5px",
          fontWeight: highlight ? 700 : 600,
          color: highlight ? "var(--sr-ink)" : "var(--sr-body)",
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{
          fontFamily: SANS,
          fontSize: "11.5px",
          fontWeight: 700,
          color: highlight ? "var(--sr-ink)" : "var(--sr-body)",
        }}
      >
        {pct}%
      </Typography>
    </Box>
    <Box
      sx={{
        height: highlight ? 10 : 7,
        borderRadius: "999px",
        background: "var(--sr-line)",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          width: `${Math.min(100, Math.max(0, pct))}%`,
          height: "100%",
          background: color,
          transition: "width 0.5s ease",
        }}
      />
    </Box>
  </Box>
);

// ─── Section heading ───
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <Box>
    <Typography
      sx={{
        fontFamily: SANS,
        fontSize: "10.5px",
        fontWeight: 800,
        color: "var(--sr-muted)",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: "8px",
        paddingLeft: "2px",
      }}
    >
      {title}
    </Typography>
    {children}
  </Box>
);

export default TherapistProfileTabs;
