// src/pages/admin/AdminAuditLogPage.tsx
//
// 🆕 Round 28s234 (Phase 4 — "รื้อ ทำให้ ตกแต่ง และฟังก์ชั่น") — Audit log
//   viewer. The `auditLogs` collection existed in firestore.rules for a
//   long time but nothing ever wrote to it ("populated by Cloud Functions
//   only" — no function did, so it was permanently empty). Real entries now
//   come from src/utils/auditLog.ts, called from booking confirm/cancel/
//   complete, payout mark-paid, and roster relight actions.
//
// 🆕 Round 28s294 (founder: "admin/audit-log ปรับแก้ และ ตกแต่งสวยงาม
//   แนะนำ ที่ใช้ได้จริง") — an audit log's whole value is "can I find
//   what happened" — a flat unfilterable list of 200 rows fails that the
//   moment there's more than a screenful of history. Added:
//   • Search (label / detail / actor email) + category filter (grouped
//     by the action's `x.y` prefix — booking/payout/therapist/user/
//     review/phone — so new actions under an existing prefix need no
//     filter-UI maintenance) + a today/7d/30d/all time window, matching
//     the filter conventions every other admin list page gained this
//     session.
//   • Two stat pills (today's count, total loaded) for an at-a-glance
//     read before scrolling.
//   • Bumped the query cap 200 → 500 (now that filters exist, a narrow
//     window like "today" silently losing older-in-range rows to a low
//     cap felt wrong) and made the "capped" note honest/dynamic instead
//     of a hardcoded "200" that would've gone stale the next time this
//     changed.
//   • The detail line used single-line nowrap+ellipsis — the same
//     pattern round 28s290 root-caused as breaking under OS text-size
//     scaling (fixed elsewhere this session). Reason/changedFields text
//     can run long (especially now that phone.block carries a free-typed
//     reason), so long entries were silently cut off with no way to see
//     the rest. Switched to wrap.

import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, CircularProgress, MenuItem, TextField, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { collection, onSnapshot, orderBy, query, limit, Timestamp } from "firebase/firestore";
import dayjs from "dayjs";
import { ArrowLeft, ClockCounterClockwise, MagnifyingGlass, ListChecks } from "phosphor-react";
import { useNavigate } from "react-router-dom";

import { db } from "@/lib/firebase";
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";
import type { AuditAction } from "@/utils/auditLog";

const SANS = adminFont.sans;
const LOG_LIMIT = 500;

type TimeWindow = "today" | "7d" | "30d" | "all";
const WINDOW_MS: Record<TimeWindow, number> = {
  today: 24 * 60 * 60 * 1000,
  "7d": 7 * 24 * 60 * 60 * 1000,
  "30d": 30 * 24 * 60 * 60 * 1000,
  all: Number.POSITIVE_INFINITY,
};

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
  "booking.mark_paid":       { label: "ลูกค้าจ่ายแล้ว",       color: adminColor.green },
  "booking.mark_unpaid":     { label: "ยกเลิกสถานะจ่าย",      color: adminColor.dim },
  "booking.status_change":   { label: "เปลี่ยนสถานะ",         color: adminColor.blue },
  "booking.edit_details":    { label: "แก้ไขรายละเอียดจอง",    color: adminColor.blue },
  "booking.mark_reviewed":   { label: "เคลียร์รอรีวิว",        color: adminColor.dim },
  "payout.mark_paid":        { label: "จ่ายค่าตอบแทนแล้ว",     color: adminColor.highlight },
  "payout.mark_unpaid":      { label: "ยกเลิกสถานะจ่ายแล้ว",   color: adminColor.dim },
  "therapist.relight_all":   { label: "เปิดร้านทั้งหมด",       color: adminColor.green },
  "therapist.reset_auto":    { label: "รีเซ็ตเป็น Auto",       color: adminColor.blue },
  "therapist.create":        { label: "เพิ่มหมอนวดใหม่",       color: adminColor.green },
  "therapist.update":        { label: "แก้ไขข้อมูลหมอนวด",     color: adminColor.blue },
  "therapist.delete":        { label: "ลบหมอนวด",             color: adminColor.red },
  "user.block":              { label: "บล็อกผู้ใช้",          color: adminColor.red },
  "user.unblock":            { label: "ปลดบล็อกผู้ใช้",       color: adminColor.green },
  "review.edit":             { label: "แก้ไขรีวิว",           color: adminColor.blue },
  "review.hide":             { label: "ซ่อนรีวิว",            color: adminColor.red },
  "phone.block":             { label: "บล็อกเบอร์โทร",         color: adminColor.red },
  "phone.unblock":           { label: "ปลดบล็อกเบอร์โทร",      color: adminColor.green },
  "settings.update":         { label: "แก้ไขการตั้งค่า",       color: adminColor.blue },
  "promo.toggle":            { label: "เปิด/ปิดโค้ดโปรโมชั่น",  color: adminColor.blue },
  "promo.create":            { label: "สร้างโค้ดโปรโมชั่น",     color: adminColor.green },
  "promo.delete":            { label: "ลบโค้ดโปรโมชั่น",        color: adminColor.red },
  "service.update":          { label: "แก้ไขราคา/บริการ",       color: adminColor.blue },
};

// 🆕 Round 28s294 — category = the prefix before the dot. New actions
//   under an existing prefix (e.g. a future "booking.refund") need no
//   change here or in the filter UI — they just inherit the group label.
const CATEGORY_LABEL: Record<string, string> = {
  booking: "จอง",
  payout: "จ่ายเงิน",
  therapist: "หมอนวด",
  user: "ผู้ใช้",
  review: "รีวิว",
  phone: "เบอร์โทร",
  settings: "ตั้งค่า",
  promo: "โปรโมชั่น",
  service: "บริการ",
  other: "อื่น ๆ",
};
// 🆕 Round 28s295 (founder screenshot: white-screened on "Cannot read
//   properties of undefined (reading 'split')") — a real doc in
//   `auditLogs` has an `action` that isn't a string (missing/legacy
//   entry predating logAdminAction, per the file's own 28s234 comment
//   about a Cloud-Functions-only design this collection had before).
//   `categoryOptions` runs this eagerly over every loaded row, so one
//   bad doc crashed the whole page before anything could render or be
//   filtered out. Firestore data isn't guaranteed to match the
//   TypeScript-asserted shape — never trust `as AuditRow` at runtime.
const categoryOf = (action: unknown): string =>
  typeof action === "string" && action.includes(".") ? action.split(".")[0] : "other";

function detailLine(detail?: Record<string, unknown>): string {
  if (!detail) return "";
  const parts: string[] = [];
  if (detail.bookingId) parts.push(`booking ${String(detail.bookingId).slice(0, 8)}`);
  if (detail.from && detail.to) parts.push(`${detail.from} → ${detail.to}`);
  if (detail.therapistName) parts.push(String(detail.therapistName));
  if (detail.phone) parts.push(String(detail.phone));
  if (detail.reason) parts.push(String(detail.reason));
  if (detail.field) parts.push(`${String(detail.field)} → ${String(detail.value)}`);
  // 🆕 Round 28s271 — AdminTherapistDetailPage's Save button batches many
  //   field edits into one write; list which fields actually changed.
  if (Array.isArray(detail.changedFields) && detail.changedFields.length) {
    parts.push(detail.changedFields.join(", "));
  }
  if (typeof detail.amount === "number") parts.push(`฿${detail.amount.toLocaleString()}`);
  if (typeof detail.count === "number") parts.push(`${detail.count} คน`);
  if (typeof detail.rating === "number") parts.push(`★${detail.rating}`);
  return parts.join(" · ");
}

const AdminAuditLogPage: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("all");

  useEffect(() => {
    const q = query(collection(db, "auditLogs"), orderBy("at", "desc"), limit(LOG_LIMIT));
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

  const categoryOptions = useMemo(
    () => Array.from(new Set(rows.map((r) => categoryOf(r.action)))).sort(),
    [rows],
  );

  const todayCount = useMemo(() => {
    const cutoff = Date.now() - WINDOW_MS.today;
    return rows.filter((r) => (r.at?.toMillis() ?? 0) >= cutoff).length;
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const cutoff = timeWindow === "all" ? 0 : Date.now() - WINDOW_MS[timeWindow];
    return rows.filter((r) => {
      if ((r.at?.toMillis() ?? 0) < cutoff) return false;
      if (categoryFilter && categoryOf(r.action) !== categoryFilter) return false;
      if (q) {
        const cfg = ACTION_LABEL[r.action as string] ?? { label: typeof r.action === "string" ? r.action : "" };
        const haystack = [cfg.label, detailLine(r.detail), r.actorEmail].filter(Boolean).join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rows, searchQuery, categoryFilter, timeWindow]);

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 860, mx: "auto", fontFamily: SANS }}>
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
      <Typography sx={{ fontSize: 12.5, color: adminColor.muted, mb: 2 }}>
        ประวัติการทำงานของแอดมิน — ยืนยัน/ยกเลิกออเดอร์ · จ่ายค่าตอบแทน · เปิด-ปิดร้าน · บล็อกเบอร์ ฯลฯ
        {rows.length === LOG_LIMIT && ` (แสดง ${LOG_LIMIT} รายการล่าสุด อาจมีเก่ากว่านี้ที่ไม่แสดง)`}
      </Typography>

      {/* 🆕 Round 28s294 — icon-circle stat pills. */}
      <Box sx={{ display: "flex", gap: 1.25, mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "10px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "15px", p: "8px 15px 8px 8px", boxShadow: "0 1px 3px rgba(31,41,51,0.04)" }}>
          <Box sx={{ width: 32, height: 32, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, #6FA0AD, ${adminColor.accent})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ClockCounterClockwise size={16} color="#fff" weight="fill" />
          </Box>
          <Box>
            <Typography sx={{ ...adminFigureSx, fontSize: 17, color: adminColor.text, lineHeight: 1.1 }}>{todayCount}</Typography>
            <Typography sx={{ fontSize: 10, color: adminColor.dim, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>วันนี้</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: "10px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "15px", p: "8px 15px 8px 8px", boxShadow: "0 1px 3px rgba(31,41,51,0.04)" }}>
          <Box sx={{ width: 32, height: 32, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, #3B82F6, ${adminColor.blue})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ListChecks size={16} color="#fff" weight="fill" />
          </Box>
          <Box>
            <Typography sx={{ ...adminFigureSx, fontSize: 17, color: adminColor.blue, lineHeight: 1.1 }}>{rows.length}</Typography>
            <Typography sx={{ fontSize: 10, color: adminColor.dim, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>ทั้งหมดที่โหลด</Typography>
          </Box>
        </Box>
      </Box>

      {/* 🆕 Round 28s294 — search + category + time-window filters. */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.5, alignItems: "center" }}>
        <Box sx={{ flex: 1, minWidth: 200, maxWidth: 320, display: "flex", alignItems: "center", gap: 1, background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "12px", p: "9px 13px" }}>
          <MagnifyingGlass size={15} color={adminColor.dim} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหา…"
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 13.5, color: adminColor.text, width: "100%", fontFamily: SANS }}
          />
        </Box>
        {categoryOptions.length > 1 && (
          <TextField
            select size="small" label="ประเภท"
            value={categoryFilter ?? "__all__"}
            onChange={(e) => setCategoryFilter(e.target.value === "__all__" ? null : e.target.value)}
            sx={{ minWidth: 130, "& .MuiOutlinedInput-root": { borderRadius: "12px", background: adminColor.panel } }}
          >
            <MenuItem value="__all__">ทั้งหมด</MenuItem>
            {categoryOptions.map((c) => (
              <MenuItem key={c} value={c}>{CATEGORY_LABEL[c] ?? c}</MenuItem>
            ))}
          </TextField>
        )}
        <ToggleButtonGroup
          value={timeWindow}
          exclusive
          onChange={(_, v: TimeWindow | null) => v && setTimeWindow(v)}
          sx={{
            "& .MuiToggleButton-root": {
              fontFamily: SANS, fontSize: 12, fontWeight: 700, textTransform: "none",
              border: `1px solid ${adminColor.line2}`, color: adminColor.text, padding: "6px 12px",
              "&.Mui-selected": { background: adminColor.accent, color: "#fff", "&:hover": { background: adminColor.accentDeep } },
            },
          }}
        >
          <ToggleButton value="today">วันนี้</ToggleButton>
          <ToggleButton value="7d">7 วัน</ToggleButton>
          <ToggleButton value="30d">30 วัน</ToggleButton>
          <ToggleButton value="all">ทั้งหมด</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", mt: 6 }}>
          <CircularProgress size={24} sx={{ color: adminColor.accent }} />
        </Box>
      ) : rows.length === 0 ? (
        <Box
          sx={{
            textAlign: "center", mt: 4, p: 3, borderRadius: 2,
            background: adminColor.panel, border: `1px solid ${adminColor.line}`,
            color: adminColor.muted, fontSize: 13,
          }}
        >
          <ClockCounterClockwise size={28} color={adminColor.dim} style={{ marginBottom: 8 }} />
          <div>ยังไม่มีประวัติ — จะบันทึกอัตโนมัติเมื่อมีการยืนยัน/ยกเลิกออเดอร์, จ่ายค่าตอบแทน หรือเปิด-ปิดร้าน</div>
        </Box>
      ) : filteredRows.length === 0 ? (
        <Box sx={{ textAlign: "center", mt: 4, p: 3, borderRadius: 2, background: adminColor.panel, border: `1px solid ${adminColor.line}`, color: adminColor.muted, fontSize: 13 }}>
          ไม่พบรายการที่ตรงกับตัวกรอง
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          {filteredRows.map((r) => {
            const cfg = ACTION_LABEL[r.action as string] ?? { label: typeof r.action === "string" ? r.action : "ไม่ทราบประเภท", color: adminColor.muted };
            const when = r.at?.toDate ? dayjs(r.at.toDate()) : null;
            const detail = [detailLine(r.detail), r.actorEmail].filter(Boolean).join(" · ");
            return (
              <Box
                key={r.id}
                sx={{
                  display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5, flexWrap: "wrap",
                  p: "10px 13px", borderRadius: "12px",
                  background: adminColor.panel, border: `1px solid ${adminColor.line}`,
                  borderLeft: `3px solid ${cfg.color}`,
                }}
              >
                <Box sx={{ minWidth: 0, flex: "1 1 220px" }}>
                  <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: adminColor.text }}>
                    {cfg.label}
                  </Typography>
                  {/* 🆕 Round 28s294 — wrap instead of single-line ellipsis
                      (same fix pattern as 28s290): a long reason/changedFields
                      string used to just get cut off with no way to see the
                      rest. */}
                  {detail && (
                    <Typography sx={{ fontSize: 11.5, color: adminColor.muted, wordBreak: "break-word", lineHeight: 1.4 }}>
                      {detail}
                    </Typography>
                  )}
                </Box>
                <Typography sx={{ fontSize: 11.5, color: adminColor.dim, flexShrink: 0, fontVariantNumeric: "tabular-nums" }}>
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
