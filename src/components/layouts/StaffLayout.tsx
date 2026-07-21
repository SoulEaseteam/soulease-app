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
//   there is no shared surface left to leak through.
//
// 🆕 Round 28x.87 (founder reference screenshots of a competitor's staff app,
//   "อยากได้ 3 แท็บแบบภาพอ้างอิง") — grew from 2 tabs to 3: หน้าทำงาน (Home,
//   new landing) · My Jobs · Profile. The reference's 4th tab (chat) stays
//   out — declined earlier this session as a big, separate feature.

import React, { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Box, IconButton, CircularProgress, Typography, Button } from "@mui/material";
import { signOut } from "firebase/auth";
import { collection, onSnapshot, query, where, limit } from "firebase/firestore";
import { SquaresFour, Briefcase, UserCircle, SignOut, ShieldWarning, Heart } from "phosphor-react";

import { auth, db } from "@/lib/firebase";
import { responsiveShell } from "@/theme/breakpoints";
import { CONCIERGE, whatsappDeepLink } from "@/config/concierge";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';
const ROSE = "#E0708F";

// 🆕 Round 28x.106 (founder: "แถบบาร์เพิ่มหน้าเว็บ Practitioners เอาไว้ก่อน
//   หน้าทำงาน") — a quick way out to the live customer site (the public
//   practitioners grid at "/"), same label + heart icon language as the
//   customer app's own bottom nav (BottomNavGlass) first tab, so it reads
//   as "the same tab, one level up" rather than a new concept. Placed
//   first, ahead of the 3 staff-only tabs. Navigating there leaves
//   StaffLayout's route tree entirely (expected — MainLayout takes over,
//   same as tapping any other external-feeling link).
const TABS = [
  { label: "Practitioners", value: "/", icon: Heart },
  { label: "หน้าทำงาน", value: "/therapist/home", icon: SquaresFour },
  { label: "My Jobs", value: "/therapist/jobs", icon: Briefcase },
  { label: "Profile", value: "/therapist/profile", icon: UserCircle },
] as const;

// 🆕 Round 28x.81 (founder: "บัญชียังไม่เปิดใช้งาน ... ให้ติดต่อมาขอให้
//   แอดมินซิงก์งาน กับตั้งค่าช่องงาน") — a real activation gate, not just an
//   account existing. Linking (28x.70) proves she is who she says she is;
//   activation is the SEPARATE, deliberate step where admin has run the job
//   sync and set her up on the job channel before letting her operate.
//
//   One query here, checked once at the top of the whole staff shell, rather
//   than in every page: `uid` is written onto the therapist doc by
//   setRoleOnSignup the moment her Auth account is created (matched by
//   email), so it is reliably present before any booking ever touches her —
//   unlike therapistUid on bookings, which only exists once a job does.
type Activation = "loading" | "active" | "inactive" | "not-found";

function useStaffActivation(): Activation {
  const [state, setState] = useState<Activation>("loading");
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setState("not-found");
      return;
    }
    const q = query(collection(db, "therapists"), where("uid", "==", uid), limit(1));
    const unsub = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          setState("not-found");
          return;
        }
        const d = snap.docs[0].data() as { staffActive?: boolean };
        setState(d.staffActive === true ? "active" : "inactive");
      },
      () => setState("not-found"),
    );
    return () => unsub();
  }, []);
  return state;
}

const ActivationGate: React.FC<{ onSignOut: () => void }> = ({ onSignOut }) => (
  <Box
    sx={{
      minHeight: "100vh",
      background: "var(--sr-bg)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      textAlign: "center",
      px: 3,
      gap: 2,
    }}
  >
    <ShieldWarning size={48} weight="duotone" color="#D97C95" />
    <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: "var(--sr-ink)" }}>
      บัญชียังไม่เปิดใช้งาน
    </Typography>
    <Typography sx={{ fontFamily: SANS, fontSize: 13.5, color: "var(--sr-muted)", maxWidth: 320, lineHeight: 1.6 }}>
      บัญชีของคุณเชื่อมต่อแล้ว แต่แอดมินยังไม่ได้เปิดใช้งาน
      กรุณาติดต่อแอดมินเพื่อขอให้ซิงก์งานและตั้งค่าช่องงานให้คุณก่อนเริ่มใช้งาน
    </Typography>
    {/* 🆕 Round 28x.97 (founder, ref. WhatsApp's own tab bar: "ให้กล่องส่งข้อความ
        สวยแบบภาพ2") — one grouped capsule instead of two loose pill buttons:
        icon-over-label items sharing a single rounded card, divided by a
        hairline, same shape language as the reference screenshot. */}
    <Box
      sx={{
        display: "flex",
        alignItems: "stretch",
        width: "100%",
        maxWidth: 300,
        mt: 1.5,
        borderRadius: "22px",
        background: "var(--sr-panel)",
        border: "1px solid var(--sr-hairline)",
        boxShadow: "0 10px 28px rgba(138, 58, 87, 0.12)",
        overflow: "hidden",
      }}
    >
      <Box
        component="a"
        href={whatsappDeepLink("สวัสดีค่ะ บัญชีพนักงานของฉันยังไม่เปิดใช้งาน รบกวนเปิดให้ด้วยค่ะ")}
        target="_blank"
        rel="noopener"
        aria-label="ทัก WhatsApp แอดมิน"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.7,
          py: 2,
          textDecoration: "none",
          transition: "background 0.15s ease",
          "&:active": { background: "var(--sr-panel-2)" },
        }}
      >
        <Box component="img" src="/images/profli/whatsapp.png" alt="" width={28} height={28} sx={{ width: 28, height: 28, objectFit: "contain" }} />
        <Typography sx={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: "var(--sr-ink)" }}>
          WhatsApp
        </Typography>
      </Box>

      <Box sx={{ width: "1px", my: 1.75, background: "var(--sr-hairline)" }} />

      {/* 🆕 Round 28x.99 (founder: "บัญชียังไม่เปิดใช้งาน เพิ่ม Telegram") —
          @SunRed24hBot is the same bot she just linked to get here, so this
          is a channel she's already inside rather than a new one to add. */}
      <Box
        component="a"
        href="https://t.me/SunRed24hBot"
        target="_blank"
        rel="noopener"
        aria-label="ทัก Telegram แอดมิน"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.7,
          py: 2,
          textDecoration: "none",
          transition: "background 0.15s ease",
          "&:active": { background: "var(--sr-panel-2)" },
        }}
      >
        <Box component="img" src="/images/profli/telegram.png" alt="" width={28} height={28} sx={{ width: 28, height: 28, objectFit: "contain" }} />
        <Typography sx={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: "var(--sr-ink)" }}>
          Telegram
        </Typography>
      </Box>

      <Box sx={{ width: "1px", my: 1.75, background: "var(--sr-hairline)" }} />

      <Box
        component="a"
        href={CONCIERGE.lineUrl}
        target="_blank"
        rel="noopener"
        aria-label="ทัก LINE"
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.7,
          py: 2,
          textDecoration: "none",
          transition: "background 0.15s ease",
          "&:active": { background: "var(--sr-panel-2)" },
        }}
      >
        <Box component="img" src="/images/profli/line.png" alt="" width={28} height={28} sx={{ width: 28, height: 28, objectFit: "contain" }} />
        <Typography sx={{ fontFamily: SANS, fontSize: 12.5, fontWeight: 700, color: "var(--sr-ink)" }}>
          LINE
        </Typography>
      </Box>
    </Box>
    <Button onClick={onSignOut} sx={{ mt: 2, textTransform: "none", fontSize: 12.5, color: "var(--sr-dim)" }}>
      ออกจากระบบ
    </Button>
  </Box>
);

const StaffLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const activation = useStaffActivation();

  const currentTab = location.pathname.startsWith("/therapist/jobs")
    ? "/therapist/jobs"
    : location.pathname.startsWith("/therapist/home")
    ? "/therapist/home"
    : "/therapist/profile"; // profile, settings, reports, location, update-location

  const logout = async () => {
    await signOut(auth);
    void navigate("/staff");
  };

  if (activation === "loading") {
    return (
      <Box sx={{ minHeight: "100vh", background: "var(--sr-bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress sx={{ color: "#D97C95" }} />
      </Box>
    );
  }
  if (activation === "inactive" || activation === "not-found") {
    return <ActivationGate onSignOut={() => void logout()} />;
  }

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
          onClick={() => navigate("/therapist/home")}
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

      {/* Bottom bar — 3 tabs (28x.87). Settings is a tap inside Profile, not
          its own tab; Reports is a tap inside Home, same reasoning. */}
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
