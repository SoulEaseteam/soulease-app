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
import RedeemRoundedIcon from "@mui/icons-material/RedeemRounded";
// 🆕 28w.19 — icons for the public site-section rows the drawer was
//   missing (Promotions · Near Me · Pricing), mirroring QuickNavRow.
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import NearMeRoundedIcon from "@mui/icons-material/NearMeRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import { useAuth } from "@/providers/AuthProvider";
import ReferralDialog from "@/components/home/ReferralDialog";
// 🆕 Round 28w.20 — the Refer & earn drawer hint mirrors the dialog: it only
//   promises "Give X · Get X" when the referral program is actually live
//   (promos master switch on + REFERRAL code enabled in admin), else "Coming
//   soon" — so drawer + dialog never disagree.
import { PROMOS_ENABLED } from "@/config/featureFlags";
import { getReferralConfig } from "@/utils/discount";
import LanguageSwitcher from "@/components/common/LanguageSwitcher";
// 🆕 28x.132 (founder annotated arrow: "search bar ย้ายไปตามลูกศร") —
// practitioner search moved from HomeTherapistGrid into this site-wide bar.
import TherapistSearchBar from "@/components/TherapistSearchBar";
import { useHomeSearch } from "@/context/HomeSearchContext";
// 🆕 Round 28r79 — dead imports removed. `useConciergeMode`, `brand`,
//   and `fonts` were only referenced in the commented-out mode-chip
//   block (28s142 removed the visible chip). Ripping them out shrinks
//   the bundle by a hair and removes the temptation to reintroduce the
//   chip on the next TopNav edit. The mode chip lives on Hero now.
// 🆕 Round 28r52 — Phase 3.1 responsive foundation. Desktop nav bar
//   uses MUI's useMediaQuery to swap in a horizontal nav row on md+
//   viewports. Founder direction 2026-07-08: the site should feel
//   like a real web app on desktop, not a phone shell in a gutter.
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

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
  action?: "openReferral";
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
  // 🆕 28w.19 (founder: "แก้แทบบาร์ให้มีเมนูเหมือนกับด้านบน") — surface the
  //   same public destinations as the home QuickNavRow so the hamburger
  //   drawer isn't just Home + Services for guests. Order mirrors the top
  //   quick-nav: Services → Promotions → Near Me → Pricing.
  {
    icon: <CampaignRoundedIcon />,
    labelKey: "nav.promotions",
    defaultLabel: "Promotions",
    path: "/promotions",
  },
  {
    icon: <NearMeRoundedIcon />,
    labelKey: "nav.nearme",
    defaultLabel: "Near Me",
    path: "/near-me",
  },
  {
    icon: <LocalOfferRoundedIcon />,
    labelKey: "nav.pricing",
    defaultLabel: "Pricing",
    path: "/pricing",
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
    defaultHint: "Give 200฿ · Get 200฿",
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
];

const TopNav: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  // 🆕 Round 28s142 — concierge mode read + tint dropped along with
  //   the mode chip in the right cluster (founder feedback). Other
  //   surfaces still read mode via the same hook.
  // const concierge = useConciergeMode();
  // const modeTint = concierge.mode === "prime" ? brand.red : ...

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

  // 🆕 Round 28w.20 — live referral state for the drawer hint (see the
  //   INFO_ITEMS render below). Same gate the dialog uses.
  const referralCfg = getReferralConfig();
  const referralLive = PROMOS_ENABLED && referralCfg.enabled;

  // 🆕 Round 28r52 — Desktop mode: md+ (>= 900px) gets a horizontal
  //   nav row with real link buttons + concierge CTA. Mobile (<900px)
  //   keeps the hamburger drawer pattern verbatim from prior rounds.
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  const [drawerOpen, setDrawerOpen] = useState(false);
  // 🆕 28x.132 — shared with HomeTherapistGrid via context; the input
  //   renders here now, only when on the home route (see isHome below).
  const { searchQ, setSearchQ } = useHomeSearch();
  // 🆕 Round 28r7 — Refer & earn dialog state.
  const [referralOpen, setReferralOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const prevY = useRef(0);

  useEffect(() => {
    // 🆕 Round 28r52 — Auto-hide-on-scroll is a mobile-only affordance
    //   (protecting scarce phone vertical real estate). On desktop the
    //   nav stays pinned so users can hop between pages any time.
    if (isDesktop) {
      setHidden(false);
      setScrolled(false);
      return;
    }
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 30);
      if (y > 80) setHidden(y > prevY.current);
      prevY.current = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isDesktop]);

  const goto = (path: string) => {
    setDrawerOpen(false);
    // Compare full search-aware path so "/services?tab=how" replaces
    // "/services" cleanly when the user is already on services.
    const fullCurrent = location.pathname + location.search;
    if (fullCurrent !== path) void navigate(path);
  };

  const handleNavItem = (item: NavItem) => {
    if (item.action === "openReferral") {
      setDrawerOpen(false);
      setReferralOpen(true);
      return;
    }
    if (item.path) goto(item.path);
  };

  const handleSignOut = async () => {
    setDrawerOpen(false);
    // 🆕 28x.79 — was always "/" regardless of role, which sent a signed-out
    //   therapist to the customer storefront instead of back to the staff door.
    const dest = isTherapist ? "/staff" : "/";
    if (providerLogout) await providerLogout();
    if (location.pathname !== dest) void navigate(dest);
  };

  // 🆕 Round 28r52 — Desktop horizontal nav rows. Each item is a real
  //   link button (accessible focus outline + brand-red hover). On
  //   mobile these are hidden and the drawer NAV_ITEMS list remains
  //   the source of navigation.
  // 🆕 Round 28r71 · Rebrand Phase 2 — "Pricing" surfaces the new
  //   Core Experiences money page (/pricing) alongside the existing
  //   Services link (routes to the ROLADEX rate cards at /services).
  //   Both intentionally kept: Services is the browse-and-tap gallery,
  //   Pricing is the transparent-rates money page (the founder's r70
  //   ask). Placed between Services and Therapists so pricing is one
  //   discoverable click from anywhere on the site.
  // 🆕 Round 28r77 (founder 2026-07-08) — Bugfix: Therapists item
  //   used to share `path: "/"` with Home, and line 419's
  //   `key={item.path}` produced two React children with the same
  //   key "/" → duplicate-key warning → repeated remount cascade →
  //   Firestore's internal onSnapshot state machine got confused and
  //   threw INTERNAL ASSERTION FAILED (ID: b815/ca9). Two fixes:
  //     1. Therapists path → "/#therapist-grid" so clicking scrolls
  //        to the grid on the home page (matches QuickNavRow r74).
  //     2. `key` in the .map below switched to `item.labelKey` so
  //        even if two items ever share a path again, keys stay
  //        unique.
  const DESKTOP_NAV = [
    { labelKey: "nav.home", defaultLabel: "Home", path: "/" },
    { labelKey: "nav.services", defaultLabel: "Services", path: "/services" },
    { labelKey: "nav.pricing", defaultLabel: "Pricing", path: "/pricing" },
    {
      labelKey: "nav.therapists",
      defaultLabel: "Therapists",
      path: "/#therapist-grid",
    },
    {
      labelKey: "nav.howToBook",
      defaultLabel: "How to Book",
      path: "/services?tab=how",
    },
  ];

  // 🆕 28s335 — on the home hero the nav goes transparent to blend into the
  //   cream hero (founder: "navbar โปร่งใส กลืนไปกับฮีโร"); a soft cream blur
  //   fades in on scroll so it stays legible over content below. Other pages
  //   keep the solid dark bar. Foreground ink flips dark↔white to match.
  const isHome = location.pathname === "/";
  // 🕯️ 28t day/night — transparent over the hero, fading to a translucent
  //   scrim on scroll; solid deep-panel bar elsewhere. Foreground ink flips
  //   with the theme so it reads on both the light-day and dark-night bar.
  const navBg = isHome
    ? scrolled
      ? "var(--sr-nav-scrim)"
      : "transparent"
    : "var(--sr-panel-deep)";
  const fg = "var(--sr-ink)";

  return (
    <>
      <Box
        component="nav"
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          // 🆕 Round 28r52 — Wider horizontal padding on desktop so the
          //   nav row breathes at 1200px. Mobile spacing unchanged.
          padding: {
            xs: "8px 18px 14px",
            md: "12px 32px",
          },
          position: "relative",
          zIndex: 10,
          transform: hidden ? "translateY(-100%)" : "translateY(0)",
          transition: "transform 0.28s ease, background 0.2s ease, box-shadow 0.2s ease",
          // 🆕 Round 28s153 — Cool-mint bg replaces warm cream when
          //   scrolled (was rgba(255,248,240) = old #F4F6F5). Matches
          //   the new flat palette and stops the dour warm-tint
          //   from creeping over the top of the page.
          // 🆕 Round 28s163 — Founder: TopNav bg = brand red #2D2D2B
          //   (ROLADEX reference). Always solid, both at rest and on
          //   scroll. White text + icons ride on top.
          // 🆕 28s335 — transparent over the home hero (see consts above);
          //   solid dark bar elsewhere.
          background: navBg,
          color: fg,
          boxShadow:
            isHome && !scrolled
              ? "none"
              : scrolled
              ? "0 2px 10px rgba(0,0,0,0.34)"
              : "none",
          borderBottom: "none",
          // Blur only when there's a surface to blur (solid bar, or the
          //   home bar after it fades in on scroll) — never over the hero.
          backdropFilter:
            isHome && !scrolled ? "none" : "blur(10px) saturate(140%)",
          WebkitBackdropFilter:
            isHome && !scrolled ? "none" : "blur(10px) saturate(140%)",
        }}
      >
        {/* 🆕 28x.132 (founder: "โลโก้ → search bar → แฮมเบอร์เกอร์") — brand
            wordmark is now FIRST on mobile (was after the hamburger).
            Clickable, routes to "/". Desktop keeps its existing left-aligned
            position (marginRight:auto pushes the centered nav + CTA right). */}
        <Box
          component="button"
          type="button"
          // 🆕 28x.79 — the logo was a second door back into the customer
          //   storefront from a therapist's own pages. Home means her panel now.
          // 🆕 28x.87 — points at the new Home dashboard, not Profile.
          onClick={() => goto(isTherapist ? "/therapist/home" : "/")}
          aria-label={t("nav.brandHome", "SunRed home")}
          sx={{
            background: "transparent",
            border: "none",
            padding: "4px 8px",
            cursor: "pointer",
            borderRadius: "8px",
            flexShrink: 0,
            marginRight: { md: "auto" },
            "&:focus-visible": {
              outline: "2px solid #FF9999",
              outlineOffset: 2,
            },
          }}
        >
          {/* 🆕 28x.132 swapped this to the italic SunRedWordmark; 🆕 28x.139
              (founder selected the italic nav wordmark + sent a reference
              screenshot of the old two-tone caps treatment, "เปลี่ยน เอาโลโก้
              นี้") — restored, #FF9999 instead of the old #D97C95 to match
              the sitewide 28x.134 color unification. 🆕 28x.142 (founder:
              "ปรับหน่อย" → spacing / font size / letter-spacing / overall
              alignment) — 0.22em read as too wide next to the compact search
              bar it now shares the row with; tightened tracking + size and
              gave it explicit breathing room instead of relying on the
              search bar's own margin. */}
          <Box
            component="span"
            sx={{
              fontFamily: '"Playfair Display", "Fraunces", Georgia, serif',
              fontSize: { xs: "18px", md: "23px" },
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            <Box component="span" sx={{ color: fg }}>
              SUN
            </Box>
            <Box component="span" sx={{ color: "#FF9999" }}>
              RED
            </Box>
          </Box>
        </Box>

        {/* 🆕 28x.132 — practitioner search, moved here from
            HomeTherapistGrid. Mobile + home-route only: it's meaningless
            chrome on pages with no filterable list, and desktop already has
            its own horizontal nav + concierge CTA filling this row. */}
        {isHome && (
          <Box sx={{ display: { xs: "flex", md: "none" }, flex: 1, minWidth: 0 }}>
            {/* 🆕 28x.145 (founder selected the hamburger icon: "ให้search
                bar ขยับออกห่าง จาก 3 แถบ หน่อย") — right margin bumped so the
                pill doesn't crowd the menu button's tap target. */}
            <TherapistSearchBar
              value={searchQ}
              onChange={setSearchQ}
              m="0 10px 0 16px"
              compact
            />
          </Box>
        )}

        {/* 🆕 Founder: "เพิ่มปุ่มแปลภาษาข้างช่องค้นหา" — the manual language
            switcher (removed 28s168 for device auto-detect) returns here, right
            next to the practitioner search on the mobile home bar. Reuses the
            shared LanguageSwitcher (already imported); its menu still carries
            "Auto (device)" so auto-detect is one tap away. */}
        {isHome && (
          <Box sx={{ display: { xs: "flex", md: "none" }, alignItems: "center", flexShrink: 0, mr: 0.5 }}>
            <LanguageSwitcher size="sm" />
          </Box>
        )}

        {/* Menu button — opens drawer. Hidden on desktop where the
            inline horizontal nav takes over. Moved to the END (right side)
            of the row — was first/left before 28x.132. */}
        <IconButton
          aria-label={t("nav.openMenu", "Open menu")}
          onClick={() => setDrawerOpen(true)}
          sx={{
            // 🆕 Round 28r57 · Phase 3.6 — 40→44 WCAG 2.1 AA min tap
            //   target on mobile primary nav.
            width: "44px",
            height: "44px",
            borderRadius: "50%",
            display: { xs: "inline-flex", md: "none" },
            flexShrink: 0,
            // 🆕 Round 28s170 — Founder: "3 แทบ เอากรอบ ออก".
            //   Drop the white ring around the hamburger; the 3
            //   bars alone on the red bg are plenty of affordance.
            background: "transparent",
            border: "none",
            boxShadow: "none",
            color: fg,
            "&:hover": {
              background: isHome
                ? "rgba(243, 230, 219, 0.10)"
                : "rgba(255, 255, 255, 0.12)",
            },
            "&:focus-visible": {
              outline: `2px solid ${fg}`,
              outlineOffset: 2,
            },
          }}
        >
          <MenuRoundedIcon sx={{ fontSize: 20 }} />
        </IconButton>

        {/* 🆕 Round 28r52 — Desktop-only horizontal nav row. Center of
            the bar. Mobile skips this entirely and falls back to the
            drawer. */}
        <Box
          component="ul"
          sx={{
            display: { xs: "none", md: "flex" },
            listStyle: "none",
            margin: 0,
            padding: 0,
            alignItems: "center",
            gap: "6px",
            // Center the nav between the wordmark (marginRight:auto
            // above) and the concierge CTA (marginLeft:auto below).
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          {DESKTOP_NAV.map((item) => {
            const active =
              location.pathname + location.search === item.path ||
              (item.path === "/" && location.pathname === "/");
            return (
              <Box component="li" key={item.labelKey} sx={{ listStyle: "none" }}>
                <Box
                  component="button"
                  type="button"
                  onClick={() => goto(item.path)}
                  sx={{
                    // 🆕 28w.3 — rose-tint active/hover pill. Was white-
                    //   translucent (rgba(255,255,255,.12)) → invisible on the
                    //   light day bar; rose reads on cream, dark, and light-rose
                    //   alike. Label stays `fg` (ink) for contrast.
                    background: active
                      ? "rgba(217, 124, 149, 0.20)"
                      : "transparent",
                    border: "none",
                    padding: "8px 14px",
                    borderRadius: "999px",
                    cursor: "pointer",
                    color: fg,
                    fontFamily: SANS,
                    fontSize: "14px",
                    fontWeight: active ? 700 : 500,
                    letterSpacing: "0.02em",
                    transition: "background 0.15s ease, transform 0.15s ease",
                    "&:hover": {
                      background: active
                        ? "rgba(217, 124, 149, 0.26)"
                        : "rgba(217, 124, 149, 0.10)",
                      transform: "translateY(-1px)",
                    },
                    "&:focus-visible": {
                      outline: `2px solid ${fg}`,
                      outlineOffset: 2,
                    },
                  }}
                >
                  {t(item.labelKey, item.defaultLabel)}
                </Box>
              </Box>
            );
          })}
        </Box>

        {/* 🆕 Round 28r52 — Desktop concierge CTA (opens Refer & earn
            dialog for now; matches the drawer's featured action).
            Mobile keeps the balanced 40px spacer so the wordmark stays
            centred between hamburger + spacer. */}
        <Box
          component="button"
          type="button"
          onClick={() => setReferralOpen(true)}
          sx={{
            display: { xs: "none", md: "inline-flex" },
            alignItems: "center",
            gap: "8px",
            // 🕯️ 28t — dusty-rose gradient concierge pill (both home + inner).
            background: "linear-gradient(135deg,#FF9999 0%,#FF9999 100%)",
            border: "none",
            color: "#FFF7F0",
            fontFamily: SANS,
            fontSize: "13px",
            fontWeight: 700,
            letterSpacing: "0.03em",
            padding: "9px 18px",
            borderRadius: "999px",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.32)",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: "0 6px 16px rgba(0, 0, 0, 0.42)",
            },
            "&:focus-visible": {
              outline: "2px solid #F3E6DB",
              outlineOffset: 2,
            },
          }}
          aria-label={t("nav.conciergeCta", "Concierge")}
        >
          <RedeemRoundedIcon sx={{ fontSize: 18 }} />
          {t("nav.concierge", "Concierge")}
        </Box>

        {/* 🆕 Round 28s168 — Language pill removed (founder: "เอา
            แปลภาษา ออก · เราแปลจากการตั้งค่ามือถือลูกค้าอยู่แล้ว").
            i18next LanguageDetector already pulls navigator/htmlTag
            so EN/TH/ZH/JA/KO auto-switch by device locale. Manual
            switcher was redundant + crowded the red TopNav.
            🆕 28x.132 — the balancing spacer that kept the wordmark
            centred is gone too: the wordmark is genuinely first now
            (not centred), so nothing needs to balance it. */}
      </Box>

      {/* ───────── Navigation drawer ───────── */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            background: "var(--sr-panel-deep)",
            borderRight: "1px solid var(--sr-hairline)",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.5)",
          },
        }}
      >
        {/* Header — close button only now.
            🆕 28x.132 (founder selected this wordmark, "ลบ") — the
            drawer's own SunRedWordmark is gone; it's now the TopNav bar's
            wordmark instead (moved, not duplicated). */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            padding: "16px 18px 12px",
          }}
        >
          <IconButton
            aria-label={t("nav.closeMenu", "Close menu")}
            onClick={() => setDrawerOpen(false)}
            sx={{
              color: "var(--sr-ink)",
              width: 44,
              height: 44,
              "&:focus-visible": {
                outline: "2px solid #FF9999",
                outlineOffset: 2,
              },
            }}
          >
            <CloseRoundedIcon />
          </IconButton>
        </Box>

        <Box sx={{ height: "1px", background: "var(--sr-hairline)" }} />

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
                // 🆕 28x.79 (founder: "ทางเข้าเดียวกัน ทุกอย่างในนั้นก็เหมือนกัน")
                //   — was /profile, the CUSTOMER page. The exact bug she was
                //   pointing at: opening this drawer FROM her own therapist
                //   panel and having its own shortcut send her back to the
                //   guest profile.
                // 🆕 28x.87 — points at the new Home dashboard now.
                void navigate("/therapist/home");
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
              // 🆕 28w.3 — was faint cream + retired gold/tan (dated "แก่").
              //   Unified rose card for both admin + therapist.
              background:
                "linear-gradient(135deg, rgba(217,124,149,0.18), rgba(217,124,149,0.06))",
              border: "1px solid rgba(217,124,149,0.30)",
              cursor: "pointer",
              fontFamily: SANS,
              textAlign: "left",
              "&:hover": { transform: "translateY(-1px)" },
              transition: "transform 0.15s ease",
              "&:focus-visible": {
                outline: "2px solid #FF9999",
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
                background: "#FF9999",
                color: "#FFFFFF",
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
                  color: "var(--sr-gold-text)",
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
                  color: "var(--sr-ink)",
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
                color: "#FF9999",
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              ›
            </Box>
          </Box>
        )}

        {/* Account / nav items — 🆕 28x.79: therapist pages no longer render
            TopNav at all (see StaffLayout), so this is customer-only chrome by
            construction and needs no role gating here. */}
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

        <Box sx={{ height: "1px", background: "var(--sr-hairline)", mx: 2 }} />

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
            color: "var(--sr-dim)",
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
          {INFO_ITEMS.map((item) => {
            // 🆕 Round 28w.20 — swap the referral row's hint for the live
            //   state so it never over-promises while promos are off. Drop
            //   hintKey so the dynamic default renders (not a stale "Give 200"
            //   translation).
            const rendered =
              item.action === "openReferral"
                ? {
                    ...item,
                    hintKey: undefined,
                    defaultHint: referralLive
                      ? `Give ${referralCfg.amountThb.toLocaleString()}฿ · Get ${referralCfg.amountThb.toLocaleString()}฿`
                      : "Coming soon",
                  }
                : item;
            return renderNavRow(
              rendered,
              location,
              (k, def) => t(k, def),
              handleNavItem
            );
          })}
        </Box>

        <Box sx={{ height: "1px", background: "var(--sr-hairline)", mx: 2 }} />

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
                color: "#FF9999",
                fontFamily: SANS,
                fontSize: 14,
                fontWeight: 600,
                textAlign: "left",
                cursor: "pointer",
                "&:hover": { background: "rgba(243,230,219,0.07)" },
                "&:focus-visible": {
                  outline: "2px solid #FF9999",
                  outlineOffset: 2,
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 0, color: "#FF9999" }}>
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
                  "linear-gradient(135deg,#FF9999 0%,#FF9999 100%)",
                border: "none",
                color: "#FFF7F0",
                fontFamily: SANS,
                fontSize: 14,
                fontWeight: 700,
                textAlign: "left",
                cursor: "pointer",
                boxShadow: "0 6px 16px rgba(0, 0, 0, 0.4)",
                "&:hover": {
                  boxShadow: "0 8px 20px rgba(0, 0, 0, 0.5)",
                },
                "&:focus-visible": {
                  outline: "2px solid #FF9999",
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
            color: "var(--sr-dim)",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            fontFamily: SANS,
          }}
        >
          {t("nav.languageHint", "Tap the flag pill to change language")}
        </Box>
      </Drawer>

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
  // 🆕 Round 28w.20 — fall back to defaultHint when hintKey is cleared (the
  //   referral row injects a dynamic hint with no key; see INFO_ITEMS render).
  const hint = item.hintKey
    ? t(item.hintKey, item.defaultHint ?? "")
    : item.defaultHint ?? null;

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
          /* 🕯️ 28t — drawer active row uses the dusty-rose accent on the
             dark drawer (#2A1D16): a soft rose-tint fill + rose label with
             a warm cream register for inactive rows. */
          background: active
            ? "linear-gradient(135deg, rgba(217,124,149,0.22), rgba(217,124,149,0.10))"
            : "transparent",
          border: "none",
          color: active ? "#E7A9AB" : "var(--sr-body)",
          fontFamily: SANS,
          fontSize: 14,
          fontWeight: active ? 700 : 600,
          textAlign: "left",
          cursor: "pointer",
          transition: "background 0.2s ease",
          "&:hover": {
            background: active
              ? "linear-gradient(135deg, rgba(217,124,149,0.28), rgba(217,124,149,0.14))"
              : "rgba(243,230,219,0.07)",
          },
          "&:focus-visible": {
            outline: "2px solid #FF9999",
            outlineOffset: 2,
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 0,
            color: active ? "#FF9999" : "var(--sr-muted)",
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
            color: "var(--sr-muted)",
            sx: { mt: 0.25 },
          }}
        />
      </Box>
    </Box>
  );
}

export default TopNav;
