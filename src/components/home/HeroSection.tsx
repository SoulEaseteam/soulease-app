// src/components/home/HeroSection.tsx
//
// 🎨 Round 28 (founder 2026-05-02) — niche-funnel redesign.
//
// Why we ditched the 8-tile Grab grid (Round 27):
//   • Grab's audience is 100M+ daily users with broad intent — they need
//     8 verticals on one screen. SunRed's audience is narrow: hotel guests
//     and expats in Bangkok looking for a SPECIFIC kind of recovery
//     (jet lag, late-night, couples). Throwing 8 tiles at them dilutes
//     intent and conversion.
//   • Removed the duplicate search bar — the grid below already has the
//     functional search above the cards (where it actually filters).
//     Two searches on one page = friction without payoff.
//
// New shape — promo banner + 3 niche tiles + 2 loyalty cards:
//
//   ┌───────────────────────────────────────┐
//   │  SunRed                  ● Live · BKK │  ← brand + live pill
//   ├───────────────────────────────────────┤
//   │ ╔═══════════════════════════════════╗ │
//   │ ║ 🌙 Tonight Special                ║ │  ← featured promo
//   │ ║ Limited slots · Book before 12AM  ║ │     (red→coral gradient)
//   │ ║                              →    ║ │
//   │ ╚═══════════════════════════════════╝ │
//   ├───────────────────────────────────────┤
//   │  ┌────────┐  ┌────────┐  ┌────────┐  │
//   │  │  ✈️    │  │  👫    │  │  ⏰    │  │  ← niche tiles aligned to
//   │  │ Jet Lag│  │ Couples│  │ Express│  │     real customer intents
//   │  │Recovery│  │  Suite │  │ <1 hour│  │
//   │  └────────┘  └────────┘  └────────┘  │
//   ├───────────────────────────────────────┤
//   │ ┌─────────────────┐ ┌────────────────┐│
//   │ │ 💎 SunMember    │ │ ⭐ Reviews     ││  ← loyalty + social proof
//   │ │   Member perks  │ │   See ratings  ││
//   │ └─────────────────┘ └────────────────┘│
//   └───────────────────────────────────────┘
//
// Each tile maps to a specific buying motivation, not a menu item:
//   • Jet Lag Recovery → traveler arriving from long-haul flight
//   • Couples Suite     → vacationing pair, anniversary, honeymoon
//   • Express <1 hour   → spontaneous booking after dinner / drinks
//
// Promo banner copy is intentionally generic ("Tonight Special",
// "Limited slots") to avoid fabricating offers — founder/marketing
// can swap in concrete deals via i18n keys.

import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import RedeemRoundedIcon from "@mui/icons-material/RedeemRounded";
// 🆕 Round 28ax — replace emoji glyphs with MUI icons (founder rule:
//   icons only, no emoji site-wide).
import FlightRoundedIcon from "@mui/icons-material/FlightRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import DiamondRoundedIcon from "@mui/icons-material/DiamondRounded";
import NightsStayRoundedIcon from "@mui/icons-material/NightsStayRounded";
import { brand, fonts, glass, gradients } from "@/theme";
import { useAuth } from "@/providers/AuthProvider";
// 🆕 Round 28b21 — Phase 5: first-booking discount + social proof.
import FirstBookingBanner from "@/components/common/FirstBookingBanner";
import SocialProofTicker from "@/components/common/SocialProofTicker";
// 🆕 Round 28b21 — Phase 3: admin presence badge.
import AdminPresenceBadge from "@/components/common/AdminPresenceBadge";

// ─────────────────────────────────────────────────────────────────────
// 🎯 Competitive Strategy & Sales Boost (Round 28b · founder 2026-05-02)
// ─────────────────────────────────────────────────────────────────────
//
// Niche: Bangkok luxury OUTCALL massage. Target persona: international
// hotel guests + expats in Sukhumvit/Silom/Asok/Thonglor. The narrowness
// of the niche IS the moat — broad super-app players can't match it.
//
//
// SALES TRIGGERS layered into the funnel:
//   • Scarcity   — "Limited slots · Book before midnight" promo banner
//   • Urgency    — "Express <1 hour" niche tile
//   • Social proof — REAL aggregated reviews count from Firestore
//   • Loyalty    — SunMember card (anchors repeat business)
//   • Persona match — Niche tiles (Jet Lag, Couples, Express) speak to
//                     specific buying motivations, not menu items
//
// ANTI-PATTERN: we deliberately avoid fabricated stats. The page used
// to show a live Firestore-backed review count via useReviewsAggregate,
// but Round 28q (founder direction) replaced that with a login-gated
// rewards loop — customers must sign in to leave reviews and in
// exchange earn SunCoins / next-booking discounts. This both:
//   1. Cuts ~2 always-on Firestore listeners from the home page, AND
//   2. Improves review quality (no anonymous ratings) AND
//   3. Drives sign-ups (review = the reward unlock).
// ─────────────────────────────────────────────────────────────────────

interface NicheTile {
  /** Round 28ax — React node icon (MUI), not emoji string. */
  glyph: React.ReactNode;
  /** i18n key for the line-1 label */
  titleKey: string;
  defaultTitle: string;
  /** i18n key for the line-2 sub-label */
  subKey: string;
  defaultSub: string;
  /** Route on tap — used when `action` is undefined */
  path?: string;
  /**
   * 🆕 Round 28n — when set, the tile bypasses navigate() and triggers
   * a side-effect instead. "openLine" opens the concierge LINE chat in
   * a new tab — used by Couples Suite (custom request flow).
   */
  action?: "openLine";
  /** Background tint preset */
  tint: "cream" | "peach" | "rose";
  /**
   * 🆕 Round 28n — small promo ribbon shown on top-left of the tile.
   * Mirrors the Grab-style "PAYWEEK" / earlier service tile badges so
   * the marketing language is consistent across the page.
   *
   *   "SOON"     → upcoming feature (gradient)
   *   "REQUEST"  → on-request offering (LINE) (burgundy)
   *   "LIVE"     → currently available right now (green)
   */
  badge?: { text: string; tone: "soon" | "request" | "live" };
}

// 🆕 Round 28n — concierge LINE handle (mirrors AdminFloatingChat).
const LINE_CONCIERGE_URL = "https://line.me/R/ti/p/@sunred.bkk?from=page&searchId=sunred.bkk";

// Three niches, three intents. Add a fourth ONLY if it represents a
// distinct customer journey — never a service synonym.
const NICHE_TILES: NicheTile[] = [
  {
    glyph: <FlightRoundedIcon sx={{ fontSize: 28, color: "#B45309" }} />,
    titleKey: "hero.niche.jetlag.title",
    defaultTitle: "Jet Lag",
    subKey: "hero.niche.jetlag.sub",
    defaultSub: "Recovery",
    path: "/services/gentlemans-recovery",
    tint: "cream",
  },
  {
    glyph: <FavoriteRoundedIcon sx={{ fontSize: 28, color: "#831843" }} />,
    titleKey: "hero.niche.couples.title",
    defaultTitle: "Couples",
    subKey: "hero.niche.couples.sub",
    defaultSub: "In-suite",
    // No `path` — `action: openLine` takes precedence and opens the
    // concierge chat directly (couples bookings are custom-built).
    action: "openLine",
    tint: "rose",
    badge: { text: "REQUEST", tone: "request" },
  },
  {
    glyph: <AccessTimeRoundedIcon sx={{ fontSize: 28, color: "#FE7A52" }} />,
    titleKey: "hero.niche.express.title",
    defaultTitle: "Express",
    subKey: "hero.niche.express.sub",
    defaultSub: "Within 1 hour",
    path: "/?available=now#therapist-grid",
    tint: "peach",
    badge: { text: "LIVE", tone: "live" },
  },
];

// Badge palette — pre-built gradients keep the JSX render block compact.
const BADGE_TONE: Record<NonNullable<NicheTile["badge"]>["tone"], string> = {
  soon: "linear-gradient(135deg, #FE0944, #FE7A52)", // brand sunset
  request: "linear-gradient(135deg, #831843, #FE0944)", // burgundy → red
  live: "linear-gradient(135deg, #16a34a, #22c55e)", // green
};

// 🆕 Round 28b0 — Clean v2 tile tints. Softer warm washes, more
//   white space. ~30% less saturation than the original cream/peach/rose
//   stack. Lets the icon + label take center stage instead of the bg.
const TINT_BG: Record<NicheTile["tint"], string> = {
  cream:
    "linear-gradient(135deg, rgba(253, 252, 250, 0.95) 0%, rgba(247, 241, 234, 0.92) 100%)",
  peach:
    "linear-gradient(135deg, rgba(253, 252, 250, 0.95) 0%, rgba(255, 220, 200, 0.35) 100%)",
  rose:
    "linear-gradient(135deg, rgba(253, 252, 250, 0.95) 0%, rgba(254, 200, 180, 0.3) 100%)",
};

// 🆕 Round 28f (founder 2026-05-02): trust strip removed per founder
// direction. The competitive moats (licensed, verified, multilingual,
// real-time GPS) still live in code/copy elsewhere — Live·BKK pill,
// the real-time distance on cards, the multilingual reviews — they
// just don't take up Hero real estate as their own row anymore.

const HeroSection: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // 🆕 Round 28q — login-gated rewards instead of live review count.
  // Anonymous review aggregation removed (saves 2 Firestore listeners);
  // the Earn tile now drives customers to sign in → review → earn coins.
  const auth = useAuth() as {
    user?: { uid?: string } | null;
    currentUser?: { uid?: string } | null;
  };
  const isLoggedIn = Boolean(auth.user ?? auth.currentUser);

  // 🆕 Round 28p — promo banner is a non-interactive teaser for now.
  // The clickable scroll-to-grid handler is parked here for when an
  // actual offer ships (just rewire to /promotions/{id} or whatever).
  // Click is intentionally disabled — banner reads as "coming soon".
  void navigate; // keep navigate referenced; used elsewhere in tiles

  return (
    <Box
      component="section"
      aria-label="quick actions"
      sx={{
        position: "relative",
        margin: "12px 14px 4px",
        padding: "14px 14px 16px",
        borderRadius: "24px",
        background: gradients.surface,
        border: "1px solid rgba(255, 255, 255, 0.7)",
        boxShadow:
          "0 12px 40px rgba(254, 9, 68, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
        overflow: "hidden",
      }}
    >
      {/* Subtle warm blob — single, low-key accent */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: -60,
          right: -50,
          width: 220,
          height: 220,
          borderRadius: "50%",
          background: brand.peach,
          opacity: 0.3,
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      {/* ═══ Brand row ═══ */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          marginBottom: "12px",
          paddingX: "2px",
        }}
      >
        <Box>
        
          <Typography
            sx={{
              fontFamily: fonts.heading,
              fontSize: 22,
              fontWeight: 600,
              letterSpacing: "-0.02em",
              color: brand.text,
              lineHeight: 1.05,
            }}
          >
            Sun
            <Box component="span" sx={{ color: brand.red }}>
              Red
            </Box>
          </Typography>
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontSize: 11,
              color: brand.textMuted,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              marginTop: "2px",
            }}
          >
            {t("hero.tagline2", "Restore. Delivered to you.")}
          </Typography>
        </Box>

        {/* Live · BKK pill */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "5px",
            padding: "5px 10px",
            ...glass.pill,
            fontFamily: fonts.body,
            fontSize: 10,
            fontWeight: 700,
            color: brand.burgundy,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          <Box
            component="span"
            aria-hidden
            sx={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: brand.green,
              boxShadow: `0 0 8px ${brand.green}`,
              animation: "heroPulseDot 1.5s ease-in-out infinite",
              "@keyframes heroPulseDot": {
                "0%, 100%": { opacity: 1 },
                "50%": { opacity: 0.4 },
              },
            }}
          />
          {t("hero.live", "Live · BKK")}
        </Box>
      </Box>

      {/* 🆕 Round 28b21 (founder 2026-05-04) — Phase 5 of conversion plan.
          Social-proof ticker + first-booking 10% off banner + admin
          online badge sit ABOVE the Tonight Special promo so they're
          the first thing the eye catches as the page loads.
          - SocialProofTicker rotates between 3 messages every 5s.
          - FirstBookingBanner self-hides for repeat customers.
          - AdminPresenceBadge confirms a human is on the other end. */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          marginBottom: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            flexWrap: "wrap",
          }}
        >
          <SocialProofTicker variant="inline" />
          <AdminPresenceBadge variant="full" />
        </Box>
        <FirstBookingBanner />
      </Box>

      <Box
        role="status"
        aria-live="polite"
        aria-label={t(
          "hero.promo.aria",
          "Tonight Special — coming soon"
        )}
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          padding: "16px 18px",
          marginBottom: "12px",
          borderRadius: "18px",
          background: gradients.finalCta, // red → coral → peach sunset
          color: "#fff",
          cursor: "default",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          boxShadow:
            "0 10px 28px rgba(254, 9, 68, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.35)",
          overflow: "hidden",
          // Subtle breath — inviting, not insistent
          animation: "promoBreath 3.6s ease-in-out infinite",
          "@keyframes promoBreath": {
            "0%, 100%": { transform: "scale(1)" },
            "50%": { transform: "scale(1.012)" },
          },
          "@media (prefers-reduced-motion: reduce)": {
            animation: "none",
          },
        }}
      >
        {/* Decorative shimmer — diagonal highlight */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(120deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
            animation: "promoShimmer 4s linear infinite",
            pointerEvents: "none",
            "@keyframes promoShimmer": {
              "0%": { transform: "translateX(-100%)" },
              "100%": { transform: "translateX(100%)" },
            },
            "@media (prefers-reduced-motion: reduce)": {
              animation: "none",
            },
          }}
        />

        {/* Glyph badge */}
        <Box
          sx={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.22)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
            zIndex: 1,
          }}
        >
          <NightsStayRoundedIcon sx={{ fontSize: 24, color: "#fff" }} />
        </Box>

        {/* Copy — anticipation language */}
        <Box sx={{ flex: 1, minWidth: 0, zIndex: 1 }}>
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: "0.14em",
              opacity: 0.9,
              textTransform: "uppercase",
              lineHeight: 1,
            }}
          >
            {t("hero.promo.eyebrow", "Tonight Special ")}
          </Typography>
          <Typography
            sx={{
              fontFamily: fonts.heading,
              fontStyle: "italic",
              fontSize: 16,
              fontWeight: 500,
              letterSpacing: "-0.01em",
              lineHeight: 1.2,
              marginTop: "3px",
            }}
          >
            {t(
              "hero.promo.title",
              "Bangkok Nightlife's"
            )}
          </Typography>
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontSize: 10.5,
              fontWeight: 500,
              opacity: 0.85,
              marginTop: "3px",
              lineHeight: 1.3,
            }}
          >
            {t(
              "hero.promo.sub",
              "best-kept secret, arriving at your door soon."
            )}
          </Typography>
        </Box>

        {/* COMING SOON — bare megaphone icon (Round 28b20c · founder
            2026-05-04). White halo circle removed — the colorful
            megaphone (yellow speech bubble + pink horn) reads cleanly
            against the red→coral banner on its own. Soft drop-shadow
            keeps it legible without a backing plate. */}
        <Box
          component="img"
          src="/badges/boost_5129689.png"
          alt=""
          role="img"
          aria-label={t("hero.promo.aria", "Tonight Special — coming soon")}
          loading="lazy"
          sx={{
            position: "absolute",
            top: "10%",
            right: 10,
            zIndex: 2,
            width: 100,
            height: 100,
            objectFit: "contain",
            // Drop-shadow makes the icon pop against the gradient bg
            // without a circular plate behind it.
            filter:
              "drop-shadow(0 6px 14px rgba(0,0,0,0.28)) drop-shadow(0 0 2px rgba(255,255,255,0.7))",
            transformOrigin: "70% 70%",
            // Combined pulse + wiggle — single timeline so movement
            // feels like one motion, not two stacked transforms.
       
          }}
        />
      </Box>

      {/* Round 28f — trust strip removed (founder direction). */}

      {/* ═══ 3 niche tiles ═══ */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "8px",
          marginBottom: "12px",
        }}
      >
        {NICHE_TILES.map((tile) => {
          const handleTileClick = () => {
            if (tile.action === "openLine") {
              window.open(LINE_CONCIERGE_URL, "_blank", "noopener,noreferrer");
              return;
            }
            if (tile.path) void navigate(tile.path);
          };
          const ariaSuffix =
            tile.action === "openLine"
              ? ` — ${t("hero.niche.requestAria", "request via concierge")}`
              : "";
          return (
            <Box
              key={tile.titleKey}
              component="button"
              type="button"
              onClick={handleTileClick}
              aria-label={`${t(tile.titleKey, tile.defaultTitle)} — ${t(
                tile.subKey,
                tile.defaultSub
              )}${ariaSuffix}`}
              sx={{
                position: "relative",
                padding: "16px 8px 14px",
                borderRadius: "16px",
                background: TINT_BG[tile.tint],
                border: "1px solid rgba(255, 255, 255, 0.7)",
                boxShadow:
                  "0 2px 8px rgba(126, 30, 46, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                transition: "transform 0.15s ease, box-shadow 0.2s ease",
                overflow: "visible",
                "&:hover": {
                  transform: "translateY(-2px)",
                  boxShadow: "0 8px 20px rgba(254, 9, 68, 0.14)",
                },
                "&:active": { transform: "translateY(0) scale(0.98)" },
                "&:focus-visible": {
                  outline: `2px solid ${brand.red}`,
                  outlineOffset: 2,
                },
              }}
            >
              {/* 🆕 Round 28n — promo ribbon (top-left) */}
              {tile.badge && (
                <Box
                  sx={{
                    position: "absolute",
                    top: -6,
                    left: 8,
                    padding: "2px 7px",
                    borderRadius: 99,
                    background: BADGE_TONE[tile.badge.tone],
                    color: "#fff",
                    fontFamily: fonts.body,
                    fontSize: 8,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    boxShadow: "0 2px 6px rgba(254, 9, 68, 0.32)",
                    whiteSpace: "nowrap",
           
                    ...(tile.badge.tone === "live" && {
                      animation: "nicheLivePulse 1.6s ease-in-out infinite",
                      "@keyframes nicheLivePulse": {
                        "0%, 100%": {
                          boxShadow: "0 2px 6px rgba(22, 163, 74, 0.42)",
                        },
                        "50%": {
                          boxShadow: "0 2px 14px rgba(22, 163, 74, 0.62)",
                        },
                      },
                    }),
                  }}
                >
                  {tile.badge.text}
                </Box>
              )}

              {/* Round 28ay — wrap icon in soft circular bg so it has
                  visual weight comparable to the previous emoji. The
                  inner color is set per-tile in the icon itself. */}
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  background: "rgba(255, 255, 255, 0.65)",
                  border: "1px solid rgba(255, 255, 255, 0.8)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 6px rgba(126, 30, 46, 0.06)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {tile.glyph}
              </Box>
              <Box sx={{ textAlign: "center" }}>
                <Typography
                  sx={{
                    fontFamily: fonts.heading,
                    fontSize: 13,
                    fontWeight: 600,
                    color: brand.text,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.1,
                  }}
                >
                  {t(tile.titleKey, tile.defaultTitle)}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 10,
                    fontWeight: 500,
                    color: brand.textMuted,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.2,
                    marginTop: "2px",
                  }}
                >
                  {t(tile.subKey, tile.defaultSub)}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* ═══ Bottom action cards (loyalty + social proof) ═══ */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
        }}
      >
        {/* SunMember */}
        <Box
          component="button"
          type="button"
          onClick={() => void navigate("/account?tab=membership")}
          aria-label={t("hero.cta.member.aria", "SunMember benefits")}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 14px",
            borderRadius: "14px",
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(255,201,167,0.6) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.7)",
            cursor: "pointer",
            textAlign: "left",
            transition: "transform 0.15s ease, box-shadow 0.2s ease",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: "0 8px 18px rgba(254, 9, 68, 0.14)",
            },
            "&:focus-visible": {
              outline: `2px solid ${brand.red}`,
              outlineOffset: 2,
            },
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: 9.5,
                fontWeight: 700,
                color: brand.textMuted,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {t("hero.cta.activate", "Activate")}
            </Typography>
            <Typography
              sx={{
                fontFamily: fonts.heading,
                fontSize: 15,
                fontWeight: 600,
                color: brand.text,
                letterSpacing: "-0.01em",
                marginTop: "1px",
                lineHeight: 1.1,
              }}
            >
              {t("hero.cta.member", "SunMember")}
            </Typography>
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: 10,
                fontWeight: 500,
                color: brand.textMuted,
                marginTop: "1px",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {t("hero.cta.member.sub", "Perks for repeat guests")}
            </Typography>
          </Box>
          <DiamondRoundedIcon sx={{ fontSize: 22, color: "#FE0944", flexShrink: 0 }} />
        </Box>

        {/* 🆕 Round 28q — Earn tile (replaces live Reviews aggregate).
            Login-gated: signed-in users get a quick path to their
            rewards dashboard, anonymous users get a sign-in CTA framed
            around the value (Coins · Discount · Repeat).

            Why this trade is worth it:
              • -2 always-on Firestore listeners on the home page
              • Reviews are higher quality (no anonymous spam)
              • Sign-in conversion gets a specific value hook ("review
                this booking → unlock SunCoins → save next time"). */}
        <Box
          component="button"
          type="button"
          onClick={() => {
            if (isLoggedIn) {
              void navigate("/account?tab=rewards");
            } else {
              void navigate("/login?next=/account?tab=rewards");
            }
          }}
          aria-label={
            isLoggedIn
              ? t("hero.cta.rewards.aria.in", "View my SunCoins")
              : t(
                  "hero.cta.rewards.aria.out",
                  "Sign in to earn rewards on every booking"
                )
          }
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            padding: "12px 14px",
            borderRadius: "14px",
            background:
              "linear-gradient(135deg, rgba(255,255,255,0.85) 0%, rgba(254,201,167,0.5) 100%)",
            border: "1px solid rgba(255, 255, 255, 0.7)",
            cursor: "pointer",
            textAlign: "left",
            transition: "transform 0.15s ease, box-shadow 0.2s ease",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: "0 8px 18px rgba(254, 9, 68, 0.14)",
            },
            "&:focus-visible": {
              outline: `2px solid ${brand.red}`,
              outlineOffset: 2,
            },
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: 9.5,
                fontWeight: 700,
                color: brand.textMuted,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {isLoggedIn
                ? t("hero.cta.earn.eyebrow.in", "Rewards")
                : t("hero.cta.earn.eyebrow.out", "Earn")}
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                marginTop: "1px",
              }}
            >
              <RedeemRoundedIcon
                sx={{ fontSize: 17, color: brand.red, flexShrink: 0 }}
              />
              <Typography
                sx={{
                  fontFamily: fonts.heading,
                  fontSize: 15,
                  fontWeight: 600,
                  color: brand.text,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.1,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {isLoggedIn
                  ? t("hero.cta.earn.title.in", "SunCoins")
                  : t("hero.cta.earn.title.out", "Sign in & earn")}
              </Typography>
            </Box>
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: 10,
                fontWeight: 500,
                color: brand.textMuted,
                marginTop: "1px",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {isLoggedIn
                ? t(
                    "hero.cta.earn.sub.in",
                    "Review · Save next booking"
                  )
                : t(
                    "hero.cta.earn.sub.out",
                    "Coins · Discount · Repeat"
                  )}
            </Typography>
          </Box>
          <RedeemRoundedIcon sx={{ fontSize: 22, color: "#FE7A52", flexShrink: 0 }} />
        </Box>
      </Box>
    </Box>
  );
};

export default HeroSection;
