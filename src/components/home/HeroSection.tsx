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

import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import RedeemRoundedIcon from "@mui/icons-material/RedeemRounded";
// 🆕 Round 28ax — replace emoji glyphs with MUI icons (founder rule:
//   icons only, no emoji site-wide).
import FlightRoundedIcon from "@mui/icons-material/FlightRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import DiamondRoundedIcon from "@mui/icons-material/DiamondRounded";
// 🆕 Round 28r4 — outbound arrow on the Couples tile to telegraph that
//   tapping opens an external concierge chat (LINE) instead of an
//   in-app route. The other two tiles route internally.
import NorthEastRoundedIcon from "@mui/icons-material/NorthEastRounded";
import { brand, fonts, glass, gradients } from "@/theme";
// 🆕 Round 28r4 — single source of truth for the four operational
//   windows (prime / evening / day / off). Live pill, Tonight Special
//   eyebrow + copy all read from the same payload so the page mood
//   never disagrees with itself when the hour rolls over.
import { useConciergeMode } from "@/utils/conciergeMode";
// 🆕 Round 28r6 — shared mode glyph (☀ / 🌅 / 🌙 / ☕) so Live pill,
//   Tonight Special banner, TopNav chip, and Concierge FAB all agree.
import ConciergeModeIcon from "@/components/common/ConciergeModeIcon";
// 🆕 Round 28r7 — Phase 1 referral surface. Self-hides when no
//   referral code is captured from URL — safe to mount unconditionally.
import ReferralActiveBanner from "@/components/common/ReferralActiveBanner";
// 🆕 Round 28r13 — concierge_chat_open analytics for the Hero CTAs
//   that route guests directly into LINE (the Tonight Special promo
//   banner, the Concierge tile, and the Couples niche tile).
import { trackConciergeOpen } from "@/utils/analytics";
// 🆕 Round 28b21 — Phase 5: first-booking discount + social proof.
// 🆕 Round 28r14 (founder 2026-05-07) — FirstBookingBanner re-enabled.
//   Round 28r8 had hidden it because the FIRST10 code copied to the
//   clipboard never actually applied a discount in the booking flow
//   — pure vaporware. With the discount apply logic shipped in this
//   round, FIRST10 now subtracts 10% (capped at ฿500) at checkout
//   and surfaces on the booking success page. Banner is honest now.
//
//   AdminPresenceBadge stays commented out until an AdminLayout
//   heartbeat writer to `adminPresence/global` ships.
import FirstBookingBanner from "@/components/common/FirstBookingBanner";
import SocialProofTicker from "@/components/common/SocialProofTicker";
// import AdminPresenceBadge from "@/components/common/AdminPresenceBadge";
// 🆕 Round 28r8 — Refer & earn dialog now opens from the bottom-right
//   tile (replacing the dead SunCoins/Earn route).
import ReferralDialog from "@/components/home/ReferralDialog";

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
    // 🆕 Round 28b61 — dropped #therapist-grid hash anchor (founder
    //   "ลบ -grid"). Filter still applies via ?available=now.
    path: "/?available=now",
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
  // 🆕 Round 28r4 (founder 2026-05-06) — Time-aware page mood.
  //   `mode` flips four times a day and the components below pull
  //   their copy from this payload. Refresh cadence is 60s so we
  //   transition across boundaries (e.g. 21:59 → 22:00 prime) without
  //   a hard reload.
  const concierge = useConciergeMode();

  // 🆕 Round 28r5 (founder 2026-05-06) — Promo banner now cycles through
  //   2–3 messages per mode every 7.5s. Slow enough to read fully (per
  //   founder spa-pacing direction), pauses on hover so a reader who
  //   wants to dwell on one isn't fighting the carousel. Reset to 0
  //   whenever the mode itself flips (e.g. 21:59 → 22:00 prime).
  const [promoIdx, setPromoIdx] = useState(0);
  const [promoPaused, setPromoPaused] = useState(false);
  const promoMessages = concierge.promoMessages;

  useEffect(() => {
    setPromoIdx(0);
  }, [concierge.mode]);

  useEffect(() => {
    if (promoPaused || promoMessages.length <= 1) return;
    const id = window.setInterval(() => {
      setPromoIdx((prev) => (prev + 1) % promoMessages.length);
    }, 7500);
    return () => window.clearInterval(id);
  }, [promoPaused, promoMessages.length]);

  const promo = promoMessages[promoIdx] ?? promoMessages[0];

  // 🆕 Round 28r8 — Local state for the Refer & earn dialog when
  //   triggered from the bottom-right tile. (TopNav drawer also opens
  //   the same dialog via its own state instance.)
  const [referralOpen, setReferralOpen] = useState(false);

  // 🆕 Round 28r8 — useAuth() removed (and the login-gated SunCoins
  //   tile with it). Bottom-right tile is now Refer & earn → opens
  //   ReferralDialog directly. Sign-in CTA still lives in TopNav.

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

        {/* 🆕 Round 28r4 — Live pill is now time-aware. The dot color +
            label flip across the four concierge windows so a guest who
            opens the page at 23:30 sees "Prime hours" with a coral
            crescent, while a guest at 06:00 sees "Concierge · 09:00"
            with a muted slate dot (no fake green liveness). */}
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
            color: concierge.mode === "off" ? "rgba(60,30,20,0.55)" : brand.burgundy,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {/* 🆕 Round 28r6 — Live pill glyph now always uses the shared
              ConciergeModeIcon so it cycles ☀ → 🌅 → 🌙 → ☕ across
              the day. Colour + glow are mode-tinted; the prime moon
              gets the strongest red drop-shadow because that's our
              headline window. */}
          {(() => {
            const tint =
              concierge.mode === "prime"
                ? brand.red
                : concierge.mode === "evening"
                ? "#F59E0B"
                : concierge.mode === "off"
                ? "rgba(60,30,20,0.55)"
                : "#FE7A52";
            return (
              <ConciergeModeIcon
                mode={concierge.mode}
                sx={{
                  fontSize: 12,
                  color: tint,
                  filter:
                    concierge.mode === "off"
                      ? "none"
                      : `drop-shadow(0 0 4px ${tint})`,
                  animation:
                    concierge.mode === "off"
                      ? "none"
                      : "heroPulseDot 2s ease-in-out infinite",
                  "@keyframes heroPulseDot": {
                    "0%, 100%": { opacity: 1 },
                    "50%": { opacity: 0.55 },
                  },
                }}
              />
            );
          })()}
          {t("hero.live.prefix", "Live · BKK")} ·{" "}
          {t(`hero.live.${concierge.mode}`, concierge.pillLabel)}
        </Box>
      </Box>

      {/* 🆕 Round 28r7 (founder 2026-05-06) — Phase 1 referral chip.
          Renders nothing unless a `?ref=` was captured by HomePage on
          mount. When visible, sits between the brand row and the
          social-proof ticker so a referred friend sees the
          acknowledgement before anything else loads. */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          marginBottom: "10px",
        }}
      >
        <ReferralActiveBanner />
      </Box>

      {/* 🆕 Round 28b21 (founder 2026-05-04) — Phase 5 of conversion plan.
          Social-proof ticker + first-booking 10% off banner + admin
          online badge sit ABOVE the Tonight Special promo so they're
          the first thing the eye catches as the page loads.
          - SocialProofTicker rotates between 3 messages every 5s.
          - FirstBookingBanner self-hides for repeat customers.
          - AdminPresenceBadge confirms a human is on the other end. */}
      {/* 🆕 Round 28r14 (founder 2026-05-07) — FirstBookingBanner
          back, sitting beneath the SocialProofTicker. The FIRST10
          code now actually subtracts 10% (capped at ฿500) at
          checkout — apply logic shipped in this round. Tapping the
          banner copies the code to clipboard; auto-fill in the
          booking form picks it up via sessionStorage. */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          marginBottom: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "6px",
        }}
      >
        <SocialProofTicker variant="inline" />
        <FirstBookingBanner />

        {/* 🆕 Round 28r12 (founder 2026-05-06) — "Female-only · No
            ladyboys" trust strip. Direct response to the recurring
            customer FAQ pattern ("Who isn't a Ladyboy?" / "Which
            lady is the youngest, real age?" — 8% of inbound chat
            inquiries). BKK has many mixed-roster massage operators;
            stating cisgender female + Thai nationality up-front
            removes a dealbreaker question before guests have to ask.
            Phrasing is positive identification ("verified Thai
            female") not negative differentiation. */}
        <Box
          aria-label="Verified roster"
          sx={{
            display: "inline-flex",
            alignSelf: "flex-start",
            alignItems: "center",
            gap: "6px",
            paddingX: "9px",
            paddingY: "3px",
            borderRadius: 999,
            background:
              "linear-gradient(135deg, rgba(255,231,213,0.85) 0%, rgba(254,201,167,0.4) 100%)",
            border: "1px solid rgba(184, 92, 60, 0.22)",
          }}
        >
          <Box
            component="span"
            aria-hidden
            sx={{
              fontFamily: fonts.body,
              fontSize: 9.5,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: brand.accent,
            }}
          >
            ✓ 100% Thai female
          </Box>
          <Box
            component="span"
            aria-hidden
            sx={{
              width: 3,
              height: 3,
              borderRadius: "50%",
              background: "rgba(184, 92, 60, 0.45)",
            }}
          />
          <Box
            component="span"
            aria-hidden
            sx={{
              fontFamily: fonts.body,
              fontSize: 9.5,
              fontWeight: 700,
              color: "rgba(60, 30, 20, 0.7)",
            }}
          >
            Verified · cisgender
          </Box>
        </Box>
      </Box>

      {/* 🆕 Round 28r4 — Tonight Special is now CLICKABLE and TIME-AWARE.
          Three concrete improvements over Round 28b21:
            • cursor: "pointer" — banner was a dead pixel before
            • onClick → opens LINE concierge in a new tab so guests can
              chat directly with View; previously had no destination
            • copy reads from `concierge` mode payload so 11pm shows
              "Concierge live, slots filling fast" while 7am shows
              "Concierge resumes at 09:00" — same banner, four moods. */}
      <Box
        component="button"
        type="button"
        onClick={() => {
          trackConciergeOpen("hero_tonight_special");
          window.open(LINE_CONCIERGE_URL, "_blank", "noopener,noreferrer");
        }}
        onMouseEnter={() => setPromoPaused(true)}
        onMouseLeave={() => setPromoPaused(false)}
        onTouchStart={() => setPromoPaused(true)}
        aria-label={`${concierge.promoEyebrow} — ${promo.title}`}
        sx={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          padding: "16px 18px",
          marginBottom: "12px",
          borderRadius: "18px",
          // 🆕 Round 28r5 (founder 2026-05-06) — gradient + glow now
          //   pulled from the concierge mode payload. 23:00 prime burns
          //   midnight burgundy → coral; 11:00 day shows coral → gold
          //   peach; 06:00 off shows muted slate dawn. Same banner,
          //   four moods. The `transition` makes the gradient morph
          //   smoothly when the page rolls over a boundary.
          background: concierge.bannerGradient,
          color: "#fff",
          cursor: "pointer",
          border: "none",
          textAlign: "left",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          boxShadow: `${concierge.bannerGlow}, inset 0 1px 0 rgba(255, 255, 255, 0.35)`,
          transition: "background 0.6s ease, box-shadow 0.6s ease",
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
          "&:hover": {
            transform: "translateY(-1px)",
            boxShadow: `0 14px 32px ${concierge.bannerGlow
              .replace("0 10px 28px ", "")
              .replace(/0\.\d+\)/, "0.50)")}, inset 0 1px 0 rgba(255, 255, 255, 0.35)`,
          },
          "&:active": {
            transform: "translateY(0) scale(0.99)",
          },
          "&:focus-visible": {
            outline: "2px solid rgba(255,255,255,0.85)",
            outlineOffset: 2,
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

        {/* Glyph badge — 🆕 Round 28r6 (founder 2026-05-06):
            Icon now flips with the concierge window. 🌙 prime, 🌅
            evening sunset, ☀ daytime, ☕ off-hours. Same circular
            glass plate keeps the silhouette identical so the banner's
            visual shape stays consistent while the meaning changes. */}
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
          <ConciergeModeIcon
            mode={concierge.mode}
            sx={{ fontSize: 24, color: "#fff" }}
          />
        </Box>

        {/* Copy — 🆕 Round 28r5 (founder 2026-05-06).
            Eyebrow stays mode-fixed (it's a section label).
            Title + sub crossfade through 2–3 messages every 7.5s
            so the banner re-baits the eye without page reload. */}
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
            {t(
              `hero.promo.eyebrow.${concierge.mode}`,
              concierge.promoEyebrow
            )}
          </Typography>
          <Box
            sx={{
              position: "relative",
              minHeight: 50,
              marginTop: "3px",
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <Box
                key={`${concierge.mode}-${promoIdx}`}
                component={motion.div}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <Typography
                  sx={{
                    fontFamily: fonts.heading,
                    fontStyle: "italic",
                    fontSize: 16,
                    fontWeight: 500,
                    letterSpacing: "-0.01em",
                    lineHeight: 1.2,
                  }}
                >
                  {t(
                    `hero.promo.title.${concierge.mode}.${promoIdx}`,
                    promo.title
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
                    `hero.promo.sub.${concierge.mode}.${promoIdx}`,
                    promo.sub
                  )}
                </Typography>
              </Box>
            </AnimatePresence>
          </Box>

          {/* 🆕 Round 28r5 — tiny pagination dots so the guest sees
              "this banner has more to say". Lit dot = current message;
              taps cycle manually. */}
          {promoMessages.length > 1 && (
            <Box
              sx={{
                display: "flex",
                gap: "4px",
                marginTop: "6px",
              }}
            >
              {promoMessages.map((_, i) => (
                <Box
                  key={i}
                  component="span"
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    setPromoIdx(i);
                    setPromoPaused(true);
                  }}
                  sx={{
                    width: i === promoIdx ? 16 : 6,
                    height: 4,
                    borderRadius: 2,
                    background:
                      i === promoIdx
                        ? "rgba(255, 255, 255, 0.95)"
                        : "rgba(255, 255, 255, 0.35)",
                    transition:
                      "width 0.25s ease, background 0.25s ease",
                    cursor: "pointer",
                  }}
                />
              ))}
            </Box>
          )}
        </Box>

        {/* 🆕 Round 28r31 (founder 2026-05-07) — megaphone sticker
            removed. Founder direction: "เอาสติกเกอออก". The Tonight
            Special banner now stands cleanly on its gradient with the
            rotating headlines + dot indicators alone — less visual
            clutter, more editorial register. */}
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
              trackConciergeOpen("hero_couples_tile");
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
              {/* 🆕 Round 28r4 — outbound arrow (top-right) when the
                  tile opens an external concierge chat (LINE) instead
                  of an in-app route. Quiet glyph, no badge framing —
                  just enough to telegraph "this leaves the app". */}
              {tile.action === "openLine" && (
                <Box
                  aria-hidden="true"
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.85)",
                    border: "1px solid rgba(184, 92, 60, 0.18)",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 1px 3px rgba(126, 30, 46, 0.10)",
                  }}
                >
                  <NorthEastRoundedIcon
                    sx={{ fontSize: 11, color: brand.accent }}
                  />
                </Box>
              )}

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

      {/* ═══ Bottom action cards — 🆕 Round 28r8 (founder 2026-05-06)
          ═══════════════════════════════════════════════════════════
          Both tiles previously routed to dead destinations:
            • SunMember → /account?tab=membership → /profile (no
              membership UI exists)
            • SunCoins/Earn → /account?tab=rewards → /profile (no
              rewards UI exists)
          Replaced with two REAL endpoints that work today:
            • Concierge → opens LINE chat with View directly
            • Refer & earn → opens the (just-wired) ReferralDialog
          When membership / rewards systems ship, we can swap them
          back. Until then the page never sends a guest to a dead
          end. */}
      <Box
        sx={{
          position: "relative",
          zIndex: 1,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
        }}
      >
        {/* Concierge tile — opens LINE chat. Real, always works. */}
        <Box
          component="button"
          type="button"
          onClick={() => {
            trackConciergeOpen("hero_concierge_tile");
            window.open(LINE_CONCIERGE_URL, "_blank", "noopener,noreferrer");
          }}
          aria-label={t(
            "hero.cta.concierge.aria",
            "Chat with the SunRed concierge on LINE"
          )}
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
              {t("hero.cta.concierge.eyebrow", "Talk to")}
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
              {t("hero.cta.concierge.title", "Concierge")}
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
              {t("hero.cta.concierge.sub", "Chat live · 5 languages")}
            </Typography>
          </Box>
          <DiamondRoundedIcon sx={{ fontSize: 22, color: "#FE0944", flexShrink: 0 }} />
        </Box>

        {/* Refer & earn tile — opens the ReferralDialog (Phase 1). */}
        <Box
          component="button"
          type="button"
          onClick={() => setReferralOpen(true)}
          aria-label={t(
            "hero.cta.refer.aria",
            "Open the refer-and-earn dialog"
          )}
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
              {t("hero.cta.refer.eyebrow", "Refer & earn")}
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
                {t("hero.cta.refer.title", "Give 500฿")}
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
              {t("hero.cta.refer.sub", "Friends save · You save back")}
            </Typography>
          </Box>
          <RedeemRoundedIcon sx={{ fontSize: 22, color: "#FE7A52", flexShrink: 0 }} />
        </Box>
      </Box>

      {/* 🆕 Round 28r8 — Refer & earn dialog (opened from the bottom-
          right tile above). TopNav drawer also opens this dialog
          via its own state instance — both are safe to coexist. */}
      <ReferralDialog
        open={referralOpen}
        onClose={() => setReferralOpen(false)}
      />
    </Box>
  );
};

export default HeroSection;
