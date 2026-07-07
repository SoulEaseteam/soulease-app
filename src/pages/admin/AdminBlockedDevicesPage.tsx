// src/pages/admin/AdminBlockedDevicesPage.tsx
//
// 🆕 Round 28s293 (founder: "admin/blocked-devices ปรับแก้ และ
//   ตกแต่งสวยงาม แนะนำ ที่ใช้ได้จริง") — this page used to block a
//   "deviceId" that nothing anywhere else in the codebase ever generated
//   (grep confirmed: zero other references in `src`). There was no way
//   to even discover a real deviceId to type in, and even if you did,
//   nothing at booking time ever checked `blockedDevices` — so "blocking"
//   a device did nothing. A shell feature end to end.
//
// Rebuilt around what's actually collected on every booking and already
// the CRM's identity key (AdminUsersPage.tsx's Customer Insights): the
// phone number. This page now:
//   • lists every blocked phone with reason + date,
//   • lets admin add/remove a block directly,
//   • is ENFORCED — BookingFlowPage checks `blockedPhones` before
//     accepting a new booking (see its submit handler),
//   • is also reachable from Customer Insights (a guest's profile
//     drawer has its own Block/Unblock button) so the realistic
//     workflow — spot a problem guest, block them — takes one click
//     instead of a copy-paste round trip through a separate page.
//
// The old `blockedDevices` collection/rule is left in place (harmless,
// admin-only) but nothing reads/writes it anymore.

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { ProhibitInset, MagnifyingGlass, Plus, Trash, ShieldWarning } from "phosphor-react";
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";
import { normPhone } from "@/utils/phoneCountry";
import { logAdminAction } from "@/utils/auditLog";

const SANS = adminFont.sans;

interface BlockedPhone {
  id: string; // normPhone() key
  phoneRaw?: string;
  reason?: string;
  createdAt?: Timestamp | null;
}

function fmtDate(ts: Timestamp | null | undefined): string {
  if (!ts) return "—";
  try {
    return ts.toDate().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return "—";
  }
}

const AdminBlockedDevicesPage: React.FC = () => {
  const [rows, setRows] = useState<BlockedPhone[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [addPhone, setAddPhone] = useState("");
  const [addReason, setAddReason] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [unblockTarget, setUnblockTarget] = useState<BlockedPhone | null>(null);
  const [unblockSubmitting, setUnblockSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "blockedPhones"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as BlockedPhone));
      list.sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));
      setRows(list);
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        (r.phoneRaw ?? r.id).toLowerCase().includes(q) ||
        (r.reason ?? "").toLowerCase().includes(q),
    );
  }, [rows, searchQuery]);

  const handleAdd = async () => {
    const key = normPhone(addPhone);
    if (!key) {
      toast.error("กรอกเบอร์โทรก่อน");
      return;
    }
    setAddSubmitting(true);
    try {
      await setDoc(doc(db, "blockedPhones", key), {
        phoneRaw: addPhone.trim(),
        reason: addReason.trim() || "Blocked by admin",
        createdAt: serverTimestamp(),
      });
      void logAdminAction("phone.block", { phone: key, reason: addReason.trim() });
      setAddOpen(false);
      setAddPhone("");
      setAddReason("");
      toast.success(`บล็อกเบอร์ ${addPhone} แล้ว`);
    } catch (err) {
      console.error("[block phone] failed:", err);
      toast.error("บล็อกไม่สำเร็จ");
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleUnblock = async () => {
    if (!unblockTarget) return;
    setUnblockSubmitting(true);
    try {
      await deleteDoc(doc(db, "blockedPhones", unblockTarget.id));
      void logAdminAction("phone.unblock", { phone: unblockTarget.id });
      toast.success(`ปลดบล็อกเบอร์ ${unblockTarget.phoneRaw ?? unblockTarget.id} แล้ว`);
      setUnblockTarget(null);
    } catch (err) {
      console.error("[unblock phone] failed:", err);
      toast.error("ปลดบล็อกไม่สำเร็จ");
    } finally {
      setUnblockSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, fontFamily: SANS }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5, gap: "12px", flexWrap: "wrap" }}>
        <Typography sx={{ fontFamily: adminFont.serif, fontSize: 22, fontWeight: 600, color: adminColor.text }}>
          Blocked Phone Numbers
        </Typography>
        <Button
          variant="contained"
          startIcon={<Plus size={16} weight="bold" />}
          onClick={() => setAddOpen(true)}
          sx={{ background: adminColor.red, textTransform: "none", fontWeight: 700, borderRadius: "10px", "&:hover": { background: "#B91C1C" } }}
        >
          บล็อกเบอร์ใหม่
        </Button>
      </Box>
      <Typography sx={{ fontSize: 12.5, color: adminColor.muted, mb: 1.5, maxWidth: 640 }}>
        เบอร์ในลิสต์นี้จะจองผ่านเว็บไม่ได้อีก (เช็คตอนกดยืนยันจอง) · บล็อก/ปลดบล็อกได้จากหน้านี้ หรือกดจากโปรไฟล์ลูกค้าใน Customer Insights โดยตรง
      </Typography>

      {/* stat pill */}
      <Box sx={{ display: "flex", gap: 1.25, mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "10px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "15px", p: "8px 15px 8px 8px", boxShadow: "0 1px 3px rgba(31,41,51,0.04)" }}>
          <Box sx={{ width: 32, height: 32, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, #EF4444, ${adminColor.red})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <ShieldWarning size={16} color="#fff" weight="fill" />
          </Box>
          <Box>
            <Typography sx={{ ...adminFigureSx, fontSize: 17, color: adminColor.red, lineHeight: 1.1 }}>{rows.length}</Typography>
            <Typography sx={{ fontSize: 10, color: adminColor.dim, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>เบอร์ที่บล็อก</Typography>
          </Box>
        </Box>
      </Box>

      {/* search */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.5 }}>
        <Box sx={{ flex: 1, minWidth: 220, maxWidth: 360, display: "flex", alignItems: "center", gap: 1, background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "12px", p: "9px 13px" }}>
          <MagnifyingGlass size={15} color={adminColor.dim} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาเบอร์โทร / เหตุผล…"
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 13.5, color: adminColor.text, width: "100%", fontFamily: SANS }}
          />
        </Box>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", p: 5 }}>
          <CircularProgress sx={{ color: adminColor.red }} />
        </Box>
      ) : rows.length === 0 ? (
        <Box sx={{ p: "40px 16px", textAlign: "center", background: adminColor.panel, borderRadius: "16px", border: `1px solid ${adminColor.line}` }}>
          <Typography sx={{ color: adminColor.muted }}>ยังไม่มีเบอร์ที่บล็อก</Typography>
        </Box>
      ) : filteredRows.length === 0 ? (
        <Box sx={{ p: "40px 16px", textAlign: "center", background: adminColor.panel, borderRadius: "16px", border: `1px solid ${adminColor.line}` }}>
          <Typography sx={{ color: adminColor.muted }}>ไม่พบเบอร์ที่ตรงกับตัวกรอง</Typography>
        </Box>
      ) : (
        <Stack spacing={1}>
          {filteredRows.map((r) => (
            <Box
              key={r.id}
              sx={{ display: "flex", alignItems: "center", gap: 1.5, p: "12px 14px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "12px", flexWrap: "wrap" }}
            >
              <Box sx={{ width: 30, height: 30, borderRadius: "50%", background: `${adminColor.red}1A`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ProhibitInset size={15} color={adminColor.red} weight="fill" />
              </Box>
              <Box sx={{ flex: "1 1 160px", minWidth: 0 }}>
                <Typography sx={{ ...adminFigureSx, fontSize: 14, color: adminColor.text }}>{r.phoneRaw ?? r.id}</Typography>
                <Typography sx={{ fontSize: 12, color: adminColor.muted, wordBreak: "break-word" }}>{r.reason || "—"}</Typography>
              </Box>
              <Typography sx={{ fontSize: 11.5, color: adminColor.dim, flexShrink: 0 }}>{fmtDate(r.createdAt)}</Typography>
              <Button
                size="small"
                startIcon={<Trash size={14} />}
                onClick={() => setUnblockTarget(r)}
                sx={{ color: adminColor.green, textTransform: "none", fontWeight: 700, flexShrink: 0 }}
              >
                ปลดบล็อก
              </Button>
            </Box>
          ))}
        </Stack>
      )}

      {/* Add dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontFamily: adminFont.serif, color: adminColor.text }}>บล็อกเบอร์โทรใหม่</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth autoFocus label="เบอร์โทร" placeholder="0812345678 หรือ +66812345678"
            value={addPhone} onChange={(e) => setAddPhone(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth label="เหตุผล" placeholder="เช่น เบี้ยวนัดหลายครั้ง, พฤติกรรมไม่เหมาะสม"
            value={addReason} onChange={(e) => setAddReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button
            onClick={() => void handleAdd()}
            variant="contained"
            disabled={addSubmitting || !addPhone.trim()}
            sx={{ background: adminColor.red, textTransform: "none", fontWeight: 700, "&:hover": { background: "#B91C1C" } }}
          >
            {addSubmitting ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "บล็อก"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unblock confirm */}
      <Dialog open={!!unblockTarget} onClose={() => setUnblockTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontFamily: adminFont.serif, color: adminColor.text }}>ปลดบล็อกเบอร์นี้?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, color: adminColor.text }}>
            <strong>{unblockTarget?.phoneRaw ?? unblockTarget?.id}</strong> จะสามารถจองผ่านเว็บได้อีกครั้งทันที
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUnblockTarget(null)}>Cancel</Button>
          <Button
            onClick={() => void handleUnblock()}
            variant="contained"
            disabled={unblockSubmitting}
            sx={{ background: adminColor.green, textTransform: "none", fontWeight: 700 }}
          >
            ปลดบล็อก
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminBlockedDevicesPage;
