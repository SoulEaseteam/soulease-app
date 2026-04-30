// src/components/layouts/BottomNav.tsx
//
// 🎨 Phase 2 — Bottom nav (verbatim port of `.bottom-nav` from
// sunred-therapists2.html). 5 tabs: Therapists / Discover / Bookings /
// Concierge / Account.
//
// Marked sticky inside the .phone column (matches mockup's `position: sticky`
// behavior). Active tab matches current route; defaults to no active.

import React from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";

const SANS = '"Inter", system-ui, -apple-system, sans-serif';

type Tab = {
  id: string;
  icon: string;
  labelKey: string;
  fallback: string;
  to: string;
};

// Route targets mapped to ROUTES THAT EXIST in `src/app/App.tsx` to avoid 404s:
//   /therapists       → exists (Phase 2)
//   /                 → exists (HomePage)
//   /booking/history  → exists  (used as "Bookings" target)
//   /                 → reused for "Concierge" (no concierge page yet — opens
//                       the home page where the FAQ/concierge link lives)
//   /profile          → exists  (used as "Account" target — auth flow handled
//                       by BottomNavGlass auth-guard logic; we keep simple)
const TABS: Tab[] = [
  { id: "therapists", icon: "👥", labelKey: "nav.therapists", fallback: "Therapists", to: "/therapists" },
  { id: "discover", icon: "🔍", labelKey: "nav.discover", fallback: "Discover", to: "/" },
  { id: "bookings", icon: "📅", labelKey: "nav.bookings", fallback: "Bookings", to: "/booking/history" },
  { id: "concierge", icon: "💬", labelKey: "nav.concierge", fallback: "Concierge", to: "/" },
  { id: "account", icon: "👤", labelKey: "nav.account", fallback: "Account", to: "/profile" },
];

const BottomNav: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (to: string) =>
    location.pathname === to ||
    (to === "/therapists" && location.pathname.startsWith("/therapists"));

  return (
    <Box
      component="nav"
      sx={{
        // .bottom-nav — verbatim
        position: "sticky",
        bottom: 0,
        background: "rgba(255, 248, 240, 0.85)",
        backdropFilter: "blur(30px) saturate(180%)",
        WebkitBackdropFilter: "blur(30px) saturate(180%)",
        borderTop: "1px solid rgba(184, 92, 60, 0.15)",
        padding: "10px 24px 14px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        zIndex: 10,
      }}
    >
      {TABS.map((tab) => {
        const active = isActive(tab.to);
        return (
          <Box
            key={tab.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(tab.to)}
            sx={{
              // .nav-item — verbatim
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
              color: active ? "#FE0944" : "rgba(60, 30, 20, 0.72)",
              fontSize: "9.5px",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: SANS,
            }}
          >
            <Box sx={{ fontSize: "18px" }}>{tab.icon}</Box>
            <Box>{t(tab.labelKey, tab.fallback)}</Box>
          </Box>
        );
      })}
    </Box>
  );
};

export default BottomNav;
