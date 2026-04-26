// src/pages/LoginPage.tsx
import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  CircularProgress,
  Snackbar,
  Alert,
} from "@mui/material";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import "@fontsource/chonburi";
import BottomNav from '../components/layouts/BottomNavGlass';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // =============================================================
  // 🔥 ROLE CHECK: SunRed Role Logic (Admin > Therapist > User)
  // =============================================================
  const getUserRole = async (uid: string, email: string) => {
    const lower = email.toLowerCase();

    // 1) Check Admin
    const adminDoc = await getDoc(doc(db, "admins", uid));
    if (adminDoc.exists()) return "admin";

    // 2) Check Therapist by email
    const tQ = query(
      collection(db, "therapists"),
      where("email", "==", lower)
    );
    const tSnap = await getDocs(tQ);
    if (!tSnap.empty) return "therapist";

    // 3) Check Users
    const uDoc = await getDoc(doc(db, "users", uid));
    if (uDoc.exists()) {
      return uDoc.data().role || "customer";
    }

    return "customer";
  };

  // =============================================================
  // 🔥 HANDLE LOGIN
  // =============================================================
  const handleLogin = async () => {
    if (!email || !password) {
      return setSnackbar({
        open: true,
        message: t("auth.errEmailPasswordRequired", "❌ Please enter email and password"),
        severity: "error",
      });
    }

    setLoading(true);

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;
      const userEmail = userCred.user.email ?? "";

      const role = await getUserRole(uid, userEmail);

      setSnackbar({
        open: true,
        message: t("auth.successLogin", "🎉 Login successful!"),
        severity: "success",
      });

      setTimeout(() => {
        if (role === "admin") return navigate("/admin/dashboard");
        if (role === "therapist") return navigate("/therapist/profile");
        return navigate("/profile");
      }, 300);
    } catch (err: any) {
      setSnackbar({
        open: true,
        message: `${t("auth.errLoginFailed", "❌ Login failed")}: ${err.message}`,
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  // =============================================================
  // UI
  // =============================================================
  return (
    <>
      <Box
        sx={{
          minHeight: "100vh",
          background: "linear-gradient(to bottom, #FE0944, #FEAE96)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          p: 2,
        }}
      >
        <Paper
          elevation={10}
          sx={{
            width: "100%",
            maxWidth: 320,
            textAlign: "center",
            p: 4,
            borderRadius: 6,
            background: "rgba(255,255,255,0.95)",
            backdropFilter: "blur(12px)",
            color: "#3a3420", 
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
          }}
        >
          {/* Avatar */}
          <Box sx={{ textAlign: "center", mt: -12 }}>
            <Box
              component="img"
              src="/images/icon/User.gif"
              alt="User Icon"
              sx={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              }}
            />
          </Box>

          {/* Title */}
          <Typography
            variant="h6"
            fontWeight="bold"
            mt={3}
            mb={4}
            sx={{
              fontFamily: "Chonburi, serif",
              fontSize: "2rem",
              color: "#FE0944",
            }}
          >
            {t("auth.logIn", "Login")}
          </Typography>

          {/* Inputs */}
          <TextField
            placeholder={t("auth.email", "Email")}
            fullWidth
            size="small"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                borderRadius: "16px",
              },
            }}
          />

          <TextField
            placeholder="Password"
            type="password"
            fullWidth
            size="small"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{
              mb: 2,
              "& .MuiOutlinedInput-root": {
                borderRadius: "16px",
              },
            }}
          />

          {/* LOGIN BUTTON */}
          <Button
            fullWidth
            sx={{
              mt: 1,
              py: 1.2,
              fontWeight: "bold",
              borderRadius: "20px",
              background: "#FE0944",
              color: "#fff",
              "&:hover": { background: "#FEAE96" },
            }}
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <CircularProgress size={22} sx={{ color: "#fff" }} />
            ) : (
              "LOGIN"
            )}
          </Button>

          {/* Register */}
          <Typography mt={3} fontSize={14}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "#FE0944", fontWeight: "bold" }}>
              Sign up
            </Link>
          </Typography>
        </Paper>
        <Typography mt={4} fontSize={14} color="#fff" textAlign="center">
                  You may proceed with booking without an account.
                </Typography>
      </Box>
      <BottomNav />
      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={2500}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </>
  );
};

export default LoginPage; 