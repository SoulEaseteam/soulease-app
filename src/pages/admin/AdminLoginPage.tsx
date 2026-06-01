// src/pages/admin/AdminLoginPage.tsx
import React, { useState } from "react";

import {
  Box,
  Paper,
  TextField,
  Typography,
  Button,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";

import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

const AdminLoginPage: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "error" as "error" | "success",
  });

  const navigate = useNavigate();

  // -------------------------------------------------------------
  // LOGIN HANDLER
  // -------------------------------------------------------------
  const handleLogin = async () => {
    if (!email || !password) {
      return setToast({
        open: true,
        message: "⚠️ Please fill all fields.",
        severity: "error",
      });
    }

    setLoading(true);

    try {
      // stay logged in
      await setPersistence(auth, browserLocalPersistence);

      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      // check admin role
      const adminRef = doc(db, "admins", uid);
      const adminDoc = await getDoc(adminRef);

      if (!adminDoc.exists()) {
        throw new Error("not_admin");
      }

      setToast({
        open: true,
        message: "🎉 Welcome Admin!",
        severity: "success",
      });

      setTimeout(() => navigate("/admin/dashboard"), 500); // redirect

    } catch (err: any) {
      let msg = "Login failed.";

      if (err.code === "auth/user-not-found") msg = "❌ User not found.";
      if (err.code === "auth/wrong-password") msg = "❌ Wrong password.";
      if (err.code === "auth/invalid-email") msg = "❌ Invalid email format.";
      if (err.message === "not_admin") msg = "⚠️ This account is not an admin.";

      setToast({ open: true, message: msg, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // UI
  // -------------------------------------------------------------
  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#B4000A",
        px: 2,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          width: "100%",
          maxWidth: 380,
          borderRadius: 4,
          p: 4,
          textAlign: "center",
          background: "#fff",
        }}
      >
        <Box sx={{ mb: 2 }}>
          <img
            src="/images/icon/admin.png"
            alt="Admin Icon"
            style={{ width: 90, height: 90 }}
          />
        </Box>

        <Typography
          variant="h5"
          fontWeight="bold"
          mb={3}
          sx={{ color: "#B4000A" }}
        >
          Admin Login
        </Typography>

        <Stack spacing={2}>
          <TextField
            label="Email"
            fullWidth
            size="small"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />

          <TextField
            label="Password"
            type="password"
            fullWidth
            size="small"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />

          <Button
            variant="contained"
            fullWidth
            sx={{
              mt: 1,
              py: 1.2,
              fontWeight: "bold",
              borderRadius: 2,
              background: "#B4000A",
              "&:hover": { background: "#FE7144" },
            }}
            disabled={loading}
            onClick={handleLogin}
          >
            {loading ? (
              <CircularProgress size={24} sx={{ color: "#fff" }} />
            ) : (
              "Login"
            )}
          </Button>
        </Stack>
      </Paper>

      <Snackbar
        open={toast.open}
        autoHideDuration={2500}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={toast.severity} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminLoginPage;