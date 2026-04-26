// src/components/home/HomeBelowSections.tsx
// Trust sections สำหรับ HomePage — เฉพาะที่ไม่ทับซ้อนกับเพจอื่น
//   - HowItWorks  → ย้ายไป ServicesPage แล้ว
//   - Reviews     → ใช้ LiveReviewsCarousel (ดึงจาก Firestore จริง)
//   - Hotels      → ใหม่ ไม่ทับซ้อน
//   - QuickLinks  → ใหม่ ไม่ทับซ้อน
import React from "react";
import { Box, Typography, Stack, Chip } from "@mui/material";
import { Link } from "react-router-dom";
import { Shield, ArrowRight } from "lucide-react";
import LiveReviewsCarousel from "./LiveReviewsCarousel";

// =========================
// Section: Trusted by Hotels
// =========================
const HOTELS = [
  "Mandarin Oriental",
  "Marriott Sukhumvit",
  "Sheraton Grande",
  "Banyan Tree",
  "Park Hyatt",
  "JW Marriott",
  "Lebua",
  "Westin Grande",
  "Sofitel So",
  "Capella",
];

const TrustedByHotels: React.FC = () => (
  <Box sx={{ mt: 6, mb: 5, px: 2 }}>
    <Typography
      sx={{
        fontSize: 11,
        letterSpacing: 4,
        textAlign: "center",
        color: "#FE0944",
        fontWeight: 700,
        mb: 1,
        textTransform: "uppercase",
      }}
    >
      Hotel Friendly
    </Typography>
    <Typography
      sx={{
        fontSize: 22,
        textAlign: "center",
        fontWeight: 700,
        mb: 0.5,
        color: "#0F172A",
      }}
    >
      Trusted by guests at
    </Typography>
    <Typography
      sx={{ fontSize: 13, textAlign: "center", color: "#64748B", mb: 3 }}
    >
      Bangkok's top hotels — discreet arrival, professional service
    </Typography>

    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 1,
        justifyContent: "center",
        maxWidth: 480,
        mx: "auto",
      }}
    >
      {HOTELS.map((h) => (
        <Chip
          key={h}
          label={h}
          sx={{
            bgcolor: "#fff",
            border: "1px solid #E5E7EB",
            color: "#475569",
            fontWeight: 600,
            fontSize: 12,
          }}
        />
      ))}
    </Box>

    <Stack
      direction="row"
      spacing={1}
      alignItems="center"
      justifyContent="center"
      mt={3}
    >
      <Shield size={14} color="#10B981" />
      <Typography sx={{ fontSize: 11, color: "#64748B" }}>
        Therapists carry ID — discreet check-in at any hotel
      </Typography>
    </Stack>
  </Box>
);

// =========================
// Section: Quick links footer
// =========================
const QuickLinks: React.FC = () => (
  <Box sx={{ mt: 8, mb: 4, px: 2 }}>
    <Box
      sx={{
        maxWidth: 480,
        mx: "auto",
        p: 3,
        borderRadius: 4,
        background:
          "linear-gradient(135deg, rgba(254,9,68,0.04), rgba(254,174,150,0.04))",
        border: "1px solid rgba(254,9,68,0.1)",
      }}
    >
      <Typography
        sx={{
          fontSize: 11,
          letterSpacing: 4,
          color: "#FE0944",
          fontWeight: 700,
          mb: 1.5,
          textTransform: "uppercase",
        }}
      >
        Explore
      </Typography>

      <Typography sx={{ fontSize: 12, color: "#64748B", fontWeight: 700, mt: 2 }}>
        Services
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.5}>
        {[
          { to: "/services/thai-massage", label: "Thai Traditional" },
          { to: "/services/aromatherapy", label: "Aromatherapy" },
          { to: "/services/oil-massage", label: "Oil Massage" },
          { to: "/services/foot-massage", label: "Foot Reflexology" },
        ].map((l) => (
          <Chip
            key={l.to}
            component={Link}
            to={l.to}
            label={l.label}
            clickable
            size="small"
            sx={{ fontSize: 12, bgcolor: "#fff" }}
          />
        ))}
      </Stack>

      <Typography sx={{ fontSize: 12, color: "#64748B", fontWeight: 700, mt: 2 }}>
        Areas served
      </Typography>
      <Stack direction="row" flexWrap="wrap" gap={0.5} mt={0.5}>
        {[
          { to: "/areas/sukhumvit", label: "Sukhumvit" },
          { to: "/areas/silom", label: "Silom · Sathorn" },
          { to: "/areas/asoke", label: "Asoke" },
        ].map((l) => (
          <Chip
            key={l.to}
            component={Link}
            to={l.to}
            label={l.label}
            clickable
            size="small"
            sx={{ fontSize: 12, bgcolor: "#fff" }}
          />
        ))}
      </Stack>

      <Stack
        direction="row"
        alignItems="center"
        spacing={0.5}
        mt={3}
        sx={{ color: "#FE0944", fontSize: 12, fontWeight: 700 }}
      >
        <Typography
          component={Link}
          to="/wechat-scan"
          sx={{
            fontSize: 12,
            fontWeight: 700,
            color: "#FE0944",
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          中文 WeChat 客服
        </Typography>
        <ArrowRight size={14} />
      </Stack>
    </Box>

    {/* Legal footer */}
    <Typography
      sx={{
        textAlign: "center",
        fontSize: 11,
        color: "#94A3B8",
        mt: 3,
        lineHeight: 1.6,
      }}
    >
      SUNRED · Outcall Massage Bangkok · 24/7
      <br />
      © {new Date().getFullYear()} SunRed. All rights reserved.
    </Typography>
  </Box>
);

// =========================
// Combined export
// =========================
const HomeBelowSections: React.FC = () => (
  <>
    {/* Reviews — ดึงจาก Firestore จริง (ซ่อน section อัตโนมัติถ้าไม่มี data) */}
    <LiveReviewsCarousel />
    {/* Hotel partners — unique to home, builds trust */}
    <TrustedByHotels />
    {/* Quick links — guides to SEO landing pages */}
    <QuickLinks />
  </>
);

export default HomeBelowSections;
