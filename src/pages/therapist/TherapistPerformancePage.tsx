// src/pages/therapist/TherapistPerformancePage.tsx
//
// 🆕 Round 28x.96 (founder: "เพิ่ม สรุปผลงาน กดเข้าไปดู Industry benchmark
//   Rebook timing เหมือนรูป2 หน้าเว็บ") — the founder's "รูป 2" is the public
//   website's own Loyalty tab (src/components/therapist/detail/
//   TherapistProfileTabs.tsx → LoyaltyTab). Originally reused verbatim here.
//
// 🆕 Round 28x.106 (founder: "Loyalty ปรับให้เข้ากับสไตล์ของ Performance") —
//   swapped for TherapistLoyaltyCard, a page-local component with the SAME
//   data + math as LoyaltyTab (copied deliberately, see that file's header)
//   but restyled to match the vivid rose treatment RevenueDashboard uses,
//   instead of LoyaltyTab's own olive/plain-ink accents. LoyaltyTab itself
//   is untouched — it's still what customers see on the public detail page,
//   and that page's design wasn't asked to change.
//
// 🆕 Round 28x.100 (founder: "Loyalty ไม่ขึ้นจ่ะ") — the stats FEEDING that
//   component are deliberately NOT the same hook the public page uses.
//   useTherapistBookingStats queries `where("therapistId", "==", <slug>)`;
//   firestore.rules can only grant a therapist access to her own bookings via
//   `therapistUid == request.auth.uid`, so that query silently permission-
//   denied for a real signed-in therapist too (same wall the public page
//   hits for anonymous visitors — expected THERE, a bug HERE) and always
//   rendered the empty "coming soon" state, even for a therapist with 90+
//   real unique guests. useTherapistOwnBookingStats queries by therapistUid
//   instead — same computeBookingStats math, a query the rules actually
//   permit for her own session. See that hook's header for the full story.

import React from "react";
import { Box, Typography, CircularProgress, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { CaretLeft } from "phosphor-react";

import { auth } from "@/lib/firebase";
import { responsiveShell } from "@/theme/breakpoints";
import { useTherapistSelf } from "@/hooks/useTherapistSelf";
import { useTherapistOwnBookingStats } from "@/hooks/useTherapistOwnBookingStats";
import { TherapistLoyaltyCard } from "@/components/therapist/TherapistLoyaltyCard";
import { RevenueDashboard } from "@/components/therapist/RevenueDashboard";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS = '"Inter", system-ui, sans-serif';

const TherapistPerformancePage: React.FC = () => {
  const navigate = useNavigate();
  const { therapist, loading } = useTherapistSelf();
  const uid = auth.currentUser?.uid;
  const stats = useTherapistOwnBookingStats(uid);

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
          {/* 🆕 Round 28x.98 (founder: "แถบ Dashboard เพิ่ม Lifetime Revenue...") —
              her own revenue dashboard sits above Loyalty: what she earned
              matters more than what guests think of her, and it's the first
              money figure she should see on open, same as View's own
              Dashboard leads with Lifetime Revenue. */}
          <Typography sx={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: "var(--sr-ink)", mb: 1.5 }}>
            Dashboard · แดชบอร์ดรายได้
          </Typography>
          <RevenueDashboard uid={uid} />

          <Typography sx={{ fontFamily: SERIF, fontSize: 15, fontWeight: 700, color: "var(--sr-ink)", mt: 3.5, mb: 1.5 }}>
            Loyalty · ความภักดีของลูกค้า
          </Typography>
          <TherapistLoyaltyCard
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
