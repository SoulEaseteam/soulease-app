// src/components/therapist/detail/StickyBookCTA.tsx
//
// 🎨 Phase 2 Detail — sticky bottom CTA (verbatim port of `.cta-bottom`).
// Price display + book button (red→coral gradient pill) + circular fav button.

import React from "react";
import { Box, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Props {
  therapistId: string;
  therapistName: string;
  /** Pre-formatted price string (e.g. "฿1,800") or starting price fallback */
  fromPrice: string;
  /** "60min" / "90min" / "120min" — what the user has chosen */
  duration: string;
  /**
   * Currently picked time slot. Empty string => no slot picked yet
   * (CTA shows generic "Book {{name}}" copy).
   */
  selectedSlot: string;
  /**
   * Pre-selection forwarded to /booking/:id via URL search params so the
   * booking flow can pre-fill its form and skip Step 1+2. Booking flow
   * starts at "Where should we go?" when all 4 are present.
   */
  serviceId?: string | null;
  /** Duration in minutes (60 / 90 / 120). Forwarded as ?duration= */
  durationMin?: number | null;
  /** Selected date YYYY-MM-DD. Forwarded as ?date= */
  date?: string | null;
  /** Selected time HH:mm. Forwarded as ?time= */
  time?: string | null;
}

const StickyBookCTA: React.FC<Props> = ({
  therapistId,
  therapistName,
  fromPrice,
  duration,
  selectedSlot,
  serviceId,
  durationMin,
  date,
  time,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // CTA disabled until at least a service is picked. Date/time can still
  // be filled inside the booking flow if user prefers.
  const canBook = !!serviceId;

  const goBooking = () => {
    const params = new URLSearchParams();
    if (serviceId) params.set("service", serviceId);
    if (durationMin) params.set("duration", String(durationMin));
    if (date) params.set("date", date);
    if (time) params.set("time", time);
    const qs = params.toString();
    void navigate(`/booking/${therapistId}${qs ? `?${qs}` : ""}`);
  };

  return (
    <Box
      sx={{
        // .cta-bottom — verbatim
        position: "sticky",
        bottom: 0,
        marginTop: "16px",
        padding: "12px 16px 20px",
        background: "rgba(255, 248, 240, 0.85)",
        backdropFilter: "blur(30px) saturate(180%)",
        WebkitBackdropFilter: "blur(30px) saturate(180%)",
        borderTop: "1px solid rgba(184, 92, 60, 0.15)",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        zIndex: 10,
      }}
    >
      {/* .price-display */}
      <Box sx={{ flexShrink: 0 }}>
        <Box
          sx={{
            fontFamily: SERIF,
            fontWeight: 600,
            fontSize: "18px",
            color: "#2a1a14",
            letterSpacing: "-0.02em",
          }}
        >
          {t("detail.cta.from", "From")}{" "}
          <Box component="span" sx={{ color: "#FE0944" }}>
            {fromPrice}
          </Box>
        </Box>
        <Box
          sx={{
            fontFamily: SANS,
            fontSize: "10px",
            color: "rgba(60, 30, 20, 0.72)",
            marginTop: "1px",
            fontWeight: 600,
          }}
        >
          {t("detail.cta.duration", "{{duration}} selected", { duration })}
        </Box>
      </Box>

      {/* .book-btn */}
      <Button
        type="button"
        onClick={goBooking}
        disabled={!canBook}
        sx={{
          flex: 1,
          background: "linear-gradient(135deg, #FE0944, #FE7A52)",
          color: "#fff",
          padding: "13px",
          borderRadius: "99px",
          fontSize: "13px",
          fontWeight: 700,
          textAlign: "center",
          boxShadow:
            "0 8px 24px rgba(254, 9, 68, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
          letterSpacing: "-0.01em",
          border: "none",
          cursor: "pointer",
          fontFamily: SANS,
          textTransform: "none",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          "&:hover": {
            background: "linear-gradient(135deg, #FE0944, #FE7A52)",
            boxShadow: "0 10px 28px rgba(254, 9, 68, 0.36)",
          },
          "&.Mui-disabled": {
            background: "rgba(0, 0, 0, 0.12)",
            color: "rgba(0, 0, 0, 0.35)",
            boxShadow: "none",
          },
        }}
      >
        {!canBook
          ? t("detail.cta.pickService", "Pick a service to continue")
          : selectedSlot
          ? t("detail.cta.book", "Book {{name}} for {{slot}}", {
              name: therapistName,
              slot: selectedSlot,
            })
          : t("detail.cta.bookNoSlot", "Continue with {{name}}", {
              name: therapistName,
            })}{" "}
        →
      </Button>

      {/* Favorite button removed (founder feedback 2026-05-01).
          Save-to-favorites is still accessible via the ⋯ menu in DetailHero. */}
    </Box>
  );
};

export default StickyBookCTA;
