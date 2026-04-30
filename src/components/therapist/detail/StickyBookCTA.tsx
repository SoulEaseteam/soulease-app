// src/components/therapist/detail/StickyBookCTA.tsx
//
// 🎨 Phase 2 Detail — sticky bottom CTA (verbatim port of `.cta-bottom`).
// Price display + book button (red→coral gradient pill) + circular fav button.

import React, { useState } from "react";
import { Box, Button } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Props {
  therapistId: string;
  therapistName: string;
  fromPrice: string;
  duration: string;
  selectedSlot: string;
}

const StickyBookCTA: React.FC<Props> = ({
  therapistId,
  therapistName,
  fromPrice,
  duration,
  selectedSlot,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [fav, setFav] = useState(false);

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
        onClick={() => navigate(`/booking/${therapistId}`)}
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
        }}
      >
        {t("detail.cta.book", "Book {{name}} for {{slot}}", {
          name: therapistName,
          slot: selectedSlot,
        })}{" "}
        →
      </Button>

      {/* .fav-btn */}
      <Box
        component="button"
        type="button"
        onClick={() => setFav((f) => !f)}
        aria-label={t("detail.cta.fav", "Save to favorites")}
        sx={{
          width: "44px",
          height: "44px",
          borderRadius: "50%",
          background: "rgba(255, 255, 255, 0.7)",
          border: "1px solid rgba(254, 9, 68, 0.2)",
          color: "#FE0944",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "16px",
          flexShrink: 0,
          cursor: "pointer",
          fontFamily: SANS,
        }}
      >
        {fav ? "♥" : "♡"}
      </Box>
    </Box>
  );
};

export default StickyBookCTA;
