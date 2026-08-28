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
import { Link as RouterLink } from "react-router-dom";
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

  // 🆕 Round 28x.186 (founder: "ปรับแถบนี้ให้มันดูดีขึ้นเป็นทางการขึ้น
  //   อะไรที่มีอยู่แล้วให้ตัดออก") — dropped "Practitioners" specifically:
  //   it was the one entry in this column NOT using `to=` (it fired
  //   `scrollToTherapistGrid` via onClick instead), so unlike its siblings
  //   it was never a real crawlable link — no SEO value lost cutting it —
  //   and it duplicates "Home" one row above for a guest just reading link
  //   labels. Every OTHER link below stays: TopNav/BottomNavGlass both
  //   navigate via onClick+navigate() (see NAV_ITEMS in TopNav.tsx), which
  //   Googlebot's link-discovery crawler can't see — confirmed the hard way
  //   in 28x.99d, when the 5 district pages below showed "Referring page:
  //   None detected" in Search Console despite being real pages. This
  //   footer is the ONLY real <a href> path to Home/Services/Pricing/
  //   Journal on the whole site; cutting them would silently undo that.
  const menuLinks: FooterLink[] = [
    { label: t("footer.home", "Home"), to: "/" },
    { label: t("footer.services", "Services"), to: "/services" },
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
  // 🆕 28x.186 (founder: "อะไรที่มีอยู่แล้วให้ตัดออก") — same pattern one
  //   level down: "How to book" / "Payment" / "FAQ" were three DIFFERENT
  //   labels pointing at the literal SAME href (/services?tab=how). Three
  //   anchors to one URL earn no extra crawl value over one — Google
  //   collapses repeat same-page links from one source anyway — so this
  //   was pure visual repetition, unlike the menu/area links above.
  const helpLinks: FooterLink[] = [
    { label: t("footer.howToBookFaq", "How to book & FAQ"), to: "/services?tab=how" },
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

  // 28x.227 (founder: "ปรับสวยขึ้น เหมาะกับสมัยใหม่") — contact entries
  // render as tappable glass chips instead of plain text rows.
  const columns: { title: string; links: FooterLink[]; chips?: boolean }[] = [
    { title: t("footer.col.menu", "Menu"), links: menuLinks },
    { title: t("footer.col.areas", "Areas"), links: areaLinks },
    { title: t("footer.col.help", "Help"), links: helpLinks },
    { title: t("footer.col.contact", "Contact us"), links: contactLinks, chips: true },
  ];

  return (
    <Box
      component="footer"
      className="sr-reveal"
      aria-label="SunRed footer"
      sx={{
        marginTop: { xs: "36px", md: "48px" },
        marginX: { xs: "12px", md: "12px" },
        padding: { xs: "30px 20px 30px", md: "40px 36px 36px" },
        // 28x.227 modern dress: same day/night ground, plus a faint blush
        // wash in the top-right corner and a magenta→gold hairline instead
        // of the flat border. Structure/links untouched (SEO-load-bearing).
        background: "var(--sr-panel-deep)",
        backgroundImage:
          "radial-gradient(120% 90% at 100% 0%, rgba(230, 25, 126, 0.055), transparent 55%)",
        borderRadius: "24px",
        border: "1px solid var(--sr-hairline)",
        position: "relative",
        overflow: "hidden",
        "&::before": {
          content: '""',
          position: "absolute",
          top: 0,
          left: "8%",
          right: "8%",
          height: "2px",
          borderRadius: "2px",
          background:
            "linear-gradient(90deg, transparent, rgba(240, 80, 160, 0.8), rgba(215, 181, 109, 0.8), transparent)",
        },
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
          className="sr-shine"
          sx={{
            width: 42,
            height: 42,
            borderRadius: "50%",
            background:
              "linear-gradient(135deg, rgba(240, 80, 160, 0.14), rgba(215, 181, 109, 0.16))",
            border: "1px solid var(--sr-hairline)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--sr-gold-text)",
            fontSize: 17,
            lineHeight: 1,
          }}
        >
          ✦
        </Box>
        <Box>
          <Box
            sx={{
              fontFamily: fonts.heading,
              fontSize: 23,
              fontWeight: 500,
              color: "var(--sr-ink)",
              letterSpacing: "0.04em",
              lineHeight: 1,
            }}
          >
            SUN
            <Box
              component="span"
              sx={{
                background: "linear-gradient(135deg, #F050A0, #E6197E)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              RED
            </Box>
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
            {/* 🆕 Round 28x.186 (founder: "ให้มันดูดีขึ้นเป็นทางการขึ้น") —
                sentence-case headings read as casual sub-labels; switched to
                the same uppercase/letter-spaced "eyebrow" treatment used for
                every other section label in the app (Profile's REWARDS /
                RESERVATIONS, the identity card's SEX / HEIGHT · WEIGHT),
                plus a short accent rule so each column reads as its own
                titled block instead of a loose list of links. */}
            <Box
              sx={{
                fontFamily: fonts.body,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--sr-muted)",
                marginBottom: "10px",
              }}
            >
              {col.title}
            </Box>
            <Box
              aria-hidden
              sx={{
                width: 22,
                height: "2px",
                borderRadius: "1px",
                background: "linear-gradient(90deg, #F050A0, #D7B56D)",
                opacity: 0.8,
                marginBottom: "12px",
              }}
            />
            <Box
              component="ul"
              sx={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {col.links.map((link) => (
                <Box
                  component="li"
                  key={link.label}
                  sx={{
                    fontFamily: fonts.body,
                    fontSize: 11.5,
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
                        display: "inline-block",
                        transition: "color 0.18s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
                        "&:hover": { color: "#F050A0", transform: "translateX(3px)" },
                        "&:focus-visible": {
                          outline: "2px solid #F050A0",
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
                      sx={
                        col.chips
                          ? {
                              color: "inherit",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              padding: "6px 12px",
                              borderRadius: "99px",
                              border: "1px solid var(--sr-line)",
                              transition:
                                "color 0.18s ease, border-color 0.18s ease, background 0.18s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
                              "&:hover": {
                                color: "#F050A0",
                                borderColor: "rgba(240, 80, 160, 0.5)",
                                background: "rgba(240, 80, 160, 0.06)",
                                transform: "translateY(-1px)",
                              },
                              "&:focus-visible": {
                                outline: "2px solid #F050A0",
                                outlineOffset: 2,
                              },
                            }
                          : {
                              color: "inherit",
                              textDecoration: "none",
                              display: "inline-block",
                              transition:
                                "color 0.18s ease, transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
                              "&:hover": { color: "#F050A0", transform: "translateX(3px)" },
                              "&:focus-visible": {
                                outline: "2px solid #F050A0",
                                outlineOffset: 2,
                                borderRadius: "3px",
                              },
                            }
                      }
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
        © {new Date().getFullYear()} SunRed Wellness &amp; Massage
        <Box component="span" aria-hidden sx={{ color: "var(--sr-gold-text)", margin: "0 7px", fontSize: 9 }}>
          ✦
        </Box>
        Bangkok
      </Box>
    </Box>
  );
};

export default HomeFooterV2;
