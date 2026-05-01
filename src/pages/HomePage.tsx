// src/pages/HomePage.tsx
//
// 🎨 Phase 1 Home — pixel-perfect composition of `01-mockups/sunred-home.html`
// (canonical Phase 1 mockup `sunred-home1.html`).
//
// Layout (verbatim mockup `.phone` outer container):
//   maxWidth: 430px · margin: 0 auto · linear-gradient warm-cream bg ·
//   borderRadius 28px · 0 20px 60px shadow · overflow hidden
//
// Section flow (verbatim mockup):
//   TopNav  → Hero  → HowItWorks  → Services  → FeaturedTherapists
//   → Trust → Testimonials → FAQ → FinalCTA → Footer
//
// Existing logic intentionally retained:
//   • useDocumentMeta — SEO title/description per locale (still important)
//
// Existing logic intentionally REMOVED from home page (moves to Task 3
// `redesign/phase-2-therapists` when /therapists route is built):
//   • Firestore live therapist status subscription
//   • Geolocation-based distance sort
//   • Search / area / service filters
//   • "Today's Spotlight" + "All Therapists" 5-col grid
// Static data + Firestore plumbing remain in place under
// `src/data/therapists.ts` + `src/lib/firebase.ts` for Task 3 to pick up.

import React from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";

import TopNav from "@/components/home/TopNav";
import HeroSection from "@/components/home/HeroSection";
// 🆕 Round 21 (founder 2026-05-01): ultra-lean. Removed:
//    • FeaturedTherapists — used DEMO fallback data, not authoritative
//      Firestore live therapists. Real list is at /therapists.
//    • TrustSection — stats were hardcoded ('100% Licensed' / '4.8★ /
//      1,200 reviews') not backed by DB; misleading.
//    • FinalCTA — duplicates Hero CTA; redundant on a now-3-section page.
//    • Round 20 dropped HowItWorks → /services HOW TO BOOK tab.
//    • Round 18 dropped ServicesGrid / Testimonials / FAQ.
//    HomePage was: TopNav → Hero → Footer (felt visually empty).
// 🆕 Round 25 (founder 2026-05-02): added PromiseStrip — factual-only
//    "Why SunRed" section (ผ.พ. licensed / Outcall / 5 Languages) to
//    bridge the Hero→Footer gap WITHOUT reintroducing fake stats.
import PromiseStrip from "@/components/home/PromiseStrip";
import HomeFooter from "@/components/home/HomeFooter";

import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();

  useDocumentMeta({
    title: t(
      "meta.home.title",
      "SUNRED Bangkok • #1 Luxury Outcall Massage • EN/中文/日本語/한국어"
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
        // .phone — verbatim from mockup `sunred-home1.html`
        maxWidth: "430px",
        margin: "0 auto",
        background: "linear-gradient(180deg, #FFF8F0 0%, #FCEBDC 100%)",
        borderRadius: "28px",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(126, 30, 46, 0.15)",
        position: "relative",
      }}
    >
      <TopNav />
      <HeroSection />
      <PromiseStrip />
      <HomeFooter />
    </Box>
  );
};

export default HomePage;
