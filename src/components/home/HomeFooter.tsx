// src/components/home/HomeFooter.tsx
//
// 🎨 Phase 1 Home — Footer (pixel-perfect port of `<footer>` block).
// Brand row + 4-col link grid + 5-language switcher + ผ.พ. legal disclaimer.
//
// Verbatim CSS from sunred-home1.html:
//   footer { padding: 24px 20px 28px; background: rgba(126,30,46,0.05);
//     border-top: 1px solid rgba(184,92,60,0.15); }
//   .brand-row, .brand-name (gradient text), .socials, .links (2-col grid),
//   .col h4 (uppercase eyebrow), .col a (12px), .legal.

import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";
// 🆕 Round 25 (founder 2026-05-02): emoji socials (📱📧💬) replaced with
//    MUI icons per Round 15 mandate "no emojis, use MUI icons" — matches
//    BookingSuccessPage / Confirm Order / TherapistListPage rounds.
import PhoneIphoneRoundedIcon from "@mui/icons-material/PhoneIphoneRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import ChatRoundedIcon from "@mui/icons-material/ChatRounded";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

type SocialIcon = {
  Icon: typeof PhoneIphoneRoundedIcon;
  label: string;
};

const SOCIALS: SocialIcon[] = [
  { Icon: PhoneIphoneRoundedIcon, label: "Phone" },
  { Icon: EmailRoundedIcon, label: "Email" },
  { Icon: ChatRoundedIcon, label: "Chat" },
];

type LinkItem = { key: string; fallback: string };
type Col = { titleKey: string; titleFallback: string; links: LinkItem[] };

const COLS: Col[] = [
  {
    titleKey: "footer.col.service",
    titleFallback: "Service",
    links: [
      { key: "footer.therapists", fallback: "Therapists" },
      { key: "footer.services", fallback: "Services" },
      { key: "footer.pricing", fallback: "Pricing" },
      { key: "footer.coverage", fallback: "Coverage areas" },
    ],
  },
  {
    titleKey: "footer.col.company",
    titleFallback: "Company",
    links: [
      { key: "footer.about", fallback: "About SunRed" },
      { key: "footer.standards", fallback: "Standards" },
      { key: "footer.hotels", fallback: "For hotels" },
      { key: "footer.careers", fallback: "Careers" },
    ],
  },
  {
    titleKey: "footer.col.support",
    titleFallback: "Support",
    links: [
      { key: "footer.help", fallback: "Help center" },
      { key: "footer.contact", fallback: "Contact concierge" },
      { key: "footer.cancellation", fallback: "Cancellation" },
    ],
  },
  {
    titleKey: "footer.col.langs",
    titleFallback: "Languages",
    links: [
      { key: "footer.lang.en", fallback: "🇬🇧 English" },
      { key: "footer.lang.zh", fallback: "🇨🇳 中文" },
      { key: "footer.lang.ja", fallback: "🇯🇵 日本語" },
      { key: "footer.lang.ko", fallback: "🇰🇷 한국어" },
      { key: "footer.lang.th", fallback: "🇹🇭 ไทย" },
    ],
  },
];

const HomeFooter: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Box
      component="footer"
      sx={{
        // footer — verbatim
        padding: "24px 20px 28px",
        background: "rgba(126, 30, 46, 0.05)",
        borderTop: "1px solid rgba(184, 92, 60, 0.15)",
      }}
    >
      {/* .brand-row */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        {/* .brand-name */}
        <Typography
          sx={{
            fontFamily: SERIF,
            fontStyle: "italic",
            fontWeight: 500,
            fontSize: "20px",
            background: "linear-gradient(90deg, #FE0944, #FE7A52)",
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          {t("hero.brand", "SunRed")}
        </Typography>

        {/* .socials — MUI icons per Round 15 no-emoji standard */}
        <Box sx={{ display: "flex", gap: "8px" }}>
          {SOCIALS.map(({ Icon, label }) => (
            <Box
              key={label}
              role="button"
              aria-label={label}
              sx={{
                width: "32px",
                height: "32px",
                borderRadius: "50%",
                background: "rgba(254, 9, 68, 0.08)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FE0944",
                cursor: "pointer",
                transition: "background 0.2s ease, transform 0.2s ease",
                "&:hover": {
                  background: "rgba(254, 9, 68, 0.16)",
                  transform: "translateY(-1px)",
                },
              }}
            >
              <Icon sx={{ fontSize: 16 }} />
            </Box>
          ))}
        </Box>
      </Box>

      {/* .links — 2-col grid per mockup */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "16px",
          marginBottom: "18px",
        }}
      >
        {COLS.map((col) => (
          <Box key={col.titleKey}>
            {/* .col h4 */}
            <Typography
              component="h4"
              sx={{
                fontFamily: SANS,
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.15em",
                color: "#b85c3c",
                fontWeight: 700,
                marginBottom: "8px",
              }}
            >
              {t(col.titleKey, col.titleFallback)}
            </Typography>
            {col.links.map((link) => (
              <Box
                key={link.key}
                component="a"
                href="#"
                sx={{
                  display: "block",
                  fontFamily: SANS,
                  fontSize: "12px",
                  color: "rgba(60, 30, 20, 0.72)",
                  textDecoration: "none",
                  marginBottom: "6px",
                  "&:hover": { color: "#FE0944" },
                }}
              >
                {t(link.key, link.fallback)}
              </Box>
            ))}
          </Box>
        ))}
      </Box>

      {/* .legal */}
      <Box
        sx={{
          fontFamily: SANS,
          fontSize: "10px",
          color: "rgba(60, 30, 20, 0.72)",
          lineHeight: 1.5,
          borderTop: "1px solid rgba(184, 92, 60, 0.15)",
          paddingTop: "12px",
        }}
      >
        <Box component="strong" sx={{ color: "#2a1a14", fontWeight: 700 }}>
          {t("footer.legal.org", "SunRed Wellness Co., Ltd.")}
        </Box>
        <br />
        {t(
          "footer.legal.licensing",
          "All therapists hold valid Thai Ministry of Public Health licenses (ผ.พ.)."
        )}
        <br />
        {t(
          "footer.legal.location",
          "Bangkok, Thailand · Licensed wellness service."
        )}

        {/* .legal-row */}
        <Box sx={{ display: "flex", gap: "12px", marginTop: "6px" }}>
          {[
            { key: "footer.terms", fallback: "Terms" },
            { key: "footer.privacy", fallback: "Privacy" },
            { key: "footer.cookies", fallback: "Cookies" },
          ].map((l) => (
            <Box
              key={l.key}
              component="a"
              href="#"
              sx={{
                color: "#b85c3c",
                textDecoration: "none",
                fontWeight: 600,
              }}
            >
              {t(l.key, l.fallback)}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default HomeFooter;
