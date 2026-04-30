// src/components/therapist/TherapistMap.tsx
//
// 🎨 Phase 2 — Map view stub (verbatim port of `.map-mode` + floating card).
// Static SVG placeholder per ROADMAP — real map (Leaflet / Google Maps) wires
// in later. Pins use the same gradient colors as therapist photo cards.

import React from "react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

const TherapistMap: React.FC = () => {
  const { t } = useTranslation();

  return (
    <>
      {/* "Or browse by location ↓" eyebrow */}
      <Box sx={{ padding: "0 14px" }}>
        <Box
          sx={{
            fontSize: "10px",
            color: "#b85c3c",
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            margin: "8px 4px",
            fontFamily: SANS,
          }}
        >
          {t("browse.map.eyebrow", "Or browse by location")} ↓
        </Box>
      </Box>

      {/* .map-mode — verbatim */}
      <Box
        sx={{
          position: "relative",
          height: "380px",
          background: "linear-gradient(180deg, #F8E8DC 0%, #F0DCC8 100%)",
          margin: "0 14px 14px",
          borderRadius: "18px",
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.7)",
          boxShadow: "inset 0 0 40px rgba(254, 9, 68, 0.05)",
          // grid pattern overlay
          "&::before": {
            content: '""',
            position: "absolute",
            inset: 0,
            backgroundImage: [
              "linear-gradient(rgba(184, 92, 60, 0.08) 1px, transparent 1px)",
              "linear-gradient(90deg, rgba(184, 92, 60, 0.08) 1px, transparent 1px)",
            ].join(", "),
            backgroundSize: "30px 30px",
          },
        }}
      >
        {/* "you are here" pulse */}
        <Box
          aria-label="your location"
          sx={{
            position: "absolute",
            top: "55%",
            left: "48%",
            width: "14px",
            height: "14px",
            borderRadius: "50%",
            background: "#1d9bf0",
            boxShadow:
              "0 0 0 4px rgba(29, 155, 240, 0.3), 0 0 16px rgba(29, 155, 240, 0.6)",
            zIndex: 3,
          }}
        />

        {/* pins p1-p4 */}
        {[
          { id: "p1", top: "30%", left: "30%", bg: "linear-gradient(135deg, #d4a574, #8b6f47)" },
          { id: "p2", top: "25%", left: "65%", bg: "linear-gradient(135deg, #e8c4a0, #c89968)" },
          { id: "p3", top: "60%", left: "70%", bg: "linear-gradient(135deg, #c89c7a, #6b4a2f)", active: true },
          { id: "p4", top: "70%", left: "25%", bg: "linear-gradient(135deg, #f4d4b4, #d4a574)" },
        ].map((p) => (
          <Box
            key={p.id}
            sx={{
              position: "absolute",
              top: p.top,
              left: p.left,
              width: p.active ? "50px" : "36px",
              height: p.active ? "50px" : "36px",
              borderRadius: "50%",
              background: p.bg,
              border: "3px solid #fff",
              boxShadow: p.active
                ? "0 6px 20px rgba(254, 9, 68, 0.6)"
                : "0 4px 12px rgba(254, 9, 68, 0.4)",
              cursor: "pointer",
              zIndex: p.active ? 4 : 2,
              overflow: "hidden",
              backgroundSize: "cover",
              ...(p.active && {
                "&::after": {
                  content: '"★ 4.9"',
                  position: "absolute",
                  bottom: "-6px",
                  left: "50%",
                  transform: "translateX(-50%)",
                  background: "#fff",
                  color: "#FE0944",
                  fontSize: "9px",
                  fontWeight: 800,
                  padding: "2px 6px",
                  borderRadius: "99px",
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
                  fontFamily: SANS,
                },
              }),
            }}
          />
        ))}

        {/* .map-card-floating */}
        <Box
          sx={{
            position: "absolute",
            bottom: "14px",
            left: "14px",
            right: "14px",
            padding: "10px",
            background: "rgba(255, 255, 255, 0.92)",
            backdropFilter: "blur(30px)",
            WebkitBackdropFilter: "blur(30px)",
            borderRadius: "14px",
            boxShadow: "0 8px 24px rgba(126, 30, 46, 0.2)",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            zIndex: 5,
          }}
        >
          {/* .pic */}
          <Box
            sx={{
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #c89c7a, #6b4a2f)",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
            }}
          />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: "14px",
                color: "#2a1a14",
                lineHeight: 1.1,
                marginBottom: "2px",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              Nan, 31{" "}
              <Box
                component="span"
                sx={{
                  width: "14px",
                  height: "14px",
                  background: "#1d9bf0",
                  color: "#fff",
                  borderRadius: "50%",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "8px",
                  fontFamily: SANS,
                }}
              >
                ✓
              </Box>
            </Box>
            <Box
              sx={{
                fontFamily: SANS,
                fontSize: "10.5px",
                color: "rgba(60, 30, 20, 0.72)",
                lineHeight: 1.3,
              }}
            >
              ★ 4.8 · 3.1 km · Sport · Deep tissue
            </Box>
          </Box>
          <Box
            sx={{
              fontFamily: SERIF,
              fontWeight: 600,
              fontSize: "14px",
              color: "#FE0944",
              flexShrink: 0,
              textAlign: "right",
            }}
          >
            ฿2,200
            <Box
              component="small"
              sx={{
                fontFamily: SANS,
                fontWeight: 500,
                fontSize: "9px",
                color: "rgba(60, 30, 20, 0.72)",
                display: "block",
                marginTop: "1px",
              }}
            >
              /60min
            </Box>
          </Box>
        </Box>
      </Box>
    </>
  );
};

export default TherapistMap;
