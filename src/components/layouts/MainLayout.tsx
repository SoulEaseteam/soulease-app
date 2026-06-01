// src/components/layouts/MainLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import BottomNavGlass from "@/components/layouts/BottomNavGlass";
import TopNav from "@/components/home/TopNav";
// 🆕 Round 28r22 — Sticky role-context banner for admin/therapist
//   when browsing customer routes. Self-hides for guests + customers.
import RoleViewBanner from "@/components/common/RoleViewBanner";

/**
 * 🎨 Page surface — Phase 1 redesign defers all styling to the MUI theme's
 * `MuiCssBaseline` body override (warm-cream gradient `#F4F6F5 → #F4F6F5`
 * from BRAND.md). MainLayout used to set its own "Aurora pastel" bg which
 * conflicted with the mockup's surface. Other routes (Booking, Login,
 * Therapist Detail, etc.) inherit the same warm-cream surface until each
 * is individually redesigned in its own ROADMAP.md task.
 *
 * 🆕 Round 28r (founder 2026-05-02) — TopNav lifted from HomePage to
 * MainLayout so the menu drawer + brand wordmark + language pill follow
 * the user across every main-shell route (Services, Therapist Detail,
 * Booking, Account, etc.). Auth/admin/maintenance routes sit outside
 * MainLayout in App.tsx so they keep their minimal layouts.
 *
 * Pages that already have their own sticky back-button header (Services,
 * BookingFlow, PaymentMethods, Notifications, etc.) keep working — TopNav
 * scrolls away with the page, so the per-page sticky header takes over
 * once the user scrolls past it. No double-header collision because the
 * per-page header is `position: sticky` while TopNav is `position: relative`.
 */
const MainLayout: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        pb: "90px",
        position: "relative",
      }}
    >
      {/* 🆕 Site-wide TopNav — wrapped in the same 430px phone-shell
          column the page content uses, so menu/brand/language stay
          aligned with whatever route renders below.
          🆕 Round 28r22 — RoleViewBanner sits ABOVE TopNav inside
          the same sticky column so an admin previewing customer
          pages always sees the bridge back to backstage. Banner
          self-hides for guests + signed-in customers. */}
      <Box
        sx={{
          maxWidth: 430,
          margin: "0 auto",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <RoleViewBanner />
        <TopNav />
      </Box>

      <Outlet />
      <BottomNavGlass />
    </Box>
  );
};

export default MainLayout;
