// src/pages/TherapistDetailPage.tsx
//
// 🎯 Round 28s23 — Minimal web-app practitioner detail (founder
// 2026-05-30, "Web-app trim — ทุกหน้า").
//
// Replaces the 1,015-line Round 28af–s page that carried a 3-tier
// data lookup (real / demo / MAI fallback), DetailHero +
// DetailSections + StatsCard subcomponent stack, multi-tab info
// sheet, loyalty/rebook stats card, badge configurator, and
// dozens of decorative MUI icons. The minimal shape:
//
//   ← Back            ★ 4.9 (27)
//   [Photo gallery — horizontal scroll]
//   Name · age · area
//   ✓ Verified · Languages
//   [Services available — vertical list w/ prices]
//   [Reviews — horizontal scroll]
//   ──────────────────────
//   [STICKY] Chat to book — WhatsApp
//
// Reviews query is the same shape ServiceDetailPage uses (rule-
// compatible from 28s6). The CTA opens WhatsApp with the
// practitioner's name pre-filled so the concierge has the
// dispatch context immediately.
//
// Demo/fallback chain is intentionally dropped — production uses
// the real therapistsData array; the demo cards were dev-only.
// To revert: git revert 28s23

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
} from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import TranslateRoundedIcon from "@mui/icons-material/TranslateRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from "firebase/firestore";

import { therapists as therapistsData } from "@/data/therapists";
import services from "@/data/services";
import { db } from "@/lib/firebase";
import { brand, fonts } from "@/theme";
import { trackConciergeOpen } from "@/utils/analytics";
import { startingPrice, formatTHB } from "@/utils/servicePricing";
import { enhanceImage } from "@/utils/cloudinary";
import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";

const WHATSAPP_URL = "https://wa.me/66634350987";

interface ReviewLite {
  id: string;
  rating: number;
  text: string;
}

const TherapistDetailPage: React.FC = () => {
  const { id: rawId } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const therapist = rawId
    ? therapistsData.find((tt) => tt.id === rawId)
    : null;

  const [reviews, setReviews] = useState<ReviewLite[]>([]);

  // Reviews — gated by 28s6 rule (each doc must carry rating ≥ 1).
  useEffect(() => {
    if (!therapist) return;
    const q = query(
      collection(db, "bookings"),
      where("therapistId", "==", therapist.id),
      where("rating", ">=", 1),
      orderBy("rating", "desc"),
      limit(8),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ReviewLite[] = [];
        snap.forEach((d) => {
          const data = d.data() as {
            rating?: number;
            reviewText?: string;
          };
          const text = (data.reviewText ?? "").trim();
          if (!text) return;
          list.push({
            id: d.id,
            rating: typeof data.rating === "number" ? data.rating : 5,
            text,
          });
        });
        setReviews(list);
      },
      (err) => {
        console.warn("[TherapistDetailPage] reviews error:", err);
      },
    );
    return () => unsub();
  }, [therapist]);

  useDocumentMeta({
    title: therapist
      ? t("meta.therapist.title", "{{name}} — SunRed Bangkok", {
          name: therapist.name,
        })
      : t("meta.therapist.fallback", "Practitioner — SunRed"),
    description: therapist
      ? `${therapist.name} · ${therapist.area ?? "Bangkok"} · ${therapist.features.language}`
      : undefined,
    locale: langToLocale(i18n.language),
    url: therapist
      ? `https://sunred.vip/therapists/${therapist.id}`
      : "https://sunred.vip/",
    type: "profile",
  });

  if (!therapist) {
    return (
      <Box
        sx={{
          maxWidth: 430,
          margin: "0 auto",
          padding: "60px 24px",
          textAlign: "center",
        }}
      >
        <Typography
          sx={{ fontFamily: fonts.heading, fontSize: "22px", marginBottom: 2 }}
        >
          Practitioner not found
        </Typography>
        <Button onClick={() => navigate("/")} variant="text">
          Browse practitioners
        </Button>
      </Box>
    );
  }

  // Resolve availableServices SKUs → MassageService objects so we
  // can render names + starting prices.
  const availableServices = (
    therapist.servicesAvailable ??
    therapist.services ??
    []
  )
    .map((sku) => services.find((s) => s.id === sku))
    .filter((s): s is (typeof services)[number] => Boolean(s));

  const handleBook = () => {
    const msg = `Hi, I'd like to book ${therapist.name}. When can I reserve?`;
    trackConciergeOpen(`whatsapp_therapist_${therapist.id}`);
    window.open(
      `${WHATSAPP_URL}?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const heroPhoto = enhanceImage(
    therapist.gallery?.[0] ?? therapist.image,
    { variant: "hero", crop: "fill" },
  );

  return (
    <Box
      sx={{
        maxWidth: 430,
        margin: "0 auto",
        background:
          "linear-gradient(180deg, #FFF6EF 0%, #FCEBDC 60%, #FAFBFC 100%)",
        minHeight: "100vh",
        position: "relative",
        paddingBottom: "120px",
      }}
    >
      {/* ── Hero photo + back/rating overlay ──────────────────────── */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          height: "min(72vh, 540px)",
          overflow: "hidden",
        }}
      >
        <Box
          component="img"
          src={heroPhoto}
          alt={therapist.name}
          loading="eager"
          decoding="async"
          fetchPriority="high"
          sx={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center 25%",
          }}
        />
        <Box
          aria-hidden="true"
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(20,8,12,0.30) 0%, rgba(20,8,12,0.0) 25%, rgba(20,8,12,0.0) 60%, rgba(20,8,12,0.65) 100%)",
          }}
        />

        {/* Top row: back + rating */}
        <Box
          sx={{
            position: "absolute",
            top: 16,
            left: 16,
            right: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 2,
          }}
        >
          <IconButton
            onClick={() => navigate(-1)}
            aria-label={t("common.back", "Back")}
            sx={{
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(8px)",
              "&:hover": { background: "#fff" },
            }}
          >
            <ArrowBackRoundedIcon sx={{ color: brand.text }} />
          </IconButton>

          {therapist.rating > 0 && (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "6px 12px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.85)",
                backdropFilter: "blur(8px)",
                fontFamily: fonts.body,
                fontSize: "13px",
                fontWeight: 700,
                color: brand.text,
              }}
            >
              <StarRoundedIcon sx={{ fontSize: 16, color: "#FFA726" }} />
              {therapist.rating.toFixed(1)}
              <Box
                component="span"
                sx={{ opacity: 0.55, fontWeight: 500 }}
              >
                ({therapist.reviews})
              </Box>
            </Box>
          )}
        </Box>

        {/* Bottom: name + chips */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          sx={{
            position: "absolute",
            bottom: 20,
            left: 20,
            right: 20,
            color: "#fff",
            zIndex: 2,
          }}
        >
          <Typography
            component="h1"
            sx={{
              fontFamily: fonts.heading,
              fontSize: "32px",
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: "-0.015em",
              textShadow: "0 2px 16px rgba(20,6,12,0.45)",
              marginBottom: "6px",
            }}
          >
            {therapist.name}
            {therapist.features.age && (
              <Box
                component="span"
                sx={{
                  fontFamily: fonts.body,
                  fontSize: "18px",
                  fontWeight: 400,
                  marginLeft: "8px",
                  opacity: 0.85,
                }}
              >
                · {therapist.features.age}
              </Box>
            )}
          </Typography>

          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
            }}
          >
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 10px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.18)",
                border: "1px solid rgba(255,255,255,0.30)",
                backdropFilter: "blur(8px)",
                fontFamily: fonts.body,
                fontSize: "11px",
                fontWeight: 700,
              }}
            >
              <VerifiedRoundedIcon sx={{ fontSize: 12 }} />
              {t("therapist.verified", "Verified")}
            </Box>
            {therapist.area && (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.18)",
                  border: "1px solid rgba(255,255,255,0.30)",
                  backdropFilter: "blur(8px)",
                  fontFamily: fonts.body,
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                <PlaceRoundedIcon sx={{ fontSize: 12 }} />
                {therapist.area}
              </Box>
            )}
            {therapist.features.language && (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 10px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.18)",
                  border: "1px solid rgba(255,255,255,0.30)",
                  backdropFilter: "blur(8px)",
                  fontFamily: fonts.body,
                  fontSize: "11px",
                  fontWeight: 700,
                }}
              >
                <TranslateRoundedIcon sx={{ fontSize: 12 }} />
                {therapist.features.language}
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* ── Photo gallery — horizontal strip ───────────────────────── */}
      {therapist.gallery && therapist.gallery.length > 1 && (
        <Box sx={{ padding: "18px 0 0" }}>
          <Box
            sx={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              padding: "0 18px",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
              scrollSnapType: "x mandatory",
            }}
          >
            {therapist.gallery.slice(1, 9).map((src, idx) => (
              <Box
                key={`${src}-${idx}`}
                component="img"
                src={enhanceImage(src, { variant: "card", crop: "fill" })}
                alt={`${therapist.name} ${idx + 2}`}
                loading="lazy"
                decoding="async"
                sx={{
                  flexShrink: 0,
                  width: 110,
                  height: 140,
                  objectFit: "cover",
                  borderRadius: "12px",
                  scrollSnapAlign: "start",
                }}
              />
            ))}
          </Box>
        </Box>
      )}

      {/* ── Services available ─────────────────────────────────────── */}
      {availableServices.length > 0 && (
        <Box sx={{ padding: "24px 18px 0" }}>
          <Typography
            component="p"
            sx={{
              fontFamily: fonts.body,
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: brand.accent,
              marginBottom: "12px",
            }}
          >
            {t("therapist.servicesAvailable", "Available rituals")}
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {availableServices.map((svc) => (
              <Box
                key={svc.id}
                onClick={() =>
                  navigate(`/services/${encodeURIComponent(svc.id)}`)
                }
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    navigate(`/services/${encodeURIComponent(svc.id)}`);
                  }
                }}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  borderRadius: "14px",
                  background: "#fff",
                  border: "1px solid rgba(184, 92, 60, 0.10)",
                  boxShadow: "0 2px 8px rgba(126, 30, 46, 0.04)",
                  cursor: "pointer",
                  transition:
                    "transform 0.18s ease, box-shadow 0.18s ease",
                  "&:hover": {
                    transform: "translateY(-1px)",
                    boxShadow: "0 8px 20px rgba(126, 30, 46, 0.08)",
                  },
                  "&:focus-visible": {
                    outline: `2px solid ${brand.red}`,
                    outlineOffset: 2,
                  },
                }}
              >
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: fonts.heading,
                      fontSize: "15px",
                      fontWeight: 600,
                      color: brand.text,
                      lineHeight: 1.2,
                    }}
                  >
                    {svc.name}
                  </Typography>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: fonts.body,
                      fontSize: "11px",
                      fontWeight: 500,
                      color: brand.textMuted,
                      marginTop: "2px",
                    }}
                  >
                    {t("therapist.serviceFrom", "from")} ·{" "}
                    {svc.availableDurations?.[0] ?? 60} min
                  </Typography>
                </Box>
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: "8px" }}
                >
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: fonts.heading,
                      fontSize: "16px",
                      fontWeight: 700,
                      color: brand.red,
                    }}
                  >
                    {formatTHB(startingPrice(svc))}
                  </Typography>
                  <ArrowForwardRoundedIcon
                    sx={{ fontSize: 16, color: brand.accent }}
                  />
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* ── Reviews ────────────────────────────────────────────────── */}
      {reviews.length > 0 && (
        <Box sx={{ padding: "24px 0 0" }}>
          <Typography
            component="p"
            sx={{
              padding: "0 18px",
              fontFamily: fonts.body,
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: brand.accent,
              marginBottom: "10px",
            }}
          >
            {t("therapist.reviews", "Guest reviews")}
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: "10px",
              overflowX: "auto",
              padding: "4px 18px",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
              scrollSnapType: "x mandatory",
            }}
          >
            {reviews.map((r) => (
              <Box
                key={r.id}
                sx={{
                  flexShrink: 0,
                  width: 240,
                  scrollSnapAlign: "start",
                  padding: "14px 14px 16px",
                  borderRadius: "16px",
                  background: "#fff",
                  border: "1px solid rgba(184, 92, 60, 0.10)",
                  boxShadow: "0 4px 12px rgba(126, 30, 46, 0.05)",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "2px",
                    marginBottom: "8px",
                  }}
                >
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <StarRoundedIcon
                      key={i}
                      sx={{ fontSize: 14, color: "#FFA726" }}
                    />
                  ))}
                </Box>
                <Typography
                  component="p"
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: "12.5px",
                    fontWeight: 500,
                    color: brand.text,
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 4,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {r.text}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* ── Sticky bottom CTA ──────────────────────────────────────── */}
      <Box
        sx={{
          position: "fixed",
          bottom: 70,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          padding: "0 18px",
          pointerEvents: "none",
          zIndex: 10,
        }}
      >
        <Box
          sx={{
            width: "100%",
            maxWidth: 430,
            pointerEvents: "auto",
          }}
        >
          <Button
            fullWidth
            onClick={handleBook}
            aria-label={t(
              "therapist.bookAria",
              "Chat to book {{name}}",
              { name: therapist.name }
            )}
            startIcon={<WhatsAppIcon sx={{ fontSize: "20px !important" }} />}
            sx={{
              padding: "14px 20px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #FE0944, #FE7A52)",
              color: "#fff",
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: "15px",
              textTransform: "none",
              boxShadow:
                "0 12px 32px rgba(254, 9, 68, 0.34), inset 0 1px 0 rgba(255,255,255,0.20)",
              "&:hover": {
                background: "linear-gradient(135deg, #E00738, #E76E48)",
                boxShadow: "0 16px 40px rgba(254, 9, 68, 0.40)",
              },
            }}
          >
            {t("therapist.bookCta", "Chat to book {{name}}", {
              name: therapist.name,
            })}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default TherapistDetailPage;
