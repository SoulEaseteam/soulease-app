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
import { app, db } from "@/lib/firebase";
import {
  collection, doc, getDoc, onSnapshot, setDoc, deleteDoc, getDocs, query, where,
  limit as fbLimit, serverTimestamp, Timestamp,
} from "firebase/firestore";
import { toast } from "react-toastify";
import { Tag, Percent, Ticket, ChartBar, Plus, Trash, Warning, ShareNetwork, Copy, Storefront, FloppyDisk, Camera } from "phosphor-react";
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";
import { SectionCard, fieldSx, downscaleImage } from "./therapistFormKit";
import { logAdminAction } from "@/utils/auditLog";
import type { MassageService } from "@/data/services";
import services from "@/data/services";
import { priceForDuration, type LiveServiceOverride, type CustomServiceInput } from "@/utils/servicePricing";

const BADGE_OPTIONS: MassageService["badge"][] = ["SIGNATURE", "POPULAR", "RECOMMEND", "EXCLUSIVE"];

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
  startsAt?: Timestamp | null;
  minSpendThb?: number | null;
  maxRedemptions?: number | null;
  perPhoneLimit?: number | null;
}

interface UsageStat {
  count: number;
  totalDiscount: number;
}

// 🆕 Round 28s300 — one editable row per catalog service.
interface SvcRow {
  id: string;
  name: string;
  enabled: boolean;
  p60: number;
  p90: number;
  p120: number;
}

// 🆕 Round 28s301 — one editable row per admin-created custom service.
interface CustomSvcRow extends SvcRow {
  desc: string;
  image: string;
  badge: MassageService["badge"];
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
  const [addStart, setAddStart] = useState("");
  const [addExpiry, setAddExpiry] = useState("");
  const [addMinSpend, setAddMinSpend] = useState(0);
  const [addMaxRedemptions, setAddMaxRedemptions] = useState(0);
  const [addPerPhone, setAddPerPhone] = useState(0);
  const [addSubmitting, setAddSubmitting] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<PromoDoc | null>(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // 🆕 Round 28s299 — share link + QR dialog (any code, builtin or custom).
  const [shareCode, setShareCode] = useState<string | null>(null);

  // 🆕 Round 28s300 — editable price/name/availability per service.
  const [svcRows, setSvcRows] = useState<SvcRow[]>([]);
  const [svcSaving, setSvcSaving] = useState(false);

  // 🆕 Round 28s301 — admin-created custom services + the "add" dialog.
  const [customSvcRows, setCustomSvcRows] = useState<CustomSvcRow[]>([]);
  const [addSvcOpen, setAddSvcOpen] = useState(false);
  const [addSvcName, setAddSvcName] = useState("");
  const [addSvcDesc, setAddSvcDesc] = useState("");
  const [addSvcBadge, setAddSvcBadge] = useState<MassageService["badge"]>("POPULAR");
  const [addSvcP60, setAddSvcP60] = useState(1500);
  const [addSvcP90, setAddSvcP90] = useState(2200);
  const [addSvcP120, setAddSvcP120] = useState(2900);
  const [addSvcImage, setAddSvcImage] = useState("");
  const [addSvcUploading, setAddSvcUploading] = useState(false);
  const [addSvcSubmitting, setAddSvcSubmitting] = useState(false);

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
          startsAt: data.startsAt ?? null,
          minSpendThb: data.minSpendThb ?? null,
          maxRedemptions: data.maxRedemptions ?? null,
          perPhoneLimit: data.perPhoneLimit ?? null,
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

  // 🆕 Round 28s300 — seed the editable service rows ONCE from the live
  //   publicRules.serviceOverrides (getDoc, not the live listener, so
  //   typing here isn't clobbered by a snapshot). priceForDuration on
  //   the raw catalog service returns the current effective price
  //   (override or hardcoded), so the fields pre-fill with what's live.
  useEffect(() => {
    void (async () => {
      let ov: Record<string, LiveServiceOverride> = {};
      let custom: CustomServiceInput[] = [];
      try {
        const snap = await getDoc(doc(db, "adminSettings", "publicRules"));
        ov = (snap.data()?.serviceOverrides ?? {}) as Record<string, LiveServiceOverride>;
        custom = (snap.data()?.customServices ?? []) as CustomServiceInput[];
      } catch (err) {
        console.error("[promotions] serviceOverrides fetch failed:", err);
      }
      setSvcRows(
        services.map((s) => {
          const o = ov[s.id] ?? {};
          return {
            id: s.id,
            name: o.name ?? s.name,
            enabled: o.enabled !== false,
            p60: o.prices?.[60] ?? priceForDuration(s, 60),
            p90: o.prices?.[90] ?? priceForDuration(s, 90),
            p120: o.prices?.[120] ?? priceForDuration(s, 120),
          };
        }),
      );
      setCustomSvcRows(
        (custom ?? []).filter((c) => c?.id).map((c) => ({
          id: c.id,
          name: c.name ?? c.id,
          desc: c.desc ?? "",
          image: c.image ?? "",
          badge: c.badge ?? "POPULAR",
          enabled: c.enabled !== false,
          p60: c.prices?.[60] ?? 0,
          p90: c.prices?.[90] ?? 0,
          p120: c.prices?.[120] ?? 0,
        })),
      );
    })();
  }, []);

  // Single writer for both hardcoded overrides + custom services, taking
  // explicit rows so add/delete can persist a freshly-built list without
  // waiting on a state flush.
  const persistServices = async (rows: SvcRow[], customRows: CustomSvcRow[]) => {
    const overrides: Record<string, LiveServiceOverride> = {};
    rows.forEach((r) => {
      overrides[r.id] = {
        enabled: r.enabled,
        name: r.name.trim() || r.id,
        price: r.p60,
        prices: { 60: r.p60, 90: r.p90, 120: r.p120 },
      };
    });
    const customServices: CustomServiceInput[] = customRows.map((c) => ({
      id: c.id,
      name: c.name.trim() || c.id,
      desc: c.desc.trim(),
      image: c.image,
      badge: c.badge,
      enabled: c.enabled,
      prices: { 60: c.p60, 90: c.p90, 120: c.p120 },
    }));
    await setDoc(
      doc(db, "adminSettings", "publicRules"),
      { serviceOverrides: overrides, customServices, updatedAt: serverTimestamp() },
      { merge: true },
    );
  };

  const handleSaveServices = async () => {
    setSvcSaving(true);
    try {
      await persistServices(svcRows, customSvcRows);
      void logAdminAction("service.update", {
        count: svcRows.length + customSvcRows.length,
        changedFields: [...svcRows, ...customSvcRows].filter((r) => !r.enabled).map((r) => `${r.id}: ปิด`),
      });
      toast.success("บันทึกราคา/บริการแล้ว — มีผลกับการจองใหม่ทันที");
    } catch (err) {
      console.error(err);
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setSvcSaving(false);
    }
  };

  const setSvcField = (id: string, patch: Partial<SvcRow>) =>
    setSvcRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const setCustomField = (id: string, patch: Partial<CustomSvcRow>) =>
    setCustomSvcRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  // 🆕 Round 28s301 — image upload for the new-service dialog. Reuses the
  //   therapist-gallery pattern (downscale → Storage → URL).
  const handleUploadSvcImage = async (file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("ไฟล์ต้องเป็นรูปภาพ"); return; }
    setAddSvcUploading(true);
    try {
      const { getStorage, ref, uploadBytes, getDownloadURL } = await import("firebase/storage");
      const storage = getStorage(app);
      const blob = await downscaleImage(file, 1200, 0.85);
      const path = `services/new-${Date.now()}-${Math.round(blob.size % 100000)}.jpg`;
      const snap = await uploadBytes(ref(storage, path), blob, { contentType: "image/jpeg" });
      setAddSvcImage(await getDownloadURL(snap.ref));
    } catch (err) {
      console.error("[promotions] service image upload failed", err);
      toast.error("อัปโหลดรูปไม่สำเร็จ");
    } finally {
      setAddSvcUploading(false);
    }
  };

  const handleAddCustomService = async () => {
    const name = addSvcName.trim();
    if (!name) { toast.error("ใส่ชื่อบริการก่อน"); return; }
    if (addSvcP60 <= 0) { toast.error("ราคา 60 นาที ต้องมากกว่า 0"); return; }
    setAddSvcSubmitting(true);
    try {
      const id = `SR-C${Date.now().toString(36).toUpperCase()}`;
      const row: CustomSvcRow = {
        id, name, desc: addSvcDesc.trim(), image: addSvcImage,
        badge: addSvcBadge, enabled: true,
        p60: addSvcP60, p90: addSvcP90, p120: addSvcP120,
      };
      const next = [...customSvcRows, row];
      await persistServices(svcRows, next);
      setCustomSvcRows(next);
      void logAdminAction("service.update", { changedFields: [`สร้างบริการ ${name} (${id})`] });
      setAddSvcOpen(false);
      setAddSvcName(""); setAddSvcDesc(""); setAddSvcImage(""); setAddSvcBadge("POPULAR");
      setAddSvcP60(1500); setAddSvcP90(2200); setAddSvcP120(2900);
      toast.success(`เพิ่มบริการ ${name} แล้ว`);
    } catch (err) {
      console.error(err);
      toast.error("เพิ่มบริการไม่สำเร็จ");
    } finally {
      setAddSvcSubmitting(false);
    }
  };

  const handleDeleteCustomService = async (id: string) => {
    const next = customSvcRows.filter((r) => r.id !== id);
    try {
      await persistServices(svcRows, next);
      setCustomSvcRows(next);
      void logAdminAction("service.update", { changedFields: [`ลบบริการ ${id}`] });
      toast.success("ลบบริการแล้ว");
    } catch (err) {
      console.error(err);
      toast.error("ลบไม่สำเร็จ");
    }
  };

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
    if (addStart && addExpiry && new Date(addStart) >= new Date(addExpiry)) {
      toast.error("วันเริ่มต้องมาก่อนวันหมดอายุ"); return;
    }
    setAddSubmitting(true);
    try {
      await setDoc(doc(db, "promoCodes", code), {
        kind: "custom",
        enabled: true,
        type: addType,
        amount: addAmount,
        ...(addType === "percent" ? { capThb: addCap } : {}),
        label: addLabel.trim() || `${code} — ${addType === "percent" ? `${addAmount}% off` : `฿${addAmount} off`}`,
        // startsAt at 00:00, expiresAt at end-of-day so the whole picked day counts.
        startsAt: addStart ? Timestamp.fromDate(new Date(`${addStart}T00:00:00`)) : null,
        expiresAt: addExpiry ? Timestamp.fromDate(new Date(`${addExpiry}T23:59:59`)) : null,
        minSpendThb: addMinSpend > 0 ? addMinSpend : null,
        maxRedemptions: addMaxRedemptions > 0 ? addMaxRedemptions : null,
        perPhoneLimit: addPerPhone > 0 ? addPerPhone : null,
        createdAt: serverTimestamp(),
      });
      void logAdminAction("promo.create", { code, type: addType, amount: addAmount });
      setAddOpen(false);
      setAddCode(""); setAddAmount(100); setAddCap(300); setAddLabel("");
      setAddStart(""); setAddExpiry(""); setAddMinSpend(0); setAddMaxRedemptions(0); setAddPerPhone(0); setAddType("fixed");
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

  // 🆕 Round 28s299 — share link is the customer origin + ?promo=CODE,
  //   captured by HomePage into localStorage (see discount.ts).
  const shareUrl = shareCode
    ? `${typeof window !== "undefined" ? window.location.origin : "https://sunred.vip"}/?promo=${encodeURIComponent(shareCode)}`
    : "";
  const copyShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("คัดลอกลิงก์แล้ว");
    } catch {
      toast.error("คัดลอกไม่สำเร็จ — กดค้างที่ลิงก์เพื่อคัดลอกเอง");
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 760, mx: "auto", fontFamily: SANS }}>
      <Typography sx={{ fontFamily: adminFont.serif, fontSize: 22, fontWeight: 600, color: adminColor.text, mb: 0.5 }}>
        Promotions
      </Typography>
      <Typography sx={{ fontSize: 12.5, color: adminColor.muted, mb: 2.5 }}>
        จัดการราคา/บริการ และโค้ดส่วนลด — บันทึกแล้วมีผลกับการจองใหม่ทันที
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* 🆕 Round 28s300 — Pricing & services editor */}
        <SectionCard icon={<Storefront size={13} weight="bold" />} title="ราคา & บริการ">
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1.5 }}>
            แก้ราคาแต่ละช่วงเวลา · เปลี่ยนชื่อ · เปิด/ปิดบริการ — มีผลกับการจองใหม่เท่านั้น (ออเดอร์เก่าล็อกราคาที่จ่ายไว้แล้ว)
          </Typography>
          <Stack spacing={1.5}>
            {svcRows.map((r) => (
              <Box key={r.id} sx={{ p: "11px 12px", borderRadius: "12px", background: adminColor.panel2, opacity: r.enabled ? 1 : 0.6 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  <TextField
                    value={r.name} onChange={(e) => setSvcField(r.id, { name: e.target.value })}
                    size="small" variant="standard" sx={{ flex: 1, "& .MuiInput-input": { fontSize: 13.5, fontWeight: 700, color: adminColor.text } }}
                  />
                  <Typography sx={{ fontSize: 10.5, color: adminColor.dim, flexShrink: 0 }}>{r.id}</Typography>
                  <Switch checked={r.enabled} onChange={(e) => setSvcField(r.id, { enabled: e.target.checked })} sx={switchSx} size="small" />
                </Box>
                <Stack direction="row" spacing={1}>
                  {([["60 น.", "p60"], ["90 น.", "p90"], ["120 น.", "p120"]] as const).map(([lbl, key]) => (
                    <TextField
                      key={key} label={lbl} type="number" size="small" fullWidth sx={fieldSx}
                      value={r[key]}
                      onChange={(e) => setSvcField(r.id, { [key]: Math.max(0, Number(e.target.value)) } as Partial<SvcRow>)}
                      InputProps={{ startAdornment: <span style={{ color: adminColor.dim, fontSize: 12, marginRight: 3 }}>฿</span> }}
                    />
                  ))}
                </Stack>
              </Box>
            ))}

            {/* 🆕 Round 28s301 — admin-created custom services */}
            {customSvcRows.map((r) => (
              <Box key={r.id} sx={{ p: "11px 12px", borderRadius: "12px", background: adminColor.panel2, border: `1px dashed ${adminColor.line2}`, opacity: r.enabled ? 1 : 0.6 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                  {r.image
                    ? <img src={r.image} alt="" width={30} height={30} style={{ borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                    : <Box sx={{ width: 30, height: 30, borderRadius: "8px", background: adminColor.panel3, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Camera size={15} color={adminColor.dim} /></Box>}
                  <TextField
                    value={r.name} onChange={(e) => setCustomField(r.id, { name: e.target.value })}
                    size="small" variant="standard" sx={{ flex: 1, "& .MuiInput-input": { fontSize: 13.5, fontWeight: 700, color: adminColor.text } }}
                  />
                  <Box sx={{ fontSize: 9, fontWeight: 800, color: adminColor.accent, background: `${adminColor.accent}1F`, borderRadius: "5px", px: "5px", py: "1px", flexShrink: 0 }}>NEW</Box>
                  <Switch checked={r.enabled} onChange={(e) => setCustomField(r.id, { enabled: e.target.checked })} sx={switchSx} size="small" />
                  <Button size="small" onClick={() => void handleDeleteCustomService(r.id)} sx={{ color: adminColor.red, minWidth: "auto", p: "3px" }}><Trash size={15} /></Button>
                </Box>
                <Stack direction="row" spacing={1}>
                  {([["60 น.", "p60"], ["90 น.", "p90"], ["120 น.", "p120"]] as const).map(([lbl, key]) => (
                    <TextField
                      key={key} label={lbl} type="number" size="small" fullWidth sx={fieldSx}
                      value={r[key]}
                      onChange={(e) => setCustomField(r.id, { [key]: Math.max(0, Number(e.target.value)) } as Partial<CustomSvcRow>)}
                      InputProps={{ startAdornment: <span style={{ color: adminColor.dim, fontSize: 12, marginRight: 3 }}>฿</span> }}
                    />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>

          <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
            <Button
              variant="contained" disabled={svcSaving || svcRows.length === 0}
              onClick={() => void handleSaveServices()}
              startIcon={svcSaving ? <CircularProgress size={15} sx={{ color: "#fff" }} /> : <FloppyDisk size={15} weight="bold" />}
              sx={{ background: adminColor.accent, textTransform: "none", fontWeight: 700, borderRadius: "10px", "&:hover": { background: adminColor.accentDeep } }}
            >
              {svcSaving ? "กำลังบันทึก…" : "บันทึกราคา/บริการ"}
            </Button>
            <Button
              variant="outlined" startIcon={<Plus size={15} weight="bold" />} onClick={() => setAddSvcOpen(true)}
              sx={{ textTransform: "none", fontWeight: 700, borderColor: adminColor.line2, color: adminColor.accent, borderRadius: "10px" }}
            >
              เพิ่มบริการใหม่
            </Button>
          </Stack>
        </SectionCard>

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
                  <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                    {b.code !== "REFERRAL" && (
                      <Button size="small" onClick={() => setShareCode(b.code)} sx={{ color: adminColor.accent, minWidth: "auto", p: "4px" }} aria-label="Share">
                        <ShareNetwork size={16} />
                      </Button>
                    )}
                    <Switch checked={enabled} onChange={(e) => void handleToggleBuiltin(b.code, e.target.checked)} sx={switchSx} />
                  </Stack>
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
                const now = Date.now();
                const expired = c.expiresAt && c.expiresAt.toMillis() < now;
                const notStarted = c.startsAt && c.startsAt.toMillis() > now;
                // Build the conditions/limits line only from fields that are set.
                const meta: string[] = [];
                if (c.minSpendThb) meta.push(`ขั้นต่ำ ฿${c.minSpendThb.toLocaleString()}`);
                if (c.maxRedemptions) meta.push(`จำกัด ${c.maxRedemptions} ครั้ง`);
                if (c.perPhoneLimit) meta.push(`${c.perPhoneLimit} ครั้ง/เบอร์`);
                if (c.startsAt) meta.push(`เริ่ม ${c.startsAt.toDate().toLocaleDateString("th-TH")}`);
                if (c.expiresAt) meta.push(`${expired ? "หมดอายุแล้ว" : "ถึง"} ${c.expiresAt.toDate().toLocaleDateString("th-TH")}`);
                return (
                  <Box key={c.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, p: "8px 10px", borderRadius: "10px", background: adminColor.panel2, opacity: expired ? 0.6 : 1 }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: adminColor.text }}>
                        {c.id} <span style={{ fontWeight: 400, color: adminColor.dim }}>
                          · {c.type === "percent" ? `${c.amount}% off${c.capThb ? ` (สูงสุด ฿${c.capThb})` : ""}` : `฿${c.amount} off`}
                        </span>
                        {notStarted && <span style={{ color: adminColor.amber, fontWeight: 700 }}> · ยังไม่เริ่ม</span>}
                        {expired && <span style={{ color: adminColor.red, fontWeight: 700 }}> · หมดอายุ</span>}
                      </Typography>
                      <Typography sx={{ fontSize: 11.5, color: adminColor.muted }}>{c.label}</Typography>
                      {meta.length > 0 && (
                        <Typography sx={{ fontSize: 10.5, color: adminColor.dim }}>{meta.join(" · ")}</Typography>
                      )}
                    </Box>
                    <Stack direction="row" spacing={0.5} alignItems="center" sx={{ flexShrink: 0 }}>
                      <Button size="small" onClick={() => setShareCode(c.id)} sx={{ color: adminColor.accent, minWidth: "auto", p: "4px" }} aria-label="Share">
                        <ShareNetwork size={16} />
                      </Button>
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

          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: adminColor.dim, mt: 1, mb: 0.5 }}>
            เงื่อนไข (ไม่บังคับ)
          </Typography>
          <TextField fullWidth type="number" label="ยอดขั้นต่ำ (บาท)" helperText="0 = ไม่กำหนด" value={addMinSpend}
            onChange={(e) => setAddMinSpend(Math.max(0, Number(e.target.value)))} sx={{ ...fieldSx, mb: 1.5 }} />
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <TextField fullWidth type="number" label="จำกัดจำนวนครั้งรวม" helperText="0 = ไม่จำกัด" value={addMaxRedemptions}
              onChange={(e) => setAddMaxRedemptions(Math.max(0, Number(e.target.value)))} sx={fieldSx} />
            <TextField fullWidth type="number" label="ครั้ง/เบอร์" helperText="0 = ไม่จำกัด" value={addPerPhone}
              onChange={(e) => setAddPerPhone(Math.max(0, Number(e.target.value)))} sx={fieldSx} />
          </Stack>
          <Stack direction="row" spacing={1}>
            <TextField fullWidth type="date" label="วันเริ่ม" InputLabelProps={{ shrink: true }} value={addStart}
              onChange={(e) => setAddStart(e.target.value)} sx={fieldSx} />
            <TextField fullWidth type="date" label="วันหมดอายุ" InputLabelProps={{ shrink: true }} value={addExpiry}
              onChange={(e) => setAddExpiry(e.target.value)} sx={fieldSx} />
          </Stack>
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

      {/* 🆕 Round 28s299 — share link + QR. The QR is rendered by a
          public image API (goqr.me) — CSP allows img-src https:, so no
          library/bundle cost; the payload is only a public promo URL, no
          secrets. If admin has promos OFF, the link still works the
          moment she turns them on. */}
      <Dialog open={!!shareCode} onClose={() => setShareCode(null)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontFamily: adminFont.serif, color: adminColor.text }}>
          แชร์โค้ด {shareCode}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12.5, color: adminColor.muted, mb: 1.5 }}>
            ลูกค้าที่เปิดลิงก์นี้จะได้โค้ดใส่ให้อัตโนมัติตอนจอง
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 1.5 }}>
            {shareUrl && (
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=8&data=${encodeURIComponent(shareUrl)}`}
                alt={`QR ${shareCode}`}
                width={200}
                height={200}
                style={{ borderRadius: 12, border: `1px solid ${adminColor.line}` }}
              />
            )}
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, background: adminColor.panel2, border: `1px solid ${adminColor.line}`, borderRadius: "10px", p: "9px 12px" }}>
            <Typography sx={{ fontSize: 12, color: adminColor.text, wordBreak: "break-all", flex: 1 }}>{shareUrl}</Typography>
            <Button onClick={() => void copyShare()} size="small" sx={{ color: adminColor.accent, minWidth: "auto", p: "4px", flexShrink: 0 }} aria-label="Copy">
              <Copy size={16} />
            </Button>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareCode(null)} sx={{ color: adminColor.muted, textTransform: "none", fontWeight: 700 }}>ปิด</Button>
          <Button onClick={() => void copyShare()} variant="contained" startIcon={<Copy size={15} />}
            sx={{ background: adminColor.accent, textTransform: "none", fontWeight: 700, "&:hover": { background: adminColor.accentDeep } }}>
            คัดลอกลิงก์
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🆕 Round 28s301 — add a brand-new custom service */}
      <Dialog open={addSvcOpen} onClose={() => setAddSvcOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, fontFamily: adminFont.serif, color: adminColor.text }}>เพิ่มบริการใหม่</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1.5, mt: 0.5 }}>
            <Box
              component="label"
              sx={{ width: 64, height: 64, borderRadius: "12px", flexShrink: 0, cursor: "pointer", overflow: "hidden", border: `1px dashed ${adminColor.line2}`, background: adminColor.panel2, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}
            >
              {addSvcUploading ? <CircularProgress size={20} sx={{ color: adminColor.accent }} />
                : addSvcImage ? <img src={addSvcImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : <Camera size={22} color={adminColor.dim} />}
              <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUploadSvcImage(f); }} />
            </Box>
            <Typography sx={{ fontSize: 12, color: adminColor.muted }}>แตะเพื่ออัปโหลดรูป (ไม่บังคับ)</Typography>
          </Box>
          <TextField fullWidth autoFocus label="ชื่อบริการ" value={addSvcName} onChange={(e) => setAddSvcName(e.target.value)} sx={{ ...fieldSx, mb: 1.5 }} />
          <TextField fullWidth label="คำอธิบายสั้น (ไม่บังคับ)" value={addSvcDesc} onChange={(e) => setAddSvcDesc(e.target.value)} sx={{ ...fieldSx, mb: 1.5 }} />
          <TextField select fullWidth label="ป้าย" value={addSvcBadge} onChange={(e) => setAddSvcBadge(e.target.value as MassageService["badge"])} sx={{ ...fieldSx, mb: 1.5 }}>
            {BADGE_OPTIONS.map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
          </TextField>
          <Stack direction="row" spacing={1}>
            <TextField fullWidth type="number" label="60 น." value={addSvcP60} onChange={(e) => setAddSvcP60(Math.max(0, Number(e.target.value)))} sx={fieldSx}
              InputProps={{ startAdornment: <span style={{ color: adminColor.dim, fontSize: 12, marginRight: 3 }}>฿</span> }} />
            <TextField fullWidth type="number" label="90 น." value={addSvcP90} onChange={(e) => setAddSvcP90(Math.max(0, Number(e.target.value)))} sx={fieldSx}
              InputProps={{ startAdornment: <span style={{ color: adminColor.dim, fontSize: 12, marginRight: 3 }}>฿</span> }} />
            <TextField fullWidth type="number" label="120 น." value={addSvcP120} onChange={(e) => setAddSvcP120(Math.max(0, Number(e.target.value)))} sx={fieldSx}
              InputProps={{ startAdornment: <span style={{ color: adminColor.dim, fontSize: 12, marginRight: 3 }}>฿</span> }} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddSvcOpen(false)}>Cancel</Button>
          <Button
            onClick={() => void handleAddCustomService()} variant="contained" disabled={addSvcSubmitting || addSvcUploading || !addSvcName.trim()}
            sx={{ background: adminColor.accent, textTransform: "none", fontWeight: 700, "&:hover": { background: adminColor.accentDeep } }}
          >
            {addSvcSubmitting ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "เพิ่มบริการ"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPromotionsPage;
