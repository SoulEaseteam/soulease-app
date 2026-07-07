// src/pages/admin/AdminAdvancedSettingsPage.tsx
//
// 🆕 Round 28s296 (founder: "admin/advanced-settings ปรับแก้ และ
//   ตกแต่งสวยงาม แนะนำ ที่ใช้ได้จริง") — audit found every single one of
//   the 13 fields on this page was pure decoration: `grep -rl` for each
//   field name across the whole repo (src + functions) returned ONLY
//   this file. Nothing ever read `adminSettings/advanced` back —
//   flipping any switch here changed nothing about how the site behaves.
//   The real systems these fields SOUND like they control already exist
//   elsewhere, hardcoded, and working:
//     • Telegram — a real Cloud Functions bot (functions/src/telegram-*)
//       sources its token from Functions config/secrets, not this doc.
//     • LINE Notify — no implementation anywhere. Nothing to enable.
//     • PromptPay / deposit — real, but hardcoded (DEPOSIT_THB=500 in
//       DistanceDepositDialog.tsx; "promptpay" is a real payment METHOD
//       option in PaymentMethodsPage.tsx, not a feature flag).
//     • Distance / round-trip pricing — real, hardcoded in
//       src/utils/taxiFare.ts (ADMIN_QUOTE_KM=40, ROUND_TRIP_MULTIPLIER
//       =1.6, founder-confirmed business model, round 28b23).
//     • Blocked IPs — structurally impossible in this stack: a static
//       SPA + client Firestore SDK has no way to learn a visitor's real
//       IP, and Firestore rules can't inspect request IP either. Left
//       in, this would give a false sense of a control that can never
//       work — same lesson as the "blockedDevices" cleanup (28s293).
//
// This round actually wires the two fields that had NOTHING competing
// with them (maintenanceMode, minAdvanceMins, maxFutureDays — see
// MaintenanceGate.tsx + BookingFlowPage.tsx's submit guard) and removes
// blockedIps outright. The rest (Notifications, Payment & Distance) are
// kept editable and saved, but visibly marked "not yet connected" so the
// page is honest about what actually does something — wiring THOSE up
// for real means touching live pricing/payment math or a separate Cloud
// Functions deploy, which is a bigger, riskier call than a settings-page
// polish pass, so that's flagged back to the founder rather than done
// unilaterally.

import React, { useEffect, useState } from "react";
import { Box, Typography, Switch, TextField, Button, Snackbar, Alert, CircularProgress } from "@mui/material";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { Clock, BellRinging, CreditCard, FloppyDisk, Warning, CheckCircle, MoonStars } from "phosphor-react";
import { adminColor, adminFont } from "@/theme/adminTheme";
import { SectionCard, fieldSx } from "./therapistFormKit";
import { logAdminAction } from "@/utils/auditLog";

const SANS = adminFont.sans;

// Real, enforced — see MaintenanceGate.tsx + BookingFlowPage.tsx.
interface PublicRules {
  maintenanceMode: boolean;
  minAdvanceMins: number;
  maxFutureDays: number;
}
const defaultPublicRules: PublicRules = {
  maintenanceMode: false,
  minAdvanceMins: 0,
  maxFutureDays: 0,
};

// Saved, but NOT yet read by anything — see the header comment.
interface AdvancedSettings {
  telegramEnabled: boolean;
  lineEnabled: boolean;
  telegramToken: string;
  lineToken: string;
  promptPayEnabled: boolean;
  stripeEnabled: boolean;
  depositAmount: number;
  maxDistance: number;
  roundTrip: boolean;
}
const defaultSettings: AdvancedSettings = {
  telegramEnabled: true,
  lineEnabled: false,
  telegramToken: "",
  lineToken: "",
  promptPayEnabled: true,
  stripeEnabled: false,
  depositAmount: 0,
  maxDistance: 20,
  roundTrip: true,
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

        {/* 🔔 Notifications — NOT YET CONNECTED */}
        <SectionCard icon={<BellRinging size={13} weight="bold" />} title="การแจ้งเตือน">
          <Box sx={{ mb: 1 }}><NotConnectedBadge /></Box>
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1 }}>
            บอท Telegram จริงทำงานอยู่แล้วผ่าน Cloud Functions (คนละที่กับ token ด้านล่าง) ส่วน LINE Notify ยังไม่มีระบบจริงเลย — ต้องคุยกันก่อนว่าจะต่อสายไหน
          </Typography>
          <Row>
            <Typography sx={{ fontSize: 13.5, color: adminColor.text }}>Enable Telegram Notifications</Typography>
            <Switch checked={settings.telegramEnabled} onChange={(e) => setSettings((p) => ({ ...p, telegramEnabled: e.target.checked }))} sx={switchSx} />
          </Row>
          <Row>
            <Typography sx={{ fontSize: 13.5, color: adminColor.text }}>Enable LINE Notify</Typography>
            <Switch checked={settings.lineEnabled} onChange={(e) => setSettings((p) => ({ ...p, lineEnabled: e.target.checked }))} sx={switchSx} />
          </Row>
          <TextField label="Telegram Bot Token" fullWidth margin="dense" sx={fieldSx}
            value={settings.telegramToken} onChange={(e) => setSettings((p) => ({ ...p, telegramToken: e.target.value }))} />
          <TextField label="LINE Notify Token" fullWidth margin="dense" sx={fieldSx}
            value={settings.lineToken} onChange={(e) => setSettings((p) => ({ ...p, lineToken: e.target.value }))} />
        </SectionCard>

        {/* 💳 Payment & Distance — NOT YET CONNECTED */}
        <SectionCard icon={<CreditCard size={13} weight="bold" />} title="การชำระเงิน & ระยะทาง">
          <Box sx={{ mb: 1 }}><NotConnectedBadge /></Box>
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: 1 }}>
            ค่ามัดจำ (฿500) และค่าเดินทาง (round-trip ×1.6, admin quote เกิน 40 กม.) เป็นค่าจริงที่ล็อกไว้ในโค้ดแล้ว คนละที่กับตัวเลขด้านล่าง — ทำให้แก้ตรงนี้ได้จริงหมายถึงแก้ราคาได้โดยไม่ผ่านการรีวิวโค้ด จึงยังไม่เชื่อมให้จนกว่าจะคุยกันก่อน
          </Typography>
          <Row>
            <Typography sx={{ fontSize: 13.5, color: adminColor.text }}>Enable PromptPay QR</Typography>
            <Switch checked={settings.promptPayEnabled} onChange={(e) => setSettings((p) => ({ ...p, promptPayEnabled: e.target.checked }))} sx={switchSx} />
          </Row>
          <Row>
            <Typography sx={{ fontSize: 13.5, color: adminColor.text }}>Enable Stripe Payments</Typography>
            <Switch checked={settings.stripeEnabled} onChange={(e) => setSettings((p) => ({ ...p, stripeEnabled: e.target.checked }))} sx={switchSx} />
          </Row>
          <TextField label="Deposit Amount (THB)" fullWidth type="number" margin="dense" sx={fieldSx}
            value={settings.depositAmount} onChange={(e) => setSettings((p) => ({ ...p, depositAmount: Number(e.target.value) }))} />
          <TextField label="Maximum Distance (KM)" fullWidth type="number" margin="dense" sx={fieldSx}
            value={settings.maxDistance} onChange={(e) => setSettings((p) => ({ ...p, maxDistance: Number(e.target.value) }))} />
          <Row>
            <Typography sx={{ fontSize: 13.5, color: adminColor.text }}>Multiply Distance ×2 (Round Trip)</Typography>
            <Switch checked={settings.roundTrip} onChange={(e) => setSettings((p) => ({ ...p, roundTrip: e.target.checked }))} sx={switchSx} />
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
