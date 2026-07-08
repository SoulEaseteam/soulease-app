

import React, { useEffect } from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
// 🆕 Round 28r70 (Rebrand Phase 1) — "View Pricing" secondary CTA on
//   the desktop hero band routes to the new /pricing stub page (real
//   page ships in Phase 2). Falls back through react-router so no
//   full page reload on the SPA.
import { useNavigate } from "react-router-dom";

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
// 🆕 Round 28r58 (Phase 2) — customer-facing Bundle Packages surface.
//   Self-hides when no active bundles, so safe to mount unconditionally
//   between the desktop hero band and the therapist grid.
import BundleSection from "@/components/common/BundleSection";
// 🆕 Round 28r74 (Nordic sections build) — 5 new marketing / navigation
//   sections built to match the Nordic Gray mockup founder approved on
//   2026-07-08. Reverses the 28s20 "app-shell home" call — founder now
//   wants richer content back ("มีแค่นี้ หรอ" · 2026-07-08 · live site
//   feedback). See individual component files for per-section notes.
import QuickNavRow from "@/components/home/QuickNavRow";
import MembershipCard from "@/components/home/MembershipCard";
import WhySunRedSection from "@/components/home/WhySunRedSection";
import EditorialBanner from "@/components/home/EditorialBanner";
import HomeFooterV2 from "@/components/home/HomeFooterV2";
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
import { fonts } from "@/theme";
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

// 🆕 Round 28r71 — Concierge endpoints moved to src/config/concierge.ts
//   (single source of truth for wa.me / LINE / Telegram). Message text
//   stays local to each surface — the WhatsApp prompt on this hero is
//   about tonight's availability, not a generic "help me" ask.
import { whatsappDeepLink } from "@/config/concierge";

const HERO_WHATSAPP = whatsappDeepLink(
  "Hi SunRed concierge, I'd like to reserve a session — who's available tonight?"
);

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
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
      {/* 🆕 Round 28r70 (Rebrand Phase 1) — desktop hero band rebuilt on
          the Nordic Gray Neutrals + Playfair Display palette per founder
          spec (2026-07-08). Copy is preserved verbatim from r61 (already
          matched the founder's approved wording); the visual system is
          fully swapped:
            • Card surface: NEUTRAL_100 on NEUTRAL_50 page (no crimson
              gradient, no white ink)
            • Ink: GRAY_800 headline · GRAY_600 body · GRAY_500 eyebrow
            • Headline set in Playfair 40-48px desktop / 28-32px mobile
              via responsiveType.hero
            • Primary CTA "Contact Us · ติดต่อ" — dark ink pill (GRAY_900
              bg / white text) → shared WhatsApp deep-link (endpoint from
              src/config/concierge.ts, same as BundleSection r58/r60)
            • Secondary CTA "View Pricing" — outlined dark border →
              routes to /pricing (Phase 2 will build the full page)
          Hidden on xs/sm (mobile look preserved — TopNav → grid). */}
      {/* 🆕 Round 28r76 (founder 2026-07-08) — Hero band now renders
          on mobile too per direction "ให้ในมือถือ ดีไซต์เดียวกับจอใหญ่".
          Was md+ only (r70) — a purely-editorial desktop hero. Now
          shows on every viewport with a column-stack layout on
          mobile (headline → Thai → body → CTAs full-width) and the
          original side-by-side row on desktop. Same visual language,
          smaller paddings/typography on mobile so it doesn't eat the
          whole phone-shell above the therapist grid. */}
      <Box
        component="section"
        aria-label="SunRed hero band"
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          gap: { xs: 2.5, md: 3, lg: 4 },
          minHeight: { xs: 0, md: 220, lg: 280 },
          padding: { xs: "22px 20px 24px", md: "32px 28px", lg: "44px 40px" },
          margin: { xs: "12px 12px 8px", md: "20px 12px 12px" },
          borderRadius: { xs: "20px", md: "24px" },
          background: "#ECEBE8", // NEUTRAL_100 — Nordic card surface
          color: "#4B4B48",       // GRAY_800 heading ink
          boxShadow: "0 8px 24px rgba(45, 45, 43, 0.06)",
          border: "1px solid #E2E0DD", // NEUTRAL_200
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Left column — eyebrow, headline, Thai subline, sub-copy. */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "5px 12px",
              borderRadius: 999,
              background: "#F7F7F6", // NEUTRAL_50
              border: "1px solid #E2E0DD",
              marginBottom: "18px",
            }}
          >
            <Box
              component="span"
              sx={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#A2BF7A", // SAGE — soft "live" dot
                boxShadow: "0 0 0 3px rgba(162, 191, 122, 0.24)",
                flexShrink: 0,
              }}
            />
            <Box
              component="span"
              sx={{
                fontFamily: fonts.body,
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#6E6E6A", // GRAY_600
              }}
            >
              {concierge.pillLabel} · Bangkok
            </Box>
          </Box>
          <Box
            component="h2"
            sx={{
              // 🆕 Round 28r70 — Playfair Display serif, 28-32px mobile
              //   (though hero band is md+ only) / 40-48px desktop per
              //   founder spec.
              fontSize: { xs: 28, sm: 32, md: 40, lg: 48 },
              lineHeight: 1.12,
              fontFamily: fonts.heading,
              fontWeight: 500,
              margin: 0,
              letterSpacing: "-0.005em",
              color: "#2D2D2B", // GRAY_900 for maximum ink weight
            }}
          >
            {t(
              "home.desktopHero.title",
              "Bangkok Outcall Massage · Delivered to Your Hotel"
            )}
          </Box>
          {/* Thai subtitle — Sarabun. Renders regardless of picked
              locale, so Thai locals immediately feel welcomed. */}
          <Box
            sx={{
              fontFamily: fonts.body,
              fontSize: { md: 14, lg: 16 },
              fontWeight: 400,
              color: "#6E6E6A", // GRAY_600
              letterSpacing: "0.01em",
              marginTop: "10px",
            }}
          >
            นวดถึงห้อง กรุงเทพฯ · จัดส่งถึงโรงแรม
          </Box>
          <Box
            sx={{
              ...responsiveType.body,
              fontFamily: fonts.body,
              fontSize: { xs: 13, md: 14, lg: 15 },
              fontWeight: 400,
              color: "#6E6E6A", // GRAY_600
              marginTop: { xs: "12px", md: "16px" },
              maxWidth: 620,
              lineHeight: 1.6,
            }}
          >
            {t(
              "home.desktopHero.sub",
              "Verified practitioners on standby — English, 中文, 日本語, 한국어. Concierge replies in minutes."
            )}
          </Box>
        </Box>

        {/* Right column — two CTAs stacked. Full-width on mobile so
            they align with the text column; auto-width row on desktop. */}
        <Box
          sx={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            gap: { xs: "8px", md: "10px" },
            minWidth: { md: 200, lg: 220 },
            width: { xs: "100%", md: "auto" },
            marginTop: { xs: "4px", md: 0 },
          }}
        >
          {/* Primary CTA — Contact Us (WhatsApp/LINE concierge). */}
          <Box
            component="a"
            href={HERO_WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: { xs: "12px 20px", md: "13px 24px", lg: "15px 28px" },
              borderRadius: 999,
              background: "#2D2D2B", // GRAY_900 primary ink
              color: "#FFFFFF",
              fontFamily: fonts.body,
              fontSize: { xs: 13.5, md: 14, lg: 15 },
              fontWeight: 600,
              letterSpacing: "0.005em",
              textDecoration: "none",
              boxShadow: "0 6px 18px rgba(45, 45, 43, 0.24)",
              whiteSpace: "nowrap",
              transition: "transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease",
              minHeight: 46,
              "&:hover": {
                background: "#4B4B48", // GRAY_800
                transform: "translateY(-1px)",
                boxShadow: "0 8px 22px rgba(45, 45, 43, 0.30)",
              },
              "&:focus-visible": {
                outline: "2px solid #2D2D2B",
                outlineOffset: 3,
              },
            }}
          >
            {t("home.desktopHero.cta", "Contact Us · ติดต่อ")}
            <Box
              component="span"
              aria-hidden
              sx={{ fontSize: 15, lineHeight: 1 }}
            >
              →
            </Box>
          </Box>
          {/* Secondary CTA — View Pricing → /pricing (Phase 2 stub). */}
          <Box
            component="button"
            type="button"
            onClick={() => navigate("/pricing")}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: { xs: "12px 20px", md: "13px 24px", lg: "15px 28px" },
              borderRadius: 999,
              background: "transparent",
              color: "#2D2D2B", // GRAY_900
              fontFamily: fonts.body,
              fontSize: { xs: 13.5, md: 14, lg: 15 },
              fontWeight: 600,
              letterSpacing: "0.005em",
              cursor: "pointer",
              border: "1.5px solid #2D2D2B",
              whiteSpace: "nowrap",
              transition:
                "transform 0.16s ease, background 0.16s ease, color 0.16s ease",
              minHeight: 46,
              "&:hover": {
                background: "#2D2D2B",
                color: "#FFFFFF",
                transform: "translateY(-1px)",
              },
              "&:focus-visible": {
                outline: "2px solid #2D2D2B",
                outlineOffset: 3,
              },
            }}
          >
            {t("home.desktopHero.ctaSecondary", "View Pricing")}
          </Box>
        </Box>
      </Box>

      {/* 🆕 Round 28r74 — QuickNavRow (Massage · Therapists · Locations
          · Reviews). Bilingual outlined icon-circles that give the
          home page a quick way in to the 4 primary content surfaces.
          Renders at every viewport (mobile-first — the same row is
          just as useful as breadcrumbs on desktop). Therapists tap
          scrolls to the `#therapist-grid` wrapper below. */}
      <QuickNavRow />

      {/* 🆕 Round 28r58 — Bundle Packages between the desktop hero
          band and the therapist grid. Self-hides on empty, so no
          layout impact until admin ships a bundle via
          /admin/promotions. Mobile: shows below TopNav+PromoStrip,
          above therapist grid (hero band is md-only). */}
      <BundleSection />

      {/* 🆕 Round 28r74 — Therapist grid wrapped in an id="therapist-grid"
          anchor so QuickNavRow's "Therapists" tap can scroll here. The
          shared HomeTherapistGrid component intentionally does NOT
          carry the id itself (removed in 28b61 · founder direction);
          scoping the anchor to HomePage keeps that decision intact. */}
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
