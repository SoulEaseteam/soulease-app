

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
// 🆕 Round 28r30 (founder 2026-05-07) — PromiseStrip re-enabled.
//   Founder direction: "เอากลับมาด้วยในหน้าหลัก". Strip earns its
//   slot now with a tighter editorial design + ฿1,800 price anchor.
import PromiseStrip from "@/components/home/PromiseStrip";
import HomeFooter from "@/components/home/HomeFooter";

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
          no longer renders it locally to avoid a duplicate top bar. */}
      <HeroSection />
      <HomeTherapistGrid />
      <PromiseStrip />
      <HomeFooter />
    </Box>
  );
};

export default HomePage;
