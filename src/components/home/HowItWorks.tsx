// src/components/home/HowItWorks.tsx
//
// 🎨 Phase 1 Home — How It Works (pixel-perfect port of `.section + .steps`).
// Eyebrow + h2 + lead, then 3 numbered steps with red→coral gradient circles.
//
// Verbatim CSS from sunred-home1.html:
//   .section { padding: 36px 20px 8px; }
//   .section-eyebrow { font-size: 10px; letter-spacing: 0.2em; ... }
//   .section h2 { font-size: 28px; font-family: Fraunces; ... }
//   .section .lead { font-size: 13.5px; color: rgba(60,30,20,0.72); }
//   .steps { display: flex; flex-direction: column; gap: 12px; padding: 0 20px 28px; }
//   .step { padding: 14px 16px; border-radius: 16px; ... }
//   .step-num { width: 36px; height: 36px; gradient + shadow ... }

import React from "react";
import { Box, Typography } from "@mui/material";
import { useTranslation } from "react-i18next";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

const STEPS = [1, 2, 3] as const;

const HowItWorks: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Box>
      {/* .section — verbatim */}
      <Box
        sx={{
          padding: "36px 20px 8px",
          position: "relative",
        }}
      >
        {/* .section-eyebrow — verbatim with ::before line */}
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
          {t("home.howItWorks.eyebrow", "How it works")}
        </Box>

        {/* .section h2 — verbatim with em accent */}
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
          {t("home.howItWorks.title.pre", "Three steps to ")}
          <em>{t("home.howItWorks.title.em", "restoration")}</em>
        </Typography>

        {/* .section .lead — verbatim */}
        <Box
          component="p"
          sx={{
            fontFamily: SANS,
            fontSize: "13.5px",
            color: "rgba(60, 30, 20, 0.72)",
            lineHeight: 1.55,
            marginBottom: "20px",
          }}
        >
          {t(
            "home.howItWorks.lead",
            "Booked in 60 seconds. Therapist at your door in under an hour."
          )}
        </Box>
      </Box>

      {/* .steps — verbatim */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "0 20px 28px",
        }}
      >
        {STEPS.map((n) => (
          <Box
            key={n}
            sx={{
              // .step — verbatim
              display: "flex",
              gap: "14px",
              alignItems: "flex-start",
              padding: "14px 16px",
              background: "rgba(255, 255, 255, 0.55)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.7)",
              borderRadius: "16px",
              boxShadow: "0 4px 16px rgba(254, 9, 68, 0.05)",
            }}
          >
            {/* .step-num — verbatim */}
            <Box
              sx={{
                width: "36px",
                height: "36px",
                flexShrink: 0,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #FE0944, #FE7A52)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: "16px",
                boxShadow: "0 4px 12px rgba(254, 9, 68, 0.3)",
              }}
            >
              {n}
            </Box>

            <Box>
              {/* .step-content h3 */}
              <Typography
                component="h3"
                sx={{
                  fontFamily: SERIF,
                  fontWeight: 500,
                  fontSize: "15px",
                  color: "#2a1a14",
                  marginBottom: "3px",
                }}
              >
                {t(
                  `home.howItWorks.step${n}.title`,
                  n === 1
                    ? "Choose your therapist"
                    : n === 2
                    ? "Set your time & place"
                    : "Restore in your space"
                )}
              </Typography>
              {/* .step-content p */}
              <Box
                component="p"
                sx={{
                  fontFamily: SANS,
                  fontSize: "12px",
                  color: "rgba(60, 30, 20, 0.72)",
                  lineHeight: 1.5,
                }}
              >
                {t(
                  `home.howItWorks.step${n}.body`,
                  n === 1
                    ? "Browse licensed therapists by specialty, language, and availability nearby."
                    : n === 2
                    ? "Hotel, residence, or villa — anywhere in central Bangkok. 60 to 120-minute sessions."
                    : "Therapist arrives with full equipment. Pay securely. Rate & rebook your favorite."
                )}
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default HowItWorks;
