// src/components/layouts/BottomNavGlass.tsx
//
// 🆕 Round 28c15 (founder 2026-05-06) — x-transform sliding pill.
//   Root cause of jitter: animating `left` % strings requires framer
//   to parse + interpolate CSS strings — unreliable. Fix: measure the
//   track's pixel width with ResizeObserver, then animate `x` (transform)
//   between pixel values. Transform is GPU-accelerated and framer
//   interpolates pure numbers — buttery smooth.

import React, { useEffect, useRef, useState } from "react";
import { Paper, Box, Typography } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";

import { useNavigate, useLocation } from "react-router-dom";
import { UserCircle } from "phosphor-react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { Spa, SpaOutlined } from "@mui/icons-material";
import { useAuth } from "@/providers/AuthProvider";
import { brand, fonts } from "@/theme";

// 🆕 Round 28s224 — "Therapists" → "Practitioners". CLAUDE.md §3 euphemism
//   table: therapist → practitioner (more premium register). Tab is the
//   most-visible label in the app — was the loudest remaining brand
//   violation after the title/meta rewrite.
// 🆕 Round 28x.183 (founder: "ตัดหน้า history ออก เอาไปใส่ไว้ได้โปรไฟล์") —
//   History dropped as its own tab. ProfilePage already has a "Booking
//   History" row (Reservations section → /booking/history) — that was
//   always the SAME destination this tab pointed at, so this tab was a
//   second door to a page Profile already opens, not a second page.
//   /booking/history itself is untouched; it just loses its bottom-nav
//   entry and folds into "Profile" for active-tab purposes below.
// 🆕 Round 28x.184 (founder: "แถบล่างทำให้มันมีลูกเล่นขึ้นหน่อย") — each icon
//   now SWAPS shape on active, not just color (outline → filled), the
//   Instagram/Grab tab-bar convention. Reads as real polish rather than a
//   flat color toggle, and costs nothing extra now that there are only 3
//   tabs to draw.
const TABS = [
  { label: "Practitioners", value: "/",         icon: (a: boolean) => a ? <FaHeart size={18} color="#fff" /> : <FaRegHeart size={18} color="#9AA0AC" /> },
  { label: "Services",      value: "/services", icon: (a: boolean) => a ? <Spa sx={{ fontSize: 20, color: "#fff" }} /> : <SpaOutlined sx={{ fontSize: 20, color: "#9AA0AC" }} /> },
  { label: "Profile",       value: "/profile",  icon: (a: boolean) => <UserCircle size={20} color={a ? "#fff" : "#9AA0AC"} weight={a ? "fill" : "regular"} /> },
] as const;

// 🆕 28x.79 (founder: "ไปทำหน้าแยก เว็บแยก แต่ใช้โดเมนเดียวกัน") — the
//   therapist-branching this tab bar carried in 28x.75/77 is gone: therapist
//   routes now render inside StaffLayout, which has its own bottom nav
//   (StaffBottomNav) and never mounts this component at all. This bar is
//   customer-only again, by construction rather than by role check.
const N    = TABS.length;  // 4
const INSET = 2;           // px gap pill ↔ track edge

const BottomNavGlass: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [showNav,     setShowNav]     = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [ripple,      setRipple]      = useState<{ value: string; key: number } | null>(null);

  // ── pixel width of one tab cell (measured, not assumed) ──────────
  const trackRef = useRef<HTMLDivElement>(null);
  const [tabPx,  setTabPx]  = useState(0);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setTabPx(el.offsetWidth / N);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── active tab ───────────────────────────────────────────────────
  const currentTab = (() => {
    if (location.pathname.startsWith("/services"))        return "/services";
    if (
      location.pathname.startsWith("/profile")     ||
      location.pathname.startsWith("/admin")       ||
      location.pathname.startsWith("/user/")       ||
      location.pathname.startsWith("/my-codes")    ||
      location.pathname.startsWith("/notifications") ||
      location.pathname.startsWith("/saved")       ||
      // 🆕 28x.183 — History folded into Profile (see TABS comment above).
      location.pathname.startsWith("/booking/history") ||
      location.pathname === "/login"               ||
      location.pathname === "/register"
    ) return "/profile";
    return "/";
  })();

  const activeIndex = TABS.findIndex((t) => t.value === currentTab);

  // ── scroll hide ──────────────────────────────────────────────────
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setShowNav(y < lastScrollY || y < 10);
      setLastScrollY(y);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, [lastScrollY]);

  // ── navigation ───────────────────────────────────────────────────
  const handleTap = (value: string) => {
    setRipple((p) => ({ value, key: (p?.key ?? 0) + 1 }));
    if (value === "/profile") {
      if (!user) return void navigate("/login");
      // ทุก role ไป /profile — admin เห็น admin panel button อยู่ในหน้านั้น
      return void navigate("/profile");
    }
    void navigate(value);
  };

  // ── pill geometry (pixels) ───────────────────────────────────────
  const pillW = tabPx > INSET * 2 ? tabPx - INSET * 2 : 0;
  const pillX = activeIndex * tabPx + INSET;

  return (
    <Box
      sx={{
        position: "fixed",
        left: 0, right: 0, bottom: 0,
        zIndex: 2000,
        transform:  showNav ? "translateY(0)" : "translateY(110%)",
        transition: "transform 0.32s cubic-bezier(0.4, 0, 0.2, 1)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        pointerEvents: showNav ? "auto" : "none",
      }}
    >
      <Paper
        elevation={14}
        sx={{
          pointerEvents: "auto",
          // 🕯️ 28t — mode-aware glass bar (light glass by day, dark by night).
          background: "var(--sr-nav-scrim)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderTop:    "1px solid var(--sr-hairline)",
          borderLeft:   "1px solid var(--sr-hairline)",
          borderRight:  "1px solid var(--sr-hairline)",
          borderBottom: "none",
          boxShadow:
            "0 -10px 28px rgba(0, 0, 0, 0.22), 0 -2px 6px rgba(0, 0, 0,0.12)",
          borderRadius: "22px 22px 0 0",
          px: 1, py: 0.75,
        }}
      >
        {/* ── Pill track ── */}
        <Box
          ref={trackRef}
          sx={{
            position: "relative",
            display: "flex",
            borderRadius: 999,
            background: "var(--sr-panel)",
            border: "1px solid var(--sr-line)",
            boxShadow: "0 1px 3px rgba(0,0,0,0.14)",
            overflow: "hidden",
          }}
        >
          {/* Sliding pill — x-transform, pure pixel interpolation.
              🆕 Round 28x.184 (founder: "แถบล่างทำให้มันมีลูกเล่นขึ้นหน่อย") —
              was a flat #FF9999 fill + plain black shadow; swapped for a
              soft gradient + a rose-tinted glow (matches the heart button's
              own 28x.180 glow language) so the active tab reads as a lit
              accent instead of a grey UI shadow. Slightly bouncier spring
              (damping 42→30) so the landing has a little overshoot. */}
          {pillW > 0 && (
            <motion.div
              initial={false}
              animate={{ x: pillX }}
              transition={{ type: "spring", stiffness: 480, damping: 30, mass: 0.9 }}
              style={{
                position: "absolute",
                top: INSET,
                bottom: INSET,
                left: 0,
                width: pillW,
                borderRadius: 999,
                background: "linear-gradient(135deg, #FFADAD 0%, #FF8484 100%)",
                boxShadow:
                  "0 4px 16px rgba(255,153,153,0.55), 0 2px 6px rgba(255,132,132,0.35)",
                zIndex: 0,
                pointerEvents: "none",
              }}
            >
              {/* 🆕 (founder: "เมนูข้างล่าง เพิ่มลูกเล่นด้วย") — the same glossy
                  "แวววาว" glint as the banner/NEW badge/book button, sweeping
                  the active pill every ~4.2s (offset from the others so nothing
                  blinks in sync). Pill itself stays still (28x.133 rule). */}
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: 999,
                  overflow: "hidden",
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    width: "46%",
                    left: "-75%",
                    transform: "skewX(-18deg)",
                    background:
                      "linear-gradient(100deg, transparent, rgba(255,255,255,0.5), transparent)",
                    animation: "srTabShine 4.2s ease-in-out infinite",
                  },
                  "@keyframes srTabShine": {
                    "0%": { left: "-75%" },
                    "38%": { left: "120%" },
                    "100%": { left: "120%" },
                  },
                  "@media (prefers-reduced-motion: reduce)": {
                    "&::after": { animation: "none" },
                  },
                }}
              />
            </motion.div>
          )}

          {/* Tabs */}
          {TABS.map((tab) => {
            const active = currentTab === tab.value;
            return (
              <motion.div
                key={tab.value}
                // 28x.223 — gold spark burst on tap (fxSuite), spark-only:
                // the tab already owns its press scale + ripple flash.
                className="sr-fx-spark"
                onClick={() => handleTap(tab.value)}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 600, damping: 28 }}
                style={{
                  flex: 1,
                  position: "relative",
                  zIndex: 1,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 2,
                  paddingTop: 9,
                  paddingBottom: 9,
                  cursor: "pointer",
                  userSelect: "none",
                  WebkitTapHighlightColor: "transparent",
                  overflow: "hidden",
                }}
              >
                {/* Ripple flash */}
                <AnimatePresence>
                  {ripple?.value === tab.value && (
                    <motion.div
                      key={ripple.key}
                      initial={{ scale: 0.3, opacity: 0.5 }}
                      animate={{ scale: 2.4, opacity: 0 }}
                      exit={{}}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: 999,
                        background: "rgba(255,255,255,0.55)",
                        zIndex: 2,
                        pointerEvents: "none",
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Icon */}
                <motion.div
                  animate={{ scale: active ? 1.18 : 1, y: active ? -1 : 0 }}
                  transition={{ type: "spring", stiffness: 550, damping: 28 }}
                  style={{ position: "relative", zIndex: 3, lineHeight: 0 }}
                >
                  {/* 🆕 "เมนูข้างล่าง เพิ่มลูกเล่นด้วย" — the Practitioners tab
                      is a heart, so when it's the active tab it gets a soft
                      heartbeat (double-thump then rest, like a real pulse).
                      Other tabs stay still; reduced-motion turns it off. */}
                  {tab.value === "/" && active ? (
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        lineHeight: 0,
                        animation: "srHeartBeat 2.6s ease-in-out infinite",
                        "@keyframes srHeartBeat": {
                          "0%, 30%, 100%": { transform: "scale(1)" },
                          "8%": { transform: "scale(1.18)" },
                          "16%": { transform: "scale(0.95)" },
                          "23%": { transform: "scale(1.12)" },
                        },
                        "@media (prefers-reduced-motion: reduce)": {
                          animation: "none",
                        },
                      }}
                    >
                      {tab.icon(active)}
                    </Box>
                  ) : (
                    tab.icon(active)
                  )}
                </motion.div>

                {/* Label */}
                <motion.div
                  animate={{ scale: active ? 1.06 : 1, opacity: active ? 1 : 0.55 }}
                  transition={{ duration: 0.16 }}
                  style={{ position: "relative", zIndex: 3 }}
                >
                  <Typography
                    sx={{
                      fontFamily: fonts.body,
                      fontSize: 10,
                      fontWeight: active ? 700 : 600,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: active ? "#fff" : "var(--sr-muted)",
                      transition: "color 0.16s ease",
                      lineHeight: 1,
                    }}
                  >
                    {tab.label}
                  </Typography>
                </motion.div>
              </motion.div>
            );
          })}
        </Box>
      </Paper>
    </Box>
  );
};

export default BottomNavGlass;
