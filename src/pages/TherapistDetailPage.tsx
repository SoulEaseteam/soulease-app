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
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";

// Round 28s27 — The avatar circle is now a "view more photos"
// affordance: it shows the practitioner's portrait + a "+N" badge
// for the remaining gallery photos. Tapping opens a fullscreen
// swipeable photo viewer. The chat handoff lives on the sticky
// bottom Reserve CTA (which already pre-fills date/time/service
// into WhatsApp) so the funnel never loses the chat entry.
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

  // Round 28s28 — Service selection moves into the detail page itself
  // so a guest can pick service + date + time before tapping Reserve.
  // The chat message that opens WhatsApp carries the full triplet
  // and the concierge can confirm/refuse in one reply.
  const initialServiceId =
    therapist?.servicesAvailable?.[0] ??
    therapist?.services?.[0] ??
    null;
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(
    initialServiceId,
  );

  // Round 28s27 — Photo viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIdx, setViewerIdx] = useState(0);

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

  const selectedService =
    selectedServiceId
      ? availableServices.find((s) => s.id === selectedServiceId) ?? null
      : null;
  const selectedPrice = selectedService
    ? startingPrice(selectedService)
    : fromPrice;

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
    const svcName = selectedService?.name ?? "session";
    const priceLabel = selectedPrice ? ` · ${formatTHB(selectedPrice)}` : "";
    const msg = `Hi, I'd like to reserve ${therapist.name} for ${svcName} (60 min${priceLabel}) on ${dateLabel} at ${selectedTime}. Can you confirm?`;
    trackConciergeOpen(`whatsapp_therapist_${therapist.id}`);
    window.open(
      `${WHATSAPP_URL}?text=${encodeURIComponent(msg)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  const handleOpenGallery = () => {
    setViewerIdx(0);
    setViewerOpen(true);
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

            {/* Round 28s27 — Avatar circle is now a "view more
                photos" affordance. Tap → opens fullscreen photo
                viewer with the full gallery. The +N badge sits on
                the bottom-right (where the green dot was) so the
                count is the first thing the eye lands on. */}
            <Box
              component="button"
              type="button"
              onClick={handleOpenGallery}
              aria-label={t(
                "therapist.viewPhotosAria",
                "View {{count}} more photos of {{name}}",
                {
                  count: therapist.gallery?.length ?? 0,
                  name: therapist.name,
                }
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
                src={enhanceImage(therapist.image, {
                  variant: "thumb",
                  crop: "fill",
                })}
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
              {/* +N badge — counts the remaining gallery photos
                  beyond the hero. Brand-red pill at bottom-right
                  of the avatar, same position the online dot held
                  before. Tells the guest there's more to see. */}
              {therapist.gallery && therapist.gallery.length > 1 && (
                <Box
                  aria-hidden="true"
                  sx={{
                    position: "absolute",
                    right: -6,
                    bottom: -4,
                    minWidth: 22,
                    height: 22,
                    padding: "0 6px",
                    borderRadius: 999,
                    background:
                      "linear-gradient(135deg, #FE0944, #FE7A52)",
                    color: "#fff",
                    border: "2px solid #fff",
                    fontFamily: fonts.body,
                    fontSize: "10.5px",
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    letterSpacing: "0.01em",
                    boxShadow: "0 2px 6px rgba(254,9,68,0.30)",
                  }}
                >
                  +{therapist.gallery.length - 1}
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* ── Round 28s28 — Feature chips row replaces the 3-card stat
            row. Tourists picking an outcall practitioner glance at
            age / height / body / language / area before anything
            else; surfacing those as a quiet chip row gives a
            faster decision read than 3 metric cards. */}
      <Box
        sx={{
          padding: "18px 16px 0",
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
        }}
      >
        {[
          therapist.features.age && `${therapist.features.age} yrs`,
          therapist.features.height,
          therapist.features.bodyType,
          therapist.features.language,
          therapist.area,
        ]
          .filter((v): v is string => Boolean(v && v.trim()))
          .map((chip, idx) => (
            <Box
              key={`${chip}-${idx}`}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                padding: "6px 12px",
                borderRadius: 999,
                background: "#fff",
                border: "1px solid rgba(184, 92, 60, 0.15)",
                fontFamily: fonts.body,
                fontSize: "11.5px",
                fontWeight: 600,
                color: brand.text,
                letterSpacing: "0.005em",
                boxShadow: "0 1px 2px rgba(126, 30, 46, 0.03)",
              }}
            >
              {chip}
            </Box>
          ))}
      </Box>

      {/* ── Round 28s28 — Select service ────────────────────────────
          Service picker moves into the detail page so the Reserve
          CTA's WhatsApp message can carry service + date + time in
          one shot. Each chip shows tier color + service name + price;
          tapping flips the active state and updates the sticky CTA. */}
      {availableServices.length > 0 && (
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
            {t("therapist.selectService", "Select ritual")}
          </Typography>
          <Box
            role="radiogroup"
            aria-label={t(
              "therapist.serviceAria",
              "Choose which ritual to book"
            )}
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            {availableServices.map((svc) => {
              const isActive = svc.id === selectedServiceId;
              const price = startingPrice(svc);
              return (
                <Box
                  key={svc.id}
                  component="button"
                  type="button"
                  onClick={() => setSelectedServiceId(svc.id)}
                  role="radio"
                  aria-checked={isActive}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: "14px",
                    cursor: "pointer",
                    border: isActive
                      ? "1px solid transparent"
                      : "1px solid rgba(184, 92, 60, 0.15)",
                    background: isActive
                      ? "linear-gradient(135deg, #FE0944, #FE7A52)"
                      : "#fff",
                    color: isActive ? "#fff" : brand.text,
                    boxShadow: isActive
                      ? "0 6px 16px rgba(254, 9, 68, 0.28), inset 0 1px 0 rgba(255,255,255,0.18)"
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
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: "2px",
                    }}
                  >
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: fonts.heading,
                        fontSize: "15px",
                        fontWeight: 600,
                        lineHeight: 1.15,
                      }}
                    >
                      {svc.name}
                    </Typography>
                    <Typography
                      component="span"
                      sx={{
                        fontFamily: fonts.body,
                        fontSize: "10.5px",
                        fontWeight: 500,
                        opacity: isActive ? 0.85 : 0.55,
                      }}
                    >
                      {svc.duration} min
                    </Typography>
                  </Box>
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: fonts.heading,
                      fontSize: "16px",
                      fontWeight: 700,
                      color: isActive ? "#fff" : brand.red,
                    }}
                  >
                    {formatTHB(price)}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>
      )}

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

      {/* Round 28s28 — Verification/area/lang mini-row removed. The
          new feature chip row at the top of the body already shows
          area + language; a small Verified badge moves to the photo
          card itself in a later round. */}

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
            {selectedPrice !== null && selectedPrice !== undefined && (
              <Box
                component="span"
                sx={{
                  fontWeight: 600,
                  opacity: 0.88,
                  marginLeft: "6px",
                }}
              >
                · {formatTHB(selectedPrice)}
              </Box>
            )}
          </Button>
        </Box>
      </Box>

      {/* ── Round 28s27 — Fullscreen photo viewer ──────────────────── */}
      {viewerOpen && therapist.gallery && therapist.gallery.length > 0 && (
        <Box
          role="dialog"
          aria-label={t(
            "therapist.viewerAria",
            "Photo gallery of {{name}}",
            { name: therapist.name }
          )}
          sx={{
            position: "fixed",
            inset: 0,
            background: "rgba(15, 5, 8, 0.96)",
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            backdropFilter: "blur(8px)",
          }}
          onClick={(e) => {
            // Tap anywhere outside the photo strip → close.
            if (e.target === e.currentTarget) setViewerOpen(false);
          }}
        >
          {/* Top bar — close + count */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 18px",
              color: "#fff",
            }}
          >
            <Typography
              component="span"
              sx={{
                fontFamily: fonts.body,
                fontSize: "13px",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                opacity: 0.78,
              }}
            >
              {viewerIdx + 1} / {therapist.gallery.length}
            </Typography>
            <IconButton
              onClick={() => setViewerOpen(false)}
              aria-label={t("common.close", "Close")}
              sx={{
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                "&:hover": { background: "rgba(255,255,255,0.20)" },
              }}
            >
              <CloseRoundedIcon />
            </IconButton>
          </Box>

          {/* Horizontal swipe strip — one photo per snap */}
          <Box
            onClick={(e) => e.stopPropagation()}
            onScroll={(e) => {
              const target = e.currentTarget;
              const idx = Math.round(
                target.scrollLeft / target.clientWidth,
              );
              if (idx !== viewerIdx) setViewerIdx(idx);
            }}
            sx={{
              flex: 1,
              display: "flex",
              overflowX: "auto",
              overflowY: "hidden",
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
              scrollSnapType: "x mandatory",
              alignItems: "center",
            }}
          >
            {therapist.gallery.map((src, idx) => (
              <Box
                key={`${src}-${idx}`}
                sx={{
                  flexShrink: 0,
                  width: "100vw",
                  maxWidth: 430,
                  margin: "0 auto",
                  height: "100%",
                  scrollSnapAlign: "start",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "0 12px",
                }}
              >
                <Box
                  component="img"
                  src={enhanceImage(src, {
                    variant: "hero",
                    crop: "limit",
                  })}
                  alt={`${therapist.name} ${idx + 1}`}
                  loading={idx === 0 ? "eager" : "lazy"}
                  decoding="async"
                  sx={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    borderRadius: "16px",
                    objectFit: "contain",
                    boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
                  }}
                />
              </Box>
            ))}
          </Box>

          {/* Dot indicator row */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: "6px",
              padding: "14px 0 22px",
            }}
          >
            {therapist.gallery.map((_, idx) => (
              <Box
                key={idx}
                aria-hidden="true"
                sx={{
                  width: idx === viewerIdx ? 18 : 6,
                  height: 6,
                  borderRadius: 999,
                  background:
                    idx === viewerIdx
                      ? "linear-gradient(135deg, #FE0944, #FE7A52)"
                      : "rgba(255,255,255,0.30)",
                  transition: "width 0.2s ease, background 0.2s ease",
                }}
              />
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default TherapistDetailPage;
