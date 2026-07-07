// src/pages/admin/AdminPromotionsPage.tsx
//
// 🆕 Round 28s298 (founder: "เพิ่ม เมนู โปรโมชั่น") — discount codes
// (FIRST10, WELCOME20, TONIGHT500, SAMMY200, VIP100, FREETAXI, referral
// SUN-XXX) were 100% hardcoded in src/utils/discount.ts with zero admin
// UI. Asked what this page should actually do; founder picked all
// three:
//   1. See the real codes + turn any of them on/off.
//   2. Create brand-new custom codes without a code change.
//   3. See real usage stats pulled from actual bookings.
//
// Important context surfaced here, not buried in a comment: promos are
// currently OFF site-wide (src/config/featureFlags.ts's PROMOS_ENABLED,
// founder's own earlier call: "ยังไม่ได้คิด โปร กัน เสี่ยง"). Nothing
// below has ANY visible effect on the live site until the master switch
// at the top is flipped on — that flag is now live-controllable from
// here too (was hardcoded `false`), otherwise this whole page would be
// as decorative as /admin/advanced-settings was before 28s296/297.
//
// Data model: one doc per code in `promoCodes/{CODE}` —
//   • builtin override:  { kind: "builtin", enabled: boolean }
//   • custom code:       { kind: "custom", enabled, type, amount,
//                          capThb?, label, expiresAt?, createdAt }
// Read live by MaintenanceGate.tsx into discount.ts's module-level
// cache (same live-binding pattern as taxiFare.ts's pricing overrides)
// — validateDiscount() itself stays a pure, synchronous function.

import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Switch, TextField, MenuItem, Button, Stack,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
} from "@mui/material";
import { db } from "@/lib/firebase";
import {
  collection, doc, onSnapshot, setDoc, deleteDoc, getDocs, query, where,
  limit as fbLimit, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { Tag, Percent, Ticket, ChartBar, Plus, Trash, Warning } from "phosphor-react";
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";
import { SectionCard, fieldSx } from "./therapistFormKit";
import { logAdminAction } from "@/utils/auditLog";

const SANS = adminFont.sans;

// Kept in sync BY HAND with src/utils/discount.ts's hardcoded branches —
// this page can't introspect that file's conditional logic as data, so
// these descriptions are a snapshot of the real rules at write time.
// "REFERRAL" is a pseudo-code (matches the SUN-XXXX pattern, not one
// literal string) — see discount.ts's disable check for why.
const BUILTIN_CODES: Array<{ code: string; label: string; desc: string }> = [
  { code: "FIRST10", label: "First booking", desc: "ลูกค้าจองครั้งแรก ลด 10% (สูงสุด ฿200)" },
  { code: "WELCOME20", label: "Welcome", desc: "โปรเปิดตัว ลด 10% (สูงสุด ฿300)" },
  { code: "TONIGHT500", label: "Late-night", desc: "จองช่วง 22:00–04:00 เท่านั้น · ลด ฿200" },
  { code: "SAMMY200", label: "Sammyboy forum", desc: "โค้ดจากฟอรัม Sammyboy · ลด ฿200 ไม่มีเงื่อนไข" },
  { code: "VIP100", label: "VIP (premium only)", desc: "เฉพาะบริการพรีเมียม (Gentleman/B2B) · ลด ฿100" },
  { code: "FREETAXI", label: "Free travel (premium only)", desc: "เฉพาะบริการพรีเมียม · ฟรีค่าเดินทาง" },
  { code: "REFERRAL", label: "Referral (SUN-XXXX)", desc: "โค้ดแนะนำเพื่อน รูปแบบ SUN-XXXX · ลด ฿200" },
];

interface PromoDoc {
  id: string;
  kind: "builtin" | "custom";
  enabled: boolean;
  type?: "percent" | "fixed";
  amount?: number;
  capThb?: number;
  label?: string;
  expiresAt?: Timestamp | null;
}

interface UsageStat {
  count: number;
  totalDiscount: number;
}

const switchSx = {
  "& .MuiSwitch-switchBase.Mui-checked": { color: adminColor.accent },
  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { background: adminColor.accent },
} as const;

const AdminPromotionsPage: React.FC = () => {
  const [promosEnabled, setPromosEnabled] = useState(false);
  const [promosSaving, setPromosSaving] = useState(false);
  const [promoDocs, setPromoDocs] = useState<Record<string, PromoDoc>>({});
  const [usage, setUsage] = useState<Record<string, UsageStat>>({});
  const [usageLoading, setUsageLoading] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [addCode, setAddCode] = useState("");
  const [addType, setAddType] = useState<"percent" | "fixed">("fixed");
  const [addAmount, setAddAmount] = useState(100);
  const [addCap, setAddCap] = useState(300);
  const [addLabel, setAddLabel] = useState("");
  const [addExpiry, setAddExpiry] = useState("");
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PromoDoc | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "adminSettings", "publicRules"), (snap) => {
      setPromosEnabled(snap.data()?.promosEnabled === true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "promoCodes"), (snap) => {
      const map: Record<string, PromoDoc> = {};
      snap.forEach((d) => {
        const data = d.data();
        map[d.id] = {
          id: d.id,
          kind: data.kind === "custom" ? "custom" : "builtin",
          enabled: data.enabled !== false,
          type: data.type,
          amount: data.amount,
          capThb: data.capThb,
          label: data.label,
          expiresAt: data.expiresAt ?? null,
        };
      });
      setPromoDocs(map);
    });
    return () => unsub();
  }, []);

  // Usage stats — one-time fetch (not live; a moderately-stale count of
  // "how many bookings used this code" is fine for this page's purpose).
  useEffect(() => {
    void (async () => {
      try {
        const snap = await getDocs(
          query(collection(db, "bookings"), where("discountCode", "!=", null), fbLimit(1000)),
        );
        const stats: Record<string, UsageStat> = {};
        snap.forEach((d) => {
          const data = d.data();
          const code = String(data.discountCode ?? "").toUpperCase();
          if (!code) return;
          const amt = typeof data.discountAmount === "number" ? data.discountAmount : 0;
          const cur = stats[code] ?? { count: 0, totalDiscount: 0 };
          cur.count += 1;
          cur.totalDiscount += amt;
          stats[code] = cur;
        });
        setUsage(stats);
      } catch (err) {
        console.error("[promotions] usage fetch failed:", err);
      } finally {
        setUsageLoading(false);
      }
    })();
  }, []);

  const customList = useMemo(
    () => Object.values(promoDocs).filter((p) => p.kind === "custom"),
    [promoDocs],
  );

  const handleTogglePromos = async (checked: boolean) => {
    setPromosSaving(true);
    try {
      await setDoc(doc(db, "adminSettings", "publicRules"), { promosEnabled: checked, updatedAt: serverTimestamp() }, { merge: true });
      void logAdminAction("settings.update", { changedFields: [`promosEnabled: ${checked}`] });
      toast.success(checked ? "เปิดใช้งานโปรโมชั่นแล้ว" : "ปิดใช้งานโปรโมชั่นแล้ว");
    } catch (err) {
      console.error(err);
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setPromosSaving(false);
    }
  };

  const handleToggleBuiltin = async (code: string, enabled: boolean) => {
    try {
      await setDoc(doc(db, "promoCodes", code), { kind: "builtin", enabled }, { merge: true });
      void logAdminAction("promo.toggle", { code, enabled });
      toast.success(`${enabled ? "เปิด" : "ปิด"}โค้ด ${code} แล้ว`);
    } catch (err) {
      console.error(err);
      toast.error("บันทึกไม่สำเร็จ");
    }
  };

  const handleAddCustom = async () => {
    const code = addCode.trim().toUpperCase();
    if (!code) { toast.error("กรอกโค้ดก่อน"); return; }
    if (BUILTIN_CODES.some((b) => b.code === code)) { toast.error("ชื่อนี้ซ้ำกับโค้ดมาตรฐาน ใช้ชื่ออื่น"); return; }
    if (addAmount <= 0) { toast.error("จำนวนต้องมากกว่า 0"); return; }
    setAddSubmitting(true);
    try {
      await setDoc(doc(db, "promoCodes", code), {
        kind: "custom",
        enabled: true,
        type: addType,
        amount: addAmount,
        ...(addType === "percent" ? { capThb: addCap } : {}),
        label: addLabel.trim() || `${code} — ${addType === "percent" ? `${addAmount}% off` : `฿${addAmount} off`}`,
        expiresAt: addExpiry ? Timestamp.fromDate(new Date(addExpiry)) : null,
        createdAt: serverTimestamp(),
      });
      void logAdminAction("promo.create", { code, type: addType, amount: addAmount });
      setAddOpen(false);
      setAddCode(""); setAddAmount(100); setAddCap(300); setAddLabel(""); setAddExpiry(""); setAddType("fixed");
      toast.success(`สร้างโค้ด ${code} แล้ว`);
    } catch (err) {
      console.error(err);
      toast.error("สร้างไม่สำเร็จ");
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      await deleteDoc(doc(db, "promoCodes", deleteTarget.id));
      void logAdminAction("promo.delete", { code: deleteTarget.id });
      toast.success(`ลบโค้ด ${deleteTarget.id} แล้ว`);
      setDeleteTarget(null);
    } catch (err) {
      console.error(err);
      toast.error("ลบไม่สำเร็จ");
    } finally {
      setDeleteSubmitting(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 760, mx: "auto", fontFamily: SANS }}>
      <Typography sx={{ fontFamily: adminFont.serif, fontSize: 22, fontWeight: 600, color: adminColor.text, mb: 0.5 }}>
        Promotions
      </Typography>
      <Typography sx={{ fontSize: 12.5, color: adminColor.muted, mb: 2.5 }}>
        จัดการโค้ดส่วนลด — เปิด/ปิดโค้ดมาตรฐาน สร้างโค้ดใหม่ ดูสถิติการใช้งานจริง
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* Master switch */}
        <SectionCard icon={<Tag size={13} weight="bold" />} title="เปิดใช้งานโปรโมชั่น">
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
            <Typography sx={{ fontSize: 13.5, color: adminColor.text }}>เปิดใช้งานโปรโมชั่นทั้งเว็บ</Typography>
            <Switch checked={promosEnabled} disabled={promosSaving} onChange={(e) => void handleTogglePromos(e.target.checked)} sx={switchSx} />
          </Box>
          {!promosEnabled && (
            <Box sx={{ mt: 1, display: "flex", alignItems: "flex-start", gap: "6px", color: adminColor.amber }}>
              <Warning size={14} weight="fill" style={{ marginTop: 2, flexShrink: 0 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                ปิดอยู่ตอนนี้ — ลูกค้าจะไม่เห็นช่องใส่โค้ดส่วนลดเลย ต่อให้เปิด/สร้างโค้ดข้างล่างก็ยังไม่มีผลกับลูกค้าจริงจนกว่าจะเปิดสวิตช์นี้
              </Typography>
            </Box>
          )}
        </SectionCard>

        {/* Built-in codes */}
        <SectionCard icon={<Percent size={13} weight="bold" />} title="โค้ดมาตรฐาน">
          <Stack spacing={1}>
            {BUILTIN_CODES.map((b) => {
              const enabled = promoDocs[b.code]?.enabled !== false;
              return (
                <Box key={b.code} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, p: "8px 10px", borderRadius: "10px", background: adminColor.panel2 }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13, fontWeight: 700, color: adminColor.text }}>
                      {b.code} <span style={{ fontWeight: 400, color: adminColor.dim }}>· {b.label}</span>
                    </Typography>
                    <Typography sx={{ fontSize: 11.5, color: adminColor.muted }}>{b.desc}</Typography>
                  </Box>
                  <Switch checked={enabled} onChange={(e) => void handleToggleBuiltin(b.code, e.target.checked)} sx={switchSx} />
                </Box>
              );
            })}
          </Stack>
        </SectionCard>

        {/* Custom codes */}
        <SectionCard icon={<Ticket size={13} weight="bold" />} title="โค้ดที่สร้างเอง">
          {customList.length === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: adminColor.muted, mb: 1 }}>ยังไม่มีโค้ดที่สร้างเอง</Typography>
          ) : (
            <Stack spacing={1} sx={{ mb: 1.5 }}>
              {customList.map((c) => {
                const expired = c.expiresAt && c.expiresAt.toMillis() < Date.now();
                return (
                  <Box key={c.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, p: "8px 10px", borderRadius: "10px", background: adminColor.panel2 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: adminColor.text }}>
                        {c.id} <span style={{ fontWeight: 400, color: adminColor.dim }}>
                          · {c.type === "percent" ? `${c.amount}% off${c.capThb ? ` (สูงสุด ฿${c.capThb})` : ""}` : `฿${c.amount} off`}
                        </span>
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: expired ? adminColor.red : adminColor.muted }}>
                        {c.label}{c.expiresAt ? ` · ${expired ? "หมดอายุแล้ว" : "หมดอายุ"} ${c.expiresAt.toDate().toLocaleDateString("th-TH")}` : ""}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                      <Switch checked={c.enabled} onChange={(e) => void setDoc(doc(db, "promoCodes", c.id), { enabled: e.target.checked }, { merge: true })} sx={switchSx} />
                      <Button size="small" onClick={() => setDeleteTarget(c)} sx={{ color: adminColor.red, minWidth: "auto", p: "4px" }}>
                        <Trash size={16} />
                      </Button>
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
          <Button
            variant="outlined" startIcon={<Plus size={15} weight="bold" />} onClick={() => setAddOpen(true)}
            sx={{ textTransform: "none", fontWeight: 700, borderColor: adminColor.line2, color: adminColor.accent, borderRadius: "10px" }}
          >
            สร้างโค้ดใหม่
          </Button>
        </SectionCard>

        {/* Usage stats */}
        <SectionCard icon={<ChartBar size={13} weight="bold" />} title="สถิติการใช้งาน">
          <Typography sx={{ fontSize: 11.5, color: adminColor.muted, mb: 1 }}>
            จากออเดอร์จริงล่าสุด (สูงสุด 1,000 รายการ)
          </Typography>
          {usageLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}><CircularProgress size={20} sx={{ color: adminColor.accent }} /></Box>
          ) : Object.keys(usage).length === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: adminColor.muted }}>ยังไม่มีออเดอร์ที่ใช้โค้ดส่วนลด</Typography>
          ) : (
            <Stack spacing={0.75}>
              {Object.entries(usage).sort((a, b) => b[1].count - a[1].count).map(([code, s]) => (
                <Box key={code} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, p: "7px 10px", borderRadius: "8px", background: adminColor.panel2 }}>
                  <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: adminColor.text }}>{code}</Typography>
                  <Typography sx={{ ...adminFigureSx, fontSize: 12.5, color: adminColor.muted }}>
                    {s.count} ครั้ง · รวมลด ฿{s.totalDiscount.toLocaleString()}
                  </Typography>
                </Box>
              ))}
            </Stack>
          )}
        </SectionCard>
      </Box>

      {/* Add custom code dialog */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontFamily: adminFont.serif, color: adminColor.text }}>สร้างโค้ดใหม่</DialogTitle>
        <DialogContent>
          <TextField fullWidth autoFocus label="โค้ด" placeholder="เช่น NEWYEAR2026" value={addCode}
            onChange={(e) => setAddCode(e.target.value)} sx={{ ...fieldSx, mb: 1.5, mt: 1 }} />
          <TextField select fullWidth label="ประเภท" value={addType} onChange={(e) => setAddType(e.target.value as "percent" | "fixed")} sx={{ ...fieldSx, mb: 1.5 }}>
            <MenuItem value="fixed">ลดคงที่ (บาท)</MenuItem>
            <MenuItem value="percent">ลดเปอร์เซ็นต์</MenuItem>
          </TextField>
          <TextField
            fullWidth type="number" label={addType === "percent" ? "ลด (%)" : "ลด (บาท)"} value={addAmount}
            onChange={(e) => setAddAmount(Math.max(0, Number(e.target.value)))} sx={{ ...fieldSx, mb: 1.5 }}
          />
          {addType === "percent" && (
            <TextField fullWidth type="number" label="ลดสูงสุด (บาท)" value={addCap}
              onChange={(e) => setAddCap(Math.max(0, Number(e.target.value)))} sx={{ ...fieldSx, mb: 1.5 }} />
          )}
          <TextField fullWidth label="ข้อความที่ลูกค้าเห็น (ไม่บังคับ)" value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)} sx={{ ...fieldSx, mb: 1.5 }} />
          <TextField fullWidth type="date" label="วันหมดอายุ (ไม่บังคับ)" InputLabelProps={{ shrink: true }} value={addExpiry}
            onChange={(e) => setAddExpiry(e.target.value)} sx={fieldSx} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button
            onClick={() => void handleAddCustom()} variant="contained" disabled={addSubmitting || !addCode.trim()}
            sx={{ background: adminColor.accent, textTransform: "none", fontWeight: 700, "&:hover": { background: adminColor.accentDeep } }}
          >
            {addSubmitting ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "สร้าง"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontFamily: adminFont.serif, color: adminColor.text }}>ลบโค้ดนี้?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, color: adminColor.text }}>
            <strong>{deleteTarget?.id}</strong> จะใช้จองไม่ได้อีกทันที (สถิติการใช้งานเดิมไม่หาย เพราะเก็บอยู่ที่ booking แต่ละรายการ)
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button onClick={() => void handleDelete()} variant="contained" disabled={deleteSubmitting} sx={{ background: adminColor.red, textTransform: "none", fontWeight: 700 }}>
            {deleteSubmitting ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "ลบ"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPromotionsPage;
