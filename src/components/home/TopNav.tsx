// src/components/home/TopNav.tsx
//
// 🎨 Round 28c — wired-up TopNav.
//
// Before: every button was decorative. Menu opened nothing, brand had
// no link, language pill couldn't switch language. This round connects
// each control to real behavior:
//
//   • Menu button   → MUI Drawer with navigation links (Home, Services,
//                     Bookings, Saved, Notifications, Profile, Sign in/out)
//   • Brand wordmark → clickable, navigates to "/" (home)
//   • Language pill  → MUI Menu with 5 languages; calls
//                     i18n.changeLanguage() and updates <html lang=…>
//                     (same pattern as FloatingLanguageSwitcher)
//
// Visual recipe stays verbatim from `.nav` in sunred-home1.html — only
// behavior was added, no pixel-level changes.

import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  IconButton,
  Drawer,
  ListItemIcon,
  ListItemText,
  Divider,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import { useNavigate, useLocation } from "react-router-dom";

import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import SpaRoundedIcon from "@mui/icons-material/SpaRounded";
import EventNoteRoundedIcon from "@mui/icons-material/EventNoteRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import PaymentRoundedIcon from "@mui/icons-material/PaymentRounded";
import RoomRoundedIcon from "@mui/icons-material/RoomRounded";
import RedeemRoundedIcon from "@mui/icons-material/RedeemRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import { useAuth } from "@/providers/AuthProvider";
import DistanceDepositDialog from "@/components/home/DistanceDepositDialog";
import ReferralDialog from "@/components/home/ReferralDialog";
import SunRedWordmark from "@/components/common/SunRedWordmark";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
// 🆕 Round 28r6 (founder 2026-05-06) — TopNav now mirrors the Hero
//   pill so the page mood stays consistent after the Hero scrolls out
//   of view. A guest scrolling through the therapist grid still sees
//   "🌙 Prime hours" pinned to the navbar.
import { useConciergeMode } from "@/utils/conciergeMode";
import ConciergeModeIcon from "@/components/common/ConciergeModeIcon";
import { brand, fonts } from "@/theme";

// Wordmark uses fonts.heading via theme; SANS kept locally for drawer
// items only.
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// Language pill UI lives in `LanguageSwitcher` (Round 28i) — shared
// between TopNav (inline) and GlobalLanguagePill (fixed, site-wide).

interface NavItem {
  icon: React.ReactNode;
  labelKey: string;
  defaultLabel: string;
  /** Subtitle / hint shown below the label */
  hintKey?: string;
  defaultHint?: string;
  /** Route to navigate to. Mutually exclusive with `action`. */
  path?: string;
  /** Inline action — used for dialogs (Distance / Referral). */
  action?: "openDistance" | "openReferral";
  /** When true, only show when the user is signed in */
  requiresAuth?: boolean;
}

// Two visual groups:
//   1. Account/account-shaped items — Home, Services, Bookings, etc.
//   2. Info/help items — How-to-book, Payment, Distance — the founder
//      asked for these explicitly because they're the most-clicked
//      onboarding questions from new customers.
const NAV_ITEMS: NavItem[] = [
  {
    icon: <HomeRoundedIcon />,
    labelKey: "nav.home",
    defaultLabel: "Home",
    path: "/",
  },
  {
    icon: <SpaRoundedIcon />,
    labelKey: "nav.services",
    defaultLabel: "Services",
    path: "/services",
  },
  {
    icon: <EventNoteRoundedIcon />,
    labelKey: "nav.bookings",
    defaultLabel: "My Bookings",
    path: "/booking/history",
    requiresAuth: true,
  },
  {
    icon: <FavoriteRoundedIcon />,
    labelKey: "nav.saved",
    defaultLabel: "Saved",
    path: "/saved",
    requiresAuth: true,
  },
  {
    icon: <NotificationsRoundedIcon />,
    labelKey: "nav.notifications",
    defaultLabel: "Notifications",
    path: "/notifications",
    requiresAuth: true,
  },
  {
    icon: <PersonRoundedIcon />,
    labelKey: "nav.profile",
    defaultLabel: "Profile",
    path: "/profile",
    requiresAuth: true,
  },
];

// Info / onboarding items — separate group with a divider above so
// they don't bury the account links.
const INFO_ITEMS: NavItem[] = [
  // 🆕 Round 28r7 (founder 2026-05-06) — Refer & earn (Phase 1).
  // Wired to the existing ReferralDialog (built in Round 28g but
  // never imported). Currently a manual flow — guest mentions the
  // code in concierge chat and View applies the discount by hand.
  // Watching dialog open-rate + share-completion before we invest
  // in Firestore + Cloud Function tracking (Phase 2).
  {
    icon: <RedeemRoundedIcon />,
    labelKey: "nav.referral",
    defaultLabel: "Refer & earn",
    hintKey: "nav.referral.hint",
    defaultHint: "Give 500฿ · Get 500฿",
    action: "openReferral",
  },
  {
    icon: <HelpOutlineRoundedIcon />,
    labelKey: "nav.howToBook",
    defaultLabel: "How to book?",
    hintKey: "nav.howToBook.hint",
    defaultHint: "Step-by-step guide",
    // ServicesPage opens the "HOW TO BOOK" tab when ?tab=how is set.
    path: "/services?tab=how",
  },
  {
    icon: <PaymentRoundedIcon />,
    labelKey: "nav.payment",
    defaultLabel: "Payment",
    hintKey: "nav.payment.hint",
    defaultHint: "VISA · PromptPay · Cash",
    path: "/payment-methods",
  },
  {
    icon: <RoomRoundedIcon />,
    labelKey: "nav.distance",
    defaultLabel: "Distance & deposit",
    hintKey: "nav.distance.hint",
    defaultHint: "25 km+ requires 500฿",
    action: "openDistance",
  },
];

const TopNav: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  // 🆕 Round 28r6 — mirror the Hero's Live pill in the navbar so the
  //   page mood stays visible after the Hero scrolls out of view.
  const concierge = useConciergeMode();
  const modeTint =
    concierge.mode === "prime"
      ? brand.red
      : concierge.mode === "evening"
      ? "#F59E0B"
      : concierge.mode === "off"
      ? "rgba(60,30,20,0.55)"
      : "#FE7A52";

  // 🆕 Round 28r21 (founder 2026-05-07) — Use the AuthProvider type
  //   directly instead of the old defensive cast. Founder reported
  //   that signed-in admins were seeing the customer drawer because
  //   TopNav never read `role` — only `user`. Now we surface the
  //   active role + show role-specific shortcuts at the top of the
  //   drawer (Admin → /admin/dashboard · Therapist → /therapist).
  const { user, role, logout: providerLogout } = useAuth();
  const isLoggedIn = Boolean(user);
  const isAdmin = role === "admin";
  const isTherapist = role === "therapist";

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [distanceOpen, setDistanceOpen] = useState(false);
  // 🆕 Round 28r7 — Refer & earn dialog state.
  const [referralOpen, setReferralOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const prevY = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 30);
      if (y > 80) setHidden(y > prevY.current);
      prevY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goto = (path: string) => {
    setDrawerOpen(false);
    // Compare full search-aware path so "/services?tab=how" replaces
    // "/services" cleanly when the user is already on services.
    const fullCurrent = location.pathname + location.search;
    if (fullCurrent !== path) void navigate(path);
  };

  const handleNavItem = (item: NavItem) => {
    if (item.action === "openDistance") {
      setDrawerOpen(false);
      setDistanceOpen(true);
      return;
    }
    if (item.action === "openReferral") {
      setDrawerOpen(false);
      setReferralOpen(true);
      return;
    }
    if (item.path) goto(item.path);
  };

  const handleSignOut = async () => {
    setDrawerOpen(false);
    if (providerLogout) await providerLogout();
    if (location.pathname !== "/") void navigate("/");
  };

  return (
    <>
      <Box
        component="nav"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "8px 18px 14px",
          position: "relative",
          zIndex: 10,
          transform: hidden ? "translateY(-100%)" : "translateY(0)",
          transition: "transform 0.28s ease, background 0.2s ease, box-shadow 0.2s ease",
          background: scrolled ? "rgba(255,248,240,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
          boxShadow: scrolled ? "0 1px 0 rgba(126,30,46,0.08)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.6)" : "none",
        }}
      >
        {/* Menu button — opens drawer */}
        <IconButton
          aria-label={t("nav.openMenu", "Open menu")}
          onClick={() => setDrawerOpen(true)}
          sx={{
            width: "40px",
            height: "40px",
            borderRadius: "50%",
            background: "rgba(255, 255, 255, 0.55)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.7)",
            boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.6)",
            color: "#2a1a14",
            "&:hover": { background: "rgba(255, 255, 255, 0.75)" },
            "&:focus-visible": {
              outline: "2px solid #FE0944",
              outlineOffset: 2,
            },
          }}
        >
          <MenuRoundedIcon sx={{ fontSize: 20 }} />
        </IconButton>

        {/* Brand wordmark — clickable, routes to "/" */}
        <Box
          component="button"
          type="button"
          onClick={() => goto("/")}
          aria-label={t("nav.brandHome", "SunRed home")}
          sx={{
            background: "transparent",
            border: "none",
            padding: "4px 8px",
            cursor: "pointer",
            borderRadius: "8px",
            "&:focus-visible": {
              outline: "2px solid #FE0944",
              outlineOffset: 2,
            },
          }}
        >
          {/* 🆕 Round 28e — wordmark uses shared `<SunRedWordmark>`
              (sun glyph + italic serif). Single source of truth so
              every brand mention in the app reads identically. */}
          <SunRedWordmark size={22} />
        </Box>

        {/* Right cluster — 🆕 Round 28r6: Concierge mode chip + lang. */}
        <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {/* Mode chip — compact icon-only pill with mode tint.
              Tap → scroll the page back to the top so the guest sees
              the full Hero (Live pill + promo banner) again, in case
              they scrolled past and want to re-check tonight's mood. */}
          <Box
            component="button"
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }
            }}
            aria-label={`Concierge mode: ${concierge.pillLabel}`}
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "5px 9px 5px 7px",
              border: "1px solid rgba(255,255,255,0.7)",
              borderRadius: 999,
              background: "rgba(255, 255, 255, 0.55)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.6)",
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.2s ease",
              "&:hover": {
                transform: "translateY(-1px)",
                boxShadow:
                  "inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 4px 12px rgba(254, 9, 68, 0.12)",
              },
              "&:focus-visible": {
                outline: "2px solid #FE0944",
                outlineOffset: 2,
              },
            }}
          >
            <ConciergeModeIcon
              mode={concierge.mode}
              sx={{
                fontSize: 13,
                color: modeTint,
                filter:
                  concierge.mode === "off"
                    ? "none"
                    : `drop-shadow(0 0 3px ${modeTint})`,
                animation:
                  concierge.mode === "off"
                    ? "none"
                    : "topNavModePulse 2s ease-in-out infinite",
                "@keyframes topNavModePulse": {
                  "0%, 100%": { opacity: 1 },
                  "50%": { opacity: 0.55 },
                },
              }}
            />
            <Typography
              component="span"
              sx={{
                fontFamily: fonts.body,
                fontSize: 9.5,
                fontWeight: 700,
                color: brand.burgundy,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
              }}
            >
              {concierge.pillLabel}
            </Typography>
          </Box>

          {/* Language pill — shared component, identical UX as the
              site-wide GlobalLanguagePill on non-home pages. */}
          <LanguageSwitcher size="md" />
        </Box>
      </Box>

      {/* ───────── Navigation drawer ───────── */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            background: "linear-gradient(180deg, #FAFBFC 0%, #F1F3F5 100%)",
            borderRight: "1px solid rgba(255, 255, 255, 0.7)",
            boxShadow: "0 24px 60px rgba(126, 30, 46, 0.2)",
          },
        }}
      >
        {/* Header — brand mark + close */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 18px 12px",
          }}
        >
          {/* Same wordmark as the top-nav button — slightly larger
              (24px) for the drawer header. */}
          <SunRedWordmark size={24} />
          <IconButton
            aria-label={t("nav.closeMenu", "Close menu")}
            onClick={() => setDrawerOpen(false)}
            size="small"
            sx={{ color: "#2a1a14" }}
          >
            <CloseRoundedIcon />
          </IconButton>
        </Box>

        <Divider sx={{ borderColor: "rgba(184, 92, 60, 0.18)" }} />

        {/* 🆕 Round 28r21 (founder 2026-05-07) — Role banner +
            shortcut. When the signed-in user is admin or therapist,
            the drawer surfaces their backstage entry as the FIRST
            item — fixes the "I'm logged in as admin but every page
            still treats me as a customer" friction founder reported.
            Tap → goes straight to admin dashboard / therapist panel.
            Customer / guest sessions skip this row entirely. */}
        {(isAdmin || isTherapist) && (
          <Box
            component="button"
            type="button"
            onClick={() => {
              setDrawerOpen(false);
              if (isAdmin) {
                void navigate("/admin/dashboard");
              } else {
                // Therapists land on their own profile editor for now
                // (a dedicated /therapist/dashboard can replace this
                // once it ships).
                void navigate("/profile");
              }
            }}
            aria-label={
              isAdmin
                ? t("nav.adminShortcut", "Open admin dashboard")
                : t("nav.therapistShortcut", "Open therapist panel")
            }
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              width: "calc(100% - 16px)",
              margin: "10px 8px",
              padding: "12px 14px",
              borderRadius: "12px",
              background: isAdmin
                ? "linear-gradient(135deg, rgba(254, 9, 68, 0.12), rgba(254, 122, 82, 0.10))"
                : "linear-gradient(135deg, rgba(22, 163, 74, 0.12), rgba(22, 163, 74, 0.06))",
              border: isAdmin
                ? "1px solid rgba(254, 9, 68, 0.28)"
                : "1px solid rgba(22, 163, 74, 0.28)",
              cursor: "pointer",
              fontFamily: SANS,
              textAlign: "left",
              "&:hover": { transform: "translateY(-1px)" },
              transition: "transform 0.15s ease",
              "&:focus-visible": {
                outline: "2px solid #FE0944",
                outlineOffset: 2,
              },
            }}
          >
            <Box
              aria-hidden
              sx={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: isAdmin ? "#FE0944" : "#16a34a",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {isAdmin ? (
                <AdminPanelSettingsRoundedIcon sx={{ fontSize: 20 }} />
              ) : (
                <SpaRoundedIcon sx={{ fontSize: 20 }} />
              )}
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box
                component="span"
                sx={{
                  display: "block",
                  fontSize: 9.5,
                  fontWeight: 800,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: isAdmin ? "#FE0944" : "#15803d",
                }}
              >
                {t("nav.signedInAs", "Signed in as")}{" "}
                {isAdmin ? "Admin" : "Therapist"}
              </Box>
              <Box
                component="span"
                sx={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "#3c1e14",
                  marginTop: "2px",
                }}
              >
                {isAdmin
                  ? t("nav.openAdmin", "Open admin dashboard")
                  : t("nav.openTherapist", "Open therapist panel")}
              </Box>
            </Box>
            <Box
              aria-hidden
              sx={{
                fontSize: 18,
                color: isAdmin ? "#FE0944" : "#15803d",
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              ›
            </Box>
          </Box>
        )}

        {/* Account / nav items */}
        <Box
          component="ul"
          sx={{ listStyle: "none", margin: 0, padding: "8px" }}
        >
          {NAV_ITEMS.filter((it) => !it.requiresAuth || isLoggedIn).map(
            (item) =>
              renderNavRow(
                item,
                location,
                (k, def) => t(k, def),
                handleNavItem
              )
          )}
        </Box>

        <Divider sx={{ borderColor: "rgba(184, 92, 60, 0.18)", mx: 2 }} />

        {/* Info / onboarding group — How to book?, Payment, Distance.
            Section title sets expectation that these are help links,
            not account features. */}
        <Box
          component="span"
          sx={{
            display: "block",
            padding: "12px 18px 4px",
            fontFamily: SANS,
            fontSize: 9.5,
            fontWeight: 700,
            color: "rgba(60, 30, 20, 0.55)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          {t("nav.helpSection", "Help & Info")}
        </Box>
        <Box
          component="ul"
          sx={{ listStyle: "none", margin: 0, padding: "0 8px 8px" }}
        >
          {INFO_ITEMS.map((item) =>
            renderNavRow(item, location, (k, def) => t(k, def), handleNavItem)
          )}
        </Box>

        <Divider sx={{ borderColor: "rgba(184, 92, 60, 0.18)", mx: 2 }} />

        {/* Auth row — sign in or sign out */}
        <Box sx={{ padding: "8px" }}>
          {isLoggedIn ? (
            <Box
              component="button"
              type="button"
              onClick={() => void handleSignOut()}
              sx={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 14px",
                borderRadius: "12px",
                background: "transparent",
                border: "none",
                color: "#831843",
                fontFamily: SANS,
                fontSize: 14,
                fontWeight: 600,
                textAlign: "left",
                cursor: "pointer",
                "&:hover": { background: "rgba(255, 255, 255, 0.55)" },
                "&:focus-visible": {
                  outline: "2px solid #FE0944",
                  outlineOffset: 2,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, color: "#831843" }}>
                <LogoutRoundedIcon />
              </ListItemIcon>
              {t("nav.signOut", "Sign out")}
            </Box>
          ) : (
            <Box
              component="button"
              type="button"
              onClick={() => goto("/login")}
              sx={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 14px",
                borderRadius: "12px",
                background:
                  "linear-gradient(135deg, #FE0944 0%, #FE7A52 100%)",
                border: "none",
                color: "#fff",
                fontFamily: SANS,
                fontSize: 14,
                fontWeight: 700,
                textAlign: "left",
                cursor: "pointer",
                boxShadow: "0 6px 16px rgba(254, 9, 68, 0.28)",
                "&:hover": {
                  boxShadow: "0 8px 20px rgba(254, 9, 68, 0.36)",
                },
                "&:focus-visible": {
                  outline: "2px solid #FE0944",
                  outlineOffset: 2,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, color: "#fff" }}>
                <LoginRoundedIcon />
              </ListItemIcon>
              {t("nav.signIn", "Sign in")}
            </Box>
          )}
        </Box>

        {/* Footer hint — language selector lives at the top-right pill */}
        <Box
          sx={{
            marginTop: "auto",
            padding: "16px 18px",
            fontSize: 10,
            fontWeight: 500,
            color: "rgba(60, 30, 20, 0.55)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            fontFamily: SANS,
          }}
        >
          {t("nav.languageHint", "Tap the flag pill to change language")}
        </Box>
      </Drawer>

      {/* ───────── Distance & deposit policy dialog ───────── */}
      <DistanceDepositDialog
        open={distanceOpen}
        onClose={() => setDistanceOpen(false)}
      />

      {/* 🆕 Round 28r7 — Refer & earn dialog (Phase 1, manual flow). */}
      <ReferralDialog
        open={referralOpen}
        onClose={() => setReferralOpen(false)}
      />
    </>
  );
};

// `useTranslation()` returns an i18next TFunction whose overloads are
// numerous. Narrowing to the (key, defaultValue) overload via a wrapper
// keeps `renderNavRow` simple to read.
type TranslateFn = (key: string, defaultValue: string) => string;

/** Renders a single drawer row — both nav and info groups use this. */
function renderNavRow(
  item: NavItem,
  location: ReturnType<typeof useLocation>,
  t: TranslateFn,
  onPick: (item: NavItem) => void
) {
  const active = item.path
    ? location.pathname + location.search === item.path
    : false;
  const key = item.path ?? `action:${item.action ?? ""}:${item.labelKey}`;
  const hint = item.hintKey ? t(item.hintKey, item.defaultHint ?? "") : null;

  return (
    <Box component="li" key={key} sx={{ listStyle: "none" }}>
      <Box
        component="button"
        type="button"
        onClick={() => onPick(item)}
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "12px 14px",
          borderRadius: "12px",
          background: active
            ? "linear-gradient(135deg, rgba(254, 9, 68, 0.1), rgba(254, 122, 82, 0.08))"
            : "transparent",
          border: "none",
          color: active ? "#FE0944" : "#2a1a14",
          fontFamily: SANS,
          fontSize: 14,
          fontWeight: active ? 700 : 600,
          textAlign: "left",
          cursor: "pointer",
          transition: "background 0.2s ease",
          "&:hover": {
            background: active
              ? "linear-gradient(135deg, rgba(254, 9, 68, 0.14), rgba(254, 122, 82, 0.12))"
              : "rgba(255, 255, 255, 0.55)",
          },
          "&:focus-visible": {
            outline: "2px solid #FE0944",
            outlineOffset: 2,
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 0,
            color: active ? "#FE0944" : "#b85c3c",
          }}
        >
          {item.icon}
        </ListItemIcon>
        <ListItemText
          primary={t(item.labelKey, item.defaultLabel)}
          secondary={hint || undefined}
          primaryTypographyProps={{
            fontSize: 14,
            fontWeight: "inherit",
          }}
          secondaryTypographyProps={{
            fontSize: 11,
            fontWeight: 500,
            color: "rgba(60, 30, 20, 0.6)",
            sx: { mt: 0.25 },
          }}
        />
      </Box>
    </Box>
  );
}

export default TopNav;
