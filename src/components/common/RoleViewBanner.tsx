// src/components/common/RoleViewBanner.tsx
//
// 🆕 Round 28r22 (founder 2026-05-07) — Role context banner.
//
// When the signed-in user is admin or therapist but currently
// browsing a customer-facing route, surface a sticky banner at the
// very top with a one-tap shortcut back to their backstage panel.
//
// Why: founder reported confusion — she'd log in as admin, click
// around to test customer pages, then forget she was an admin
// because the customer surface gave no role cue. The TopNav drawer
// shortcut (Round 28r21) is one tap behind the menu icon; this
// banner makes the role visible without any tap.
//
// Self-hides when:
//   • not signed in
//   • role === "user" (regular customer)
//   • current path is already inside admin / therapist backstage
//   • the guest dismissed it this session
//
// Sessions, not localStorage — dismissals reset when the tab
// closes so the badge re-appears next visit (admin should always
// know they're "viewing as customer").

import React, { useState } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import { useAuth } from "@/providers/AuthProvider";

const SANS = '"Inter", system-ui, -apple-system, sans-serif';
const DISMISS_KEY = "sunred.roleBanner.dismissed";

const RoleViewBanner: React.FC = () => {
  const { user, role } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      return false;
    }
  });

  // Conditions to hide the banner
  const isCustomerOrGuest = !user || role === "user" || role === null;
  const onBackstage =
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/therapist");

  if (isCustomerOrGuest || onBackstage || dismissed) return null;

  const isAdmin = role === "admin";

  const handleSwitch = () => {
    if (isAdmin) {
      void navigate("/admin/dashboard");
    } else {
      void navigate("/profile");
    }
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* private mode / quota */
    }
  };

  const accent = isAdmin ? "#FE0944" : "#16a34a";
  const accentSoft = isAdmin
    ? "rgba(254, 9, 68, 0.10)"
    : "rgba(22, 163, 74, 0.10)";
  const accentBorder = isAdmin
    ? "rgba(254, 9, 68, 0.28)"
    : "rgba(22, 163, 74, 0.28)";
  const labelInk = isAdmin ? "#9F0731" : "#15803d";

  return (
    <Box
      role="status"
      aria-live="polite"
      onClick={handleSwitch}
      sx={{
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "8px 12px",
        background: accentSoft,
        borderBottom: `1px solid ${accentBorder}`,
        fontFamily: SANS,
        transition: "background 0.15s ease",
        "&:hover": {
          background: isAdmin
            ? "rgba(254, 9, 68, 0.16)"
            : "rgba(22, 163, 74, 0.16)",
        },
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 26,
          height: 26,
          borderRadius: "50%",
          background: accent,
          color: "#fff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {isAdmin ? (
          <AdminPanelSettingsRoundedIcon sx={{ fontSize: 16 }} />
        ) : (
          <SpaRoundedIcon sx={{ fontSize: 16 }} />
        )}
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          component="span"
          sx={{
            display: "block",
            fontSize: 9,
            fontWeight: 800,
            letterSpacing: "0.10em",
            textTransform: "uppercase",
            color: labelInk,
            lineHeight: 1,
          }}
        >
          {isAdmin ? "Admin · viewing as customer" : "Therapist · viewing as customer"}
        </Typography>
        <Typography
          component="span"
          sx={{
            display: "block",
            fontSize: 12,
            fontWeight: 700,
            color: "#3c1e14",
            marginTop: "2px",
            lineHeight: 1.2,
          }}
        >
          Tap to switch back to {isAdmin ? "admin dashboard" : "therapist panel"} ›
        </Typography>
      </Box>

      <IconButton
        aria-label="Dismiss role banner"
        onClick={handleDismiss}
        size="small"
        sx={{
          color: labelInk,
          flexShrink: 0,
          width: 28,
          height: 28,
          "&:hover": { color: accent },
        }}
      >
        <CloseRoundedIcon sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
};

export default RoleViewBanner;
