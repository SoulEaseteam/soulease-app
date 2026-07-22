// src/pages/admin/AdminAdvancedSettingsPage.tsx
//
// 🆕 Round 28s296 (founder: "admin/advanced-settings ปรับแก้ และ
//   ตกแต่งสวยงาม แนะนำ ที่ใช้ได้จริง") — audit found every single one of
//   the 13 fields on this page was pure decoration: `grep -rl` for each
//   field name across the whole repo (src + functions) returned ONLY
//   this file. Nothing ever read `adminSettings/advanced` back —
//   flipping any switch here changed nothing about how the site behaves.
//   Wired maintenanceMode + minAdvanceMins/maxFutureDays for real (see
//   MaintenanceGate.tsx + BookingFlowPage.tsx), removed blockedIps
//   outright (structurally impossible in this stack — no server to read
//   a visitor's real IP from).
//
// 🆕 Round 28s297 (founder, asked directly: "เชื่อม Telegram ให้คุมได้จริง"
//   + "เชื่อมให้แก้ราคาได้จริงจากหน้านี้") — the two remaining categories
//   she said yes to:
//   • Telegram — token stays in Firebase Secret Manager (that's the
//     correct place for a real secret; moving it into an admin-editable
//     Firestore doc would be a security downgrade, not an upgrade), but
//     the ENABLE toggle is now real: functions/src/index.ts checks
//     `adminSettings/advanced.telegramEnabled` (Admin SDK, bypasses
//     rules) before sending a booking/review/overdue/abandoned alert.
//     LINE Notify wasn't part of what she approved (no real system
//     backs it, building one from scratch is a different-sized ask) —
//     removed rather than left decorative.
//   • Deposit & Distance pricing — now genuinely live: taxiFare.ts's
//     hardcoded ADMIN_QUOTE_KM/ROUND_TRIP_MULTIPLIER and
//     DistanceDepositDialog.tsx's FREE_RADIUS_KM/DEPOSIT_THB are all
//     `export let` + overridden from the public `adminSettings/
//     publicRules` doc (see MaintenanceGate.tsx, which already listens
//     on that doc for maintenanceMode and now applies fare config too).
//     IMPORTANT nuance surfaced to the founder: the "deposit" here is
//     informational-only today — grep confirms BookingFlowPage.tsx never
//     actually charges a separate deposit; the real distance-based cost
//     customers pay is the round-trip travel fare. Editing "Deposit
//     Amount" changes what the FAQ dialog tells customers, not a second
//     real charge.
//   PromptPay/Stripe ENABLE toggles were NOT part of either answer (the
//   question was scoped to pricing, not payment-method availability) —
//   left honestly marked "not yet connected" pending a separate call.

import React, { useEffect, useState } from "react";
import { Box, Typography, Switch, TextField, Button, Snackbar, Alert, CircularProgress } from "@mui/material";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { motoFareCheckpoints, motoRoundTripFare } from "@/utils/taxiFare";
import { Clock, CreditCard, Wallet, FloppyDisk, Warning, CheckCircle, MoonStars } from "phosphor-react";
import { adminColor, adminFont } from "@/theme/adminTheme";
import { SectionCard, fieldSx } from "./therapistFormKit";
import { logAdminAction } from "@/utils/auditLog";

const SANS = adminFont.sans;

// Real, enforced — see MaintenanceGate.tsx + BookingFlowPage.tsx + taxiFare.ts.
interface PublicRules {
  maintenanceMode: boolean;
  minAdvanceMins: number;
  maxFutureDays: number;
  maxDistance: number; // = ADMIN_QUOTE_KM, the manual-quote threshold
  roundTripMultiplier: number;
  // 🆕 Round 28s309 — Grab booking fee (per leg) + time-of-day surge %.
  grabBookingFee: number;
  rushSurgePct: number;
  peakSurgePct: number;
  // 🆕 28x.6 (founder: "เทคซี่ละ") — the travel-fee table. Every other fare knob
  //   was already editable here; the ONE number the guest actually pays was not.
  // 🆕 28x.99u — was `travelBands` (TravelBand[], flat "up to X km" shape),
  //   which fed the dead travelBudgetForKm()/calcTravelBudgetResult() pair —
  //   the live moto fare (calcTaxiFare → motoRoundTripFare) hasn't read that
  //   since the 28x.99n checkpoint-interpolation rewrite, so this editor was
  //   saving successfully and changing nothing. Reconnected to the model
  //   that's actually live: [km, round-trip ฿][] checkpoints, interpolated.
  motoFareCheckpoints: [number, number][];
}
const defaultPublicRules: PublicRules = {
  maintenanceMode: false,
  minAdvanceMins: 0,
  maxFutureDays: 0,
  maxDistance: 15,
  roundTripMultiplier: 2.0,
  grabBookingFee: 20,
  rushSurgePct: 25,
  peakSurgePct: 15,
  // Seeded from the live module value so the form's fallback always matches
  // today's real fare, not a second hardcoded copy that can drift from it.
  motoFareCheckpoints: motoFareCheckpoints(),
};

// 🆕 28x.88 — telegramEnabled moved to SunRed Bot → Telegram Bot (still the
//   same adminSettings/advanced.telegramEnabled field, just edited from
//   there now so every Telegram control lives in one place). The two
//   fields below are saved but NOT yet read by anything — see header comment.
interface AdvancedSettings {
  promptPayEnabled: boolean;
  stripeEnabled: boolean;
}
const defaultSettings: AdvancedSettings = {
  promptPayEnabled: true,
  stripeEnabled: false,
};

const switchSx = {
  "& .MuiSwitch-switchBase.Mui-checked": { color: adminColor.accent },
  "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { background: adminColor.accent },
} as const;

// 🆕 Round 28r48 (bilingual pass) — English-primary status badges.
const NotConnectedBadge: React.FC = () => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: adminColor.amber, background: `${adminColor.amber}1A`, borderRadius: "6px", px: "8px", py: "3px" }}>
    <Warning size={12} weight="fill" /> Not Yet Wired · ยังไม่เชื่อม
  </Box>
);
const LiveBadge: React.FC = () => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: adminColor.green, background: `${adminColor.green}1A`, borderRadius: "6px", px: "8px", py: "3px" }}>
    <CheckCircle size={12} weight="fill" /> Live · ใช้งานจริง
  </Box>
);

const Row: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, py: "8px" }}>{children}</Box>
);

const AdminAdvancedSettingsPage: React.FC = () => {
  const [rules, setRules] = useState<PublicRules>(defaultPublicRules);
  const [settings, setSettings] = useState<AdvancedSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" });

  useEffect(() => {
    void (async () => {
      try {
        const [rulesSnap, advSnap] = await Promise.all([
          getDoc(doc(db, "adminSettings", "publicRules")),
          getDoc(doc(db, "adminSettings", "advanced")),
        ]);
        if (rulesSnap.exists()) setRules((prev) => ({ ...prev, ...rulesSnap.data() }));
        if (advSnap.exists()) setSettings((prev) => ({ ...prev, ...advSnap.data() }));
      } catch (err) {
        console.error("Failed to load admin settings:", err);
        setSnackbar({ open: true, message: "โหลดการตั้งค่าไม่สำเร็จ", severity: "error" });
      }
    })();
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await Promise.all([
        setDoc(doc(db, "adminSettings", "publicRules"), { ...rules, updatedAt: serverTimestamp() }, { merge: true }),
        setDoc(doc(db, "adminSettings", "advanced"), { ...settings, updatedAt: serverTimestamp() }, { merge: true }),
      ]);
      void logAdminAction("settings.update", {
        changedFields: [
          rules.maintenanceMode ? "maintenanceMode: ON" : null,
          rules.minAdvanceMins ? `minAdvanceMins: ${rules.minAdvanceMins}` : null,
          rules.maxFutureDays ? `maxFutureDays: ${rules.maxFutureDays}` : null,
          `maxDistance: ${rules.maxDistance}`,
          `roundTripMultiplier: ${rules.roundTripMultiplier}`,
          `grabBookingFee: ${rules.grabBookingFee}`,
          `rushSurgePct: ${rules.rushSurgePct}`,
          `peakSurgePct: ${rules.peakSurgePct}`,
        ].filter((v): v is string => !!v),
      });
      setSnackbar({ open: true, message: "บันทึกการตั้งค่าแล้ว", severity: "success" });
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "บันทึกไม่สำเร็จ", severity: "error" });
    }
    setLoading(false);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 720, mx: "auto", fontFamily: SANS }}>
      {/* 🆕 Round 28r48 (bilingual pass) — English-primary header + Thai subtitle,
          matching Dashboard/Bookings/Earnings r35 convention. */}
      <Typography sx={{ fontFamily: adminFont.serif, fontSize: 22, fontWeight: 600, color: adminColor.text, mb: 0.5, lineHeight: 1 }}>
        Advanced Settings
      </Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.4, letterSpacing: "0.02em", mb: 1.25 }}>
        ตั้งค่าขั้นสูง
      </Typography>
      <Typography sx={{ fontSize: 12.5, color: adminColor.muted, mb: 2.5 }}>
        ตั้งค่าระดับระบบ — บันทึกแล้วมีผลทันที ไม่ต้องรอ deploy
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* 🌙 Maintenance Mode — REAL */}
        <SectionCard icon={<MoonStars size={13} weight="bold" />} title="Maintenance Mode · โหมดปิดปรับปรุง">
          <Box sx={{ mb: 1 }}><LiveBadge /></Box>
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1 }}>
            เปิดแล้วลูกค้าทั่วไปจะเห็นหน้า &ldquo;ปิดปรับปรุงชั่วคราว&rdquo; ทันที (ไม่ต้องรีเฟรช) — แอดมิน/หมอนวดยังเข้าใช้งานได้ตามปกติ
          </Typography>
          <Row>
            <Typography sx={{ fontSize: 13.5, color: adminColor.text }}>Enable maintenance mode · เปิดโหมดปิดปรับปรุง</Typography>
            <Switch
              checked={rules.maintenanceMode}
              onChange={(e) => setRules((prev) => ({ ...prev, maintenanceMode: e.target.checked }))}
              sx={switchSx}
            />
          </Row>
          {rules.maintenanceMode && (
            <Typography sx={{ fontSize: 12, color: adminColor.red, fontWeight: 700, mt: 0.5 }}>
              ⚠️ กำลังปิดรับจองอยู่ตอนนี้ — อย่าลืมปิดสวิตช์นี้เมื่อเสร็จ
            </Typography>
          )}
        </SectionCard>

        {/* ⏰ Booking Rules — REAL */}
        <SectionCard icon={<Clock size={13} weight="bold" />} title="Booking Rules · กฎการจอง">
          <Box sx={{ mb: 1 }}><LiveBadge /></Box>
          <TextField
            label="ต้องจองล่วงหน้าอย่างน้อย (นาที)" fullWidth type="number" margin="dense" sx={fieldSx}
            value={rules.minAdvanceMins}
            helperText="0 = ไม่จำกัด"
            onChange={(e) => setRules((prev) => ({ ...prev, minAdvanceMins: Math.max(0, Number(e.target.value)) }))}
          />
          <TextField
            label="จองล่วงหน้าได้ไม่เกิน (วัน)" fullWidth type="number" margin="dense" sx={fieldSx}
            value={rules.maxFutureDays}
            helperText="0 = ไม่จำกัด"
            onChange={(e) => setRules((prev) => ({ ...prev, maxFutureDays: Math.max(0, Number(e.target.value)) }))}
          />
        </SectionCard>

        {/* 📍 Travel fee — 🆕 28x.6 (founder: "เทคซี่ละ") introduced this
             editable table. 🆕 28x.99u (audit "Audit หน้าเว็บ แอดมินปัจจุบัน
             แบบเจาะลึก") — that table went silently dead when 28x.99n
             rewrote the fare model to interpolate between real spot-checked
             GrabBike checkpoints instead of flat bands: it kept saving to
             Firestore and this card kept showing "Live", but nothing in the
             real fare path (calcTaxiFare → motoRoundTripFare) read the saved
             value anymore. Reconnected — this now edits the actual
             checkpoint table motoRoundTripFare() interpolates between. */}
        <SectionCard icon={<CreditCard size={13} weight="bold" />} title="Travel Fee · ค่าเดินทาง">
          <Box sx={{ mb: 1 }}><LiveBadge /></Box>
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1.5 }}>
            ค่าเดินทาง (รถมอเตอร์ไซค์ · ใช้ตอนไม่มีฝน) = <b>เทียบเคียงจากจุดอ้างอิงราคาจริง</b> แล้วปัดเศษเป็นสิบบาท ·
            ระหว่างจุดจะไล่ราคาขึ้นแบบเนียน ไม่ใช่ขั้นบันได · เกินระยะสูงสุดด้านล่าง → ให้ลูกค้าติดต่อผู้ช่วยส่วนตัวแทนคิดราคาอัตโนมัติ ·
            (วันฝนตกใช้รถยนต์แทน คิดตามมิเตอร์จริง ไม่ใช่ตารางนี้)
          </Typography>

          <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: adminColor.dim, mb: 0.75 }}>
            จุดอ้างอิงราคา (มอเตอร์ไซค์ ไป-กลับ)
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 1.5 }}>
            {rules.motoFareCheckpoints.map(([km, thb], i) => (
              <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Typography sx={{ fontSize: 12, color: adminColor.dim, width: 34, flexShrink: 0 }}>ที่</Typography>
                <TextField
                  type="number" size="small" label="กม." sx={{ ...fieldSx, width: 100 }}
                  value={km}
                  onChange={(e) => {
                    const v = Math.max(0, Number(e.target.value));
                    setRules((p) => ({
                      ...p,
                      motoFareCheckpoints: p.motoFareCheckpoints.map((pt, j) => j === i ? [v, pt[1]] : pt),
                    }));
                  }}
                />
                <Typography sx={{ fontSize: 12, color: adminColor.dim, flexShrink: 0 }}>→</Typography>
                <TextField
                  type="number" size="small" label="ไป-กลับ (฿)" sx={{ ...fieldSx, width: 140 }}
                  value={thb}
                  onChange={(e) => {
                    const v = Math.max(1, Number(e.target.value));
                    setRules((p) => ({
                      ...p,
                      motoFareCheckpoints: p.motoFareCheckpoints.map((pt, j) => j === i ? [pt[0], v] : pt),
                    }));
                  }}
                />
                <Button
                  size="small" variant="text"
                  onClick={() => setRules((p) => ({ ...p, motoFareCheckpoints: p.motoFareCheckpoints.filter((_, j) => j !== i) }))}
                  sx={{ minWidth: "auto", color: adminColor.red, textTransform: "none", fontWeight: 700, fontSize: 12 }}
                >
                  ลบ
                </Button>
              </Box>
            ))}
            <Button
              size="small" variant="text"
              onClick={() => setRules((p) => ({
                ...p,
                motoFareCheckpoints: [
                  ...p.motoFareCheckpoints,
                  [(p.motoFareCheckpoints.at(-1)?.[0] ?? 0) + 5, (p.motoFareCheckpoints.at(-1)?.[1] ?? 0) + 100],
                ],
              }))}
              sx={{ alignSelf: "flex-start", color: adminColor.accent, textTransform: "none", fontWeight: 700, fontSize: 12.5 }}
            >
              + เพิ่มจุด
            </Button>
          </Box>

          {/* Live preview — a wrong checkpoint is far easier to see as a fare than as a table. */}
          <Typography sx={{ fontSize: 11, color: adminColor.dim, mb: 1.5, lineHeight: 1.7 }}>
            ลองคิดจริง:{" "}
            {[3, 8, 12, 18, 25].map((km) => {
              const overQuote = km > rules.maxDistance;
              const f = overQuote ? null : motoRoundTripFare(km);
              return (
                <Box key={km} component="span" sx={{ mr: 1.25 }}>
                  {km} กม. → <b style={{ color: adminColor.text }}>{f === null ? "ผู้ช่วยส่วนตัวเสนอราคา" : `฿${f.toLocaleString()}`}</b>
                </Box>
              );
            })}
            <br />
            <i>(ตัวอย่างนี้ใช้ค่าที่บันทึกแล้ว — กดบันทึกก่อนถึงจะอัปเดต)</i>
          </Typography>

          <TextField label="ระยะทางสูงสุดก่อนต้องยืนยันกับแอดมิน (กม.)" fullWidth type="number" margin="dense" sx={fieldSx}
            helperText="เกินระยะนี้ระบบให้ติดต่อผู้ช่วยส่วนตัวแทนคิดราคาอัตโนมัติ"
            value={rules.maxDistance} onChange={(e) => setRules((p) => ({ ...p, maxDistance: Math.max(1, Number(e.target.value)) }))} />
        </SectionCard>

        {/* 💳 Payment Methods — NOT YET CONNECTED */}
        <SectionCard icon={<Wallet size={13} weight="bold" />} title="Payment Methods · ช่องทางชำระเงิน">
          <Box sx={{ mb: 1 }}><NotConnectedBadge /></Box>
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1 }}>
            PromptPay เป็นตัวเลือกที่เปิดใช้อยู่แล้วในหน้าชำระเงินจริง (ล็อกไว้ในโค้ด) Stripe ยังไม่มีระบบเลย — สวิตช์นี้ยังไม่ได้คุมว่าลูกค้าจะเห็นช่องทางไหนบ้าง
          </Typography>
          <Row>
            <Typography sx={{ fontSize: 13.5, color: adminColor.text }}>Enable PromptPay QR</Typography>
            <Switch checked={settings.promptPayEnabled} onChange={(e) => setSettings((p) => ({ ...p, promptPayEnabled: e.target.checked }))} sx={switchSx} />
          </Row>
          <Row>
            <Typography sx={{ fontSize: 13.5, color: adminColor.text }}>Enable Stripe Payments</Typography>
            <Switch checked={settings.stripeEnabled} onChange={(e) => setSettings((p) => ({ ...p, stripeEnabled: e.target.checked }))} sx={switchSx} />
          </Row>
        </SectionCard>
      </Box>

      <Button
        variant="contained"
        disabled={loading}
        onClick={() => void handleSave()}
        startIcon={loading ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : <FloppyDisk size={16} weight="bold" />}
        sx={{ mt: 2.5, background: adminColor.accent, textTransform: "none", fontWeight: 700, borderRadius: "10px", px: 3, "&:hover": { background: adminColor.accentDeep } }}
      >
        {loading ? "กำลังบันทึก…" : "Save Settings · บันทึก"}
      </Button>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={2800}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminAdvancedSettingsPage;
