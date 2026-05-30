// src/pages/TherapistDetailPage.tsx
//
// 🎯 Round 28s24 — Appointment-booking style (founder 2026-05-30,
// reference: Behance "Tracey Clifford" doctor app).
//
// Replaces the 28s23 "Tinder profile" hero with the cleaner
// appointment shape the founder pointed at:
//
//   ┌─────────────────────────────────────┐
//   │  ←                              ♡   │
//   │                                     │
//   │           [photo card]              │
//   │                                     │
//   │   Yuri                              │
//   │   Specialist · ★ 4.9                │
//   │       💬   📞   💌                  │  ← 3 quick contact icons
//   └─────────────────────────────────────┘
//
//   [⏱ 5+ yrs Experience] [👥 200+ Sessions] [⭐ 4.9 Reviews]
//
//   SELECT DATE
//   [Today · Tomorrow · Tue · Wed · Thu · Fri · Sat]
//
//   SELECT TIME
//   [⏱ 19:00] [⏱ 20:00] [⏱ 21:00] [⏱ 22:00]
//
//   ──────────────────────────────────────
//   [STICKY] Reserve {Yuri} · ฿1,200 →
//
// CTA opens WhatsApp pre-filled with the practitioner name +
// selected date + selected time so the concierge sees the full
// dispatch context in one message. Selection state is in-memory
// only — the real booking flow at /booking/:id still owns the
// money path; this page just feeds the chat shortcut.

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  Button,
} from "@mui/material";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";

// Round 28s25 — Quick-chat circle now uses a concierge avatar
// (`/images/icon/admins.png`) instead of the generic chat glyph
// so the affordance reads as "tap to chat with a real person",
// not "tap to open a chat app". Swap the src to a real photo of
// the concierge whenever one is provided.
const CONCIERGE_AVATAR = "/images/icon/admins.png";
import ScheduleRoundedIcon from "@mui/icons-material/ScheduleRounded";
import GroupRoundedIcon from "@mui/icons-material/GroupRounded";
import StarsRoundedIcon from "@mui/icons-material/StarsRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import { therapists as therapistsData } from "@/data/therapists";
import services from "@/data/services";
import { brand, fonts } from "@/theme";
import { trackConciergeOpen } from "@/utils/analytics";
import { startingPrice, formatTHB } from "@/utils/servicePricing";
import { enhanceImage } from "@/utils/cloudinary";
import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";

const WHATSAPP_URL = "https://wa.me/66634350987";

// Generate 7 upcoming dates starting from today.
function nextDays(n: number): { iso: string; label: string; day: string }[] {
  const out: { iso: string; label: string; day: string }[] = [];
  const today = dayjs().startOf("day");
  for (let i = 0; i < n; i++) {
    const d = today.add(i, "day");
    out.push({
      iso: d.format("YYYY-MM-DD"),
      label: d.format("D"),
      day:
        i === 0
          ? "Today"
          : i === 1
            ? "Tomorrow"
            : d.format("ddd"),
    });
  }
  return out;
}

// Build hourly slots between startTime and endTime in HH:mm.
function buildTimeSlots(startHHMM: string, endHHMM: string): string[] {
  const [sh] = startHHMM.split(":").map(Number);
  const [eh] = endHHMM.split(":").map(Number);
  const slots: string[] = [];
  // Overnight window (e.g. 19:00 → 05:00)
  if (Number.isFinite(sh) && Number.isFinite(eh)) {
    let h = sh;
    let safety = 0;
    while (safety < 24) {
      slots.push(`${String(h).padStart(2, "0")}:00`);
      h = (h + 1) % 24;
      if (h === eh) break;
      safety++;
    }
  }
  return slots;
}

const TherapistDetailPage: React.FC = () => {
  const { id: rawId } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const therapist = rawId
    ? therapistsData.find((tt) => tt.id === rawId)
    : null;

  const dates = useMemo(() => nextDays(7), []);
  const slots = useMemo(
    () =>
      therapist
        ? buildTimeSlots(therapist.startTime, therapist.endTime)
        : [],
    [therapist],
  );

  const [selectedDate, setSelectedDate] = useState(dates[0].iso);
  const [selectedTime, setSelectedTime] = useState(slots[0] ?? "20:00");

  useEffect(() => {
    if (slots.length > 0 && !slots.includes(selectedTime)) {
      setSelectedTime(slots[0]);
    }
  }, [slots, selectedTime]);

  // Resolve available services for the headline price anchor
  const availableServices = useMemo(
    () =>
      (therapist?.servicesAvailable ?? therapist?.services ?? [])
        .map((sku) => services.find((s) => s.id === sku))
        .filter((s): s is (typeof services)[number] => Boolean(s)),
    [therapist],
  );

  const fromPrice =
    availableServices.length > 0
      ? Math.min(...availableServices.map((s) => startingPrice(s)))
      : null;

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
          sx={{
            fontFamily: fonts.heading,
            fontSize: "22px",
            marginBottom: 2,
          }}
        >
          Practitioner not found
        </Typography>
        <Button onClick={() => navigate("/")} variant="text">
          Browse practitioners
        </Button>
      </Box>
    );
  }

  const heroPhoto = enhanceImage(
    therapist.gallery?.[0] ?? therapist.image,
    { variant: "hero", crop: "fill" },
  );

  const handleBook = () => {
    const dateLabel = dayjs(selectedDate).format("ddd D MMM");
    const specialty =
      availableServices[0]?.name ?? "session";
    const msg = `Hi, I'd like to reserve ${therapist.name} on ${dateLabel} at ${selectedTime} (${specialty}). Can you confirm?`;
    trackConciergeOpen(`whatsapp_therapist_${therapist.id}`);
    window.open(
      `${WHATSAPP_URL}?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleChatNow = () => {
    const msg = `Hi, I'd like to ask about ${therapist.name}.`;
    trackConciergeOpen(`whatsapp_therapist_${therapist.id}_quick`);
    window.open(
      `${WHATSAPP_URL}?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  // Headline experience number — fall back gracefully if not present.
  const experienceYears = therapist.experience ?? 5;
  const sessionsLabel = therapist.totalSessions
    ? `${therapist.totalSessions}+`
    : "200+";
  const reviewsLabel =
    therapist.reviews > 0 ? therapist.reviews : "—";
  const ratingLabel =
    therapist.rating > 0 ? therapist.rating.toFixed(1) : "—";

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
      {/* ── Photo card with back button overlay ─────────────────────── */}
      <Box sx={{ padding: "14px 16px 0" }}>
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          sx={{
            position: "relative",
            borderRadius: "24px",
            overflow: "hidden",
            height: "min(54vh, 420px)",
            background: "#1a0e0a",
            boxShadow:
              "0 14px 38px rgba(126, 30, 46, 0.14), 0 2px 8px rgba(126, 30, 46, 0.06)",
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
                "linear-gradient(180deg, rgba(20,8,12,0.25) 0%, transparent 30%, transparent 55%, rgba(20,8,12,0.78) 100%)",
            }}
          />

          {/* Back button */}
          <IconButton
            onClick={() => navigate(-1)}
            aria-label={t("common.back", "Back")}
            sx={{
              position: "absolute",
              top: 14,
              left: 14,
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(8px)",
              "&:hover": { background: "#fff" },
              zIndex: 2,
            }}
          >
            <ArrowBackRoundedIcon sx={{ color: brand.text }} />
          </IconButton>

          {/* Bottom-of-card title block */}
          <Box
            sx={{
              position: "absolute",
              bottom: 18,
              left: 20,
              right: 20,
              color: "#fff",
              zIndex: 2,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "16px",
            }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                component="h1"
                sx={{
                  fontFamily: fonts.heading,
                  fontSize: "30px",
                  fontWeight: 600,
                  lineHeight: 1.05,
                  letterSpacing: "-0.015em",
                  textShadow: "0 2px 14px rgba(20,6,12,0.45)",
                  marginBottom: "4px",
                }}
              >
                {therapist.name}
              </Typography>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontFamily: fonts.body,
                  fontSize: "12.5px",
                  fontWeight: 600,
                  opacity: 0.92,
                }}
              >
                <Box
                  component="span"
                  sx={{ letterSpacing: "0.005em" }}
                >
                  {t("therapist.specialist", "Practitioner")}
                </Box>
                {therapist.rating > 0 && (
                  <>
                    <Box
                      component="span"
                      sx={{ opacity: 0.5 }}
                    >
                      ·
                    </Box>
                    <Box
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "3px",
                      }}
                    >
                      <StarRoundedIcon
                        sx={{ fontSize: 14, color: "#FFC371" }}
                      />
                      {ratingLabel}
                    </Box>
                  </>
                )}
              </Box>
            </Box>

            {/* Round 28s25 — Quick contact: concierge avatar instead
                of the chat glyph. Photo-style affordance reads as
                "ping a real person", which is the brand's chat-
                first promise. Swap the src for a real concierge
                photo whenever one is provided. */}
            <Box
              component="button"
              type="button"
              onClick={handleChatNow}
              aria-label={t(
                "therapist.chatQuick",
                "Quick chat about {{name}}",
                { name: therapist.name }
              )}
              sx={{
                position: "relative",
                width: 52,
                height: 52,
                borderRadius: "50%",
                padding: 0,
                border: "2px solid rgba(255,255,255,0.85)",
                background: "#fff",
                cursor: "pointer",
                boxShadow:
                  "0 8px 22px rgba(254, 9, 68, 0.36), inset 0 1px 0 rgba(255,255,255,0.25)",
                transition:
                  "transform 0.12s ease, box-shadow 0.18s ease",
                "&:hover": {
                  transform: "scale(1.04)",
                  boxShadow:
                    "0 12px 30px rgba(254, 9, 68, 0.42)",
                },
                "&:focus-visible": {
                  outline: `2px solid #fff`,
                  outlineOffset: 2,
                },
              }}
            >
              <Box
                component="img"
                src={CONCIERGE_AVATAR}
                alt=""
                aria-hidden="true"
                sx={{
                  width: "100%",
                  height: "100%",
                  borderRadius: "50%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              {/* Tiny green online dot to telegraph "concierge is
                  available right now". Sits bottom-right of the
                  avatar like Instagram/Messenger. */}
              <Box
                aria-hidden="true"
                sx={{
                  position: "absolute",
                  right: -2,
                  bottom: -2,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: brand.green,
                  border: "2px solid #fff",
                }}
              />
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Stat row — 3 cards ──────────────────────────────────────── */}
      <Box
        sx={{
          padding: "18px 16px 0",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "10px",
        }}
      >
        {[
          {
            icon: ScheduleRoundedIcon,
            label: `${experienceYears} yrs`,
            sub: t("therapist.experience", "Experience"),
          },
          {
            icon: GroupRoundedIcon,
            label: sessionsLabel,
            sub: t("therapist.sessions", "Sessions"),
          },
          {
            icon: StarsRoundedIcon,
            label: `${ratingLabel === "—" ? "—" : ratingLabel}`,
            sub:
              reviewsLabel === "—"
                ? t("therapist.reviewsNoneYet", "Reviews")
                : `${reviewsLabel} ${t("therapist.reviews", "Reviews")}`,
          },
        ].map((s, idx) => {
          const Icon = s.icon;
          return (
            <Box
              key={idx}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 12px",
                borderRadius: "14px",
                background: "#fff",
                border: "1px solid rgba(184, 92, 60, 0.10)",
                boxShadow: "0 2px 8px rgba(126, 30, 46, 0.04)",
              }}
            >
              <Box
                sx={{
                  flexShrink: 0,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "rgba(254, 9, 68, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon sx={{ fontSize: 16, color: brand.red }} />
              </Box>
              <Box sx={{ display: "flex", flexDirection: "column" }}>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: fonts.heading,
                    fontSize: "13px",
                    fontWeight: 700,
                    color: brand.text,
                    lineHeight: 1.1,
                  }}
                >
                  {s.label}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: "10.5px",
                    fontWeight: 500,
                    color: brand.textMuted,
                    marginTop: "1px",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: 90,
                  }}
                >
                  {s.sub}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* ── Select Date ─────────────────────────────────────────────── */}
      <Box sx={{ padding: "22px 16px 0" }}>
        <Typography
          component="p"
          sx={{
            fontFamily: fonts.body,
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: brand.accent,
            marginBottom: "10px",
          }}
        >
          {t("therapist.selectDate", "Select date")}
        </Typography>
        <Box
          role="radiogroup"
          aria-label={t("therapist.dateAria", "Choose a date")}
          sx={{
            display: "flex",
            gap: "8px",
            overflowX: "auto",
            scrollbarWidth: "none",
            "&::-webkit-scrollbar": { display: "none" },
            paddingBottom: "2px",
            scrollSnapType: "x mandatory",
          }}
        >
          {dates.map((d) => {
            const isActive = d.iso === selectedDate;
            return (
              <Box
                key={d.iso}
                component="button"
                type="button"
                onClick={() => setSelectedDate(d.iso)}
                role="radio"
                aria-checked={isActive}
                sx={{
                  flexShrink: 0,
                  scrollSnapAlign: "start",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "2px",
                  padding: "10px 14px",
                  borderRadius: "16px",
                  cursor: "pointer",
                  border: isActive
                    ? "1px solid transparent"
                    : "1px solid rgba(184, 92, 60, 0.15)",
                  background: isActive
                    ? "linear-gradient(135deg, #FE0944, #FE7A52)"
                    : "#fff",
                  color: isActive ? "#fff" : brand.text,
                  boxShadow: isActive
                    ? "0 6px 16px rgba(254, 9, 68, 0.30), inset 0 1px 0 rgba(255,255,255,0.20)"
                    : "0 1px 3px rgba(126, 30, 46, 0.04)",
                  transition:
                    "background 0.18s ease, box-shadow 0.18s ease, transform 0.12s ease",
                  "&:hover": { transform: "translateY(-1px)" },
                  "&:focus-visible": {
                    outline: `2px solid ${brand.red}`,
                    outlineOffset: 2,
                  },
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontFamily: fonts.heading,
                    fontSize: "18px",
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {d.label}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: "10px",
                    fontWeight: 600,
                    opacity: isActive ? 0.9 : 0.6,
                    letterSpacing: "0.02em",
                  }}
                >
                  {d.day}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* ── Select Time ─────────────────────────────────────────────── */}
      {slots.length > 0 && (
        <Box sx={{ padding: "22px 16px 0" }}>
          <Typography
            component="p"
            sx={{
              fontFamily: fonts.body,
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: brand.accent,
              marginBottom: "10px",
            }}
          >
            {t("therapist.selectTime", "Select time")}
          </Typography>
          <Box
            role="radiogroup"
            aria-label={t("therapist.timeAria", "Choose a time")}
            sx={{
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
              paddingBottom: "2px",
              scrollSnapType: "x mandatory",
            }}
          >
            {slots.map((slot) => {
              const isActive = slot === selectedTime;
              return (
                <Box
                  key={slot}
                  component="button"
                  type="button"
                  onClick={() => setSelectedTime(slot)}
                  role="radio"
                  aria-checked={isActive}
                  sx={{
                    flexShrink: 0,
                    scrollSnapAlign: "start",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    padding: "8px 14px",
                    borderRadius: 999,
                    cursor: "pointer",
                    border: isActive
                      ? "1px solid transparent"
                      : "1px solid rgba(184, 92, 60, 0.15)",
                    background: isActive
                      ? "linear-gradient(135deg, #FE0944, #FE7A52)"
                      : "#fff",
                    color: isActive ? "#fff" : brand.text,
                    boxShadow: isActive
                      ? "0 6px 14px rgba(254, 9, 68, 0.28), inset 0 1px 0 rgba(255,255,255,0.18)"
                      : "0 1px 3px rgba(126, 30, 46, 0.04)",
                    fontFamily: fonts.body,
                    fontSize: "12.5px",
                    fontWeight: 700,
                    letterSpacing: "0.01em",
                    transition:
                      "background 0.18s ease, box-shadow 0.18s ease",
                    "&:focus-visible": {
                      outline: `2px solid ${brand.red}`,
                      outlineOffset: 2,
                    },
                  }}
                >
                  <AccessTimeRoundedIcon sx={{ fontSize: 14 }} />
                  {slot}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

      {/* ── Verification / area / languages mini-row ───────────────── */}
      <Box
        sx={{
          padding: "22px 16px 0",
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
            padding: "5px 10px",
            borderRadius: 999,
            background: "rgba(22, 163, 74, 0.10)",
            border: "1px solid rgba(22, 163, 74, 0.18)",
            fontFamily: fonts.body,
            fontSize: "10.5px",
            fontWeight: 700,
            color: "#15803d",
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
              padding: "5px 10px",
              borderRadius: 999,
              background: "#fff",
              border: "1px solid rgba(184, 92, 60, 0.15)",
              fontFamily: fonts.body,
              fontSize: "10.5px",
              fontWeight: 700,
              color: brand.text,
            }}
          >
            {therapist.area}
          </Box>
        )}
        {therapist.features.language && (
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              padding: "5px 10px",
              borderRadius: 999,
              background: "#fff",
              border: "1px solid rgba(184, 92, 60, 0.15)",
              fontFamily: fonts.body,
              fontSize: "10.5px",
              fontWeight: 700,
              color: brand.text,
            }}
          >
            {therapist.features.language}
          </Box>
        )}
      </Box>

      {/* ── Sticky bottom CTA ──────────────────────────────────────── */}
      <Box
        sx={{
          position: "fixed",
          bottom: 70,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          padding: "0 16px",
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
              "Reserve {{name}} on {{date}} at {{time}}",
              {
                name: therapist.name,
                date: dayjs(selectedDate).format("ddd D MMM"),
                time: selectedTime,
              }
            )}
            startIcon={
              <WhatsAppIcon sx={{ fontSize: "20px !important" }} />
            }
            endIcon={<ArrowForwardRoundedIcon sx={{ fontSize: 18 }} />}
            sx={{
              padding: "15px 22px",
              borderRadius: "16px",
              background:
                "linear-gradient(135deg, #FE0944, #FE7A52)",
              color: "#fff",
              fontFamily: fonts.body,
              fontWeight: 700,
              fontSize: "15px",
              textTransform: "none",
              letterSpacing: "0.005em",
              boxShadow:
                "0 14px 32px rgba(254, 9, 68, 0.36), inset 0 1px 0 rgba(255,255,255,0.20)",
              "&:hover": {
                background:
                  "linear-gradient(135deg, #E00738, #E76E48)",
                boxShadow: "0 18px 40px rgba(254, 9, 68, 0.42)",
              },
            }}
          >
            {t("therapist.bookCta", "Reserve {{name}}", {
              name: therapist.name,
            })}
            {fromPrice !== null && (
              <Box
                component="span"
                sx={{
                  fontWeight: 600,
                  opacity: 0.88,
                  marginLeft: "6px",
                }}
              >
                · {t("therapist.from", "from")} {formatTHB(fromPrice)}
              </Box>
            )}
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default TherapistDetailPage;
