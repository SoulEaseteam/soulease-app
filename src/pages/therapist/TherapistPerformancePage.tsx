// src/pages/therapist/TherapistPerformancePage.tsx
//
// 🆕 Round 28x.96 (founder: "เพิ่ม สรุปผลงาน กดเข้าไปดู Industry benchmark
//   Rebook timing เหมือนรูป2 หน้าเว็บ") — the founder's "รูป 2" is the public
//   website's own Loyalty tab (src/components/therapist/detail/
//   TherapistProfileTabs.tsx → LoyaltyTab), already live on every therapist's
//   public detail page. Reused verbatim here — same component, same real
//   Firestore aggregates (useTherapistBookingStats), just scoped to HER OWN
//   id instead of a route param — so this can never drift from what
//   customers actually see.

import React from "react";
import { Box, Typography, CircularProgress, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { CaretLeft } from "phosphor-react";

import { responsiveShell } from "@/theme/breakpoints";
import { useTherapistSelf } from "@/hooks/useTherapistSelf";
import { useTherapistBookingStats } from "@/hooks/useTherapistBookingStats";
import { LoyaltyTab } from "@/components/therapist/detail/TherapistProfileTabs";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';

const TherapistPerformancePage: React.FC = () => {
  const navigate = useNavigate();
  const { therapist, therapistDocId, loading } = useTherapistSelf();
  const stats = useTherapistBookingStats(therapistDocId);

  return (
    <Box sx={{ ...responsiveShell, minHeight: "100vh", background: "var(--sr-bg)", pb: 8 }}>
      <Box sx={{ display: "flex", alignItems: "center", px: 1, pt: 2, pb: 1.5 }}>
        <Button onClick={() => navigate("/therapist/home")} sx={{ minWidth: 0, p: 1, color: "var(--sr-ink)" }}>
          <CaretLeft size={22} />
        </Button>
        <Typography sx={{ flex: 1, textAlign: "center", fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: "var(--sr-ink)", mr: 5 }}>
          สรุปผลงาน · Performance
        </Typography>
      </Box>

      {loading || stats.loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
          <CircularProgress sx={{ color: "#D97C95" }} />
        </Box>
      ) : !therapist ? (
        <Box sx={{ padding: "40px 24px", textAlign: "center" }}>
          <Typography sx={{ fontFamily: SERIF, fontSize: "18px", fontWeight: 600, color: "var(--sr-ink)" }}>
            Therapist profile not found
          </Typography>
        </Box>
      ) : (
        <Box sx={{ px: 2 }}>
          <LoyaltyTab
            rebookPct={therapist.rebookRate ?? 0}
            totalSessions={stats.totalCompleted}
            loyaltyStats={{
              totalCompleted: stats.totalCompleted,
              uniqueCustomers: stats.uniqueCustomers,
              repeatCustomers: stats.repeatCustomers,
              repeatPct: stats.repeatPct,
              avgSessions: stats.avgSessions,
              timingBuckets: stats.timingBuckets,
            }}
          />
          <Typography sx={{ fontFamily: SANS, fontSize: 11, color: "var(--sr-muted)", mt: 2.5, textAlign: "center", lineHeight: 1.5 }}>
            ตัวเลขเดียวกับที่ลูกค้าเห็นในหน้าโปรไฟล์สาธารณะของคุณ
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default TherapistPerformancePage;
