// src/components/common/FirstBookingBanner.tsx
//
// 🆕 Round 28b21 (founder 2026-05-04) — Phase 5 of conversion plan.
//
// Renders a small, dismissible "First booking · 10% off · code FIRST10"
// banner only when:
//   • The customer is signed-out OR has zero confirmed bookings.
//   • They haven't dismissed the banner this session (sessionStorage flag).
//
// Tap → copies the code FIRST10 to the clipboard and shows a brief
// "Code copied" affordance for 2 seconds before reverting.
//
// Used by HeroSection (homepage). Safe to render anywhere — self-hides.

import React, { useState } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import useFirstBookingDiscount from "@/hooks/useFirstBookingDiscount";

const SERIF = '"Federo", "Italiana", "Cinzel", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

const DISMISS_KEY = "sunred_dismissed_first10";

export const FirstBookingBanner: React.FC = () => {
  const { eligible, code, loading } = useFirstBookingDiscount();
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(DISMISS_KEY) === "1";
  });

  if (loading || !eligible || dismissed) return null;

  const handleCopy = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      void navigator.clipboard.writeText(code).catch(() => {});
    }
    // 🆕 Round 28r14 — Also stash the code in sessionStorage so the
    //   booking form's getInitialDiscountCode() can auto-fill it on
    //   the next page. Removes the "I copied the code but the form
    //   doesn't know about it" friction.
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem("sunred.discount.suggested", code);
      } catch {
        /* ignore quota / privacy mode */
      }
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const onDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    }
    setDismissed(true);
  };

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={handleCopy}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          handleCopy();
        }
      }}
      aria-label={`First-booking 10% off discount, code ${code}, tap to copy`}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        borderRadius: "16px",
        background:
          "rgba(180, 0, 10, 0.06)",
        border: "1px solid rgba(15, 23, 42, 0.20)",
        cursor: "pointer",
        transition: "transform 0.15s ease, box-shadow 0.15s ease",
        "&:hover": {
          transform: "translateY(-1px)",
          boxShadow: "0 8px 22px rgba(15, 23, 42, 0.18)",
        },
        "&:focus-visible": {
          outline: "2px solid #B4000A",
          outlineOffset: "2px",
        },
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 32,
          height: 32,
          borderRadius: "10px",
          background: "#B4000A",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          boxShadow: "0 4px 10px rgba(15, 23, 42, 0.30)",
        }}
      >
        <LocalOfferRoundedIcon sx={{ fontSize: 18 }} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{
            fontFamily: SERIF,
            fontSize: "13.5px",
            fontWeight: 700,
            color: "#7f1d1d",
            lineHeight: 1.2,
          }}
        >
          First booking · 10% off
        </Typography>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "11px",
            color: "rgba(127, 29, 29, 0.78)",
            lineHeight: 1.3,
          }}
        >
          {copied ? "Code copied!" : `Tap to copy code ${code}`}
        </Typography>
      </Box>
      {copied ? (
        <CheckRoundedIcon
          aria-hidden
          sx={{
            color: "#16a34a",
            fontSize: 22,
            animation: "fbCheckPop 0.25s ease-out",
            "@keyframes fbCheckPop": {
              "0%": { transform: "scale(0.4)", opacity: 0 },
              "100%": { transform: "scale(1)", opacity: 1 },
            },
          }}
        />
      ) : (
        <IconButton
          aria-label="Dismiss"
          onClick={onDismiss}
          size="small"
          sx={{
            padding: "4px",
            color: "rgba(127, 29, 29, 0.55)",
            "&:hover": { color: "#7f1d1d", background: "rgba(127, 29, 29, 0.08)" },
          }}
        >
          <CloseRoundedIcon sx={{ fontSize: 16 }} />
        </IconButton>
      )}
    </Box>
  );
};

export default FirstBookingBanner;
