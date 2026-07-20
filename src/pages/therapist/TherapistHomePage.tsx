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

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface QuickTileDef {
  id: string;
  label: string;
  sub: string;
  Icon: React.ElementType;
  to: string;
  accent: string;
  badge?: number;
}

const QuickTile: React.FC<QuickTileDef & { onClick: () => void }> = ({ label, sub, Icon, accent, badge, onClick }) => (
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
      background: "var(--sr-panel)",
      border: "1px solid rgba(184,92,60,0.18)",
      boxShadow: "0 6px 18px rgba(15, 23, 42,0.06)",
      cursor: "pointer",
      "&:active": { background: "var(--sr-panel-2)" },
    }}
  >
    {badge !== undefined && badge > 0 && (
      <Box
        sx={{
          position: "absolute", top: 10, right: 10,
          minWidth: 20, height: 20, px: "5px", borderRadius: "10px",
          background: "#C0562E", color: "#fff",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontFamily: SANS, fontSize: 11, fontWeight: 800,
        }}
      >
        {badge}
      </Box>
    )}
    <Box
      sx={{
        width: 36, height: 36, borderRadius: "10px", flexShrink: 0,
        background: `${accent}24`, color: accent,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <Icon size={18} weight="duotone" />
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
);

const TherapistHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { therapist, loading } = useTherapistSelf();

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

  const tiles: QuickTileDef[] = [
    {
      id: "reports",
      label: "รายการรีพอร์ต · Reports",
      sub: openReportCount > 0 ? `${openReportCount} รายการยังไม่ได้อ่าน` : "แจ้งจากลูกค้าจะขึ้นที่นี่",
      Icon: Flag,
      to: "/therapist/reports",
      accent: "#D97C95",
      badge: openReportCount,
    },
    {
      id: "performance",
      label: "สรุปผลงาน · Performance",
      sub: "Industry benchmark · Rebook timing",
      Icon: ChartLineUp,
      to: "/therapist/performance",
      accent: "#4E7E8C",
    },
    {
      id: "gallery",
      label: "แกลเลอรี · Gallery",
      sub: "สูงสุด 9 รูป · รอแอดมินตรวจก่อนขึ้นจริง",
      Icon: GalleryTileIcon,
      to: "/therapist/gallery",
      accent: "#C96F89",
    },
    {
      id: "services",
      label: "บริการที่ทำได้ · Services",
      sub: "เลือกบริการที่เปิดรับ",
      Icon: ListChecks,
      to: "/therapist/services",
      accent: "#16a34a",
    },
    {
      id: "features",
      label: "ลักษณะเฉพาะตัว · Features",
      sub: "ส่วนสูง น้ำหนัก รูปร่าง ฯลฯ",
      Icon: Fingerprint,
      to: "/therapist/features",
      accent: "#7A3049",
    },
    {
      id: "languages",
      label: "ภาษา · Languages",
      sub: "ภาษาที่พูดได้ + ระดับ",
      Icon: Translate,
      to: "/therapist/languages",
      accent: "#5A8998",
    },
    {
      id: "bio",
      label: "ประวัติแนะนำ · Bio",
      sub: "เขียนแนะนำตัว ทีละภาษา",
      Icon: Notebook,
      to: "/therapist/bio",
      accent: "#B8823C",
    },
    {
      id: "payout",
      label: "บัญชีธนาคาร · Payout",
      sub: "บัญชีรับเงินสำหรับโอน",
      Icon: Bank,
      to: "/therapist/payout",
      accent: "#831843",
    },
  ];

  return (
    <Box sx={{ ...responsiveShell, minHeight: "100vh", background: "var(--sr-bg)", paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))", fontFamily: SANS }}>
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
