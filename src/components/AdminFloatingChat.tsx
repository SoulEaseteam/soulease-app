// src/components/AdminFloatingChat.tsx
//
// 🎨 Round 28l (founder 2026-05-02) — full visual refresh to match the
// rest of the site's warm-cream + red→coral identity.
//
// What changed vs. the previous version:
//   • Main FAB — was a generic "24-hours.png" clip-art image;
//     now a clean MUI ChatBubble icon on the brand gradient with a
//     pulsing live-dot badge so the "24/7" message is communicated
//     without text-on-image.
//   • Expanded panel — was a bare column of white circles; now a
//     glass card with a proper editorial header
//     ("CONCIERGE / Live · 24/7" — the same eyebrow + italic serif
//     tagline pattern used in HomeTherapistGrid + HeroSection).
//   • Each chat option is now a horizontal pill (icon + label) so
//     users can SEE which platform they're tapping; the previous
//     icon-only circles required hover tooltips to disambiguate.
//   • Animations — switched to framer-motion (already in the app)
//     for buttery expand/collapse + per-row stagger, with full
//     prefers-reduced-motion fallback.
//   • Theme tokens — replaced hardcoded `#fff` / inline styles with
//     `brand.*`, `fonts.*`, `glass.*` so future palette changes
//     propagate automatically.

import React, { useEffect, useRef, useState } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ChatBubbleRoundedIcon from "@mui/icons-material/ChatBubbleRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";

import { brand, fonts, glass } from "@/theme";

// 🆕 Round 28o — first-visit greeting persistence key + visibility delay.
const GREETING_LS_KEY = "sunred.adminChat.greeted";
const GREETING_SHOW_AFTER_MS = 1800; // wait briefly so it doesn't feel spammy
const GREETING_AUTO_DISMISS_MS = 12000; // self-hide after a beat

interface ChatOption {
  title: string;
  /** External URL or internal route */
  href: string;
  /** Path to platform icon image */
  src: string;
  /** Brand color used for the icon background */
  tint: string;
}

const CHAT_OPTIONS: ChatOption[] = [
  {
    title: "LINE",
    href: "https://lin.ee/uqvdwWt",
    src: "/images/profli/line.png",
    tint: "rgba(6, 199, 85, 0.12)",
  },
  {
    title: "WhatsApp",
    href: "https://wa.me/66634350987",
    src: "/images/profli/whatsapp.png",
    tint: "rgba(37, 211, 102, 0.12)",
  },
  {
    title: "WeChat",
    href: "/wechat-scan",
    src: "/images/profli/wechat_2626283.png",
    tint: "rgba(7, 193, 96, 0.12)",
  },
  {
    title: "Telegram",
    href: "https://t.me/SunRedvip_bkk",
    src: "/images/profli/telegram.png",
    tint: "rgba(38, 161, 224, 0.12)",
  },
  {
    title: "X (Twitter)",
    href: "https://x.com/SunredBangkok",
    src: "/images/profli/twitter.png",
    tint: "rgba(0, 0, 0, 0.08)",
  },
];

const AdminFloatingChat: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const location = useLocation();
  const { t } = useTranslation();

  // 🆕 First-visit greeting bubble — shows once, never again.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(GREETING_LS_KEY);
    if (seen) return;
    const showTimer = window.setTimeout(() => {
      setShowGreeting(true);
    }, GREETING_SHOW_AFTER_MS);
    return () => window.clearTimeout(showTimer);
  }, []);

  // Auto-dismiss the greeting after a beat — and remember it was shown.
  useEffect(() => {
    if (!showGreeting) return;
    const hideTimer = window.setTimeout(() => {
      setShowGreeting(false);
      try {
        window.localStorage.setItem(GREETING_LS_KEY, "1");
      } catch {
        /* private mode / quota — non-fatal */
      }
    }, GREETING_AUTO_DISMISS_MS);
    return () => window.clearTimeout(hideTimer);
  }, [showGreeting]);

  // Opening the chat panel also dismisses the greeting permanently.
  const dismissGreeting = () => {
    setShowGreeting(false);
    try {
      window.localStorage.setItem(GREETING_LS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  // ESC closes
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsExpanded(false);
    };
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, []);

  // Click outside closes
  useEffect(() => {
    if (!isExpanded) return;
    const onClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideContainer =
        !!containerRef.current && containerRef.current.contains(target);
      const onMainBtn =
        !!buttonRef.current && buttonRef.current.contains(target);
      if (!insideContainer && !onMainBtn) setIsExpanded(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [isExpanded]);

  // Route change closes the panel
  useEffect(() => {
    setIsExpanded(false);
  }, [location.pathname]);

  const prefersReducedMotion =
    typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
      : false;

  return (
    <>
      {/* Expanded panel — glass card with header + 5 chat pills */}
      <AnimatePresence>
        {isExpanded && (
          <Box
            component={motion.div}
            ref={containerRef}
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 16, scale: 0.92 }
            }
            animate={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 1, y: 0, scale: 1 }
            }
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, y: 12, scale: 0.95 }
            }
            transition={{
              type: "spring",
              stiffness: 240,
              damping: 22,
            }}
            sx={{
              position: "fixed",
              bottom: 180,
              right: 18,
              zIndex: 1500,
              width: 240,
              padding: "16px 14px 12px",
              ...glass.card, // includes borderRadius
              transformOrigin: "bottom right",
              "@media (max-width: 500px)": {
                bottom: 158,
                right: 12,
                width: 224,
              },
            }}
            role="dialog"
            aria-label="Concierge contact options"
          >
            {/* Header — editorial eyebrow + italic tagline */}
            <Box sx={{ paddingX: "4px", marginBottom: "10px" }}>
              <Typography
                sx={{
                  fontFamily: fonts.body,
                  fontSize: "9.5px",
                  fontWeight: 700,
                  color: brand.accent,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  marginBottom: "2px",
                }}
              >
                Concierge
              </Typography>
              <Typography
                sx={{
                  fontFamily: fonts.heading,
                  fontStyle: "italic",
                  fontWeight: 500,
                  fontSize: "16px",
                  color: brand.text,
                  letterSpacing: "-0.01em",
                  lineHeight: 1.1,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <Box
                  component={motion.span}
                  aria-hidden
                  animate={
                    prefersReducedMotion
                      ? undefined
                      : { opacity: [1, 0.45, 1] }
                  }
                  transition={{ duration: 1.4, repeat: Infinity }}
                  sx={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: brand.green,
                    boxShadow: `0 0 8px ${brand.green}`,
                    flexShrink: 0,
                  }}
                />
                Live · 24/7
              </Typography>
            </Box>

            {/* 5 chat platform pills */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {CHAT_OPTIONS.map((opt, idx) => (
                <Box
                  key={opt.title}
                  component={motion.a}
                  href={opt.href}
                  target={opt.href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    opt.href.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
                  onClick={() => setIsExpanded(false)}
                  initial={
                    prefersReducedMotion
                      ? { opacity: 1 }
                      : { opacity: 0, x: 12 }
                  }
                  animate={{ opacity: 1, x: 0 }}
                  transition={{
                    delay: prefersReducedMotion ? 0 : idx * 0.04,
                    type: "tween",
                    duration: 0.25,
                  }}
                  whileHover={
                    prefersReducedMotion ? undefined : { x: -2, scale: 1.02 }
                  }
                  whileTap={prefersReducedMotion ? undefined : { scale: 0.98 }}
                  aria-label={`Contact via ${opt.title}`}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "8px 10px",
                    borderRadius: "12px",
                    background: "rgba(255, 255, 255, 0.55)",
                    border: "1px solid rgba(255, 255, 255, 0.7)",
                    textDecoration: "none",
                    transition: "background 0.2s ease",
                    "&:hover": {
                      background: "rgba(255, 255, 255, 0.8)",
                    },
                    "&:focus-visible": {
                      outline: `2px solid ${brand.red}`,
                      outlineOffset: 2,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: opt.tint,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      component="img"
                      src={opt.src}
                      alt={opt.title}
                      sx={{ width: 20, height: 20, objectFit: "contain" }}
                    />
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: fonts.body,
                      fontSize: 13,
                      fontWeight: 600,
                      color: brand.text,
                      letterSpacing: "-0.01em",
                    }}
                  >
                    {opt.title}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </AnimatePresence>

      {/* 🆕 Round 28o — First-visit greeting bubble.
          A tiny chat-bubble that pops next to the FAB to break the
          ice. Shows once per device (localStorage gate) and self-
          dismisses after 12s; opening the panel also dismisses. */}
      <AnimatePresence>
        {showGreeting && !isExpanded && (
          <Box
            component={motion.div}
            initial={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, x: 16, scale: 0.92 }
            }
            animate={
              prefersReducedMotion
                ? { opacity: 1 }
                : { opacity: 1, x: 0, scale: 1 }
            }
            exit={
              prefersReducedMotion
                ? { opacity: 0 }
                : { opacity: 0, x: 8, scale: 0.95 }
            }
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            role="status"
            aria-live="polite"
            sx={{
              position: "fixed",
              bottom: 110,
              right: 88,
              zIndex: 1499,
              maxWidth: 220,
              padding: "10px 14px 10px 12px",
              ...glass.card, // includes borderRadius
              cursor: "pointer",
              // Decorative tail pointing toward the FAB
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: 14,
                right: -7,
                width: 14,
                height: 14,
                background: "rgba(255, 255, 255, 0.55)",
                borderRight: "1px solid rgba(255, 255, 255, 0.7)",
                borderBottom: "1px solid rgba(255, 255, 255, 0.7)",
                transform: "rotate(-45deg)",
                backdropFilter: "blur(30px) saturate(180%)",
                WebkitBackdropFilter: "blur(30px) saturate(180%)",
              },
              "@media (max-width: 500px)": {
                bottom: 102,
                right: 76,
                maxWidth: 200,
              },
            }}
            onClick={() => {
              dismissGreeting();
              setIsExpanded(true);
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: "8px",
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: "9.5px",
                    fontWeight: 700,
                    color: brand.accent,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    marginBottom: "2px",
                  }}
                >
                  {t("chat.greet.eyebrow", "Concierge")}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: fonts.heading,
                    fontStyle: "italic",
                    fontSize: "13.5px",
                    fontWeight: 500,
                    color: brand.text,
                    lineHeight: 1.3,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {t("chat.greet.title", "👋 Hi! Need help booking?")}
                </Typography>
                <Typography
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: "11px",
                    color: brand.textMuted,
                    marginTop: "4px",
                    lineHeight: 1.4,
                  }}
                >
                  {t(
                    "chat.greet.body",
                    "Tap any time — we're live 24/7."
                  )}
                </Typography>
              </Box>
              <IconButton
                aria-label={t("common.dismiss", "Dismiss")}
                onClick={(e) => {
                  e.stopPropagation();
                  dismissGreeting();
                }}
                size="small"
                sx={{
                  width: 22,
                  height: 22,
                  color: brand.textMuted,
                  marginTop: "-2px",
                  marginRight: "-4px",
                  "&:hover": { color: brand.red },
                }}
              >
                <CloseRoundedIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          </Box>
        )}
      </AnimatePresence>

      {/* Main FAB — gradient brand button with chat icon + live dot */}
      <Box
        component={motion.button}
        ref={buttonRef}
        type="button"
        aria-label={isExpanded ? "Close concierge" : "Open concierge"}
        aria-expanded={isExpanded}
        onClick={() => {
          dismissGreeting();
          setIsExpanded((p) => !p);
        }}
        whileHover={prefersReducedMotion ? undefined : { scale: 1.06 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
        animate={
          prefersReducedMotion
            ? undefined
            : isExpanded
            ? { rotate: 90 }
            : { rotate: 0 }
        }
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        sx={{
          position: "fixed",
          bottom: 96,
          right: 18,
          zIndex: 1500,
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: "none",
          background:
            "linear-gradient(135deg, #FE0944 0%, #FE7A52 100%)",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow:
            "0 12px 28px rgba(254, 9, 68, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.32)",
          "&:focus-visible": {
            outline: `3px solid ${brand.red}`,
            outlineOffset: 3,
          },
          "@media (max-width: 500px)": {
            bottom: 88,
            right: 12,
            width: 54,
            height: 54,
          },
        }}
      >
        {isExpanded ? (
          <CloseRoundedIcon sx={{ fontSize: 26 }} />
        ) : (
          <ChatBubbleRoundedIcon sx={{ fontSize: 24 }} />
        )}

        {/* Pulsing live dot — overlaps the FAB top-right.
            Communicates "we're online 24/7" without overlay text. */}
        {!isExpanded && (
          <Box
            component={motion.span}
            aria-hidden
            animate={
              prefersReducedMotion
                ? undefined
                : { scale: [1, 1.25, 1], opacity: [1, 0.55, 1] }
            }
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            sx={{
              position: "absolute",
              top: 6,
              right: 6,
              width: 12,
              height: 12,
              borderRadius: "50%",
              background: brand.green,
              border: "2px solid #fff",
              boxShadow: `0 0 8px ${brand.green}`,
            }}
          />
        )}
      </Box>
    </>
  );
};

export default AdminFloatingChat;
