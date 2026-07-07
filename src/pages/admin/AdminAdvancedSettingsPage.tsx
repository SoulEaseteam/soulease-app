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
import { Clock, BellRinging, CreditCard, Wallet, FloppyDisk, Warning, CheckCircle, MoonStars } from "phosphor-react";
import { adminColor, adminFont } from "@/theme/adminTheme";
import { SectionCard, fieldSx } from "./therapistFormKit";
import { logAdminAction } from "@/utils/auditLog";

const SANS = adminFont.sans;

// Real, enforced — see MaintenanceGate.tsx + BookingFlowPage.tsx + taxiFare.ts.
interface PublicRules {
  maintenanceMode: boolean;
  minAdvanceMins: number;
  maxFutureDays: number;
  depositAmount: number;
  freeRadiusKm: number;
  maxDistance: number; // = ADMIN_QUOTE_KM, the manual-quote threshold
  roundTripMultiplier: number;
}
const defaultPublicRules: PublicRules = {
  maintenanceMode: false,
  minAdvanceMins: 0,
  maxFutureDays: 0,
  depositAmount: 500,
  freeRadiusKm: 25,
  maxDistance: 40,
  roundTripMultiplier: 1.6,
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

const NotConnectedBadge: React.FC = () => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: adminColor.amber, background: `${adminColor.amber}1A`, borderRadius: "6px", px: "8px", py: "3px" }}>
    <Warning size={12} weight="fill" /> ยังไม่เชื่อมระบบจริง
  </Box>
);
const LiveBadge: React.FC = () => (
  <Box sx={{ display: "inline-flex", alignItems: "center", gap: "5px", fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", color: adminColor.green, background: `${adminColor.green}1A`, borderRadius: "6px", px: "8px", py: "3px" }}>
    <CheckCircle size={12} weight="fill" /> ใช้งานจริง
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
          `depositAmount: ${rules.depositAmount}`,
          `maxDistance: ${rules.maxDistance}`,
          `roundTripMultiplier: ${rules.roundTripMultiplier}`,
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
      <Typography sx={{ fontFamily: adminFont.serif, fontSize: 22, fontWeight: 600, color: adminColor.text, mb: 0.5 }}>
        Advanced Settings
      </Typography>
      <Typography sx={{ fontSize: 12.5, color: adminColor.muted, mb: 2.5 }}>
        ตั้งค่าระดับระบบ — บันทึกแล้วมีผลทันที ไม่ต้องรอ deploy
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {/* 🌙 Maintenance Mode — REAL */}
        <SectionCard icon={<MoonStars size={13} weight="bold" />} title="โหมดปิดปรับปรุง">
          <Box sx={{ mb: 1 }}><LiveBadge /></Box>
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1 }}>
            เปิดแล้วลูกค้าทั่วไปจะเห็นหน้า "ปิดปรับปรุงชั่วคราว" ทันที (ไม่ต้องรีเฟรช) — แอดมิน/หมอนวดยังเข้าใช้งานได้ตามปกติ
          </Typography>
          <Row>
            <Typography sx={{ fontSize: 13.5, color: adminColor.text }}>เปิดโหมดปิดปรับปรุง</Typography>
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
        <SectionCard icon={<Clock size={13} weight="bold" />} title="กฎการจอง">
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
        <SectionCard icon={<BellRinging size={13} weight="bold" />} title="การแจ้งเตือน">
          <Box sx={{ mb: 1 }}><LiveBadge /></Box>
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1 }}>
            Token เก็บใน Firebase Secret Manager (แก้ตรงนี้ไม่ได้ และไม่ควรเก็บใน Firestore เพื่อความปลอดภัย) — สวิตช์นี้แค่หยุด/เปิดการส่งข้อความจริง
          </Typography>
          <Row>
            <Typography sx={{ fontSize: 13.5, color: adminColor.text }}>Enable Telegram Notifications</Typography>
            <Switch checked={settings.telegramEnabled} onChange={(e) => setSettings((p) => ({ ...p, telegramEnabled: e.target.checked }))} sx={switchSx} />
          </Row>
        </SectionCard>

        {/* 📍 Deposit & Distance — REAL */}
        <SectionCard icon={<CreditCard size={13} weight="bold" />} title="ค่ามัดจำ & ระยะทาง">
          <Box sx={{ mb: 1 }}><LiveBadge /></Box>
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1 }}>
            ค่ามัดจำเป็นข้อความแจ้งลูกค้าในหน้า FAQ เท่านั้น (ยังไม่ได้เก็บเป็นค่าใช้จ่ายแยกจริงตอนจอง) — ค่าที่ลูกค้าจ่ายจริงตามระยะทางคือค่าเดินทาง round-trip ด้านล่าง
          </Typography>
          <TextField label="ค่ามัดจำ (บาท)" fullWidth type="number" margin="dense" sx={fieldSx}
            value={rules.depositAmount} onChange={(e) => setRules((p) => ({ ...p, depositAmount: Math.max(0, Number(e.target.value)) }))} />
          <TextField label="ระยะที่เริ่มมัดจำ (กม.)" fullWidth type="number" margin="dense" sx={fieldSx}
            value={rules.freeRadiusKm} onChange={(e) => setRules((p) => ({ ...p, freeRadiusKm: Math.max(1, Number(e.target.value)) }))} />
          <TextField label="ระยะทางสูงสุดก่อนต้องขอราคาแยก (กม.)" fullWidth type="number" margin="dense" sx={fieldSx}
            helperText="เกินระยะนี้ระบบจะให้ติดต่อแอดมินขอราคาแทนคิดราคาอัตโนมัติ"
            value={rules.maxDistance} onChange={(e) => setRules((p) => ({ ...p, maxDistance: Math.max(1, Number(e.target.value)) }))} />
          <TextField label="ตัวคูณค่าเดินทางไป-กลับ" fullWidth type="number" margin="dense" sx={fieldSx}
            helperText="1.6 = ไปเต็มราคา + กลับ 60% (ส่วนลด 40%) ต้องมากกว่า 1"
            value={rules.roundTripMultiplier}
            onChange={(e) => setRules((p) => ({ ...p, roundTripMultiplier: Math.max(1.01, Number(e.target.value)) }))} />
        </SectionCard>

        {/* 💳 Payment Methods — NOT YET CONNECTED */}
        <SectionCard icon={<Wallet size={13} weight="bold" />} title="ช่องทางชำระเงิน">
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
        {loading ? "กำลังบันทึก…" : "Save Settings"}
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
