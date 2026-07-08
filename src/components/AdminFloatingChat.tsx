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
// 🆕 Round 28r6 (founder 2026-05-06) — Concierge FAB now reflects the
//   four operational windows so the live indicator + header tagline
//   never disagree with the page-wide page mood.
import { useConciergeMode } from "@/utils/conciergeMode";
import ConciergeModeIcon from "@/components/common/ConciergeModeIcon";
// 🆕 Round 28r13 — concierge_chat_open analytics. Tagged with the
//   channel name so we can rank LINE vs WA vs WeChat vs TG vs X.
import { trackConciergeOpen } from "@/utils/analytics";
// 🆕 Round 28s98 (conversion) — resolve the current page into a
//   prefilled concierge message so the chat doesn't open empty.
import therapistsData from "@/data/therapists";
import services from "@/data/services";
// 🆕 Round 28r71 — shared concierge endpoints (r71 rebrand phase 2).
import { CONCIERGE } from "@/config/concierge";

/** Build a context-aware concierge opener from the current path. */
function conciergeContextMessage(pathname: string): string {
  const tMatch = pathname.match(/\/therapists\/([^/?#]+)/);
  if (tMatch) {
    const t = therapistsData.find((x) => x.id === tMatch[1]);
    if (t?.name) {
      return `Hi SunRed concierge, I'd like to book ${t.name} tonight. Is she available?`;
    }
  }
  const sMatch = pathname.match(/\/services\/([^/?#]+)/);
  if (sMatch) {
    const s = services.find((x) => x.id === sMatch[1]);
    if (s?.name) {
      return `Hi SunRed concierge, I'd like to book the ${s.name}. What's available tonight?`;
    }
  }
  return "Hi SunRed concierge, I'd like to book an outcall massage tonight. What's available?";
}

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
    href: "https://line.me/R/ti/p/@sunred.bkk?from=page&searchId=sunred.bkk",
    src: "/images/profli/line.png",
    tint: "#06C755",
  },
  {
    title: "WhatsApp",
    href: CONCIERGE.whatsappUrl,
    // 🆕 Round 28s103 (perf) — was Whatsapp.gif (10MB) loaded on the
    //   global concierge widget; swapped to the 42KB PNG.
    src: "/images/profli/whatsapp.png",
    tint: "#25D366",
  },
  {
    title: "WeChat",
    href: "/wechat-scan",
    src: "/images/profli/wechat_2626283.png",
    tint: "#07C160",
  },
  {
    title: "Telegram",
    href: "https://t.me/SunRedvip_bkk",
    src: "/images/profli/telegram.png",
    tint: "#26A1E0",
  },
  {
    title: "X (Twitter)",
    href: "https://x.com/SunredBangkok",
    src: "/images/profli/twitter.png",
    tint: "#fff",
  },
];

const AdminFloatingChat: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showGreeting, setShowGreeting] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const location = useLocation();
  const { t } = useTranslation();
  // 🆕 Round 28r6 — current concierge mode for FAB + header tinting.
  const concierge = useConciergeMode();
  const modeTint =
    concierge.mode === "prime"
      ? brand.red
      : concierge.mode === "evening"
      ? "#F59E0B"
      : concierge.mode === "off"
      ? "rgba(15, 23, 42,0.55)"
      : brand.green;
  // Per-mode greeting copy — friendlier than the static "Hi! Need help"
  // because each mode answers a different unspoken guest question:
  // prime → "is anyone there now?"; off → "are you closed?"; etc.
  const greetingByMode: Record<typeof concierge.mode, { title: string; body: string }> = {
    prime: {
      title: "🌙 Concierge live · tonight's roster",
      body: "Tap to chat — practitioner dispatched in <40 min.",
    },
    evening: {
      title: "🌅 Slots opening for late-night",
      body: "Tap to lock your 22:00 — 02:00 window.",
    },
    day: {
      title: "☀ Plan tonight's ritual",
      body: "Tap to chat — 22:00 onward fills fastest.",
    },
    off: {
      title: "☕ Concierge resumes at 09:00",
      body: "Leave a message — we'll confirm at sunrise.",
    },
  };
  const greet = greetingByMode[concierge.mode];
  // 🆕 Round 28s98 — prefilled opener based on the page the guest is on.
  const contextMsg = conciergeContextMessage(location.pathname);

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
              width: 220,
              padding: "16px 14px 12px",
              borderRadius: "20px",
              background: "#fff",
              border: "1px solid rgba(15, 23, 42, 0.08)",
              boxShadow: "0 8px 32px rgba(15, 23, 42, 0.14), 0 2px 8px rgba(0,0,0,0.06)",
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
              {/* 🆕 Round 28r6 — header tagline now reflects the
                  current concierge window. Glyph swaps ☀ → 🌅 → 🌙
                  → ☕; "Live · 24/7" replaced with the mode-specific
                  pill label so an off-hours guest doesn't see
                  "Live" while concierge is sleeping. */}
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
                    prefersReducedMotion || concierge.mode === "off"
                      ? undefined
                      : { opacity: [1, 0.45, 1] }
                  }
                  transition={{ duration: 1.4, repeat: Infinity }}
                  sx={{
                    display: "inline-flex",
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <ConciergeModeIcon
                    mode={concierge.mode}
                    sx={{
                      fontSize: 14,
                      color: modeTint,
                      filter:
                        concierge.mode === "off"
                          ? "none"
                          : `drop-shadow(0 0 4px ${modeTint})`,
                    }}
                  />
                </Box>
                {concierge.mode === "off"
                  ? "Concierge · 09:00"
                  : `Live · ${concierge.pillLabel}`}
              </Typography>
            </Box>

            {/* 5 chat platform pills */}
            <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {CHAT_OPTIONS.map((opt, idx) => {
                // 🆕 Round 28s98 — WhatsApp supports a prefilled body via
                //   ?text=; append the page-aware opener so the concierge
                //   gets context instead of an empty "hi".
                const href =
                  opt.title === "WhatsApp"
                    ? `${opt.href}?text=${encodeURIComponent(contextMsg)}`
                    : opt.href;
                return (
                <Box
                  key={opt.title}
                  component={motion.a}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel={
                    href.startsWith("http")
                      ? "noopener noreferrer"
                      : undefined
                  }
                  onClick={() => {
                    trackConciergeOpen(opt.title);
                    setIsExpanded(false);
                  }}
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
                    background: "#F4F6F5",
                    border: "1px solid rgba(15, 23, 42, 0.06)",
                    textDecoration: "none",
                    transition: "background 0.2s ease, transform 0.2s ease",
                    "&:hover": {
                      background: "#F0EBE7",
                    },
                    "&:focus-visible": {
                      outline: `2px solid ${brand.red}`,
                      outlineOffset: 2,
                    },
                  }}
                >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: "10px",
                      background: opt.tint,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: `0 2px 8px ${opt.tint}55`,
                    }}
                  >
                    <Box
                      component="img"
                      src={opt.src}
                      alt={opt.title}
                      width={20}
                      height={20}
                      loading="lazy"
                      decoding="async"
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
                );
              })}
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
              borderRadius: "16px",
              background: "#fff",
              border: "1px solid rgba(15, 23, 42, 0.08)",
              boxShadow: "0 8px 28px rgba(15, 23, 42, 0.12), 0 2px 6px rgba(0,0,0,0.05)",
              cursor: "pointer",
              // Decorative tail pointing toward the FAB
              "&::after": {
                content: '""',
                position: "absolute",
                bottom: 14,
                right: -7,
                width: 14,
                height: 14,
                background: "#fff",
                borderRight: "1px solid rgba(15, 23, 42, 0.08)",
                borderBottom: "1px solid rgba(15, 23, 42, 0.08)",
                transform: "rotate(-45deg)",
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
                  {t(`chat.greet.title.${concierge.mode}`, greet.title)}
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
                  {t(`chat.greet.body.${concierge.mode}`, greet.body)}
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

      {/* 🆕 Round 28s194 — Twin radiating pulse rings behind the
          FAB so the concierge button feels alive without animating
          the button itself (which a rotation already owns). Rings
          disable during expanded / reduced-motion. */}
      {!isExpanded && !prefersReducedMotion && concierge.mode !== "off" && (
        <>
          {[0, 0.7].map((delay, i) => (
            <Box
              key={i}
              component={motion.span}
              aria-hidden
              initial={{ scale: 0.6, opacity: 0.55 }}
              animate={{ scale: [0.6, 1.6, 1.9], opacity: [0.55, 0.15, 0] }}
              transition={{
                duration: 2.0,
                delay,
                repeat: Infinity,
                ease: "easeOut",
              }}
              sx={{
                position: "fixed",
                bottom: 96,
                right: 18,
                zIndex: 1499,
                width: 60,
                height: 60,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(45, 45, 43, 0.42) 0%, rgba(45, 45, 43, 0) 70%)",
                pointerEvents: "none",
                "@media (max-width: 500px)": {
                  bottom: 88,
                  right: 12,
                  width: 54,
                  height: 54,
                },
              }}
            />
          ))}
        </>
      )}

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
        whileHover={prefersReducedMotion ? undefined : { scale: 1.08 }}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.94 }}
        animate={
          prefersReducedMotion
            ? undefined
            : isExpanded
              ? { rotate: 90, scale: 1 }
              : {
                  rotate: 0,
                  scale: [1, 1.04, 1],
                }
        }
        transition={
          prefersReducedMotion
            ? undefined
            : isExpanded
              ? { type: "spring", stiffness: 260, damping: 20 }
              : {
                  rotate: { type: "spring", stiffness: 260, damping: 20 },
                  scale: {
                    duration: 2.6,
                    repeat: Infinity,
                    ease: "easeInOut",
                  },
                }
        }
        sx={{
          position: "fixed",
          bottom: 96,
          right: 18,
          zIndex: 1500,
          width: 60,
          height: 60,
          borderRadius: "50%",
          border: "2px solid rgba(255, 255, 255, 0.35)",
          // 🆕 Round 28s194 — Radial-gradient FAB body with inset
          //   highlight so the button has dimension instead of a flat
          //   red disc. Conic sheen on hover gives a subtle "rotate
          //   the light" hover affordance.
          background:
            "radial-gradient(circle at 30% 30%, #4B4B48 0%, #2D2D2B 55%, #2D2D2B 100%)",
          color: "#fff",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow:
            "0 16px 36px rgba(45, 45, 43, 0.42), 0 4px 10px rgba(15, 23, 42, 0.14)",
          transition: "box-shadow 0.22s ease",
          "&:hover": {
            boxShadow:
              "0 20px 44px rgba(45, 45, 43, 0.50), 0 6px 14px rgba(15, 23, 42, 0.18)",
          },
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

        {/* 🆕 Round 28r6 — Mode-aware live dot. Reflects the same four
            windows as the Hero Live pill so an off-hours guest sees a
            muted slate dot (not pulsing green) while the concierge is
            warming up. The pulse animation pauses for "off" so we
            don't fake liveness when no one is at the desk. */}
        {!isExpanded && (
          <Box
            component={motion.span}
            aria-hidden
            animate={
              prefersReducedMotion || concierge.mode === "off"
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
              background: modeTint,
              border: "2px solid #fff",
              boxShadow:
                concierge.mode === "off" ? "none" : `0 0 8px ${modeTint}`,
            }}
          />
        )}
      </Box>
    </>
  );
};

export default AdminFloatingChat;
