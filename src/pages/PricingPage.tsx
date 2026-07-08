// src/pages/PricingPage.tsx
//
// 🆕 Round 28r70 · Rebrand Phase 1 (2026-07-08) — stub placeholder page.
//
// The founder wants a dedicated /pricing money page as part of the full
// Nordic-Gray rebrand. Phase 2 will build the real page (rate tables,
// service ordering, session-length pricing, concierge callouts, likely
// a per-service anchor for SEO). This round only ships:
//   • the route + a prerendered SEO shell (EN + zh/ja/ko) so external
//     links land on something
//   • a minimal Nordic-styled landing card with the intent clearly
//     signposted + two escape hatches (Back to Home / Contact Concierge)
//
// Zero data-logic. No Firestore reads. No i18n key dependencies —
// copy is inlined so a missing translation namespace can't blank the
// page during the rebrand transition.
//
// Concierge WhatsApp URL is the same shared number every other CTA on
// the site uses (BundleSection r58/r60, HomePage r70, ServicesPage,
// ServiceDetailPage, HomeTherapistGrid, AdminFloatingChat, ProfilePage).

import React from "react";
import { Box } from "@mui/material";
import { useNavigate } from "react-router-dom";

import { fonts, neutrals, grays } from "@/theme";
import { responsiveShell } from "@/theme/breakpoints";
import { useDocumentMeta } from "@/utils/useDocumentMeta";

const HERO_WHATSAPP = `https://wa.me/66634350987?text=${encodeURIComponent(
  "Hi SunRed concierge, I'd like to ask about your service pricing."
)}`;

const PricingPage: React.FC = () => {
  const navigate = useNavigate();

  useDocumentMeta({
    title: "Core Experiences · Service Pricing | SunRed",
    description:
      "SunRed Core Experiences — full service pricing for our Bangkok outcall massage menu. Verified practitioners, delivered to your hotel. Detailed rate card coming soon; contact the concierge for immediate assistance.",
    url: "https://sunred.vip/pricing",
    type: "website",
  });

  return (
    <Box
      sx={{
        ...responsiveShell,
        // Nordic page bg — same as HomePage r70.
        background: neutrals.n50,
        borderRadius: { xs: "28px", md: 0 },
        overflow: "hidden",
        boxShadow: {
          xs: "0 16px 40px rgba(45, 45, 43, 0.06)",
          md: "none",
        },
        position: "relative",
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: { xs: "48px 20px", md: "80px 40px" },
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 640,
          background: "#FFFFFF",
          borderRadius: "24px",
          border: `1px solid ${neutrals.n200}`,
          boxShadow: "0 8px 24px rgba(45, 45, 43, 0.06)",
          padding: { xs: "32px 24px", md: "56px 48px" },
          textAlign: "center",
        }}
      >
        {/* Eyebrow */}
        <Box
          component="span"
          sx={{
            display: "inline-block",
            fontFamily: fonts.body,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.20em",
            textTransform: "uppercase",
            color: grays.g500,
            marginBottom: "18px",
          }}
        >
          SunRed · Bangkok
        </Box>

        {/* Headline — Playfair Display serif */}
        <Box
          component="h1"
          sx={{
            fontFamily: fonts.heading,
            fontSize: { xs: 28, md: 40 },
            fontWeight: 500,
            lineHeight: 1.15,
            letterSpacing: "-0.005em",
            color: grays.g900,
            margin: 0,
          }}
        >
          Core Experiences
        </Box>

        {/* Bilingual subtitle */}
        <Box
          sx={{
            fontFamily: fonts.body,
            fontSize: { xs: 14, md: 16 },
            fontWeight: 400,
            color: grays.g600,
            marginTop: "10px",
            letterSpacing: "0.01em",
          }}
        >
          Service Pricing · ราคาบริการ
        </Box>

        {/* Body copy */}
        <Box
          sx={{
            fontFamily: fonts.body,
            fontSize: { xs: 14, md: 15 },
            fontWeight: 400,
            color: grays.g600,
            lineHeight: 1.7,
            marginTop: "28px",
            maxWidth: 480,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          Our full pricing page is being finalised as part of the SunRed
          brand refresh. In the meantime, our concierge can answer any
          question about our services, session lengths, and rates — usually
          within a few minutes.
        </Box>

        {/* CTAs */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: "center",
            justifyContent: "center",
            gap: "12px",
            marginTop: "36px",
          }}
        >
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
              padding: { xs: "12px 22px", md: "14px 28px" },
              borderRadius: 999,
              background: grays.g900,
              color: "#FFFFFF",
              fontFamily: fonts.body,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.005em",
              textDecoration: "none",
              boxShadow: "0 6px 18px rgba(45, 45, 43, 0.24)",
              whiteSpace: "nowrap",
              transition:
                "transform 0.16s ease, box-shadow 0.16s ease, background 0.16s ease",
              minHeight: 46,
              minWidth: 200,
              "&:hover": {
                background: grays.g800,
                transform: "translateY(-1px)",
              },
              "&:focus-visible": {
                outline: `2px solid ${grays.g900}`,
                outlineOffset: 3,
              },
            }}
          >
            Contact Concierge
            <Box component="span" aria-hidden sx={{ fontSize: 15, lineHeight: 1 }}>
              →
            </Box>
          </Box>
          <Box
            component="button"
            type="button"
            onClick={() => navigate("/")}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              padding: { xs: "12px 22px", md: "14px 28px" },
              borderRadius: 999,
              background: "transparent",
              color: grays.g900,
              fontFamily: fonts.body,
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: "0.005em",
              cursor: "pointer",
              border: `1.5px solid ${grays.g900}`,
              whiteSpace: "nowrap",
              transition:
                "transform 0.16s ease, background 0.16s ease, color 0.16s ease",
              minHeight: 46,
              minWidth: 200,
              "&:hover": {
                background: grays.g900,
                color: "#FFFFFF",
                transform: "translateY(-1px)",
              },
              "&:focus-visible": {
                outline: `2px solid ${grays.g900}`,
                outlineOffset: 3,
              },
            }}
          >
            Back to Home
          </Box>
        </Box>

        {/* Footer hint */}
        <Box
          sx={{
            fontFamily: fonts.body,
            fontSize: 12,
            fontWeight: 400,
            color: grays.g500,
            marginTop: "28px",
            letterSpacing: "0.01em",
          }}
        >
          Live availability on the home page · Concierge replies in minutes
        </Box>
      </Box>
    </Box>
  );
};

export default PricingPage;
