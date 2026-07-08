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
import { FaRegHeart, FaRegFileAlt } from "react-icons/fa";
import { SpaOutlined } from "@mui/icons-material";
import { useAuth } from "@/providers/AuthProvider";
import { brand, fonts } from "@/theme";

// 🆕 Round 28s224 — "Therapists" → "Practitioners". CLAUDE.md §3 euphemism
//   table: therapist → practitioner (more premium register). Tab is the
//   most-visible label in the app — was the loudest remaining brand
//   violation after the title/meta rewrite.
const TABS = [
  { label: "Practitioners", value: "/",                icon: (a: boolean) => <FaRegHeart   size={18} color={a ? "#fff" : "rgba(15, 23, 42,0.50)"} /> },
  { label: "Services",      value: "/services",        icon: (a: boolean) => <SpaOutlined  sx={{ fontSize: 20, color: a ? "#fff" : "rgba(15, 23, 42,0.50)" }} /> },
  { label: "History",       value: "/booking/history", icon: (a: boolean) => <FaRegFileAlt size={18} color={a ? "#fff" : "rgba(15, 23, 42,0.50)"} /> },
  { label: "Profile",       value: "/profile",         icon: (a: boolean) => <UserCircle   size={20} color={a ? "#fff" : "rgba(15, 23, 42,0.50)"} /> },
] as const;

const N    = TABS.length;  // 4
const INSET = 2;           // px gap pill ↔ track edge

const BottomNavGlass: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, role } = useAuth();

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
    if (location.pathname.startsWith("/booking/history")) return "/booking/history";
    if (
      location.pathname.startsWith("/profile")           ||
      location.pathname.startsWith("/admin")             ||
      location.pathname.startsWith("/therapist/profile") ||
      location.pathname.startsWith("/user/")             ||
      location.pathname === "/login"                     ||
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
          background:
            "linear-gradient(180deg,rgba(255,251,248,0.95) 0%,rgba(255,245,240,0.95) 100%)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderTop:    `1px solid ${brand.red}20`,
          borderLeft:   "1px solid rgba(255,255,255,0.6)",
          borderRight:  "1px solid rgba(255,255,255,0.6)",
          borderBottom: "none",
          boxShadow:
            "0 -10px 28px rgba(15, 23, 42, 0.10), 0 -2px 6px rgba(15, 23, 42,0.04)",
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
            background: "#fff",
            border: "1px solid rgba(15,23,42,0.06)",
            boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
            overflow: "hidden",
          }}
        >
          {/* Sliding pill — x-transform, pure pixel interpolation */}
          {pillW > 0 && (
            <motion.div
              initial={false}
              animate={{ x: pillX }}
              transition={{ type: "spring", stiffness: 500, damping: 42, mass: 0.9 }}
              style={{
                position: "absolute",
                top: INSET,
                bottom: INSET,
                left: 0,
                width: pillW,
                borderRadius: 999,
                background: "#8F8474",
                boxShadow: "0 4px 14px rgba(15, 23, 42, 0.30)",
                zIndex: 0,
                pointerEvents: "none",
              }}
            />
          )}

          {/* Tabs */}
          {TABS.map((tab) => {
            const active = currentTab === tab.value;
            return (
              <motion.div
                key={tab.value}
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
                  {tab.icon(active)}
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
                      color: active ? "#fff" : "rgba(15, 23, 42,0.55)",
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
