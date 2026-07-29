// src/pages/therapist/TherapistReportsPage.tsx
//
// 🆕 Round 28x.87 (founder: "รายการรีพอร์ต — รายงานปัญหา? อาจจะ ให้ฝั่งลูกค้า
//   คอมเพลนมาได้แล้วมาขึ้นเตือนพนักงาน" → "สร้างเลยตอนนี้") — the therapist side
//   of the customer "Report an issue" flow on BookingHistoryPage. Lists
//   `reports` where therapistUid == her own uid, newest first. Tapping an
//   OPEN report marks it acknowledged — Firestore rules only let her write
//   that one field on a report that's about her (see firestore.rules).
//
//   Deliberately shows NO customer identity — just when it was filed and
//   what it says, same privacy stance as the masked-until-accepted guest
//   name on her Jobs list. bookingId is stored on the report for admin
//   cross-reference but not resolved/shown here — keeps this page to one
//   Firestore listener, no per-report booking lookups.

import React, { useEffect, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Flag, CheckCircle } from "phosphor-react";
import { collection, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where, Timestamp } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { responsiveShell } from "@/theme/breakpoints";
import { fmtBKK } from "@/utils/time";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';
const ROSE = "#FF9999";

interface ReportDoc {
  id: string;
  message: string;
  status: "open" | "acknowledged";
  createdAt?: Timestamp;
}

const TherapistReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportDoc[] | null>(null);
  const [ackingId, setAckingId] = useState<string | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setReports([]); return; }
    const q = query(collection(db, "reports"), where("therapistUid", "==", uid), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => setReports(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReportDoc, "id">) }))),
      (err) => { console.warn("[reports] snapshot error:", err); setReports([]); },
    );
    return () => unsub();
  }, []);

  const acknowledge = async (id: string) => {
    setAckingId(id);
    try {
      await updateDoc(doc(db, "reports", id), { status: "acknowledged", acknowledgedAt: serverTimestamp() });
    } catch (err) {
      console.error("[reports] acknowledge failed:", err);
    } finally {
      setAckingId(null);
    }
  };

  return (
    <Box sx={{ ...responsiveShell, minHeight: "100vh", background: "var(--sr-bg)", pb: 8, fontFamily: SANS }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, pt: 2, pb: 1.5 }}>
        <Box
          component="button"
          type="button"
          aria-label="Back"
          onClick={() => navigate("/therapist/home")}
          sx={{
            width: 34, height: 34, borderRadius: "50%", border: "none", cursor: "pointer",
            background: "var(--sr-panel-2)", color: "var(--sr-ink)",
            display: "flex", alignItems: "center", justifyContent: "center", ml: 1,
          }}
        >
          <ArrowLeft size={16} weight="bold" />
        </Box>
        <Typography sx={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: "var(--sr-ink)" }}>
          รายการรีพอร์ต
        </Typography>
      </Box>

      <Box sx={{ px: 2, display: "flex", flexDirection: "column", gap: 1.25 }}>
        {reports === null && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
            <CircularProgress size={24} sx={{ color: ROSE }} />
          </Box>
        )}

        {reports !== null && reports.length === 0 && (
          <Box sx={{ textAlign: "center", py: 6, px: 2 }}>
            <Flag size={32} weight="duotone" color="var(--sr-dim)" />
            <Typography sx={{ fontFamily: SERIF, fontSize: 16, color: "var(--sr-ink)", mt: 1.5 }}>
              ยังไม่มีรีพอร์ต
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: "var(--sr-muted)", mt: 0.5 }}>
              ถ้าลูกค้าแจ้งปัญหาเกี่ยวกับงานของคุณ จะขึ้นที่นี่
            </Typography>
          </Box>
        )}

        {reports?.map((r) => {
          const open = r.status === "open";
          return (
            <Box
              key={r.id}
              sx={{
                borderRadius: "16px",
                background: "var(--sr-panel)",
                border: `1px solid ${open ? "rgba(192,86,46,0.35)" : "var(--sr-hairline)"}`,
                boxShadow: "var(--sr-card-shadow)",
                p: "14px 15px",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
                <Box
                  sx={{
                    px: "8px", py: "2px", borderRadius: 999,
                    background: open ? "rgba(192,86,46,0.12)" : "rgba(87,184,139,0.14)",
                    color: open ? "#C0562E" : "#2E7D57",
                    fontFamily: SANS, fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase",
                  }}
                >
                  {open ? "ยังไม่ได้อ่าน" : "รับทราบแล้ว"}
                </Box>
                <Typography sx={{ fontFamily: SANS, fontSize: 11, color: "var(--sr-muted)", ml: "auto" }}>
                  {fmtBKK(r.createdAt, "D MMM YYYY · h:mm A")}
                </Typography>
              </Box>
              <Typography sx={{ fontFamily: SANS, fontSize: 13.5, color: "var(--sr-body)", lineHeight: 1.55 }}>
                {r.message}
              </Typography>
              {open && (
                <Box
                  component="button"
                  type="button"
                  disabled={ackingId === r.id}
                  onClick={() => void acknowledge(r.id)}
                  sx={{
                    mt: 1.25, display: "flex", alignItems: "center", gap: 0.5,
                    border: "none", background: "none", cursor: "pointer", p: 0,
                    color: "var(--sr-muted)", fontFamily: SANS, fontSize: 12, fontWeight: 700,
                    opacity: ackingId === r.id ? 0.6 : 1,
                  }}
                >
                  <CheckCircle size={15} weight="bold" />
                  ทำเครื่องหมายว่ารับทราบแล้ว
                </Box>
              )}
            </Box>
          );
        })}
      </Box>
    </Box>
  );
};

export default TherapistReportsPage;
