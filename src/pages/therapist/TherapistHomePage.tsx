// src/pages/therapist/TherapistHomePage.tsx
//
// 🆕 Round 28x.87 (founder reference screenshots of a competitor's "หน้าทำงาน"
//   dashboard + "อยากได้ 3 แท็บแบบภาพอ้างอิง") — a genuine home/dashboard tab
//   for staff, closing the gap between the reference (Home · Jobs · Chat ·
//   Profile) and what StaffLayout had (Jobs · Profile only). Chat stays out —
//   already declined earlier this session as a big, separate feature.
//
// 🆕 Round 28x.96 (founder: "ย้ายหน้าทำงาน ไปไว้ที่โปรไฟล์" · "ข้อความ หน้าทำงาน
//   สู้ๆ นะวันนี้ เอาออก" · quick-menu additions) — Working Status + Working
//   Hours move BACK to Profile (see TherapistProfilePage), and the greeting
//   header is gone. Home is now a pure quick-menu dashboard, matching the
//   founder's original reference screenshots (status card lives elsewhere;
//   Home = icon grid) more closely than the 28x.87 version did. Grid now
//   carries the tiles the founder called out of scope back in 28x.87
//   (self-service Services/Features/Languages/Bio/Gallery) now that she's
//   asked for them explicitly, plus a new สรุปผลงาน tile reusing the exact
//   same Loyalty/benchmark panel already live on the public website.

import React, { useEffect, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Flag,
  ChartLineUp,
  Image as GalleryTileIcon,
  ListChecks,
  Fingerprint,
  Translate,
  Notebook,
  Bank,
} from "phosphor-react";
import { collection, onSnapshot, query, where } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { responsiveShell } from "@/theme/breakpoints";
import { useTherapistSelf } from "@/hooks/useTherapistSelf";
import { useTherapistIdentityStats } from "@/hooks/useTherapistIdentityStats";
import TherapistIdentityCard from "@/components/therapist/TherapistIdentityCard";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface QuickTileDef {
  id: string;
  label: string;
  sub: string;
  Icon: React.ElementType;
  to: string;
  accent: string;
  accentTo: string;
  badge?: number;
}

// 🆕 Round 28x.103 (founder: "ปรับ 2 หน้าที่เหลือ...ให้สวยงามเหมือนใช้ในไอโฟน") —
// the icon badge is now a "squircle" (continuous-corner rounded square) filled
// with the tile's own gradient, exactly the visual language iOS Settings /
// the Home Screen use for app icons — instantly reads as "native app", not
// "web page". Card itself now carries a faint wash of the same accent
// instead of every tile being identical flat white, and a spring tap-scale
// (framer-motion, matches the press feel already used on Jobs/Booking).
const QuickTile: React.FC<QuickTileDef & { onClick: () => void }> = ({ label, sub, Icon, accent, accentTo, badge, onClick }) => (
  <motion.div whileTap={{ scale: 0.96 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
    <Box
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "14px 14px 13px",
        borderRadius: 3,
        background: `linear-gradient(160deg, ${accent}14 0%, var(--sr-panel) 55%, var(--sr-panel) 100%)`,
        border: `1px solid ${accent}30`,
        boxShadow: `0 8px 18px ${accent}12`,
        cursor: "pointer",
      }}
    >
      {badge !== undefined && badge > 0 && (
        <Box
          sx={{
            position: "absolute", top: 10, right: 10,
            minWidth: 20, height: 20, px: "5px", borderRadius: "10px",
            background: "#DC2626", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: SANS, fontSize: 11, fontWeight: 800,
            boxShadow: "0 3px 8px rgba(220,38,38,0.40)",
          }}
        >
          {badge}
        </Box>
      )}
      <Box
        sx={{
          width: 38, height: 38, borderRadius: "11px", flexShrink: 0,
          background: `linear-gradient(135deg, ${accent}, ${accentTo})`,
          boxShadow: `0 4px 10px ${accent}4D`,
          color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <Icon size={19} weight="duotone" />
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: "13.5px", color: "var(--sr-ink)", lineHeight: 1.2 }}>
          {label}
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: "10px", color: "var(--sr-body)", mt: "2px", lineHeight: 1.3 }}>
          {sub}
        </Typography>
      </Box>
    </Box>
  </motion.div>
);

const TherapistHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { therapist, loading } = useTherapistSelf();
  // 🆕 28x.96 (founder: "เอาไปใส่หน้าทำงาน ให้มีเหมือนหน้าโปรไฟล์") — same
  // identity card as Profile, same shared hook, so the two can't disagree.
  const { reviewCount, computedStatus } = useTherapistIdentityStats(therapist);

  // 🆕 28x.87 — live count of her OPEN reports, for the Reports tile badge.
  const [openReportCount, setOpenReportCount] = useState(0);
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(collection(db, "reports"), where("therapistUid", "==", uid), where("status", "==", "open"));
    const unsub = onSnapshot(q, (snap) => setOpenReportCount(snap.size), () => setOpenReportCount(0));
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress sx={{ color: "#D97C95" }} />
      </Box>
    );
  }

  if (!therapist) {
    return (
      <Box sx={{ ...responsiveShell, padding: "40px 24px", textAlign: "center" }}>
        <Typography sx={{ fontFamily: SERIF, fontSize: "18px", fontWeight: 600, color: "var(--sr-ink)", marginBottom: 1 }}>
          Therapist profile not found
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: "13px", color: "var(--sr-muted)" }}>
          Please contact admin if this is unexpected.
        </Typography>
      </Box>
    );
  }

  // 🆕 Round 28x.103 — each tile gets its own true 2-stop gradient (accent →
  //   accentTo) instead of a single flat hex, 8 genuinely distinct vivid
  //   hues instead of 8 shades converging on the same dusty rose/maroon.
  const tiles: QuickTileDef[] = [
    {
      id: "reports",
      label: "รายการรีพอร์ต · Reports",
      sub: openReportCount > 0 ? `${openReportCount} รายการยังไม่ได้อ่าน` : "แจ้งจากลูกค้าจะขึ้นที่นี่",
      Icon: Flag,
      to: "/therapist/reports",
      accent: "#F0576B",
      accentTo: "#C81E3A",
      badge: openReportCount,
    },
    {
      id: "performance",
      label: "สรุปผลงาน · Performance",
      sub: "Industry benchmark · Rebook timing",
      Icon: ChartLineUp,
      to: "/therapist/performance",
      accent: "#0EA5C4",
      accentTo: "#0369A1",
    },
    {
      id: "gallery",
      label: "แกลเลอรี · Gallery",
      sub: "สูงสุด 9 รูป · รอแอดมินตรวจก่อนขึ้นจริง",
      Icon: GalleryTileIcon,
      to: "/therapist/gallery",
      accent: "#EC4899",
      accentTo: "#9D174D",
    },
    {
      id: "services",
      label: "บริการที่ทำได้ · Services",
      sub: "เลือกบริการที่เปิดรับ",
      Icon: ListChecks,
      to: "/therapist/services",
      accent: "#22C55E",
      accentTo: "#15803D",
    },
    {
      id: "features",
      label: "ลักษณะเฉพาะตัว · Features",
      sub: "ส่วนสูง น้ำหนัก รูปร่าง ฯลฯ",
      Icon: Fingerprint,
      to: "/therapist/features",
      accent: "#C2185B",
      accentTo: "#6B1541",
    },
    {
      id: "languages",
      label: "ภาษา · Languages",
      sub: "ภาษาที่พูดได้ + ระดับ",
      Icon: Translate,
      to: "/therapist/languages",
      accent: "#6366F1",
      accentTo: "#4338CA",
    },
    {
      id: "bio",
      label: "ประวัติแนะนำ · Bio",
      sub: "เขียนแนะนำตัว ทีละภาษา",
      Icon: Notebook,
      to: "/therapist/bio",
      accent: "#F0A020",
      accentTo: "#B45309",
    },
    {
      id: "payout",
      label: "บัญชีธนาคาร · Payout",
      sub: "บัญชีรับเงินสำหรับโอน",
      Icon: Bank,
      to: "/therapist/payout",
      accent: "#14B8A6",
      accentTo: "#0F766E",
    },
  ];

  return (
    <Box sx={{ ...responsiveShell, minHeight: "100vh", background: "var(--sr-bg)", paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))", fontFamily: SANS }}>
      <TherapistIdentityCard therapist={therapist} computedStatus={computedStatus} reviewCount={reviewCount} />

      <Box sx={{ paddingX: 2, paddingTop: 2.5 }}>
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1.25 }}>
          {tiles.map((tile) => (
            <QuickTile key={tile.id} {...tile} onClick={() => navigate(tile.to)} />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default TherapistHomePage;
