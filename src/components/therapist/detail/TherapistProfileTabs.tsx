

import React, { useState, useMemo } from "react";
import { Box, Typography, Tabs, Tab } from "@mui/material";
import { useTranslation } from "react-i18next";
import { bayesianRating, formatRating } from "@/utils/rating";
import { TherapistLoyaltyCard } from "@/components/therapist/TherapistLoyaltyCard";
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
  // 🆕 28x.139 — admin rebook % override, threaded to the loyalty card.
  overrideRebook?: number | null;

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
  overrideRebook,
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
            overrideRebook={overrideRebook}
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
// 🆕 Round 28x.139 (founder: "ปรับสีและธีมหน้าเว็บรูป 1 ให้เข้ากับ ... รูป 2"
//   + "[rebook override] ไม่ขึ้น") — the public Reviews-tab loyalty panel used
//   to be a separate, plainer copy of the same data (its own olive/plain
//   styling, and it read the LIVE rebook so an admin override never showed).
//   It now delegates to the shared, vivid TherapistLoyaltyCard (28x.106) so the
//   guest page and the staff Performance page render ONE card that can't drift,
//   and `overrideRebook` flows straight through.
export const LoyaltyTab: React.FC<{
  rebookPct: number;
  totalSessions: number;
  overrideRebook?: number | null;
  loyaltyStats?: {
    totalCompleted: number;
    uniqueCustomers: number;
    repeatCustomers: number;
    repeatPct: number;
    avgSessions: number;
    timingBuckets: { within7: number; within30: number; within90: number };
  };
}> = ({ rebookPct, totalSessions, loyaltyStats, overrideRebook }) => (
  <TherapistLoyaltyCard
    rebookPct={rebookPct}
    totalSessions={totalSessions}
    loyaltyStats={loyaltyStats}
    overrideRebook={overrideRebook}
  />
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
