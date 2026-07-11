

import React, { useEffect } from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";

// 🆕 Round 28s145 — HeroSection fully dropped from home (founder:
//   "ลบ ค่ะ" — pointing at the entire Hero block, greeting + 4-card
//   service strip). Home now opens directly with the hero + grid.
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

// 🆕 Round 28s326 (founder 2026-07-08) — Home hero rebuilt to the
//   "Simple · Pure · Balanced" spa mockup ("ปรับหน้าโฮม แบบนี้").
//   Replaces the inline Nordic-gray hero band (r70/r76): serif headline
//   + Thai subtitle, an auto-rotating serene image carousel, and
//   Book Now / View Services CTAs. See HomeHero.tsx for the full notes.
import HomeHero from "@/components/home/HomeHero";
import HomeTherapistGrid from "@/components/home/HomeTherapistGrid";
// 🆕 Round 28r58 (Phase 2) — customer-facing Bundle Packages surface.
//   Self-hides when no active bundles, so safe to mount unconditionally
//   between the hero and the therapist grid.
import BundleSection from "@/components/common/BundleSection";
// 🆕 Round 28r74 (Nordic sections build) — 5 new marketing / navigation
//   sections built to match the Nordic Gray mockup founder approved on
//   2026-07-08. Reverses the 28s20 "app-shell home" call — founder now
//   wants richer content back ("มีแค่นี้ หรอ" · 2026-07-08 · live site
//   feedback). See individual component files for per-section notes.
import QuickNavRow from "@/components/home/QuickNavRow";
import MokoPromoBanner from "@/components/home/MokoPromoBanner";
import MembershipCard from "@/components/home/MembershipCard";
import WhySunRedSection from "@/components/home/WhySunRedSection";
import EditorialBanner from "@/components/home/EditorialBanner";
import HomeFooterV2 from "@/components/home/HomeFooterV2";
// 🆕 Round 28r52 — Phase 3.1 responsive shell replaces the old
//   maxWidth: 430px cage so the home widens on tablet/desktop.
import { responsiveShell } from "@/theme/breakpoints";

import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();

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
        // 🆕 Round 28r70 (Rebrand Phase 1) — NEUTRAL_50 page bg replaces
        //   the old cool-slate #F4F6F5 per Nordic palette.
        background: "#F7F7F6",
        // Round the shell edges on true mobile only; on wider viewports
        // the shell reaches viewport edges (MainLayout paints the page
        // surface) so the borderRadius reads as a stray floating card.
        borderRadius: { xs: "28px", md: 0 },
        overflow: "hidden",
        boxShadow: {
          // 🆕 Round 28r57 · Phase 3.6 — softer, single-layer surface
          //   shadow. Was 60px blur which read as dated multi-stack.
          xs: "0 16px 40px rgba(15, 23, 42, 0.08)",
          md: "none",
        },
        position: "relative",
      }}
    >
      {/* 🆕 Round 28r — TopNav moved to MainLayout (site-wide). HomePage
          no longer renders it locally to avoid a duplicate top bar. */}
      {/* 🆕 Round 28s96 (SEO) — single visually-hidden H1 with the
          primary keyword. The visible hero headline is a brand tagline
          ("Simple. Pure. Balanced.") so the crawler-facing H1 lives
          here, sr-only. */}
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

      {/* 🆕 Round 28s326 (founder 2026-07-08) — "Simple · Pure · Balanced"
          spa hero (serif headline + Thai subtitle + serene image
          carousel + Book Now / View Services). Replaces the r70/r76
          inline Nordic-gray hero band. */}
      <HomeHero />

      {/* 🆕 Round 28r74 — QuickNavRow (Massage · Therapists · Locations
          · Reviews). Bilingual outlined icon-circles that give the
          home page a quick way in to the 4 primary content surfaces.
          Renders at every viewport (mobile-first — the same row is
          just as useful as breadcrumbs on desktop). Therapists tap
          scrolls to the `#therapist-grid` wrapper below. */}
      <QuickNavRow />

      {/* 🆕 28s383 — Moko-style pink promo banner (founder "จัดเต็ม
          เหมือน mokofans"). Magenta→violet gradient, discreet welcome-offer
          copy, taps through to the practitioner list. */}
      <MokoPromoBanner />

      {/* 🆕 Round 28r58 — Bundle Packages between the hero and the
          therapist grid. Self-hides on empty, so no layout impact
          until admin ships a bundle via /admin/promotions. */}
      <BundleSection />

      {/* 🆕 Round 28r74 — Therapist grid wrapped in an id="therapist-grid"
          anchor so QuickNavRow's "Therapists" tap and the hero's
          "Book Now" CTA can scroll here. The shared HomeTherapistGrid
          component intentionally does NOT carry the id itself (removed
          in 28b61 · founder direction); scoping the anchor to HomePage
          keeps that decision intact. */}
      <Box id="therapist-grid" sx={{ scrollMarginTop: "12px" }}>
        <HomeTherapistGrid />
      </Box>

      {/* 🆕 Round 28r74 — 4 Nordic marketing sections in the order
          approved in the mockup (outputs/sunred-nordic-gray-mockup.html
          phone 2): Membership benefits → Why SunRed → Editorial banner
          → Footer. Each carries its own vertical rhythm (24-36px) so
          the scroll reads as a calm editorial column, not a stack of
          equally-weighted marketing tiles. */}
      <MembershipCard />
      <WhySunRedSection />
      <EditorialBanner />
      <HomeFooterV2 />

      {/* Bottom spacer keeps the footer above MainLayout's
          BottomNavGlass (which reserves 90-110px on its own, so 24
          here is just breathing room). */}
      <Box sx={{ height: "24px" }} aria-hidden="true" />
    </Box>
  );
};

export default HomePage;
