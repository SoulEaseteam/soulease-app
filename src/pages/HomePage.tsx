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
import HowItWorks from "@/components/home/HowItWorks";
import ServicesGrid from "@/components/home/ServicesGrid";
import FeaturedTherapists from "@/components/home/FeaturedTherapists";
import TrustSection from "@/components/home/TrustSection";
import Testimonials from "@/components/home/Testimonials";
import FAQ from "@/components/home/FAQ";
import FinalCTA from "@/components/home/FinalCTA";
import HomeFooter from "@/components/home/HomeFooter";

import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";
import useTherapists from "@/utils/useTherapists";

const HomePage: React.FC = () => {
  const { t, i18n } = useTranslation();
  // 🔌 Restored Firestore live therapist data — see src/utils/useTherapists.ts.
  // Static seed (`therapistsData`) merged with live overrides
  // (`onSnapshot(therapists)`), distance-sorted with privacy filtering. The
  // home featured-scroll shows the first 4; FeaturedTherapists handles the
  // empty/loading state with a static demo fallback.
  const therapists = useTherapists();

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
      <HowItWorks />
      <ServicesGrid />

      {/* Featured therapists — anchored to #therapist-list so HeroSection's
          and FinalCTA's CTAs can scroll to it. Receives live data from
          `useTherapists()`; falls back to static demo if subscription empty. */}
      <Box id="therapist-list" sx={{ scrollMarginTop: "80px" }}>
        <FeaturedTherapists therapists={therapists} />
      </Box>

      <TrustSection />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <HomeFooter />
    </Box>
  );
};

export default HomePage;
