// src/components/home/HomeBelowSections.tsx
// Below-grid sections เพื่อสร้าง trust + reduce hesitation
// ใช้บน HomePage ใต้ therapist grid
import React from "react";
import { Box, Typography, Stack, Avatar, Chip } from "@mui/material";
import { Link } from "react-router-dom";
import {
  Search,
  Calendar,
  Sparkles,
  Quote,
  Shield,
  ArrowRight,
} from "lucide-react";

// =========================
// Section 1: How it works
// =========================
const HOW_STEPS = [
  {
    n: "01",
    icon: <Search size={22} color="#FE0944" />,
    title: "Choose",
    titleTh: "เลือกนักนวด",
    desc: "Browse verified therapists with live availability and real reviews",
  },
  {
    n: "02",
    icon: <Calendar size={22} color="#FE0944" />,
    title: "Book",
    titleTh: "จอง",
    desc: "Select service, time, and location — pricing shown upfront",
  },
  {
    n: "03",
    icon: <Sparkles size={22} color="#FE0944" />,
    title: "Relax",
    titleTh: "ผ่อนคลาย",
    desc: "Therapist arrives at your door in 30–60 minutes",
  },
];

const HowItWorks: React.FC = () => (
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
      How It Works
    </Typography>
    <Typography
      sx={{
        fontSize: 22,
        textAlign: "center",
        fontWeight: 700,
        mb: 3,
        color: "#0F172A",
      }}
    >
      จองง่ายใน 3 ขั้น
    </Typography>

    <Stack spacing={1.5} sx={{ maxWidth: 430, mx: "auto" }}>
      {HOW_STEPS.map((s, i) => (
        <Stack
          key={s.n}
          direction="row"
          spacing={2}
          alignItems="center"
          sx={{
            p: 2,
            borderRadius: 3,
            background: "#fff",
            border: "1px solid #F1F5F9",
            position: "relative",
            transition: "all 0.2s ease",
            "&:hover": {
              transform: "translateX(4px)",
              boxShadow: "0 6px 20px rgba(254,9,68,0.08)",
            },
          }}
        >
          <Box
            sx={{
              minWidth: 56,
              height: 56,
              borderRadius: 2,
              background: "linear-gradient(135deg, rgba(254,9,68,0.08), rgba(254,174,150,0.08))",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Typography sx={{ fontSize: 11, color: "#FE0944", fontWeight: 700 }}>
              {s.n}
            </Typography>
            {s.icon}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#0F172A" }}>
              {s.title} · {s.titleTh}
            </Typography>
            <Typography sx={{ fontSize: 12, color: "#64748B", mt: 0.3 }}>
              {s.desc}
            </Typography>
          </Box>
        </Stack>
      ))}
    </Stack>
  </Box>
);

// =========================
// Section 2: Reviews
// =========================
const REVIEWS = [
  {
    name: "Daniel · Singapore",
    rating: 5,
    text: "Professional, on time, exactly as advertised. Therapist was excellent — booked at my Marriott and she arrived in 25 minutes.",
    flag: "🇸🇬",
  },
  {
    name: "Hiroshi · 日本",
    rating: 5,
    text: "深夜なのに迅速に対応してもらえました。マッサージも本格的で大満足。チャイナタウンの近くから30分で到着。",
    flag: "🇯🇵",
  },
  {
    name: "Wang · 中国",
    rating: 5,
    text: "服务非常专业,网站有中文支持很方便。30分钟到酒店,价格透明,推荐!",
    flag: "🇨🇳",
  },
  {
    name: "คุณนัท · กรุงเทพ",
    rating: 5,
    text: "บริการสุภาพ ตรงเวลา จองผ่านเว็บ 5 นาทีเสร็จ ไม่ต้องคุยทาง LINE ให้วุ่นวาย แนะนำเลยครับ",
    flag: "🇹🇭",
  },
  {
    name: "James · UK",
    rating: 5,
    text: "Best outcall service in Bangkok. Verified therapists, transparent pricing, English support — exactly what I needed.",
    flag: "🇬🇧",
  },
];

const ReviewsCarousel: React.FC = () => (
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
      Real Reviews
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
      ลูกค้าจริง · จากทั่วโลก
    </Typography>
    <Typography
      sx={{ fontSize: 13, textAlign: "center", color: "#64748B", mb: 3 }}
    >
      4.8 / 5 average · 350+ verified reviews
    </Typography>

    {/* horizontal scrollable carousel */}
    <Box
      sx={{
        display: "flex",
        gap: 1.5,
        overflowX: "auto",
        pb: 2,
        px: 1,
        scrollSnapType: "x mandatory",
        WebkitOverflowScrolling: "touch",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      {REVIEWS.map((r, i) => (
        <Box
          key={i}
          sx={{
            flex: "0 0 280px",
            scrollSnapAlign: "start",
            p: 2,
            borderRadius: 3,
            background: "#fff",
            border: "1px solid #F1F5F9",
            position: "relative",
          }}
        >
          <Quote
            size={20}
            color="#FE0944"
            style={{ opacity: 0.25, position: "absolute", top: 12, right: 12 }}
          />
          <Typography sx={{ fontSize: 14, color: "#374151", lineHeight: 1.5 }}>
            "{r.text}"
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center" mt={2}>
            <Avatar sx={{ width: 28, height: 28, fontSize: 16 }}>{r.flag}</Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                {r.name}
              </Typography>
              <Typography sx={{ fontSize: 11, color: "#FBBF24" }}>
                {"★".repeat(r.rating)}
              </Typography>
            </Box>
          </Stack>
        </Box>
      ))}
    </Box>
  </Box>
);

// =========================
// Section 3: Trusted by hotels
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
// Section 4: Quick links footer
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
    <HowItWorks />
    <ReviewsCarousel />
    <TrustedByHotels />
    <QuickLinks />
  </>
);

export default HomeBelowSections;
