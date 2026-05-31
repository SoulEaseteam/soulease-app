

import React, { useEffect } from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";

import HeroSection from "@/components/home/HeroSection";
// 🆕 Round 28r7 (founder 2026-05-06) — Phase 1 referral capture.
//   When a friend opens https://sunred.vip/?ref=SUN-XXXXXX, this hook
//   stashes the code in localStorage so the Hero + booking flow can
//   surface a "Referral active" hint downstream.
import { captureReferralFromURL } from "@/utils/referral";
// 🆕 Round 28r13 — Self-hosted funnel analytics. Fires home_view
//   exactly once per page mount (not per render).
import { trackHomeView } from "@/utils/analytics";

import HomeTherapistGrid from "@/components/home/HomeTherapistGrid";
// 🆕 Round 28s98 (conversion) — trust strip restored below the hero.
import PromiseStrip from "@/components/home/PromiseStrip";
// 🆕 Round 28s112 (conversion) — addresses audit gap #9-10 in
//   docs/site-audit-2026-06.md: first-time visitors from Stickman /
//   Telegram cross-promo / WeChat OA had no obvious "where to book"
//   signal above the fold, and no social proof to validate the choice.
//   SocialProofTicker shows live Firestore-backed reservation activity;
//   ReserveCTA gives a single mode-aware Telegram-first CTA below.
import SocialProofTicker from "@/components/common/SocialProofTicker";
import ReserveCTA from "@/components/home/ReserveCTA";

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

  // 🆕 Round 28r7 — Capture referral code from URL on mount.
  //   Idempotent + fully no-op when no `?ref=` is present.
  useEffect(() => {
    captureReferralFromURL();
  }, []);

  // 🆕 Round 28r13 — Funnel analytics: count of unique home opens.
  useEffect(() => {
    trackHomeView();
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
        maxWidth: "430px",
        margin: "0 auto",
        background: "linear-gradient(180deg, #FAFBFC 0%, #F1F3F5 100%)",
        borderRadius: "28px",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(126, 30, 46, 0.10)",
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
      <HeroSection />
      {/* 🆕 Round 28s112 — trust signal (live Firestore: "X bookings in
          last 24h", "Y sessions now", "Most popular: Z"). Banner variant
          fills the home shell edge-to-edge. Sits between Hero and
          ReserveCTA so the trust register precedes the ask. */}
      <Box sx={{ padding: "12px 16px 0" }}>
        <SocialProofTicker variant="banner" />
      </Box>
      {/* 🆕 Round 28s112 — Reserve CTA (audit gap #9). Time-aware
          headline ("Reserve tonight" / "your evening" / etc.) +
          Telegram-first primary button per CLAUDE.md §5 founder bias,
          with WhatsApp / LINE / WeChat secondary chips. */}
      <ReserveCTA />
      <HomeTherapistGrid />
      {/* 🆕 Round 28s98 — trust strip (Why SunRed · Licensed · Discreet
          · 5-Lang · 24/7). Round 28s99 (founder "เอาไปไว้ล่างสุด") —
          moved below the therapist grid as a closing reassurance. */}
      <PromiseStrip />
      <Box sx={{ height: "32px" }} aria-hidden="true" />
    </Box>
  );
};

export default HomePage;
