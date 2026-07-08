

import React, { useEffect } from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";

// 🆕 Round 28s145 — HeroSection fully dropped from home (founder:
//   "ลบ ค่ะ" — pointing at the entire Hero block, greeting + 4-card
//   service strip). Home now opens directly with TherapistGrid.
//   HeroSection.tsx still on disk for `git revert` if we ever bring
//   it back; the file isn't imported anywhere else.
// import HeroSection from "@/components/home/HeroSection";
// 🆕 Round 28r7 (founder 2026-05-06) — Phase 1 referral capture.
//   When a friend opens https://sunred.vip/?ref=SUN-XXXXXX, this hook
//   stashes the code in localStorage so the Hero + booking flow can
//   surface a "Referral active" hint downstream.
import { captureReferralFromURL } from "@/utils/referral";
// 🆕 Round 28s299 — same idea for a `?promo=CODE` share link/QR from
//   the admin Promotions page: stash it so the booking flow pre-fills it.
import { capturePromoFromURL } from "@/utils/discount";
// 🆕 Round 28r13 — Self-hosted funnel analytics. Fires home_view
//   exactly once per page mount (not per render).
import { trackHomeView, consumeLandingArea } from "@/utils/analytics";

import HomeTherapistGrid from "@/components/home/HomeTherapistGrid";
// 🆕 Round 28r52 — Phase 3.1 responsive shell replaces the old
//   maxWidth: 430px cage so the home widens on tablet/desktop.
import { responsiveShell } from "@/theme/breakpoints";
// 🆕 Round 28r53 — Phase 3.2 responsive typography helpers used by
//   the desktop-only hero band (below).
import { responsiveType } from "@/theme/typography";
// 🆕 Round 28r53 — same time-aware concierge mode the therapist grid
//   header + Hero pill use, so the desktop hero band's mode chip
//   never disagrees with the grid header.
import { useConciergeMode } from "@/utils/conciergeMode";
import { brand, fonts } from "@/theme";
// 🆕 Round 28s148 — PromiseStrip dropped (founder: "ลบทิ้งไป"). Value
//   was low — price anchor duplicated each card, "5 Languages" already
//   shown by TopNav pill, "Licensed · Ministry-verified" was an
//   over-claim for the gray-area positioning, "Quiet luxury" was brand
//   copy that didn't drive action. Component file kept on disk for
//   `git revert` if a future round wants it back.
// import PromiseStrip from "@/components/home/PromiseStrip";
// 🔒 Round 28s127 — SocialProofTicker + ReserveCTA removed from home
//   (founder feedback "หน้าเว็บรกมาก ไม่สววเลย"). Components still
//   live in their own files for revert via `git revert <this>`.

// Round 28s20 — PromiseStrip + HomeFooter dropped from the home
// page composition (founder: "ตัดส่วนที่ไม่ต้องมีก็ได้ ทำให้เหมือน
// เป็น เว็บแอป จริงๆ"). Real web apps (Grab, Klook, Booking) end
// the home with the main content + bottom nav — no marketing trust
// strip, no website-style social/links footer. Components live on
// in src/components/home/ for revert (`git revert <this>`) if a
// future round decides the trust signal needs to come back.

import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  // 🆕 Round 28r53 — Phase 3.2 desktop hero band uses the same
  //   concierge-mode payload as the therapist grid header so the
  //   two never disagree ("Prime hours" chip + "On standby tonight"
  //   sub-copy always come from one source).
  const concierge = useConciergeMode();

  // 🆕 Round 28r7 — Capture referral code from URL on mount.
  //   Idempotent + fully no-op when no `?ref=` is present.
  useEffect(() => {
    captureReferralFromURL();
    capturePromoFromURL();
  }, []);

  // 🆕 Round 28r13 — Funnel analytics: count of unique home opens.
  //   28s304 — attach the district keyword page the visitor arrived on
  //   (if any) so the dashboard can show which SEO page pulls traffic.
  useEffect(() => {
    trackHomeView(consumeLandingArea());
  }, []);

  useDocumentMeta({
    title: t(
      "meta.home.title",
      "SunRed Bangkok — Luxury Outcall Massage Delivered to Your Hotel"
    ),
    description: t(
      "meta.home.description",
      "Bangkok's #1 luxury outcall massage. Verified therapists delivered to your hotel — Sukhumvit, Silom, Asok, Thonglor & all major areas. English, 中文, 日本語, 한국어. 24/7 live availability."
    ),
    locale: langToLocale(i18n.language),
    url: "https://sunred.vip/",
    type: "website",
  });

  return (
    <Box
      sx={{
        // .phone — Round 28b0 cleaner palette
        // 🆕 Round 28r52 — Widens through sm/md/lg via responsiveShell.
        //   Mobile keeps the 430px phone-shell feel; tablet 600, md 768,
        //   desktop 1200 so wide viewports fill their column instead of
        //   showing a narrow phone strip in gray gutters.
        ...responsiveShell,
        background: "#F4F6F5",
        // Round the shell edges on true mobile only; on wider viewports
        // the shell reaches viewport edges (MainLayout paints the page
        // surface) so the borderRadius reads as a stray floating card.
        borderRadius: { xs: "28px", md: 0 },
        overflow: "hidden",
        boxShadow: {
          xs: "0 20px 60px rgba(15, 23, 42, 0.10)",
          md: "none",
        },
        position: "relative",
      }}
    >
      {/* 🆕 Round 28r — TopNav moved to MainLayout (site-wide). HomePage
          no longer renders it locally to avoid a duplicate top bar.
          🆕 Round 28s20 — Below-fold marketing chrome (PromiseStrip,
          HomeFooter) removed. Bottom padding gives the last therapist
          card breathing room above MainLayout's BottomNavGlass. */}
      {/* 🆕 Round 28s96 (SEO) — single visually-hidden H1 with the
          primary keyword. The hero greeting is dynamic ("Good evening")
          so the crawler-facing H1 lives here, sr-only. */}
      <Box
        component="h1"
        sx={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        SunRed — Luxury outcall massage in Bangkok, delivered to your hotel
      </Box>
      {/* 🆕 Round 28s145 — Hero block removed entirely. Home opens
          directly with trust + the therapist grid (the actual
          product). Anything Hero used to surface (greeting, service
          menu, promo banner, language switch hint) lives elsewhere:
            • Greeting → none (sr-only H1 above carries the SEO copy)
            • Service menu → ServicesPage (/services) + BottomNav
            • Promo banner → ServicesPage detail callouts
            • Language switch → TopNav lang pill (always visible) */}
      {/* 🆕 Round 28r53 — Phase 3.2 desktop-only hero band. Hidden on
          xs/sm (mobile look preserved 100% — TopNav → PromoStrip →
          therapist grid, same as today). From md+ the top-of-fold on
          desktop was mostly empty gray gutters above the grid — this
          band fills that space with a bilingual eyebrow, concierge
          CTA, and a live mode chip. Falls back cleanly if any string
          is missing from i18n. */}
      <Box
        component="section"
        aria-label="SunRed hero band"
        sx={{
          display: { xs: "none", md: "flex" },
          alignItems: "center",
          justifyContent: "space-between",
          gap: 3,
          minHeight: { md: 200, lg: 260 },
          padding: { md: "28px 24px", lg: "36px 32px" },
          margin: { md: "20px 12px 8px" },
          borderRadius: "24px",
          // Warm brand-red → coral gradient, matching the customer
          // site's ReserveCTA + tonight-special banner vocabulary.
          background: `linear-gradient(135deg, ${brand.red} 0%, #C61B2A 55%, #E14B3B 100%)`,
          color: "#fff",
          boxShadow: "0 18px 44px rgba(180, 0, 10, 0.20)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Left column — eyebrow, headline, sub-copy. */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "5px 12px",
              borderRadius: 999,
              background: "rgba(255,255,255,0.14)",
              backdropFilter: "blur(3px)",
              marginBottom: "14px",
            }}
          >
            <Box
              component="span"
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#fff",
                boxShadow: "0 0 0 3px rgba(255,255,255,0.28)",
                flexShrink: 0,
              }}
            />
            <Box
              component="span"
              sx={{
                fontFamily: fonts.body,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              {concierge.pillLabel} · Bangkok
            </Box>
          </Box>
          <Box
            component="h2"
            sx={{
              ...responsiveType.h3,
              fontFamily: fonts.heading,
              fontWeight: 600,
              lineHeight: 1.15,
              margin: 0,
              letterSpacing: "0.005em",
            }}
          >
            {t(
              "home.desktopHero.title",
              "Bangkok Outcall Massage · Delivered to Your Hotel"
            )}
          </Box>
          <Box
            sx={{
              ...responsiveType.body,
              fontFamily: fonts.body,
              fontWeight: 500,
              opacity: 0.88,
              marginTop: "10px",
              maxWidth: 620,
            }}
          >
            {t(
              "home.desktopHero.sub",
              "Verified practitioners on standby — English, 中文, 日本語, 한국어. Concierge replies in minutes."
            )}
          </Box>
        </Box>

        {/* Right column — concierge CTA. Falls back cleanly on very
            narrow md-widths by keeping wraps predictable. */}
        <Box
          component="a"
          href={`https://wa.me/66634350987?text=${encodeURIComponent(
            "Hi SunRed concierge, I'd like to reserve a session tonight — who's available?"
          )}`}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            padding: { md: "12px 22px", lg: "14px 28px" },
            borderRadius: 999,
            background: "#fff",
            color: brand.red,
            fontFamily: fonts.body,
            fontSize: { md: 14, lg: 15 },
            fontWeight: 700,
            letterSpacing: "0.01em",
            textDecoration: "none",
            boxShadow:
              "0 10px 24px rgba(15, 23, 42, 0.18), 0 2px 4px rgba(15, 23, 42, 0.10)",
            whiteSpace: "nowrap",
            transition: "transform 0.16s ease, box-shadow 0.16s ease",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow:
                "0 14px 30px rgba(15, 23, 42, 0.22), 0 3px 6px rgba(15, 23, 42, 0.12)",
            },
            "&:focus-visible": {
              outline: "2px solid #fff",
              outlineOffset: 3,
            },
          }}
        >
          {t("home.desktopHero.cta", "Chat with concierge")}
          <Box
            component="span"
            aria-hidden
            sx={{ fontSize: 16, lineHeight: 1 }}
          >
            →
          </Box>
        </Box>
      </Box>

      {/* 🆕 Round 28s148 — PromiseStrip removed entirely (founder:
          "ลบทิ้งไป"). Home now ends at the therapist list, app-style
          (Grab / Booking / Klook close the same way). 32px bottom
          spacer keeps the last card off BottomNav. */}
      <HomeTherapistGrid />
      <Box sx={{ height: "32px" }} aria-hidden="true" />
    </Box>
  );
};

export default HomePage;
