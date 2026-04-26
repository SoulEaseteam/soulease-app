// src/pages/admin/AdminAdvancedSettingsPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Switch,
  FormControlLabel,
  Divider,
  TextField,
  Button,
  Snackbar,
  Alert,
} from "@mui/material";

import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// =============================
// 🔥 Type สำหรับ Settings
// =============================
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

  minAdvanceMins: number;
  maxFutureDays: number;

  maintenanceMode: boolean;
  blockedIps: string;
}

// =============================
// ⭐ Default Settings
// =============================
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

  minAdvanceMins: 30,
  maxFutureDays: 7,

  maintenanceMode: false,
  blockedIps: "",
};

const AdminAdvancedSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<AdvancedSettings>(defaultSettings);
  const [loading, setLoading] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // ============================================================
  // 🔥 LOAD SETTINGS จาก Firestore
  // ============================================================
  useEffect(() => {
    const loadSettings = async () => {
      const ref = doc(db, "adminSettings", "advanced");
      const snap = await getDoc(ref);

      if (snap.exists()) {
        setSettings((prev) => ({
          ...prev,
          ...snap.data(),
        }));
      }
    };

    loadSettings();
  }, []);

  // ============================================================
  // 🔥 SAVE SETTINGS
  // ============================================================
  const handleSave = async () => {
    setLoading(true);

    try {
      const ref = doc(db, "adminSettings", "advanced");

      await setDoc(
        ref,
        {
          ...settings,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSnackbar({
        open: true,
        message: "✅ Settings saved successfully.",
        severity: "success",
      });
    } catch (err) {
      setSnackbar({
        open: true,
        message: "❌ Failed to save settings.",
        severity: "error",
      });
    }

    setLoading(false);
  };

  // ============================================================
  // 🔥 UI (Premium Admin Panel)
  // ============================================================
  return (
    <Box p={3}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: "bold" }}>
        ⚙️ Advanced Settings
      </Typography>

      {/* 🔔 NOTIFICATIONS */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          🔔 Notifications
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={settings.telegramEnabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  telegramEnabled: e.target.checked,
                }))
              }
            />
          }
          label="Enable Telegram Notifications"
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.lineEnabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  lineEnabled: e.target.checked,
                }))
              }
            />
          }
          label="Enable LINE Notify"
        />

        <TextField
          label="Telegram Bot Token"
          fullWidth
          margin="normal"
          value={settings.telegramToken}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              telegramToken: e.target.value,
            }))
          }
        />

        <TextField
          label="LINE Notify Token"
          fullWidth
          margin="normal"
          value={settings.lineToken}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              lineToken: e.target.value,
            }))
          }
        />
      </Paper>

      {/* 💳 PAYMENT */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          💳 Payment Settings
        </Typography>

        <FormControlLabel
          control={
            <Switch
              checked={settings.promptPayEnabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  promptPayEnabled: e.target.checked,
                }))
              }
            />
          }
          label="Enable PromptPay QR"
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.stripeEnabled}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  stripeEnabled: e.target.checked,
                }))
              }
            />
          }
          label="Enable Stripe Payments"
        />

        <TextField
          label="Deposit Amount (THB)"
          fullWidth
          type="number"
          margin="normal"
          value={settings.depositAmount}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              depositAmount: Number(e.target.value),
            }))
          }
        />
      </Paper>

      {/* 📍 DISTANCE */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">📍 Distance Settings</Typography>

        <TextField
          label="Maximum Distance (KM)"
          fullWidth
          type="number"
          margin="normal"
          value={settings.maxDistance}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              maxDistance: Number(e.target.value),
            }))
          }
        />

        <FormControlLabel
          control={
            <Switch
              checked={settings.roundTrip}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  roundTrip: e.target.checked,
                }))
              }
            />
          }
          label="Multiply Distance ×2 (Round Trip)"
        />
      </Paper>

      {/* ⏰ BOOKING RULES */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6">⏰ Booking Rules</Typography>

        <TextField
          label="Minimum Advance Booking (minutes)"
          fullWidth
          type="number"
          margin="normal"
          value={settings.minAdvanceMins}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              minAdvanceMins: Number(e.target.value),
            }))
          }
        />

        <TextField
          label="Maximum Future Booking (days)"
          fullWidth
          type="number"
          margin="normal"
          value={settings.maxFutureDays}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              maxFutureDays: Number(e.target.value),
            }))
          }
        />
      </Paper>

      {/* 🛡 SECURITY */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6">🛡 Security Settings</Typography>

        <FormControlLabel
          control={
            <Switch
              checked={settings.maintenanceMode}
              onChange={(e) =>
                setSettings((prev) => ({
                  ...prev,
                  maintenanceMode: e.target.checked,
                }))
              }
            />
          }
          label="Enable Maintenance Mode"
        />

        <TextField
          label="Blocked IPs (comma separated)"
          fullWidth
          margin="normal"
          value={settings.blockedIps}
          onChange={(e) =>
            setSettings((prev) => ({
              ...prev,
              blockedIps: e.target.value.trim(),
            }))
          }
        />
      </Paper>

      <Divider sx={{ my: 3 }} />

      <Button
        variant="contained"
        color="primary"
        disabled={loading}
        onClick={handleSave}
      >
        {loading ? "Saving..." : "Save Settings"}
      </Button>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2800}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminAdvancedSettingsPage;