import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Divider,
  Paper,
  Alert,
  Snackbar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
} from "@mui/material";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db, auth } from "@/firebase";
import {
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";

const AdminSettingsPage: React.FC = () => {
  const [telegramEnabled, setTelegramEnabled] = useState(false);
  const [telegramToken, setTelegramToken] = useState("");
  const [promptPayNumber, setPromptPayNumber] = useState("");
  const [maxDistanceKm, setMaxDistanceKm] = useState(20);
  const [minAdvanceHour, setMinAdvanceHour] = useState(2);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [depositRequired, setDepositRequired] = useState(false);
  const [blockedIPs, setBlockedIPs] = useState("");

  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const [confirmDialog, setConfirmDialog] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const configDoc = await getDoc(doc(db, "config", "advanced"));
      if (configDoc.exists()) {
        const data = configDoc.data();
        setTelegramEnabled(data.telegramEnabled || false);
        setTelegramToken(data.telegramToken || "");
        setPromptPayNumber(data.promptPayNumber || "");
        setMaxDistanceKm(data.maxDistanceKm || 20);
        setMinAdvanceHour(data.minAdvanceHour || 2);
        setMaintenanceMode(data.maintenanceMode || false);
        setDepositRequired(data.depositRequired || false);
        setBlockedIPs(data.blockedIPs || "");
      }
      setLoading(false);
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "advanced"), {
        telegramEnabled,
        telegramToken,
        promptPayNumber,
        maxDistanceKm,
        minAdvanceHour,
        maintenanceMode,
        depositRequired,
        blockedIPs,
      });
      setSnackbar({
        open: true,
        message: "Settings saved successfully",
        severity: "success",
      });
    } catch {
      setSnackbar({
        open: true,
        message: "Error saving settings",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    setPasswordError("");
    try {
      const user = auth.currentUser;
      if (user && user.email) {
        const credential = EmailAuthProvider.credential(
          user.email,
          currentPassword
        );
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, newPassword);
        setNewPassword("");
        setCurrentPassword("");
        setSnackbar({
          open: true,
          message: "Password updated successfully",
          severity: "success",
        });
      }
    } catch (err: any) {
      setPasswordError(err.message);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ px: 6,  maxWidth: 700, mx: "auto" }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        ⚙️ Advanced Admin Settings
      </Typography>

      <Paper sx={{ p: 6 }}>
        <Stack spacing={3}>
          <FormControlLabel
            control={
              <Switch
                checked={telegramEnabled}
                onChange={(e) => setTelegramEnabled(e.target.checked)}
              />
            }
            label="Enable Telegram Notification"
          />

          <TextField
            fullWidth
            label="Telegram Bot Token"
            value={telegramToken}
            onChange={(e) => setTelegramToken(e.target.value)}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 4 } }} 
          />

          <TextField
            fullWidth
            label="PromptPay Number"
            value={promptPayNumber}
            onChange={(e) => setPromptPayNumber(e.target.value)}
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 4 } }} 
          />

          <TextField
            fullWidth
            label="Max Travel Distance (km)"
            type="number"
            value={maxDistanceKm}
            onChange={(e) => setMaxDistanceKm(parseFloat(e.target.value))}
         sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 4 } }} 
          />

          <TextField
            fullWidth
            label="Min Advance Booking (hours)"
            type="number"
            value={minAdvanceHour}
            onChange={(e) => setMinAdvanceHour(parseInt(e.target.value))}
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 4 } }} 
          />

          <FormControlLabel
            control={
              <Switch
                checked={depositRequired}
                onChange={(e) => setDepositRequired(e.target.checked)}
              sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 4 } }} 
          />
          
            }
            label="Require Deposit Before Booking"
          />

          <FormControlLabel
            control={
              <Switch
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
              />
            }
            label="Enable Maintenance Mode"
          />

          <TextField
            fullWidth
            label="Blocked IPs (comma separated)"
            value={blockedIPs}
            onChange={(e) => setBlockedIPs(e.target.value)}
          sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 4 } }} 
          />


          <Button
          
            variant="contained"
            fullWidth
            onClick={handleSave}
            disabled={saving}
            sx={{ py: 1.4, fontWeight: 'bold', fontSize: 14, borderRadius: 4, background: '#1d3557' }}
          >
            {saving ? <CircularProgress size={20} color="inherit" /> : "Save"}
          
          </Button>
        </Stack>
      </Paper>

      <Divider sx={{ my: 4 }} />

      <Typography variant="h6" fontWeight="bold" gutterBottom>
        🔐 Change Admin Password
      </Typography>

      <Paper sx={{ p: 6 }}>
        <Stack spacing={2}>
          <TextField
            fullWidth
            label="Current Password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 4 } }} 
          />
          <TextField
            fullWidth
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 4 } }} 
          />

          {passwordError && <Alert severity="error">{passwordError}</Alert>}

          <Button
            variant="outlined"
            fullWidth
            onClick={() => setConfirmDialog(true)}
            sx={{ py: 1.4, fontWeight: 'bold', fontSize: 14, borderRadius: 4,  }}
          
          >
            Change Password
          </Button>
        </Stack>
      </Paper>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
        <DialogTitle>Confirm Change Password</DialogTitle>
        <DialogContent>
          Are you sure you want to change the admin password?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setConfirmDialog(false);
              handlePasswordChange();
              
              
            }}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminSettingsPage;