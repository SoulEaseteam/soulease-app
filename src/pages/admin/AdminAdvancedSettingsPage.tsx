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
import { DEFAULT_TRAVEL_BANDS, travelBudgetForKm, type TravelBand } from "@/utils/taxiFare";
import { Clock, BellRinging, CreditCard, Wallet, FloppyDisk, Warning, CheckCircle, MoonStars } from "phosphor-react";
import { adminColor, adminFont } from "@/theme/adminTheme";
import { SectionCard, fieldSx } from "@/components/admin/therapistFormKit";
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
  travelBands: TravelBand[];
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
  travelBands: DEFAULT_TRAVEL_BANDS,
};

// telegramEnabled is real (see functions/src/index.ts). The rest is
// saved but NOT yet read by anything — see header comment.
interface AdvancedSettings {
  telegramEnabled: boolean;
  promptPayEnabled: boolean;
  stripeEnabled: boolean;
}
const defaultSettings: AdvancedSettings = {
  telegramEnabled: true,
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
          `telegramEnabled: ${settings.telegramEnabled}`,
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
            เปิดแล้วลูกค้าทั่วไปจะเห็นหน้า &quot;ปิดปรับปรุงชั่วคราว&quot; ทันที (ไม่ต้องรีเฟรช) — แอดมิน/หมอนวดยังเข้าใช้งานได้ตามปกติ
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

        {/* 🔔 Notifications — Telegram REAL, LINE removed */}
        <SectionCard icon={<BellRinging size={13} weight="bold" />} title="Notifications · การแจ้งเตือน">
          <Box sx={{ mb: 1 }}><LiveBadge /></Box>
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1 }}>
            Token เก็บใน Firebase Secret Manager (แก้ตรงนี้ไม่ได้ และไม่ควรเก็บใน Firestore เพื่อความปลอดภัย) — สวิตช์นี้แค่หยุด/เปิดการส่งข้อความจริง
          </Typography>
          <Row>
            <Typography sx={{ fontSize: 13.5, color: adminColor.text }}>Enable Telegram Notifications</Typography>
            <Switch checked={settings.telegramEnabled} onChange={(e) => setSettings((p) => ({ ...p, telegramEnabled: e.target.checked }))} sx={switchSx} />
          </Row>
        </SectionCard>

        {/* 📍 Travel fee — 🆕 28x.6 (founder: "เทคซี่ละ")
             REWRITTEN. This section used to explain a GrabCar meter formula
             (meter x round-trip multiplier + booking fee x surge) and offer four
             fields to tune it. Since 28w.11 the booking charges a FLAT BAND TABLE
             and ignores all of that: roundTripMultiplier, rushSurgePct and
             peakSurgePct are referenced nowhere outside taxiFare.ts, and
             grabBookingFee only ever appeared in a customer tooltip — it was never
             added to a bill. So the page described a formula we do not use, let her
             tune knobs that changed nothing, and did NOT let her edit the one number
             a guest actually pays. Those four fields are gone; the table is here. */}
        <SectionCard icon={<CreditCard size={13} weight="bold" />} title="Travel Fee · ค่าเดินทาง">
          <Box sx={{ mb: 1 }}><LiveBadge /></Box>
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1.5 }}>
            ค่าเดินทาง = <b>เหมาตามระยะจริง (ระยะถนน)</b> · ไม่ใช่มิเตอร์ ไม่มี surge ไม่บวกค่าเรียกรถ ·
            เกินระยะสูงสุดด้านล่าง → ให้ลูกค้าติดต่อคอนเซียร์จแทนคิดราคาอัตโนมัติ
          </Typography>

          <Typography sx={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: adminColor.dim, mb: 0.75 }}>
            ตารางค่าเดินทาง
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 1.5 }}>
            {rules.travelBands.map((b, i) => (
              <Box key={i} sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Typography sx={{ fontSize: 12, color: adminColor.dim, width: 34, flexShrink: 0 }}>ไม่เกิน</Typography>
                <TextField
                  type="number" size="small" label="กม." sx={{ ...fieldSx, width: 100 }}
                  value={b.maxKm}
                  onChange={(e) => {
                    const v = Math.max(1, Number(e.target.value));
                    setRules((p) => ({ ...p, travelBands: p.travelBands.map((x, j) => j === i ? { ...x, maxKm: v } : x) }));
                  }}
                />
                <Typography sx={{ fontSize: 12, color: adminColor.dim, flexShrink: 0 }}>→</Typography>
                <TextField
                  type="number" size="small" label="ค่าเดินทาง (฿)" sx={{ ...fieldSx, width: 140 }}
                  value={b.fareTHB}
                  onChange={(e) => {
                    const v = Math.max(1, Number(e.target.value));
                    setRules((p) => ({ ...p, travelBands: p.travelBands.map((x, j) => j === i ? { ...x, fareTHB: v } : x) }));
                  }}
                />
                <Button
                  size="small" variant="text"
                  onClick={() => setRules((p) => ({ ...p, travelBands: p.travelBands.filter((_, j) => j !== i) }))}
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
                travelBands: [...p.travelBands, { maxKm: (p.travelBands.at(-1)?.maxKm ?? 0) + 5, fareTHB: (p.travelBands.at(-1)?.fareTHB ?? 0) + 100 }],
              }))}
              sx={{ alignSelf: "flex-start", color: adminColor.accent, textTransform: "none", fontWeight: 700, fontSize: 12.5 }}
            >
              + เพิ่มช่วง
            </Button>
          </Box>

          {/* Live preview — a wrong band is far easier to see as a fare than as a table. */}
          <Typography sx={{ fontSize: 11, color: adminColor.dim, mb: 1.5, lineHeight: 1.7 }}>
            ลองคิดจริง:{" "}
            {[3, 8, 12, 18, 25].map((km) => {
              const f = travelBudgetForKm(km);
              return (
                <Box key={km} component="span" sx={{ mr: 1.25 }}>
                  {km} กม. → <b style={{ color: adminColor.text }}>{f === null ? "คอนเซียร์จเสนอราคา" : `฿${f.toLocaleString()}`}</b>
                </Box>
              );
            })}
            <br />
            <i>(ตัวอย่างนี้ใช้ค่าที่บันทึกแล้ว — กดบันทึกก่อนถึงจะอัปเดต)</i>
          </Typography>

          <TextField label="ระยะทางสูงสุดก่อนต้องยืนยันกับแอดมิน (กม.)" fullWidth type="number" margin="dense" sx={fieldSx}
            helperText="เกินระยะนี้ระบบให้ติดต่อคอนเซียร์จแทนคิดราคาอัตโนมัติ"
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
