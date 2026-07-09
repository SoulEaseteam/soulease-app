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

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
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

  // 🆕 Round 28r88 — Stat cell order changed to Sessions · Rebook ·
  //    Reviews (left→right) per founder reference screenshot
  //    (2026-07-08). Previous order was Reviews · Sessions · Rebook.
  //    The onTap prop names (onTapProfile / onTapLoyalty / onTapRating)
  //    are unchanged; only their visual position rotates. The three
  //    cells now function as scroll-nav anchors in the caller: Sessions
  //    → Services section · Rebook → About section · Reviews → Photos
  //    section.
  const stats: Stat[] = [
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
    {
      num: (
        <>
          <Box component="span" sx={{ color: "#F5A623" }}>★</Box> {rating}
        </>
      ),
      label: t("detail.stats.reviews", "{{count}} reviews", { count: reviewCount }),
      onTap: wrap(onTapRating),
    },
  ];

  return (
    <Box
      sx={{
        // Wrapper — same outer geometry as the card itself, hosts the
        // floating hint popover (absolute) so it tracks the card.
        // Round 28r64 — negative top margin was designed to overlap
        // the DetailHero photo above on MOBILE. On desktop (r55 2-col
        // layout) StatsCard sits in the RIGHT column while DetailHero
        // is in the LEFT column, so the overlap bleeds off the top of
        // the column and makes the card look cramped/floating. Reset
        // the margin on md+ so it starts clean at the column top.
        margin: { xs: "-30px 14px 18px", md: "0 0 24px" },
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
              background: "#8F8474",
              color: "#fff",
              fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.01em",
              whiteSpace: "nowrap",
              boxShadow: "0 8px 22px rgba(15, 23, 42, 0.35)",
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
              background: "#8F8474",
              boxShadow: "3px 3px 8px rgba(15, 23, 42, 0.25)",
            }}
          />
        </Box>
      )}

      {/* 🆕 Round 28s360 — redesigned stats card
          Solid white card (vs. frosted glass) for better legibility
          on any hero photo color. Numbers larger (24/28px serif),
          labels cleaner (9px SANS caps). ★ is amber (#F5A623) per
          CLAUDE.md palette. Cell padding increased for breathing room. */}
      <Box
        sx={{
          padding: { xs: "16px 8px", md: "18px 16px" },
          borderRadius: "18px",
          background: "#FFFFFF",
          border: "1px solid rgba(26,43,46,0.08)",
          boxShadow:
            "0 4px 16px rgba(15,23,42,0.08), 0 1px 3px rgba(15,23,42,0.06)",
        }}
      >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
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
            textAlign: "center",
            paddingY: { xs: "6px", md: "8px" },
            paddingX: { xs: "8px", md: "12px" },
            position: "relative",
            cursor: s.onTap ? "pointer" : "default",
            borderRadius: "10px",
            transition: "background 0.15s ease, transform 0.15s ease",
            ...(i > 0 && {
              borderLeft: "1px solid rgba(26,43,46,0.10)",
            }),
            ...(s.onTap && {
              "@media (hover: hover)": {
                "&:hover": {
                  background: "rgba(180,0,10,0.04)",
                },
              },
              "&:active": {
                transform: "scale(0.97)",
              },
              "&:focus-visible": {
                outline: "2px solid #B4000A",
                outlineOffset: "2px",
              },
            }),
          }}
        >
          {/* Number value */}
          <Box
            sx={{
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: { xs: "22px", md: "26px" },
              color: "#1A2B2E",
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
            }}
          >
            {s.num}
          </Box>
          {/* Label */}
          <Box
            sx={{
              fontFamily: SANS,
              fontSize: { xs: "9px", md: "10px" },
              color: "#4A5568",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              fontWeight: 600,
              marginTop: "5px",
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
                  fontSize: "11px",
                  color: "#B4000A",
                  fontWeight: 800,
                  marginLeft: "1px",
                  lineHeight: 1,
                  display: "inline-block",
                  opacity: 0.7,
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
