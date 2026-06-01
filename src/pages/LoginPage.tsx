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
import { useNavigate, useLocation, Link } from "react-router-dom";
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
import { getErrorMessage } from "@/utils/getErrorMessage";

type LoginRole = "admin" | "therapist" | "user";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // redirect กลับหน้าเดิมถ้า PrivateRoute ส่งมา; default ไปหน้าโปรไฟล์
  const fromPath =
    (location.state as { from?: string } | null)?.from ?? null;

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
  //   normalize "customer" → "user" ให้ตรงกับ PrivateRoute / AuthProvider
  // =============================================================
  const getUserRole = async (uid: string, email: string): Promise<LoginRole> => {
    const lower = email.toLowerCase();

    // ทำขนานเพื่อลด round-trip
    const [adminDoc, tSnap, uDoc] = await Promise.all([
      getDoc(doc(db, "admins", uid)),
      getDocs(query(collection(db, "therapists"), where("email", "==", lower))),
      getDoc(doc(db, "users", uid)),
    ]);

    if (adminDoc.exists()) return "admin";
    if (!tSnap.empty) return "therapist";

    if (uDoc.exists()) {
      const r = uDoc.data().role as string | undefined;
      if (r === "admin" || r === "therapist") return r;
      // legacy: เคยเก็บ "customer" → normalize เป็น "user"
    }
    return "user";
  };

  // =============================================================
  // 🔥 HANDLE LOGIN
  // =============================================================
  const handleLogin = async () => {
    if (!email || !password) {
      return setSnackbar({
        open: true,
        message: "❌ Please enter email and password",
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
        message: "🎉 Login successful!",
        severity: "success",
      });

      setTimeout(() => {
        // ถ้าถูก redirect มาจาก PrivateRoute ให้กลับหน้าเดิม
        if (fromPath && role !== "admin") return navigate(fromPath, { replace: true });
        if (role === "admin") return navigate("/admin/dashboard", { replace: true });
        if (role === "therapist") return navigate("/therapist/profile", { replace: true });
        return navigate("/profile", { replace: true });
      }, 300);
    } catch (err: unknown) {
      setSnackbar({
        open: true,
        message: `❌ Login failed: ${getErrorMessage(err)}`,
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
          background: "#B4000A",
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
            background: "#fff",
            color: "#3a3420",
            boxShadow: "0 6px 20px rgba(0,0,0,0.15)",
          }}
        >
          {/* Avatar */}
          <Box sx={{ textAlign: "center", mt: -12 }}>
            <Box
              component="img"
              src="/images/icon/User.webp"
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
              color: "#B4000A",
            }}
          >
            Login
          </Typography>

          {/* Inputs */}
          <TextField
            placeholder="Email"
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
              background: "#B4000A",
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
            Don&apos;t have an account?{" "}
            <Link to="/register" style={{ color: "#B4000A", fontWeight: "bold" }}>
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