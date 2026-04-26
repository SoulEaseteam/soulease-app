// src/pages/LandingPage.tsx
// SEO landing page — รับ slug จาก URL, render content จาก landingContent.ts
// Routes: /services/:slug, /areas/:slug
import React, { useEffect } from "react";
import { useParams, Link, useLocation, Navigate } from "react-router-dom";
import { Box, Typography, Stack, Button, Chip } from "@mui/material";
import { ChevronRight, Star, Clock, ShieldCheck, Sparkles } from "lucide-react";
import { findLanding } from "@/data/landingContent";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";

const LandingPage: React.FC = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const location = useLocation();
  const config = findLanding(slug);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  // อัปเดต <title> + <meta description> + canonical แบบ dynamic
  useEffect(() => {
    if (!config) return;
    document.title = config.title;
    // description
    let metaDesc = document.querySelector(
      'meta[name="description"]'
    ) as HTMLMetaElement | null;
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = config.description;
    // canonical
    let canonical = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `https://sunred.vip${location.pathname}`;
  }, [config, location.pathname]);

  if (!config) {
    return <Navigate to="/" replace />;
  }

  // Schema.org JSON-LD inline (Google จะ scan และโผล่เป็น rich snippet)
  const schema =
    config.type === "service"
      ? {
          "@context": "https://schema.org",
          "@type": "Service",
          name: config.heroTitle,
          description: config.intro,
          provider: { "@id": "https://sunred.vip/#business" },
          areaServed: { "@type": "City", name: "Bangkok" },
          offers: config.priceFrom
            ? {
                "@type": "Offer",
                price: config.priceFrom,
                priceCurrency: "THB",
              }
            : undefined,
        }
      : {
          "@context": "https://schema.org",
          "@type": "Place",
          name: config.heroTitle,
          description: config.intro,
          geo: config.geo
            ? {
                "@type": "GeoCoordinates",
                latitude: config.geo.lat,
                longitude: config.geo.lng,
              }
            : undefined,
          containedInPlace: { "@type": "City", name: "Bangkok" },
        };

  // FAQ schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: config.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <Box sx={{ minHeight: "100vh", pb: 12, background: "#FAFAFA" }}>
      {/* Inline schema — Google rich snippets */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      {/* HERO */}
      <Box
        sx={{
          position: "relative",
          background: "linear-gradient(180deg, #FE0944 0%, #FEAE96 100%)",
          color: "#fff",
          pt: 5,
          pb: 5,
          overflow: "hidden",
          "&::before": {
            content: '""',
            position: "absolute",
            top: -100,
            right: -100,
            width: 240,
            height: 240,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.18)",
            filter: "blur(48px)",
          },
        }}
      >
        <Box sx={{ maxWidth: 720, mx: "auto", px: 3, position: "relative" }}>
          {/* Top bar — back link + lang switcher */}
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
            <Button
              component={Link}
              to="/"
              sx={{
                color: "#fff",
                textTransform: "none",
                fontSize: 13,
                "&:hover": { background: "rgba(255,255,255,0.15)" },
              }}
            >
              ← SUNRED
            </Button>
            <LanguageSwitcher variant="compact" color="light" />
          </Stack>

          {/* Eyebrow */}
          <Typography
            sx={{
              fontSize: 11,
              letterSpacing: 4,
              opacity: 0.9,
              fontWeight: 600,
              textTransform: "uppercase",
            }}
          >
            {config.heroEyebrow}
          </Typography>

          {/* Title */}
          <Typography
            sx={{
              fontFamily: "'Cormorant Garamond', 'Playfair Display', serif",
              fontWeight: 600,
              fontSize: { xs: 36, sm: 48 },
              lineHeight: 1.05,
              mt: 0.5,
              textShadow: "0 2px 8px rgba(0,0,0,0.18)",
            }}
          >
            {config.heroTitle}
          </Typography>

          {/* Subtitle */}
          <Typography
            sx={{
              fontSize: { xs: 14, sm: 16 },
              opacity: 0.95,
              mt: 1.5,
              maxWidth: 540,
              lineHeight: 1.5,
            }}
          >
            {config.heroSubtitle}
          </Typography>

          {/* CTA row */}
          <Stack direction="row" spacing={1.5} mt={3}>
            <Button
              component={Link}
              to="/"
              variant="contained"
              endIcon={<ChevronRight size={18} />}
              sx={{
                bgcolor: "#fff",
                color: "#FE0944",
                fontWeight: 700,
                fontSize: 14,
                px: 2.5,
                py: 1.2,
                borderRadius: 99,
                textTransform: "none",
                boxShadow: "0 6px 16px rgba(0,0,0,0.15)",
                "&:hover": { bgcolor: "#fff", transform: "translateY(-1px)" },
              }}
            >
              Browse Therapists
            </Button>
            {config.priceFrom && (
              <Chip
                label={`From ฿${config.priceFrom.toLocaleString()}`}
                sx={{
                  bgcolor: "rgba(255,255,255,0.2)",
                  color: "#fff",
                  fontWeight: 700,
                  fontSize: 13,
                  border: "1px solid rgba(255,255,255,0.3)",
                  backdropFilter: "blur(6px)",
                }}
              />
            )}
          </Stack>
        </Box>
      </Box>

      {/* BODY */}
      <Box sx={{ maxWidth: 720, mx: "auto", px: 3, mt: 4 }}>
        {/* Intro */}
        <Typography
          sx={{ fontSize: 15, lineHeight: 1.7, color: "#1F2937", mb: 4 }}
        >
          {config.intro}
        </Typography>

        {/* Highlights */}
        <Box sx={{ mb: 5 }}>
          <Typography
            sx={{
              fontSize: 11,
              letterSpacing: 3,
              color: "#FE0944",
              fontWeight: 700,
              mb: 1.5,
              textTransform: "uppercase",
            }}
          >
            Why SUNRED
          </Typography>
          <Stack spacing={1.5}>
            {config.highlights.map((h, i) => (
              <Stack
                key={i}
                direction="row"
                spacing={1.5}
                alignItems="center"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: "#fff",
                  border: "1px solid #F1F5F9",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <Typography sx={{ fontSize: 22 }}>{h.icon}</Typography>
                <Typography sx={{ fontSize: 14, color: "#1F2937" }}>
                  {h.text}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>

        {/* Trust signals */}
        <Stack
          direction="row"
          spacing={0}
          justifyContent="space-around"
          sx={{
            p: 2,
            mb: 5,
            borderRadius: 3,
            background:
              "linear-gradient(135deg, rgba(254,9,68,0.06), rgba(254,174,150,0.06))",
            border: "1px solid rgba(254,9,68,0.12)",
          }}
        >
          <Stack alignItems="center" spacing={0.4}>
            <Star size={20} fill="#FBBF24" color="#FBBF24" />
            <Typography fontWeight={700}>4.8</Typography>
            <Typography fontSize={11} color="#64748B">
              Rating
            </Typography>
          </Stack>
          <Stack alignItems="center" spacing={0.4}>
            <Sparkles size={20} color="#FE0944" />
            <Typography fontWeight={700}>30 min</Typography>
            <Typography fontSize={11} color="#64748B">
              Arrival
            </Typography>
          </Stack>
          <Stack alignItems="center" spacing={0.4}>
            <ShieldCheck size={20} color="#FE0944" />
            <Typography fontWeight={700}>100%</Typography>
            <Typography fontSize={11} color="#64748B">
              Verified
            </Typography>
          </Stack>
          <Stack alignItems="center" spacing={0.4}>
            <Clock size={20} color="#FE0944" />
            <Typography fontWeight={700}>24/7</Typography>
            <Typography fontSize={11} color="#64748B">
              Open
            </Typography>
          </Stack>
        </Stack>

        {/* FAQ */}
        <Box sx={{ mb: 5 }}>
          <Typography
            sx={{
              fontSize: 11,
              letterSpacing: 3,
              color: "#FE0944",
              fontWeight: 700,
              mb: 1.5,
              textTransform: "uppercase",
            }}
          >
            FAQ
          </Typography>
          <Stack spacing={2}>
            {config.faqs.map((f, i) => (
              <Box
                key={i}
                component="details"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "#fff",
                  border: "1px solid #F1F5F9",
                  cursor: "pointer",
                  "& summary": {
                    fontWeight: 700,
                    fontSize: 14,
                    listStyle: "none",
                    "&::-webkit-details-marker": { display: "none" },
                  },
                  "&[open] summary": { color: "#FE0944", mb: 1 },
                }}
              >
                <Typography component="summary">{f.q}</Typography>
                <Typography sx={{ fontSize: 14, color: "#374151", mt: 1 }}>
                  {f.a}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Box>

        {/* Final CTA */}
        <Box
          sx={{
            p: 3,
            mt: 4,
            borderRadius: 4,
            background: "linear-gradient(135deg, #FE0944, #FEAE96)",
            color: "#fff",
            textAlign: "center",
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 1 }}>
            Ready to book?
          </Typography>
          <Typography sx={{ fontSize: 13, opacity: 0.9, mb: 2 }}>
            Browse verified therapists available right now in Bangkok
          </Typography>
          <Button
            component={Link}
            to="/"
            variant="contained"
            sx={{
              bgcolor: "#fff",
              color: "#FE0944",
              fontWeight: 700,
              px: 3,
              py: 1.2,
              borderRadius: 99,
              textTransform: "none",
              "&:hover": { bgcolor: "#fff" },
            }}
          >
            View Therapists →
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default LandingPage;
