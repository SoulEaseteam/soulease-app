// src/components/home/FAQ.tsx
//
// 🎨 Phase 1 Home — FAQ (pixel-perfect port of `.faq-list`).
// 6 collapsible question rows with red `+` toggle.
//
// Verbatim CSS from sunred-home1.html:
//   .faq-list { padding: 0 20px 28px; gap: 8px; }
//   .faq-item { background: rgba(255,255,255,0.55); blur(20px); border-radius: 14px; padding: 14px 16px; }
//   .faq-q { display: flex; justify-content: space-between; ... }
//   .faq-q .arrow { color: #FE0944; font-size: 16px; }

import React, { useState } from "react";
import { Box, Typography, Collapse } from "@mui/material";
import { useTranslation } from "react-i18next";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

const FAQ_IDS = ["arrival", "licensed", "equipment", "hotels", "payments", "languages"] as const;

const FAQ: React.FC = () => {
  const { t } = useTranslation();
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <Box>
      {/* .section */}
      <Box sx={{ padding: "36px 20px 8px", position: "relative" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "10px",
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#b85c3c",
            fontWeight: 700,
            marginBottom: "6px",
            fontFamily: SANS,
            "&::before": {
              content: '""',
              width: "16px",
              height: "1px",
              background: "rgba(184, 92, 60, 0.5)",
            },
          }}
        >
          {t("home.faq.eyebrow", "Common questions")}
        </Box>

        <Typography
          component="h2"
          sx={{
            fontFamily: SERIF,
            fontWeight: 400,
            fontSize: "28px",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            color: "#2a1a14",
            marginBottom: "8px",
            "& em": { fontStyle: "italic", color: "#FE0944" },
          }}
        >
          {t("home.faq.title.pre", "Good to ")}
          <em>{t("home.faq.title.em", "know")}</em>
          {t("home.faq.title.tail", ".")}
        </Typography>
      </Box>

      {/* .faq-list — verbatim */}
      <Box
        sx={{
          padding: "0 20px 28px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        {FAQ_IDS.map((id) => {
          const open = openId === id;
          return (
            <Box
              key={id}
              role="button"
              tabIndex={0}
              onClick={() => setOpenId(open ? null : id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setOpenId(open ? null : id);
                }
              }}
              aria-expanded={open}
              sx={{
                // .faq-item — verbatim
                background: "rgba(255, 255, 255, 0.55)",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.7)",
                borderRadius: "14px",
                padding: "14px 16px",
                cursor: "pointer",
              }}
            >
              {/* .faq-q */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#2a1a14",
                  fontFamily: SANS,
                }}
              >
                <Box component="span">{t(`home.faq.${id}.q`, defaultQ(id))}</Box>
                {/* .arrow */}
                <Box
                  component="span"
                  aria-hidden
                  sx={{
                    color: "#FE0944",
                    fontSize: "16px",
                    fontWeight: 400,
                    transition: "transform 0.2s ease",
                    transform: open ? "rotate(45deg)" : "rotate(0deg)",
                  }}
                >
                  +
                </Box>
              </Box>

              <Collapse in={open} timeout={220}>
                <Box
                  component="p"
                  sx={{
                    marginTop: "10px",
                    fontFamily: SANS,
                    fontSize: "12.5px",
                    lineHeight: 1.55,
                    color: "rgba(60, 30, 20, 0.72)",
                  }}
                >
                  {t(`home.faq.${id}.a`, defaultA(id))}
                </Box>
              </Collapse>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

function defaultQ(id: string): string {
  switch (id) {
    case "arrival": return "How quickly can a therapist arrive?";
    case "licensed": return "Are therapists really licensed?";
    case "equipment": return "Do they bring equipment?";
    case "hotels": return "Which hotels do you serve?";
    case "payments": return "How do payments work?";
    case "languages": return "What languages are supported?";
    default: return "";
  }
}
function defaultA(id: string): string {
  switch (id) {
    case "arrival":
      return "Average arrival is under 60 minutes anywhere in central Bangkok. Live ETA shown at booking.";
    case "licensed":
      return "Yes — every practitioner holds a current Thai Ministry of Public Health licence (ผ.พ.) and is recertified annually.";
    case "equipment":
      return "Yes. Therapists arrive with portable table, fresh linens, oils, and amenities.";
    case "hotels":
      return "Most central Bangkok hotels including Mandarin Oriental, Anantara, Park Hyatt, St. Regis, and serviced residences.";
    case "payments":
      return "Pay in-app with card, WeChat Pay, AliPay, PromptPay, or cash on arrival. No tipping required.";
    case "languages":
      return "English, 中文, 日本語, 한국어, and ไทย — both in-app and via 24/7 multilingual concierge.";
    default: return "";
  }
}

export default FAQ;
