// src/components/layouts/MainLayout.tsx
import React from "react";
import { Outlet } from "react-router-dom";
import { Box } from "@mui/material";
import BottomNavGlass from "@/components/layouts/BottomNavGlass";
import TopNav from "@/components/home/TopNav";
// 🆕 Round 28r22 — Sticky role-context banner for admin/therapist
//   when browsing customer routes. Self-hides for guests + customers.
import RoleViewBanner from "@/components/common/RoleViewBanner";
// 🆕 Round 28r52 — Phase 3.1 responsive foundation. Replaces the old
//   hard-coded 430px "phone shell" that cages the whole site into a
//   tiny centered column on desktop. Content now widens to 600/768/
//   1200 across sm/md/lg while preserving the 430px look on <600px.
import { responsiveShell, pageSurface } from "@/theme/breakpoints";
import { brand } from "@/theme";

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
 *
 * 🆕 Round 28r52 — Phase 3.1 responsive foundation. Founder direction
 * 2026-07-08: "ทำให้รองรับกับการใช้งานทั้งบนคอมและ มือถือ แบบ แอปจริง
 * ไม่ตกร่องตำแหน่งจัดวางไม่เพี้ยน". The old 430px cage is gone; the
 * shell now widens through 600/768/1200 across sm/md/lg. Mobile keeps
 * the 430px phone-shell feel (customers are dominantly mobile).
 * Individual pages get their responsive polish in Phase 3.2–3.6.
 */
const MainLayout: React.FC = () => {
  return (
    <Box
      sx={{
        ...pageSurface,
        // Page surface fills the full viewport on desktop so the cool-
        // mint background reaches the edges. The content column is
        // centered inside via `responsiveShell` on the sticky column +
        // per-page wrappers.
        background: brand.bg1,
        pb: { xs: "90px", md: "110px" },
        position: "relative",
      }}
    >
      {/* 🆕 Site-wide TopNav — wrapped in the responsive shell so on
          desktop the nav bar widens to match the content column and no
          longer sits as a tiny 430px strip centered in a huge empty gray
          gutter. The sticky column still holds the RoleViewBanner above
          TopNav so admins previewing customer pages see the bridge back
          to backstage. Banner self-hides for guests + signed-in
          customers.
          🆕 Round 28r52 — swap the fixed 430px cap for `responsiveShell`. */}
      <Box
        sx={{
          ...responsiveShell,
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
