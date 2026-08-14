// src/components/common/InstallAppBanner.tsx
//
// 🆕 Round 28x.192 (founder: "ทำเป็นแอปพลิเคชัน") — in-app "add to home
//   screen" prompt. Store distribution is not available to this vertical,
//   so the installed PWA IS the app; this banner is its storefront.
//
//   Two platform branches, one component:
//   • Android/Chrome fires `beforeinstallprompt` — we stash the event and
//     show a real Install button that calls prompt().
//   • iOS Safari has no install API at all — we show a one-line
//     instruction (Share → Add to Home Screen) instead.
//   Neither branch renders when already running standalone (installed),
//   and a dismiss snoozes it for 14 days — quiet-luxury brand, never nag.

import React, { useEffect, useState } from "react";
import { Box, Typography, IconButton } from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import IosShareRoundedIcon from "@mui/icons-material/IosShareRounded";
import AddToHomeScreenRoundedIcon from "@mui/icons-material/AddToHomeScreenRounded";
import { useTranslation } from "react-i18next";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const SNOOZE_KEY = "sunred.installBanner.dismissedAt";
const SNOOZE_DAYS = 14;
/** Delay before the banner slides in — let the guest see the product first. */
const SHOW_DELAY_MS = 6000;

function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as Mac — the touch check catches it.
  return (
    /iPhone|iPad|iPod/.test(ua) ||
    (ua.includes("Mac") && navigator.maxTouchPoints > 1)
  );
}

function snoozed(): boolean {
  const at = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
  return at > 0 && Date.now() - at < SNOOZE_DAYS * 24 * 60 * 60 * 1000;
}

const InstallAppBanner: React.FC = () => {
  const { t } = useTranslation();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosMode, setIosMode] = useState(false);

  useEffect(() => {
    if (isStandalone() || snoozed()) return;

    let showTimer: ReturnType<typeof setTimeout> | null = null;
    const showLater = () => {
      if (showTimer === null)
        showTimer = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    };

    const onBip = (e: Event) => {
      // Suppress Chrome's own mini-infobar; we present our own moment.
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      showLater();
    };
    window.addEventListener("beforeinstallprompt", onBip);

    const onInstalled = () => setVisible(false);
    window.addEventListener("appinstalled", onInstalled);

    if (isIOS()) {
      setIosMode(true);
      showLater();
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
      if (showTimer !== null) clearTimeout(showTimer);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setVisible(false);
    else dismiss();
  };

  if (!visible) return null;

  return (
    <Box
      role="dialog"
      aria-label={t("installApp.title", "Keep SunRed at hand")}
      sx={{
        position: "fixed",
        left: 12,
        right: 12,
        // Sits above BottomNavGlass (fixed bottom, zIndex 2000) but below
        // dialogs/drawers (MUI modal 1300 → nav pushed to 2000, so 2100
        // clears the nav while the chat FAB at bottom-right stays tappable
        // because the banner hugs the nav, not the corner).
        bottom: "calc(84px + env(safe-area-inset-bottom, 0px))",
        zIndex: 2100,
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "12px 14px",
        borderRadius: "16px",
        background:
          "linear-gradient(var(--sr-panel), var(--sr-panel)), var(--sr-bg, #17181D)",
        border: "1px solid var(--sr-line)",
        boxShadow: "0 12px 32px rgba(0,0,0,0.35)",
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: "12px",
          flexShrink: 0,
          display: "grid",
          placeItems: "center",
          background: "linear-gradient(135deg,#F050A0,#E6197E)",
          color: "#fff",
        }}
      >
        <AddToHomeScreenRoundedIcon sx={{ fontSize: 22 }} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography
          sx={{ fontSize: 13.5, fontWeight: 700, color: "var(--sr-ink)", lineHeight: 1.3 }}
        >
          {t("installApp.title", "Keep SunRed at hand")}
        </Typography>
        {iosMode ? (
          <Typography
            sx={{
              fontSize: 12,
              color: "var(--sr-muted)",
              lineHeight: 1.4,
              display: "flex",
              alignItems: "center",
              gap: "4px",
              flexWrap: "wrap",
            }}
          >
            {t("installApp.iosBefore", "Tap")}
            <IosShareRoundedIcon sx={{ fontSize: 14, verticalAlign: "middle" }} />
            {t("installApp.iosAfter", "then “Add to Home Screen”")}
          </Typography>
        ) : (
          <Typography sx={{ fontSize: 12, color: "var(--sr-muted)", lineHeight: 1.4 }}>
            {t("installApp.body", "One tap from your home screen — no app store needed.")}
          </Typography>
        )}
      </Box>

      {!iosMode && (
        <Box
          component="button"
          onClick={install}
          sx={{
            border: "none",
            cursor: "pointer",
            borderRadius: "999px",
            padding: "8px 16px",
            fontSize: 12.5,
            fontWeight: 700,
            color: "#fff",
            background: "linear-gradient(135deg,#F050A0,#E6197E)",
            flexShrink: 0,
          }}
        >
          {t("installApp.cta", "Install")}
        </Box>
      )}

      <IconButton
        size="small"
        onClick={dismiss}
        aria-label={t("installApp.dismiss", "Not now")}
        sx={{ color: "var(--sr-muted)", flexShrink: 0, padding: "4px" }}
      >
        <CloseRoundedIcon sx={{ fontSize: 18 }} />
      </IconButton>
    </Box>
  );
};

export default InstallAppBanner;
