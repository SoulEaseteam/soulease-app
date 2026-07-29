// src/components/home/HomeFooterV2.tsx
//
// 🆕 Round 28r74 · Nordic sections build (2026-07-08)
// ─────────────────────────────────────────────────────────────────────
// SunRed website-style footer — replaces the original HomeFooter that
// was dropped in 28s20 (founder wanted an app-shell home). This round
// reverses that call: founder wants richer content back per the Nordic
// Gray mockup she approved ("มีแค่นี้ หรอ").
//
// Layout:
//   • SunRed ✦ lockup + Playfair "SUNRED" + Inter caps
//     "WELLNESS & MASSAGE"
//   • Sarabun tagline (max ~260px on desktop)
//   • Hairline divider
//   • 3-column link grid (mobile stacks to 1 column):
//       - เมนู       — internal nav
//       - ช่วยเหลือ  — help/policy links
//       - ติดต่อเรา   — LINE / phone / email (from CONCIERGE config)
//
// Matches mockup phone-2 "footer" block
// (outputs/sunred-nordic-gray-mockup.html:567-631).
//
// Concierge phone/LINE URL sourced from src/config/concierge.ts so a
// number change never needs to touch this file.
// ─────────────────────────────────────────────────────────────────────

import React from "react";
import { useTranslation } from "react-i18next";
import { Box } from "@mui/material";
import { useNavigate, Link as RouterLink } from "react-router-dom";
import { fonts } from "@/theme";
import { CONCIERGE } from "@/config/concierge";

type FooterLink = {
  label: string;
  onClick?: () => void;
  href?: string;
  /** 🆕 Round 28x.99d (founder: "ทำให้คำค้นหาติดอันดับหน่อย") — internal
   *  route link. Renders a real react-router <Link>, which outputs a real
   *  <a href> in the DOM (unlike onClick + navigate(), which is invisible
   *  to Googlebot's link-discovery crawler — confirmed via URL Inspection:
   *  the 5 district SEO pages showed "Referring page: None detected" even
   *  though they're real, unique, content-rich pages (fixed 28x.7) — sitting
   *  in the sitemap alone is a much weaker crawl-priority signal than an
   *  actual internal link. Footer renders on every page, so this is the
   *  single highest-leverage place to add one. */
  to?: string;
};

const HomeFooterV2: React.FC = () => {
  // 🆕 Round 28w.83 — the ENTIRE footer was hardcoded Thai, and it renders on
  //   every page. A Japanese guest browsing an otherwise-Japanese site hit a
  //   Thai nav block at the bottom of every screen. English source + locales.
  const { t } = useTranslation();
  const navigate = useNavigate();

  const scrollToTherapistGrid = () => {
    const el = document.getElementById("therapist-grid");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      // Not on home page — navigate home then scroll
      void navigate("/");
    }
  };

  const menuLinks: FooterLink[] = [
    { label: t("footer.home", "Home"), to: "/" },
    { label: t("footer.services", "Services"), to: "/services" },
    { label: t("footer.practitioners", "Practitioners"), onClick: scrollToTherapistGrid },
    { label: t("footer.nearMe", "Near me"), to: "/near-me" },
    { label: t("footer.pricing", "Pricing"), to: "/pricing" },
    // 🆕 Round 28x.108 — the SEO journal. This footer renders on the home page
    //   (the most-crawled URL on the site), so a real <a href> here is the
    //   internal link that lets Googlebot discover /blog and, from the index's
    //   own crawlable list, every article (same crawl-signal reasoning as the
    //   area links below).
    { label: t("footer.journal", "Journal"), to: "/blog" },
  ];

  // 🆕 Round 28x.99d — the 5 district SEO landing pages (App.tsx →
  //   KeywordLanding, real unique content per 28x.7) had ZERO internal
  //   links pointing to them anywhere on the site — only reachable via
  //   the sitemap, which Google Search Console confirmed is a weak crawl
  //   signal ("Referring page: None detected" on every one of them).
  //   Footer renders site-wide, so this single column now gives Googlebot
  //   a real <a href> path to all 5 from every page.
  const areaLinks: FooterLink[] = [
    { label: "Sukhumvit", to: "/outcall-massage-sukhumvit" },
    { label: "Silom", to: "/outcall-massage-silom" },
    { label: "Asok", to: "/outcall-massage-asok" },
    { label: "Thonglor", to: "/outcall-massage-thonglor" },
    { label: t("footer.outcallNearMe", "Outcall near me"), to: "/outcall-massage-near-me" },
  ];

  // 🆕 28x.141 (founder: "เอาแค่อันที่ไม่ซ้ำ") — this column had its own
  //   "Contact us" link (→ WhatsApp) that duplicated the entire dedicated
  //   "Contact us" column (LINE/Call/Telegram) sitting right next to it.
  const helpLinks: FooterLink[] = [
    { label: t("footer.howToBook", "How to book"), to: "/services?tab=how" },
    { label: t("footer.payment", "Payment"), to: "/services?tab=how" },
    { label: t("footer.faq", "FAQ"), to: "/services?tab=how" },
  ];

  const contactLinks: FooterLink[] = [
    {
      label: "LINE Official",
      href: CONCIERGE.lineUrl,
    },
    {
      label: `${t("footer.call", "Call")}: ${CONCIERGE.displayPhone}`,
      href: `tel:+${CONCIERGE.whatsappPhone}`,
    },
    {
      label: `Telegram: ${CONCIERGE.telegramChannel}`,
      href: `https://t.me/${CONCIERGE.telegramChannel.replace(/^@/, "")}`,
    },
  ];

  const columns: { title: string; links: FooterLink[] }[] = [
    { title: t("footer.col.menu", "Menu"), links: menuLinks },
    { title: t("footer.col.areas", "Areas"), links: areaLinks },
    { title: t("footer.col.help", "Help"), links: helpLinks },
    { title: t("footer.col.contact", "Contact us"), links: contactLinks },
  ];

  return (
    <Box
      component="footer"
      aria-label="SunRed footer"
      sx={{
        marginTop: { xs: "36px", md: "48px" },
        marginX: { xs: "12px", md: "12px" },
        padding: { xs: "28px 20px 32px", md: "36px 32px 40px" },
        background: "var(--sr-panel-deep)", // PANEL_DEEP — deepest ground, just above ESPRESSO bg
        borderRadius: "20px",
        borderTop: "1px solid var(--sr-hairline)", // GOLD hairline — embroidery
      }}
    >
      {/* Brand lockup */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "14px",
        }}
      >
        <Box
          aria-hidden
          sx={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--sr-panel-2)", // WALNUT — inner chip
            border: "1px solid var(--sr-hairline)", // GOLD hairline
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--sr-gold-text)", // GOLD — logo star
            fontSize: 15,
            lineHeight: 1,
          }}
        >
          ✦
        </Box>
        <Box>
          <Box
            sx={{
              fontFamily: fonts.heading,
              fontSize: 17,
              fontWeight: 500,
              color: "var(--sr-ink)", // IVORY — brand heading
              letterSpacing: "0.02em",
              lineHeight: 1,
            }}
          >
            SUNRED
          </Box>
          <Box
            sx={{
              fontFamily: fonts.body,
              fontSize: 8.5,
              fontWeight: 600,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "var(--sr-muted)", // CHAMPAGNE — muted eyebrow
              marginTop: "2px",
            }}
          >
            Wellness &amp; Massage
          </Box>
        </Box>
      </Box>

      {/* Tagline */}
      <Box
        sx={{
          fontFamily: fonts.body,
          fontSize: 12,
          color: "var(--sr-muted)", // CHAMPAGNE — muted tagline
          lineHeight: 1.6,
          marginBottom: "22px",
          maxWidth: 320,
        }}
      >
        {t("footer.tagline", "We care for you like someone who matters, at every moment of your life.")}
      </Box>

      {/* 3-column link grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(4, 1fr)" },
          gap: { xs: "18px 16px", md: "20px" },
          paddingTop: "20px",
          borderTop: "1px solid var(--sr-line)", // subtle divider on dark
        }}
      >
        {columns.map((col) => (
          <Box key={col.title}>
            <Box
              sx={{
                fontFamily: fonts.body,
                fontSize: 11.5,
                fontWeight: 600,
                color: "var(--sr-ink)", // IVORY — column heading
                marginBottom: "10px",
              }}
            >
              {col.title}
            </Box>
            <Box
              component="ul"
              sx={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {col.links.map((link) => (
                <Box
                  component="li"
                  key={link.label}
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 11,
                    fontWeight: 400,
                    color: "var(--sr-body)", // CREAM — links
                    lineHeight: 1.5,
                  }}
                >
                  {link.to ? (
                    <Box
                      component={RouterLink}
                      to={link.to}
                      sx={{
                        color: "inherit",
                        textDecoration: "none",
                        transition: "color 0.16s ease",
                        "&:hover": { color: "#FF9999" }, // ROSE — link hover
                        "&:focus-visible": {
                          outline: "2px solid #FF9999", // ROSE focus ring
                          outlineOffset: 2,
                          borderRadius: "3px",
                        },
                      }}
                    >
                      {link.label}
                    </Box>
                  ) : link.href ? (
                    <Box
                      component="a"
                      href={link.href}
                      target={
                        link.href.startsWith("http") ? "_blank" : undefined
                      }
                      rel={
                        link.href.startsWith("http")
                          ? "noopener noreferrer"
                          : undefined
                      }
                      sx={{
                        color: "inherit",
                        textDecoration: "none",
                        transition: "color 0.16s ease",
                        "&:hover": { color: "#FF9999" }, // ROSE — link hover
                        "&:focus-visible": {
                          outline: "2px solid #FF9999", // ROSE focus ring
                          outlineOffset: 2,
                          borderRadius: "3px",
                        },
                      }}
                    >
                      {link.label}
                    </Box>
                  ) : (
                    <Box
                      component="button"
                      type="button"
                      onClick={link.onClick}
                      sx={{
                        all: "unset",
                        cursor: "pointer",
                        color: "inherit",
                        transition: "color 0.16s ease",
                        "&:hover": { color: "#FF9999" }, // ROSE — link hover
                        "&:focus-visible": {
                          outline: "2px solid #FF9999", // ROSE focus ring
                          outlineOffset: 2,
                          borderRadius: "3px",
                        },
                      }}
                    >
                      {link.label}
                    </Box>
                  )}
                </Box>
              ))}
            </Box>
          </Box>
        ))}
      </Box>

      {/* © line */}
      <Box
        sx={{
          marginTop: "22px",
          paddingTop: "16px",
          borderTop: "1px solid var(--sr-line)", // subtle divider on dark
          fontFamily: fonts.body,
          fontSize: 10.5,
          color: "var(--sr-dim)", // DIM — legal caption
          textAlign: "center",
          letterSpacing: "0.02em",
        }}
      >
        © {new Date().getFullYear()} SunRed Wellness &amp; Massage · Bangkok
      </Box>
    </Box>
  );
};

export default HomeFooterV2;
