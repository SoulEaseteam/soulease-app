// src/components/TherapistMinimalCard.tsx
//
// 🆕 Round 28s128 — Clean minimal card for the home therapist list.
//   Inspired by the founder's reference (medical/cardiologist app style):
//   white card · left-aligned info column · large portrait on the right ·
//   single "Book" pill CTA. Cuts visual noise vs. the full
//   TherapistProfileCard so the home page feels less crowded.
//
// TherapistProfileCard.tsx (1300+ lines) stays for ServiceDetail and
// admin contexts where richer chips/specs/states are still needed.

import React from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import StarRoundedIcon from "@mui/icons-material/StarRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";

import { brand, fonts } from "@/theme";
import { enhanceImage } from "@/utils/cloudinary";
import type { Therapist, Avail } from "@/types/therapist";
// 🆕 Round 28s132 — Surface the therapist's lowest service price so
//   guests see "ราคาเริ่มต้น ฿X" without opening the detail page.
import staticServices from "@/data/services";

interface Props {
  therapist: Therapist;
  computedStatus?: Avail;
  /** Optional click → routes to booking flow with the therapist pre-picked. */
  onBook?: (therapist: Therapist) => void;
}

// 🆕 Round 28s138 — Founder: split "Bookable" back out as its own
//   visible state (orange dot · "Bookable" label). Three states now:
//   • Available (green) — free right now, dispatch immediately
//   • Bookable  (orange) — busy now / has appt, but next slot reservable
//   • Offline   (grey)   — resting / holiday, can't book
//   `i18nKey` resolves via existing translation keys (available /
//   bookable / resting / holiday). Resting + holiday share the same
//   visual treatment but keep their own translation so e.g. TH reads
//   "วันหยุด" vs "พักวันนี้" if View ever wants to split them later.
const STATUS_DOT: Record<
  Avail,
  { color: string; i18nKey: string; fallback: string }
> = {
  available: { color: "#16a34a", i18nKey: "available", fallback: "Available" },
  bookable:  { color: "#f59e0b", i18nKey: "bookable",  fallback: "Bookable"  },
  resting:   { color: "#9ca3af", i18nKey: "offline",   fallback: "Offline"   },
  holiday:   { color: "#9ca3af", i18nKey: "offline",   fallback: "Offline"   },
};

const TherapistMinimalCard: React.FC<Props> = ({
  therapist,
  computedStatus,
  onBook,
}) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const heroImage =
    therapist.image || therapist.gallery?.[0] || "";
  const portrait = enhanceImage(heroImage, { variant: "hero" });

  // 🆕 Round 28s139 — Founder: off-duty cards stay tappable for info
  //   ("กดดูข้อมูลได้ปกติ ยกเว้นจอง"). Only the Book Now action is
  //   gated; the whole card still routes to the detail page so guests
  //   can read the practitioner's bio + gallery and request a future
  //   reservation via concierge.
  const handleCardTap = () => {
    navigate(`/therapists/${therapist.id}`);
  };

  const handleBookTap = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOffDuty) return; // booking blocked when resting/holiday
    if (onBook) onBook(therapist);
    else navigate(`/therapists/${therapist.id}`);
  };

  const status = computedStatus ?? "bookable";
  const statusMeta = STATUS_DOT[status];
  // 🆕 Round 28s138 — Label flows through i18n so the pill speaks
  //   the visitor's language (EN/TH/ZH/JA/KO). Falls back to English
  //   if the bundle hasn't loaded yet.
  const statusLabel = t(statusMeta.i18nKey, statusMeta.fallback);
  // 🆕 Round 28s136 — Founder: "ใครหยุดก็เบลอการ์ดไป จองไม่ได้".
  //   Resting / holiday therapists render desaturated + dimmed, the
  //   Book Now button becomes inert, and tapping the card no longer
  //   routes to detail.
  // 🆕 Round 28s141 — Founder: "Holiday ก็เบลอรูปไปเลย". Split out
  //   holiday from the generic "off-duty" treatment: holiday now
  //   carries a HARD blur on the portrait so the unavailability
  //   reads at a glance. Resting keeps the soft dim from 28s139.
  const isOffDuty = status === "resting" || status === "holiday";
  const isOnHoliday = status === "holiday";

  // Languages from languageSkills (preferred) or features.language fallback.
  const langTag =
    therapist.languageSkills && therapist.languageSkills.length > 0
      ? therapist.languageSkills
          .map((l) => l.code.toUpperCase())
          .slice(0, 3)
          .join(" · ")
      : therapist.features?.language?.split(/[,/]/)[0]?.trim();

  const formatTime = (hhmm: string): string => {
    if (!hhmm) return "";
    const [hStr, mStr] = hhmm.split(":");
    const h = Number(hStr);
    const m = Number(mStr);
    if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
    const period = h >= 12 ? "PM" : "AM";
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0
      ? `${hour12} ${period}`
      : `${hour12}:${m.toString().padStart(2, "0")} ${period}`;
  };

  // 🆕 Round 28s132 — Lowest 60-min base price across servicesAvailable.
  //   Falls back to ฿1,200 (Thai base) when the therapist has no
  //   services attached.
  const startingPrice = (() => {
    const sids =
      therapist.servicesAvailable ?? therapist.services ?? [];
    const prices = sids
      .map((id) => staticServices.find((s) => s.id === id)?.price)
      .filter((p): p is number => typeof p === "number");
    if (prices.length === 0) return 1200;
    return Math.min(...prices);
  })();

  return (
    <Box
      onClick={handleCardTap}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardTap();
        }
      }}
      aria-label={`View ${therapist.name}`}
      sx={{
        // 🆕 Round 28s129 — Founder swap: portrait on LEFT, info on RIGHT.
        //   Visual punch first (face), then the read.
        display: "flex",
        flexDirection: "row-reverse",
        background: "#fff",
        borderRadius: "22px",
        overflow: "hidden",
        boxShadow:
          "0 6px 20px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)",
        marginBottom: "14px",
        // 🆕 Round 28s139 — Card is always tappable for info. Only the
        //   Book Now button is gated when off-duty.
        cursor: "pointer",
        position: "relative",
        transition: "transform 0.18s ease, box-shadow 0.18s ease, opacity 0.18s ease, filter 0.18s ease",
        // 🆕 Round 28s139 — Softer off-duty treatment (was opacity 0.55
        //   + grayscale 0.5). Light dim + slight desaturation still
        //   signals "not bookable now" without making the card look
        //   broken or unreachable.
        opacity: isOffDuty ? 0.82 : 1,
        filter: isOffDuty ? "grayscale(0.25)" : "none",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow:
            "0 12px 28px rgba(15, 23, 42, 0.10), 0 2px 4px rgba(15, 23, 42, 0.05)",
        },
        "&:focus-visible": {
          outline: `2px solid ${brand.red}`,
          outlineOffset: 2,
        },
        // 🆕 Round 28s130 — Fixed card height so the list reads as a
        //   uniform grid regardless of how long each therapist's bio /
        //   language list is. minHeight was letting card height drift
        //   based on content.
        height: 190,
      }}
    >
      {/* 🆕 Round 28s135 — Status pill moved OUT of the portrait box
          (founder feedback "บังรูป") and pinned to the top-right
          corner of the WHOLE card so it sits on the info side, not
          over the face.
          🆕 Round 28s146 (audit #5) — Suppress the pill on holiday
          cards. The "Holiday" badge that floats on the blurred
          portrait already says it; rendering both was redundant. */}
      {!isOnHoliday && (
        <Box
          sx={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 2,
            display: "flex",
            alignItems: "center",
            gap: "5px",
            background: "rgba(255,255,255,0.95)",
            padding: "4px 9px",
            borderRadius: "999px",
            boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
          }}
          aria-label={statusLabel}
        >
          <Box
            sx={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: statusMeta.color,
            }}
          />
          <Typography
            sx={{
              fontFamily: fonts.body,
              fontSize: "10px",
              fontWeight: 700,
              color: brand.text,
              letterSpacing: "0.02em",
            }}
          >
            {statusLabel}
          </Typography>
        </Box>
      )}
      {/* ── Right: info column (rendered RIGHT via row-reverse) ──── */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          padding: "16px 18px 14px 18px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          gap: "8px",
          overflow: "hidden",
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          {/* 🆕 Round 28s171 — Founder: "ชื่อหนาขึ้น". Stack reordered
              so Cinzel (which has real 700/800 weights) leads for the
              name only — Federo/Italiana fall back if Cinzel hasn't
              streamed in yet. Weight bumped 500 → 800 + size 18 → 19. */}
          <Typography
            component="h3"
            noWrap
            sx={{
              fontFamily:
                '"Cinzel", "Federo", "Italiana", "Fraunces", Georgia, serif',
              fontSize: "19px",
              fontWeight: 800,
              color: brand.text,
              lineHeight: 1.1,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              marginBottom: "6px",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {therapist.name}
          </Typography>
          {/* 🆕 Round 28s174 — Restored to founder's prescribed 4-row
              layout (28s158): Hours · AGE/VERIFIED · ★ rating ·
              📍 location. 28s173 trim was wrong — View wanted to
              ADD the rating, not drop the other rows. */}

          {/* Row 1 — Hours */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
              marginBottom: "5px",
            }}
          >
            <AccessTimeRoundedIcon
              sx={{ fontSize: 15, color: brand.textMuted }}
            />
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: "12.5px",
                fontWeight: 500,
                color: brand.textMuted,
              }}
            >
              {formatTime(therapist.startTime)} – {formatTime(therapist.endTime)}
            </Typography>
          </Box>

          {/* Row 2 — AGE · VERIFIED */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              marginBottom: "5px",
            }}
          >
            {therapist.features?.age && (
              <>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: "10px",
                    fontWeight: 700,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    color: brand.textMuted,
                  }}
                >
                  Age:
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: "12.5px",
                    fontWeight: 700,
                    color: brand.text,
                  }}
                >
                  {therapist.features.age}
                </Typography>
                <Typography
                  component="span"
                  sx={{ color: brand.textMuted, fontSize: "10px" }}
                >
                  ·
                </Typography>
              </>
            )}
            <VerifiedRoundedIcon
              sx={{ fontSize: 14, color: "#1D9BF0" }}
              aria-label="Verified practitioner"
            />
            <Typography
              component="span"
              sx={{
                fontFamily: fonts.body,
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                color: brand.textMuted,
              }}
            >
              Verified
            </Typography>
          </Box>

          {/* Row 3 — Rating */}
          {therapist.rating && therapist.rating > 0 ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "5px",
                marginBottom: "5px",
              }}
            >
              <StarRoundedIcon sx={{ fontSize: 15, color: brand.amber }} />
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontSize: "12.5px",
                  fontWeight: 600,
                  color: brand.text,
                }}
              >
                {therapist.rating.toFixed(1)}
                {therapist.reviews ? (
                  <Box
                    component="span"
                    sx={{
                      fontWeight: 500,
                      color: brand.textMuted,
                      marginLeft: "4px",
                    }}
                  >
                    ({therapist.reviews} reviews)
                  </Box>
                ) : null}
              </Typography>
            </Box>
          ) : null}

          {/* Row 4 — Location (founder format: "RATCHADA · BANGKOK") */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "5px",
            }}
          >
            <PlaceRoundedIcon sx={{ fontSize: 15, color: brand.textMuted }} />
            <Typography
              noWrap
              sx={{
                fontFamily: fonts.body,
                fontSize: "12px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: brand.textMuted,
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {(() => {
                const raw = therapist.area?.trim();
                if (!raw) return "Bangkok";
                // 🆕 Round 28s164 — Founder format:
                //   "SUKHUMVIT · BANGKOK", "SILOM · BANGKOK",
                //   "ASOK · BANGKOK", "THONGLOR · BANGKOK".
                //   Always 2 parts: neighbourhood (most specific) +
                //   Bangkok. Data is "เขต · neighbourhood" so the
                //   LAST segment is the recognisable neighbourhood
                //   the guest knows.
                //   "Huai Khwang · RCA" → "RCA · BANGKOK"
                //   "Rama 4 · Silom" → "SILOM · BANGKOK"
                //   "Huai Khwang" → "HUAI KHWANG · BANGKOK"
                const segments = raw
                  .split(/\s*·\s*|\s*,\s*/)
                  .map((s) => s.trim())
                  .filter(Boolean);
                const neighbourhood = segments[segments.length - 1] ?? "Bangkok";
                return `${neighbourhood} · Bangkok`;
              })()}
            </Typography>
          </Box>
        </Box>

        {/* 🆕 Round 28s132 — Bottom row: price label LEFT + Book Now
            button RIGHT. Justifies space-between so card has a clear
            "info → action" visual rhythm at the bottom edge. */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "10px",
          }}
        >
          <Box>
            <Typography
              sx={{
                fontFamily: fonts.body,
                fontSize: "9.5px",
                fontWeight: 700,
                color: "#9b8b80",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                lineHeight: 1,
                marginBottom: "2px",
              }}
            >
              {t("therapistCard.startingFrom", "Starting from")}
            </Typography>
            <Typography
              sx={{
                fontFamily: fonts.heading,
                fontSize: "16px",
                fontWeight: 700,
                color: brand.red,
                lineHeight: 1,
              }}
            >
              ฿{startingPrice.toLocaleString("en-US")}
            </Typography>
          </Box>
          <Box
            component="button"
            type="button"
            onClick={handleBookTap}
            disabled={isOffDuty}
            sx={{
              padding: "9px 18px",
              borderRadius: "999px",
              // 🆕 Round 28s136 — Disabled visual when off-duty.
              background: isOffDuty
                ? "rgba(0,0,0,0.18)"
                : "#B4000A",
              color: "#fff",
              border: "none",
              cursor: isOffDuty ? "not-allowed" : "pointer",
              fontFamily: fonts.body,
              fontSize: "13px",
              fontWeight: 600,
              letterSpacing: "0.005em",
              whiteSpace: "nowrap",
              boxShadow: isOffDuty
                ? "none"
                : "0 6px 14px rgba(15, 23, 42, 0.22), 0 1px 3px rgba(15, 23, 42, 0.14)",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
              "&:hover": isOffDuty
                ? {}
                : {
                    transform: "translateY(-1px)",
                    boxShadow:
                      "0 10px 20px rgba(15, 23, 42, 0.28), 0 2px 5px rgba(15, 23, 42, 0.16)",
                  },
              "&:focus-visible": {
                outline: "2px solid #fff",
                outlineOffset: 2,
              },
            }}
          >
            {t("therapistCard.bookNow", "Book Now")}
          </Box>
        </Box>
      </Box>

      {/* ── Right: portrait ───────────────────────────────── */}
      <Box
        sx={{
          width: 150,
          flexShrink: 0,
          position: "relative",
          background: "#fafafa",
        }}
      >
        {portrait && (
          <Box
            component="img"
            src={portrait}
            alt={therapist.name}
            loading="lazy"
            sx={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
              // 🆕 Round 28s141 — Holiday → soft blur (founder:
              //   "blur รูปจางๆ พอเห็นนิดๆ"). Face is still legible,
              //   but the practitioner clearly reads as off today.
              //   Resting keeps the lighter card-level dim only.
              filter: isOnHoliday ? "blur(3px) saturate(0.85)" : "none",
              transform: isOnHoliday ? "scale(1.04)" : "none", // hide blur edge
              transition: "filter 0.25s ease, transform 0.25s ease",
            }}
          />
        )}
        {/* 🆕 Round 28s141 — Soft "Holiday" badge over the blurred
            portrait (founder: "blur จางๆ พอเห็นนิดๆ"). No dark
            gradient — the face stays visible, the chip just whispers
            "off today". */}
        {isOnHoliday && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <Box
              sx={{
                fontFamily: fonts.body,
                fontSize: "9.5px",
                fontWeight: 700,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#fff",
                background: "rgba(0,0,0,0.42)",
                padding: "4px 9px",
                borderRadius: "999px",
                backdropFilter: "blur(2px)",
              }}
            >
              {t("holiday", "Holiday")}
            </Box>
          </Box>
        )}
        {/* Status pill now lives at the card root (top-right) — see
            Round 28s135 above. Portrait area kept clean. */}
      </Box>
    </Box>
  );
};

export default TherapistMinimalCard;
