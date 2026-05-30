// src/components/therapist/detail/StatsCard.tsx
//
// 🎨 Phase 2 Detail — floating stats card (verbatim port of `.stats-card`).
// Negative top margin (-30px) to overlap into the hero photo above. Three
// cells separated by gold hairline borders.
//
// 🆕 Phase 4 — Cells are tappable (open the info sheet). A first-visit
//   popover hint points to the card to make the affordance discoverable.
//   Hint is shown once per browser via localStorage flag, then auto-
//   dismissed after 5 seconds OR on the first cell tap.

import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";

const HINT_LS_KEY = "sunred_stats_hint_seen_v1";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Stat {
  num: React.ReactNode;
  label: string;
  /** Tap handler — when set, cell becomes a button with affordance. */
  onTap?: () => void;
}

interface Props {
  rating: string;
  reviewCount: number;
  yearsExp: number;
  /** Round 28ak — real lifetime sessions count from useTherapistBookingStats. */
  totalSessions?: number;
  rebookRate: string;
  /** Optional — opens an info sheet on the Reviews tab. */
  onTapRating?: () => void;
  /** Optional — opens an info sheet on the Verified Profile tab. */
  onTapProfile?: () => void;
  /** Optional — opens an info sheet on the Loyalty tab (rebook stats). */
  onTapLoyalty?: () => void;
}

const StatsCard: React.FC<Props> = ({
  rating,
  reviewCount,
  yearsExp,
  totalSessions = 0,
  rebookRate,
  onTapRating,
  onTapProfile,
  onTapLoyalty,
}) => {
  const { t } = useTranslation();

  // First-visit hint — shown once per browser, auto-dismiss after 5s
  // or on first cell tap. Only shows when at least one cell is tappable.
  const hasInteractiveCell = !!(onTapRating || onTapProfile || onTapLoyalty);
  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!hasInteractiveCell) return;
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem(HINT_LS_KEY);
      if (seen === "1") return;
    } catch {
      // localStorage blocked (private mode etc.) — show hint anyway,
      // it won't persist but it also won't break the page.
    }
    // Defer show by 600ms so the hero photo doesn't compete for attention
    const showTimer = window.setTimeout(() => setShowHint(true), 600);
    // Auto-dismiss after 5s
    const hideTimer = window.setTimeout(() => {
      setShowHint(false);
      try {
        window.localStorage.setItem(HINT_LS_KEY, "1");
      } catch {
        // ignore
      }
    }, 5600);
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [hasInteractiveCell]);

  const dismissHint = () => {
    setShowHint(false);
    try {
      window.localStorage.setItem(HINT_LS_KEY, "1");
    } catch {
      // ignore
    }
  };

  // Wrap each tap handler to dismiss the hint before invoking the
  // original handler — prevents the popover from lingering after tap.
  const wrap = (fn?: () => void) =>
    fn
      ? () => {
          dismissHint();
          fn();
        }
      : undefined;

  const stats: Stat[] = [
    {
      num: (
        <>
          <Box component="span" sx={{ color: "#FE0944" }}>★</Box> {rating}
        </>
      ),
      label: t("detail.stats.reviews", "{{count}} reviews", { count: reviewCount }),
      onTap: wrap(onTapRating),
    },
    {
      // 🆕 Round 28ak — replace "X yrs experience" with real lifetime
      //    Sessions count. Years was a hardcoded mock; sessions is a
      //    live count from bookings collection. Falls back to yearsExp
      //    only when admin has explicitly set a per-therapist value
      //    AND no real sessions exist (rare migration window).
      num:
        totalSessions > 0
          ? totalSessions >= 1000
            ? `${Math.round(totalSessions / 100) / 10}k`
            : `${totalSessions}`
          : yearsExp > 0
          ? t("detail.stats.years", "{{years}} yrs", { years: yearsExp })
          : "—",
      label:
        totalSessions > 0
          ? t("detail.stats.sessions", "Sessions")
          : yearsExp > 0
          ? t("detail.stats.experience", "Experience")
          : t("detail.stats.experience", "Experience"),
      onTap: wrap(onTapProfile),
    },
    {
      num: rebookRate,
      label: t("detail.stats.rebook", "Rebook rate"),
      onTap: wrap(onTapLoyalty),
    },
  ];

  return (
    <Box
      sx={{
        // Wrapper — same outer geometry as the card itself, hosts the
        // floating hint popover (absolute) so it tracks the card.
        margin: "-30px 14px 18px",
        position: "relative",
        zIndex: 5,
      }}
    >
      {/* First-visit hint popover — absolute above the card, with a
          downward-pointing arrow notch. Tap anywhere on the popover to
          dismiss; auto-dismisses after 5s; never re-shows once dismissed. */}
      {showHint && (
        <Box
          role="status"
          onClick={dismissHint}
          sx={{
            position: "absolute",
            bottom: "calc(100% + 12px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            cursor: "pointer",
            animation: "sunredHintIn 0.32s ease-out",
            "@keyframes sunredHintIn": {
              "0%": { opacity: 0, transform: "translate(-50%, 6px)" },
              "100%": { opacity: 1, transform: "translate(-50%, 0)" },
            },
          }}
        >
          <Box
            sx={{
              padding: "8px 14px",
              borderRadius: "999px",
              background: "linear-gradient(135deg, #FE0944, #FE7A52)",
              color: "#fff",
              fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.01em",
              whiteSpace: "nowrap",
              boxShadow: "0 8px 22px rgba(254, 9, 68, 0.35)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            Tap any stat to see details
            <Box
              component="span"
              sx={{
                marginLeft: "4px",
                opacity: 0.85,
                fontSize: "14px",
                lineHeight: 1,
              }}
            >
              ×
            </Box>
          </Box>
          {/* Downward arrow notch — diamond rotated 45deg */}
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              bottom: -5,
              left: "50%",
              transform: "translateX(-50%) rotate(45deg)",
              width: 10,
              height: 10,
              background: "#FE7A52",
              boxShadow: "3px 3px 8px rgba(254, 9, 68, 0.25)",
            }}
          />
        </Box>
      )}

      <Box
        sx={{
          // .stats-card — verbatim
          padding: "14px 16px",
          borderRadius: "18px",
          background: "rgba(255, 255, 255, 0.65)",
          backdropFilter: "blur(30px) saturate(180%)",
          WebkitBackdropFilter: "blur(30px) saturate(180%)",
          border: "1px solid rgba(255, 255, 255, 0.7)",
          boxShadow:
            "0 12px 32px rgba(126, 30, 46, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
        }}
      >
      {/* Round 28s41 — Persistent "Tap any stat for full profile ↗"
          footer removed (founder request). The per-cell chevron
          pulse + first-visit popover (already in this component)
          carry the affordance signal. */}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "8px",
        }}
      >
      {stats.map((s, i) => (
        <Box
          key={i}
          {...(s.onTap
            ? {
                role: "button",
                tabIndex: 0,
                onClick: s.onTap,
                onKeyDown: (e: React.KeyboardEvent) => {
                  if (e.key === " " || e.key === "Enter") {
                    e.preventDefault();
                    s.onTap?.();
                  }
                },
              }
            : {})}
          sx={{
            // .stat-cell — verbatim
            textAlign: "center",
            padding: "4px 0",
            position: "relative",
            cursor: s.onTap ? "pointer" : "default",
            borderRadius: "10px",
            transition: "background 0.15s ease, transform 0.15s ease",
            ...(i > 0 && {
              borderLeft: "1px solid rgba(184, 92, 60, 0.18)",
            }),
            ...(s.onTap && {
              "&:hover": {
                background: "rgba(254, 9, 68, 0.04)",
              },
              "&:active": {
                transform: "scale(0.97)",
              },
              "&:focus-visible": {
                outline: "2px solid #FE0944",
                outlineOffset: "2px",
              },
            }),
          }}
        >
          <Box
            sx={{
              fontFamily: SERIF,
              fontWeight: 600,
              fontSize: "18px",
              color: "#2a1a14",
              letterSpacing: "-0.02em",
            }}
          >
            {s.num}
          </Box>
          <Box
            sx={{
              fontFamily: SANS,
              fontSize: "9px",
              color: "rgba(60, 30, 20, 0.72)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              fontWeight: 700,
              marginTop: "2px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "3px",
            }}
          >
            {s.label}
            {s.onTap && (
              <Box
                component="span"
                aria-hidden
                sx={{
                  // Round 28s58 (founder "กระพริบ กลิ้งไปมา") — the
                  // looping translateX + opacity pulse was distracting.
                  // Static red chevron now; the cell's own hover/active
                  // states still signal it's tappable.
                  fontSize: "12px",
                  color: "#FE0944",
                  fontWeight: 800,
                  marginLeft: "1px",
                  lineHeight: 1,
                  display: "inline-block",
                  opacity: 0.85,
                }}
              >
                ›
              </Box>
            )}
          </Box>
        </Box>
      ))}
      </Box>
      </Box>
    </Box>
  );
};

export default StatsCard;
