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
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { adminColor, adminFont } from "@/theme/adminTheme";
import { normPhone } from "@/utils/phoneCountry";
import {
  MEMBERSHIP_TIERS, MEMBERSHIP_COLORS, MEMBERSHIP_LABELS_TH, MEMBERSHIP_DEFAULTS,
  applyMembershipConfig, effectiveMembershipConfig, membershipFor,
  type MembershipThresholds, type MembershipTier,
} from "@/utils/membership";
import { Crown, Prohibit } from "phosphor-react";

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

  // seed from saved config
  useEffect(() => {
    void getDoc(doc(db, "adminSettings", "membership")).then((snap) => {
      applyMembershipConfig((snap.data() as Partial<MembershipThresholds>) ?? null);
      const eff = effectiveMembershipConfig();
      setMinVisits(toStrMap(eff.minVisits));
      setMinSpend(toStrMap(eff.minSpend));
      setDemoteDays(String(eff.demoteAfterDays));
    });
  }, []);

  // load every customer (grouped by phone) to count tiers live
  useEffect(() => {
    const SERVED = new Set(["completed", "done"]);
    const NOSHOW = new Set(["no_show", "no-show", "noshow"]);
    void getDocs(collection(db, "bookings")).then((snap) => {
      const map: Record<string, CustStat> = {};
      snap.forEach((d) => {
        const b = d.data() as {
          phone?: string; status?: string; totalPrice?: number; servicePrice?: number;
          createdAt?: { toDate?: () => Date; seconds?: number };
          startAt?: { toDate?: () => Date; seconds?: number };
        };
        const phone = normPhone((b.phone ?? "").trim());
        if (!phone) return;
        const row = (map[phone] ??= { served: 0, totalSpent: 0, lastVisitMs: 0, noShowCount: 0 });
        const st = b.status ?? "";
        if (NOSHOW.has(st)) row.noShowCount++;
        if (SERVED.has(st)) {
          row.served++;
          row.totalSpent += b.totalPrice ?? b.servicePrice ?? 0;
          const t = b.createdAt ?? b.startAt;
          const ms = t?.toDate ? t.toDate().getTime() : (typeof t?.seconds === "number" ? t.seconds * 1000 : 0);
          if (ms > row.lastVisitMs) row.lastVisitMs = ms;
        }
      });
      setStats(Object.values(map));
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

  const edit = (setter: React.Dispatch<React.SetStateAction<StrMap>>, t: MembershipTier, v: string) => {
    setDirty(true); setSaved(false);
    setter((p) => ({ ...p, [t]: v.replace(/[^\d]/g, "") }));
  };

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "adminSettings", "membership"), { ...draftCfg, updatedAt: serverTimestamp() }, { merge: true });
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
        ยศลูกค้าตัดจาก <b>จำนวนครั้งที่มา</b> หรือ <b>ยอดใช้จ่ายรวม</b> (เอายศสูงสุดที่เข้าเกณฑ์) · ลูกค้าที่ไม่มาเกินกำหนดจะ<b>ลดขั้น 1 ระดับ</b> · ป้าย “With no-shows” ติดเพิ่มถ้าเคยไม่มา
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
                sx={{ "& .MuiInputBase-input": { fontFamily: SANS, fontSize: 13 } }}
              />
              <TextField
                label="ยอดใช้จ่าย ≥ (฿)"
                value={minSpend[t]}
                onChange={(e) => edit(setMinSpend, t, e.target.value)}
                size="small"
                inputProps={{ inputMode: "numeric" }}
                sx={{ "& .MuiInputBase-input": { fontFamily: SANS, fontSize: 13 } }}
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
          sx={{ width: 200, "& .MuiInputBase-input": { fontFamily: SANS, fontSize: 13 } }}
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
