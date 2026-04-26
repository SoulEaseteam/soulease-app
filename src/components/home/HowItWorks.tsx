// src/components/home/HowItWorks.tsx
// 3-step "Choose · Book · Relax" visual — ใช้บน ServicesPage แทน FAQ
import React from "react";
import { Box, Typography, Stack } from "@mui/material";
import { Search, Calendar, Sparkles } from "lucide-react";

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
  <Box sx={{ mt: 4, mb: 5, px: 2 }}>
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
      {HOW_STEPS.map((s) => (
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
              background:
                "linear-gradient(135deg, rgba(254,9,68,0.08), rgba(254,174,150,0.08))",
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

export default HowItWorks;
