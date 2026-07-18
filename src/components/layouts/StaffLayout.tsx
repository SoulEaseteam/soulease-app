// src/components/layouts/StaffLayout.tsx
//
// 🆕 Round 28x.79 (founder: "ถ้าเธอทำหน้าพนักงานให้ฉันแต่แรก ก็ไม่ต้องมานั่งแก้
//   แบบนี้ แยกออกไปเลย ยังไงทางเข้าเดียวกัน ทุกอย่างในนั้นก็เหมือนกัน" · then:
//   "ไปทำหน้าแยก เว็บแยก แต่ใช้โดเมนเดียวกัน") — a structurally separate shell
//   for staff, sharing the domain and the deploy but none of the chrome.
//
//   28x.74–78 gated the PAGES for role (jobs list, profile panel, settings)
//   but every one of them still rendered inside MainLayout — so the shared
//   TopNav (hamburger → full customer mega-menu: Home, Services, Promotions,
//   Near Me, Pricing, Refer & earn…) and the shared BottomNavGlass kept
//   leaking the storefront back in around the edges. Patching each leak as
//   found (the drawer's own shortcut still pointing at /profile, sign-out
//   landing on the customer home, the tab bar's role branching) was exactly
//   the whack-a-mole the founder called out — every fix found a new gap.
//
//   StaffLayout has no dependency on TopNav or BottomNavGlass at all, so
//   there is no shared surface left to leak through. It renders only what a
//   practitioner needs: a light top bar (wordmark + sign out) and a 2-tab
//   bottom bar (My Jobs · Profile). Settings lives one tap inside Profile.

import React from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Box, IconButton } from "@mui/material";
import { signOut } from "firebase/auth";
import { Briefcase, UserCircle, SignOut } from "phosphor-react";

import { auth } from "@/lib/firebase";
import { responsiveShell } from "@/theme/breakpoints";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const ROSE = "#D97C95";

const TABS = [
  { label: "My Jobs", value: "/therapist/jobs", icon: Briefcase },
  { label: "Profile", value: "/therapist/profile", icon: UserCircle },
] as const;

const StaffLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const currentTab = location.pathname.startsWith("/therapist/jobs")
    ? "/therapist/jobs"
    : "/therapist/profile"; // profile, settings, location, update-location

  const logout = async () => {
    await signOut(auth);
    void navigate("/staff");
  };

  return (
    <Box sx={{ minHeight: "100vh", background: "var(--sr-bg)" }}>
      {/* Top bar — deliberately minimal: no hamburger, no drawer. With two
          destinations total there is nothing a menu would organize. */}
      <Box
        sx={{
          ...responsiveShell,
          position: "sticky",
          top: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.5,
          background: "var(--sr-panel)",
          borderBottom: "1px solid var(--sr-hairline)",
        }}
      >
        <Box
          component="button"
          type="button"
          onClick={() => navigate("/therapist/profile")}
          sx={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontFamily: SERIF,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.02em",
            color: "var(--sr-ink)",
            padding: 0,
          }}
        >
          SUN<span style={{ color: ROSE }}>RED</span>{" "}
          <span style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "var(--sr-muted)", letterSpacing: "0.08em" }}>
            STAFF
          </span>
        </Box>
        <IconButton
          aria-label="Sign out"
          onClick={() => void logout()}
          sx={{ color: "var(--sr-muted)" }}
        >
          <SignOut size={20} />
        </IconButton>
      </Box>

      <Outlet />

      {/* Bottom bar — 2 tabs. Settings is a tap inside Profile, not a third tab. */}
      <Box
        sx={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          display: "flex",
          background: "var(--sr-panel)",
          borderTop: "1px solid var(--sr-hairline)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {TABS.map((tab) => {
          const active = currentTab === tab.value;
          const Icon = tab.icon;
          return (
            <Box
              key={tab.value}
              component="button"
              type="button"
              onClick={() => navigate(tab.value)}
              sx={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.4,
                py: 1.25,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: active ? ROSE : "var(--sr-dim)",
              }}
            >
              <Icon size={22} weight={active ? "fill" : "regular"} />
              <Box
                component="span"
                sx={{ fontFamily: SANS, fontSize: 10.5, fontWeight: active ? 800 : 600 }}
              >
                {tab.label}
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Spacer so content doesn't sit under the fixed bottom bar. */}
      <Box sx={{ height: "calc(64px + env(safe-area-inset-bottom, 0px))" }} />
    </Box>
  );
};

export default StaffLayout;
