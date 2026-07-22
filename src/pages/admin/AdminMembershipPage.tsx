// src/pages/admin/AdminMembershipPage.tsx
//
// 🆕 Round 28w.59 (founder "ทำเมนู Membership มี Bronze/Silver/Gold/BlackVIP") —
//   admin page to define the membership tiers and see how many customers fall
//   in each. Tiers are earned by the HIGHER of (visits, spend); a customer is
//   demoted one tier after N days of inactivity ("ลดขั้นหากมากกว่า 3 เดือน").
//   "With no-shows" is a separate stacking flag shown on orders.
//
//   Thresholds save to adminSettings/membership and drive the order badges on
//   the Bookings page via the shared util (@/utils/membership).

import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, TextField, Button, CircularProgress } from "@mui/material";
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { adminColor, adminFont, adminFieldSx } from "@/theme/adminTheme";
import { normPhone } from "@/utils/phoneCountry";
import { toast } from "react-toastify";
import { logAdminAction } from "@/utils/auditLog";
import {
  applyLiveAnniversaryConfig,
  sunPointEarnPerTHB,
  sunPointTHB,
} from "@/config/anniversary";
import {
  MEMBERSHIP_TIERS, MEMBERSHIP_COLORS, MEMBERSHIP_LABELS_TH, MEMBERSHIP_DEFAULTS,
  applyMembershipConfig, effectiveMembershipConfig, membershipFor, menuSpendForBooking, isReservedShopBooking, isTestLocationBooking,
  type MembershipThresholds, type MembershipTier,
} from "@/utils/membership";
import { Crown, Prohibit, Coins } from "phosphor-react";

const SANS = adminFont.sans;
const thb = (n: number) => `฿${Math.round(n).toLocaleString()}`;

type CustStat = { served: number; totalSpent: number; lastVisitMs: number; noShowCount: number };
type StrMap = Record<MembershipTier, string>;

const toStrMap = (m: Record<MembershipTier, number>): StrMap =>
  MEMBERSHIP_TIERS.reduce((o, t) => { o[t] = String(m[t]); return o; }, {} as StrMap);

const parseMap = (m: StrMap, fallback: Record<MembershipTier, number>): Record<MembershipTier, number> =>
  MEMBERSHIP_TIERS.reduce((o, t) => {
    const n = parseInt(m[t], 10);
    o[t] = Number.isFinite(n) && n >= 0 ? n : fallback[t];
    return o;
  }, {} as Record<MembershipTier, number>);

const AdminMembershipPage: React.FC = () => {
  const [minVisits, setMinVisits] = useState<StrMap>(toStrMap(MEMBERSHIP_DEFAULTS.minVisits));
  const [minSpend,  setMinSpend]  = useState<StrMap>(toStrMap(MEMBERSHIP_DEFAULTS.minSpend));
  const [demoteDays, setDemoteDays] = useState(String(MEMBERSHIP_DEFAULTS.demoteAfterDays));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [stats, setStats] = useState<CustStat[]>([]);
  const [loaded, setLoaded] = useState(false);

  // 🆕 28w.61 — staff bonus: therapist earns ฿bonus for every N completed orders
  //   (recurring). Editable; stored alongside the membership thresholds.
  const [staffPer, setStaffPer] = useState("1000");
  const [staffAmt, setStaffAmt] = useState("5000");
  const [staffStats, setStaffStats] = useState<{ name: string; completed: number }[]>([]);

  // seed from saved config
  useEffect(() => {
    void getDoc(doc(db, "adminSettings", "membership")).then((snap) => {
      const d = (snap.data() as (Partial<MembershipThresholds> & { staffBonusPerOrders?: number; staffBonusAmount?: number }) | undefined) ?? {};
      applyMembershipConfig(d);
      const eff = effectiveMembershipConfig();
      setMinVisits(toStrMap(eff.minVisits));
      setMinSpend(toStrMap(eff.minSpend));
      setDemoteDays(String(eff.demoteAfterDays));
      setStaffPer(String(d.staffBonusPerOrders ?? 1000));
      setStaffAmt(String(d.staffBonusAmount ?? 5000));
    });
  }, []);

  // load every customer (grouped by phone) to count tiers live
  useEffect(() => {
    const SERVED = new Set(["completed", "done"]);
    const NOSHOW = new Set(["no_show", "no-show", "noshow"]);
    void getDocs(collection(db, "bookings")).then((snap) => {
      const map: Record<string, CustStat> = {};
      const tmap: Record<string, { name: string; completed: number }> = {};
      snap.forEach((d) => {
        const b = d.data() as {
          phone?: string; status?: string; totalPrice?: number; servicePrice?: number;
          taxiFee?: number; paymentFee?: number;
          contactName?: string; customerName?: string;
          locationName?: string; address?: string;
          therapistId?: string; therapistName?: string;
          createdAt?: { toDate?: () => Date; seconds?: number };
          startAt?: { toDate?: () => Date; seconds?: number };
        };
        const st = b.status ?? "";
        // therapist tally — completed orders per therapist (staff bonus basis)
        if (SERVED.has(st)) {
          const tkey = (b.therapistId || b.therapistName || "").trim();
          if (tkey) {
            const tr = (tmap[tkey] ??= { name: b.therapistName || tkey, completed: 0 });
            tr.completed++;
            if (b.therapistName) tr.name = b.therapistName;
          }
        }
        const phone = normPhone((b.phone ?? "").trim());
        if (!phone) return;
        // 🆕 28x.99u — admin's own placeholder-phone bookings aren't a real
        //   customer identity; skip so this can't inflate the tier preview.
        // 🆕 28x.99v — plus known QA test addresses (see isTestLocationBooking).
        if (isReservedShopBooking(b) || isTestLocationBooking(b)) return;
        const row = (map[phone] ??= { served: 0, totalSpent: 0, lastVisitMs: 0, noShowCount: 0 });
        if (NOSHOW.has(st)) row.noShowCount++;
        if (SERVED.has(st)) {
          row.served++;
          // 🆕 28x.99u — was `b.totalPrice ?? b.servicePrice ?? 0`; matches
          //   AdminMembersPage's canonical 28x.38 menu-only formula now, so
          //   this live threshold preview can't disagree with the real roster.
          row.totalSpent += menuSpendForBooking(b);
          const t = b.createdAt ?? b.startAt;
          const ms = t?.toDate ? t.toDate().getTime() : (typeof t?.seconds === "number" ? t.seconds * 1000 : 0);
          if (ms > row.lastVisitMs) row.lastVisitMs = ms;
        }
      });
      setStats(Object.values(map));
      setStaffStats(Object.values(tmap).sort((a, b) => b.completed - a.completed));
      setLoaded(true);
    });
  }, []);

  const nowMs = useMemo(() => Date.now(), []);
  const draftCfg = useMemo<MembershipThresholds>(() => ({
    minVisits: parseMap(minVisits, MEMBERSHIP_DEFAULTS.minVisits),
    minSpend:  parseMap(minSpend,  MEMBERSHIP_DEFAULTS.minSpend),
    demoteAfterDays: (() => { const n = parseInt(demoteDays, 10); return Number.isFinite(n) && n >= 0 ? n : MEMBERSHIP_DEFAULTS.demoteAfterDays; })(),
  }), [minVisits, minSpend, demoteDays]);

  // live counts per tier (+ demoted / no-show / no-tier) under the DRAFT config
  const counts = useMemo(() => {
    const c = { Bronze: 0, Silver: 0, Gold: 0, BlackVIP: 0, none: 0, noShow: 0, demoted: 0 } as Record<string, number>;
    for (const s of stats) {
      const m = membershipFor(s, nowMs, draftCfg);
      if (m.tier) c[m.tier]++; else c.none++;
      if (m.demoted) c.demoted++;
      if (m.hasNoShow) c.noShow++;
    }
    return c;
  }, [stats, draftCfg, nowMs]);

  // 🆕 28w.96 (founder: "admin/membership ตั้งค่า SunPoints และ อื่นๆ") — the two
  //   loyalty rates. They live on publicRules (guests must be able to read the
  //   rate they earn at) but are EDITED here, with the rest of the membership
  //   rules. Deliberately not also editable on /admin/promotions: two editors
  //   writing the same two numbers is how they end up disagreeing.
  const [earnPerTHB, setEarnPerTHB] = useState<string>(String(sunPointEarnPerTHB()));
  const [redeemTHB, setRedeemTHB] = useState<string>(String(sunPointTHB()));
  const [ptSaving, setPtSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "adminSettings", "publicRules"), (snap) => {
      const a = snap.data()?.anniversary as { earnPerTHB?: number; redeemTHB?: number } | undefined;
      applyLiveAnniversaryConfig((snap.data()?.anniversary ?? null) as never);
      if (typeof a?.earnPerTHB === "number") setEarnPerTHB(String(a.earnPerTHB));
      if (typeof a?.redeemTHB === "number") setRedeemTHB(String(a.redeemTHB));
    });
    return () => unsub();
  }, []);

  const savePoints = async () => {
    const earn = parseInt(earnPerTHB, 10);
    const redeem = parseInt(redeemTHB, 10);
    // Guard hard. A zero earn-rate divides the programme by zero; a mistyped
    // redeem rate is the difference between a 1% and a 100% giveaway.
    if (!earn || earn <= 0 || !redeem || redeem <= 0) {
      toast.error("อัตราคะแนนต้องมากกว่า 0");
      return;
    }
    setPtSaving(true);
    try {
      await setDoc(
        doc(db, "adminSettings", "publicRules"),
        { anniversary: { earnPerTHB: earn, redeemTHB: redeem }, updatedAt: serverTimestamp() },
        { merge: true },
      );
      void logAdminAction("membership.sunpoints_edit", { earnPerTHB: earn, redeemTHB: redeem });
      toast.success("บันทึกอัตรา SunPoints แล้ว");
    } catch (e) {
      console.error("[membership] sunpoints save failed", e);
      toast.error("บันทึกไม่สำเร็จ");
    } finally {
      setPtSaving(false);
    }
  };

  const edit = (setter: React.Dispatch<React.SetStateAction<StrMap>>, t: MembershipTier, v: string) => {
    setDirty(true); setSaved(false);
    setter((p) => ({ ...p, [t]: v.replace(/[^\d]/g, "") }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "adminSettings", "membership"), {
        ...draftCfg,
        staffBonusPerOrders: parseInt(staffPer, 10) || 1000,
        staffBonusAmount: parseInt(staffAmt, 10) || 0,
        updatedAt: serverTimestamp(),
      }, { merge: true });
      applyMembershipConfig(draftCfg);
      setDirty(false); setSaved(true);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[membership] save failed", e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 720, mx: "auto", px: { xs: 2, md: 3 }, py: { xs: 2, md: 3 } }}>
      <Typography sx={{ fontFamily: SANS, fontSize: 22, fontWeight: 800, color: adminColor.text, letterSpacing: "-0.01em" }}>
        Membership
      </Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: adminColor.muted, mt: 0.5, mb: 2.5, lineHeight: 1.55 }}>
        Level ลูกค้าตัดจาก <b>จำนวนครั้งที่มา</b> หรือ <b>ยอดใช้จ่ายรวม</b> (เอา Level สูงสุดที่เข้าเกณฑ์) · ลูกค้าที่ไม่มาเกินกำหนดจะ<b>ลดขั้น 1 ระดับ</b> · ป้าย “With no-shows” ติดเพิ่มถ้าเคยไม่มา
      </Typography>

      {/* tier cards */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
        {MEMBERSHIP_TIERS.map((t) => {
          const color = MEMBERSHIP_COLORS[t];
          return (
            <Box
              key={t}
              sx={{
                borderRadius: "16px", background: adminColor.panel,
                border: `1px solid ${adminColor.line}`, borderLeft: `4px solid ${color}`,
                p: { xs: 1.5, md: 2 },
                display: "grid",
                gridTemplateColumns: { xs: "1fr 1fr", sm: "150px 1fr 1fr 84px" },
                gap: 1.25, alignItems: "center",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, gridColumn: { xs: "1 / -1", sm: "auto" } }}>
                <Crown size={20} weight="fill" color={color} />
                <Box>
                  <Typography sx={{ fontFamily: SANS, fontSize: 14, fontWeight: 800, color: adminColor.text, lineHeight: 1.1 }}>{t}</Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: adminColor.dim }}>{MEMBERSHIP_LABELS_TH[t]}</Typography>
                </Box>
              </Box>
              <TextField
                label="ครั้งที่มา ≥"
                value={minVisits[t]}
                onChange={(e) => edit(setMinVisits, t, e.target.value)}
                size="small"
                inputProps={{ inputMode: "numeric" }}
                sx={adminFieldSx}
              />
              <TextField
                label="ยอดใช้จ่าย ≥ (฿)"
                value={minSpend[t]}
                onChange={(e) => edit(setMinSpend, t, e.target.value)}
                size="small"
                inputProps={{ inputMode: "numeric" }}
                sx={adminFieldSx}
              />
              <Box sx={{ textAlign: { xs: "left", sm: "right" }, gridColumn: { xs: "1 / -1", sm: "auto" } }}>
                <Typography sx={{ fontFamily: SANS, fontSize: 18, fontWeight: 800, color, lineHeight: 1 }}>
                  {loaded ? counts[t] : "–"}
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: adminColor.dim, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  ลูกค้า
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* demotion + no-show summary */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", mt: 2 }}>
        <TextField
          label="ลดขั้นถ้าไม่มาเกิน (วัน)"
          value={demoteDays}
          onChange={(e) => { setDirty(true); setSaved(false); setDemoteDays(e.target.value.replace(/[^\d]/g, "")); }}
          size="small"
          inputProps={{ inputMode: "numeric" }}
          sx={{ ...adminFieldSx, width: 200 }}
        />
        <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: adminColor.dim }}>
          (90 วัน ≈ 3 เดือน) · ลดครั้งละ 1 ขั้น (ต่ำสุด Bronze)
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mt: 1.75, color: adminColor.muted }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
          <Prohibit size={16} color={adminColor.red} weight="duotone" />
          <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.text, fontWeight: 700 }}>
            {loaded ? counts.noShow : "–"} <span style={{ color: adminColor.dim, fontWeight: 500 }}>ลูกค้ามีประวัติ no-show</span>
          </Typography>
        </Box>
        <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.text, fontWeight: 700 }}>
          {loaded ? counts.demoted : "–"} <span style={{ color: adminColor.dim, fontWeight: 500 }}>ถูกลดขั้น (ไม่มานาน)</span>
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.text, fontWeight: 700 }}>
          {loaded ? counts.none : "–"} <span style={{ color: adminColor.dim, fontWeight: 500 }}>ยังไม่เข้าเกณฑ์</span>
        </Typography>
      </Box>

      {/* 🆕 28w.96 (founder: "admin/membership ตั้งค่า SunPoints และ อื่นๆ") — the two
          loyalty rates. Deliberately TWO fields, not one "points rate": earning
          (฿ per point) and redeeming (฿ per point) are different numbers and are
          very easy to conflate — swapping them turns a 1% programme into a 100%
          one. The worked example under them recomputes as you type, so a wrong
          rate is visible before it is saved. */}
      <Box sx={{ mt: 3.5, pt: 2.5, borderTop: `1px solid ${adminColor.line}` }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Coins size={17} weight="duotone" color="#E3BE55" />
          <Typography sx={{ fontFamily: SANS, fontSize: 16, fontWeight: 800, color: adminColor.text }}>
            SunPoints
          </Typography>
        </Box>
        <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: adminColor.muted, mt: 0.5, mb: 1.5, lineHeight: 1.5 }}>
          คะแนนสะสมของลูกค้า · ลูกค้าเห็นอัตรานี้ในแอป และใช้คิดเครดิตย้อนหลังจากประวัติการจอง
        </Typography>
        <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap", alignItems: "flex-start" }}>
          <TextField
            size="small" label="ใช้จ่ายกี่บาท = 1 คะแนน" value={earnPerTHB}
            onChange={(e) => setEarnPerTHB(e.target.value.replace(/[^\d]/g, ""))}
            sx={{ ...adminFieldSx, width: 200 }}
          />
          <TextField
            size="small" label="1 คะแนน = ลดกี่บาท" value={redeemTHB}
            onChange={(e) => setRedeemTHB(e.target.value.replace(/[^\d]/g, ""))}
            sx={{ ...adminFieldSx, width: 180 }}
          />
          <Button
            variant="contained" disabled={ptSaving} onClick={() => void savePoints()}
            sx={{ textTransform: "none", fontWeight: 700, fontSize: 13, borderRadius: "999px", px: 2.5,
              background: "linear-gradient(135deg,#D97C95,#C96F89)",
              "&.Mui-disabled": { opacity: 0.5, color: "#fff" } }}
          >
            {ptSaving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "บันทึก"}
          </Button>
        </Box>
        <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: adminColor.dim, mt: 1 }}>
          ตัวอย่าง: จ่าย ฿1,200 → ได้{" "}
          <b>{Math.floor(1200 / (parseInt(earnPerTHB, 10) || 100))} คะแนน</b>{" "}
          (ใช้ลดได้ ฿{(Math.floor(1200 / (parseInt(earnPerTHB, 10) || 100)) * (parseInt(redeemTHB, 10) || 1)).toLocaleString()})
          · ช่วงแคมเปญ 2× ได้{" "}
          <b>{Math.floor(1200 / (parseInt(earnPerTHB, 10) || 100)) * 2} คะแนน</b>
        </Typography>
      </Box>

      {/* 🆕 28w.61 — Staff bonus (therapist): ฿bonus every N completed orders */}
      <Box sx={{ mt: 3.5, pt: 2.5, borderTop: `1px solid ${adminColor.line}` }}>
        <Typography sx={{ fontFamily: SANS, fontSize: 16, fontWeight: 800, color: adminColor.text }}>
          โบนัสพนักงาน (Staff Bonus)
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: 12.5, color: adminColor.muted, mt: 0.5, mb: 1.5, lineHeight: 1.5 }}>
          หมอที่ทำงานสำเร็จครบทุกๆ <b>N ออเดอร์</b> (นับสะสมทั้งหมด) ได้โบนัสก้อน · ได้ซ้ำทุกครั้งที่ครบอีกรอบ
        </Typography>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5, alignItems: "center", mb: 2 }}>
          <TextField
            label="ครบทุก (ออเดอร์)"
            value={staffPer}
            onChange={(e) => { setDirty(true); setSaved(false); setStaffPer(e.target.value.replace(/[^\d]/g, "")); }}
            size="small" inputProps={{ inputMode: "numeric" }}
            sx={{ ...adminFieldSx, width: 150 }}
          />
          <TextField
            label="โบนัส (฿)"
            value={staffAmt}
            onChange={(e) => { setDirty(true); setSaved(false); setStaffAmt(e.target.value.replace(/[^\d]/g, "")); }}
            size="small" inputProps={{ inputMode: "numeric" }}
            sx={{ ...adminFieldSx, width: 150 }}
          />
          <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: adminColor.dim }}>เช่น ครบทุก 1,000 ออเดอร์ ได้ ฿5,000</Typography>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
          {(() => {
            const perN = Math.max(1, parseInt(staffPer, 10) || 1000);
            const amt = parseInt(staffAmt, 10) || 0;
            if (!loaded) return <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.dim }}>กำลังโหลด…</Typography>;
            if (staffStats.length === 0) return <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.dim }}>ยังไม่มีข้อมูลพนักงาน</Typography>;
            return staffStats.map((t) => {
              const rounds = Math.floor(t.completed / perN);
              const bonus = rounds * amt;
              const into = t.completed % perN;
              const pct = Math.min(100, Math.round((into / perN) * 100));
              return (
                <Box key={t.name} sx={{ background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "12px", p: "10px 14px", display: "grid", gridTemplateColumns: { xs: "1fr auto", sm: "150px 1fr auto" }, gap: 1.25, alignItems: "center" }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: 13.5, fontWeight: 700, color: adminColor.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</Typography>
                  <Box sx={{ display: { xs: "none", sm: "block" } }}>
                    <Box sx={{ height: 6, borderRadius: 999, background: `${adminColor.accent}22`, overflow: "hidden" }}>
                      <Box sx={{ height: "100%", width: `${pct}%`, background: adminColor.accent }} />
                    </Box>
                    <Typography sx={{ fontFamily: SANS, fontSize: 10, color: adminColor.dim, mt: 0.4 }}>
                      {t.completed.toLocaleString()} ออเดอร์ · อีก {(perN - into).toLocaleString()} ครบรอบหน้า{rounds > 0 ? ` · ครบแล้ว ${rounds} รอบ` : ""}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography sx={{ fontFamily: SANS, fontSize: 15, fontWeight: 800, color: bonus > 0 ? "#57B88B" : adminColor.dim, lineHeight: 1 }}>{thb(bonus)}</Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: 9.5, color: adminColor.dim, textTransform: "uppercase", letterSpacing: "0.05em" }}>โบนัสสะสม</Typography>
                  </Box>
                </Box>
              );
            });
          })()}
        </Box>
      </Box>

      {/* save */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 2.5 }}>
        <Button
          onClick={save}
          disabled={!dirty || saving}
          variant="contained"
          sx={{
            textTransform: "none", fontFamily: SANS, fontWeight: 700, fontSize: 13, borderRadius: "999px", px: 2.5,
            background: "linear-gradient(135deg,#D97C95,#C96F89)",
            "&:hover": { background: "linear-gradient(135deg,#C96F89,#B36079)" },
            "&.Mui-disabled": { opacity: 0.5, color: "#fff" },
          }}
        >
          {saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "บันทึกเกณฑ์"}
        </Button>
        {saved && !dirty && (
          <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "#57B88B", fontWeight: 700 }}>บันทึกแล้ว ✓</Typography>
        )}
      </Box>
    </Box>
  );
};

export default AdminMembershipPage;
