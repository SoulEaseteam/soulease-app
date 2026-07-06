// src/pages/admin/AdminAuditLogPage.tsx
//
// 🆕 Round 28s234 (Phase 4 — "รื้อ ทำให้ ตกแต่ง และฟังก์ชั่น") — Audit log
//   viewer. The `auditLogs` collection existed in firestore.rules for a
//   long time but nothing ever wrote to it ("populated by Cloud Functions
//   only" — no function did, so it was permanently empty). Real entries now
//   come from src/utils/auditLog.ts, called from booking confirm/cancel/
//   complete, payout mark-paid, and roster relight actions.

import React, { useEffect, useState } from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { collection, onSnapshot, orderBy, query, limit, Timestamp } from "firebase/firestore";
import dayjs from "dayjs";
import { ArrowLeft, ClockCounterClockwise } from "phosphor-react";
import { useNavigate } from "react-router-dom";

import { db } from "@/lib/firebase";
import { adminColor, adminFont } from "@/theme/adminTheme";
import type { AuditAction } from "@/utils/auditLog";

const SANS = adminFont.sans;

interface AuditRow {
  id: string;
  action: AuditAction | string;
  actorEmail?: string | null;
  detail?: Record<string, unknown>;
  at?: Timestamp | null;
}

const ACTION_LABEL: Record<string, { label: string; color: string }> = {
  "booking.confirm":         { label: "ยืนยันออเดอร์",        color: adminColor.green },
  "booking.cancel":          { label: "ยกเลิกออเดอร์",        color: adminColor.red },
  "booking.complete":        { label: "ปิดงานเสร็จ",          color: adminColor.green },
  "payout.mark_paid":        { label: "จ่ายค่าตอบแทนแล้ว",     color: adminColor.highlight },
  "payout.mark_unpaid":      { label: "ยกเลิกสถานะจ่ายแล้ว",   color: adminColor.dim },
  "therapist.relight_all":   { label: "เปิดร้านทั้งหมด",       color: adminColor.green },
  "therapist.reset_auto":    { label: "รีเซ็ตเป็น Auto",       color: adminColor.blue },
  "user.block":              { label: "บล็อกผู้ใช้",          color: adminColor.red },
  "user.unblock":            { label: "ปลดบล็อกผู้ใช้",       color: adminColor.green },
};

function detailLine(detail?: Record<string, unknown>): string {
  if (!detail) return "";
  const parts: string[] = [];
  if (detail.bookingId) parts.push(`booking ${String(detail.bookingId).slice(0, 8)}`);
  if (detail.therapistName) parts.push(String(detail.therapistName));
  if (typeof detail.amount === "number") parts.push(`฿${detail.amount.toLocaleString()}`);
  if (typeof detail.count === "number") parts.push(`${detail.count} คน`);
  return parts.join(" · ");
}

const AdminAuditLogPage: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "auditLogs"), orderBy("at", "desc"), limit(200));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() } as AuditRow)));
        setLoading(false);
      },
      () => setLoading(false)
    );
    return () => unsub();
  }, []);

  return (
    <Box sx={{ p: 2, maxWidth: 760, mx: "auto" }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
        <Box
          onClick={() => navigate("/admin/dashboard")}
          sx={{ display: "flex", alignItems: "center", gap: 0.5, cursor: "pointer", color: adminColor.accent, fontWeight: 700, fontSize: 13 }}
        >
          <ArrowLeft size={16} /> Dashboard
        </Box>
      </Box>

      <Typography sx={{ fontFamily: adminFont.serif, fontWeight: 600, fontSize: 22, color: adminColor.text, mb: 0.5 }}>
        Audit Log
      </Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: adminColor.muted, mb: 2 }}>
        ประวัติการทำงานของแอดมิน — ยืนยัน/ยกเลิกออเดอร์ · จ่ายค่าตอบแทน · เปิด-ปิดร้าน (ล่าสุด 200 รายการ)
      </Typography>

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 6 }}>
          <CircularProgress size={24} sx={{ color: adminColor.accent }} />
        </Box>
      ) : rows.length === 0 ? (
        <Box
          sx={{
            textAlign: "center", mt: 4, p: 3, borderRadius: 2,
            background: adminColor.panel, border: `1px solid ${adminColor.line}`,
            color: adminColor.muted, fontFamily: SANS, fontSize: 13,
          }}
        >
          <ClockCounterClockwise size={28} color={adminColor.dim} style={{ marginBottom: 8 }} />
          <div>ยังไม่มีประวัติ — จะบันทึกอัตโนมัติเมื่อมีการยืนยัน/ยกเลิกออเดอร์, จ่ายค่าตอบแทน หรือเปิด-ปิดร้าน</div>
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          {rows.map((r) => {
            const cfg = ACTION_LABEL[r.action] ?? { label: r.action, color: adminColor.muted };
            const when = r.at?.toDate ? dayjs(r.at.toDate()) : null;
            return (
              <Box
                key={r.id}
                sx={{
                  display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5,
                  p: "10px 13px", borderRadius: "12px",
                  background: adminColor.panel, border: `1px solid ${adminColor.line}`,
                  borderLeft: `3px solid ${cfg.color}`,
                }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 700, color: adminColor.text }}>
                    {cfg.label}
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: adminColor.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {[detailLine(r.detail), r.actorEmail].filter(Boolean).join(" · ")}
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: adminColor.dim, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
                  {when ? when.format("D MMM HH:mm") : "—"}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
};

export default AdminAuditLogPage;
