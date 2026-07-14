// src/pages/LoginPage.tsx
//
// 🆕 Round 28w.1 (2026-07-13) — audit fixes:
//   • Retheme: retired taupe #8F8474 + brown #4B4B48 + Chonburi font +
//     navy shadows → rose #D97C95 on day/night var(--sr-*) tokens
//     (matches the rest of the app). White-on-taupe subtitle → var token
//     so it stays legible in day mode.
//   • Removed production emoji from snackbar copy (founder no-emoji rule).
//   • Real <form>: Enter now submits; button is type="submit".
//   • a11y / password-manager: labelled fields + type="email" +
//     autoComplete="email" / "current-password".
//   • Avatar (LCP image) → loading="eager".
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
import BottomNav from '../components/layouts/BottomNavGlass';
import { getErrorMessage } from "@/utils/getErrorMessage";
import { resolveLoginId } from "@/utils/loginId";
// 🆕 28w.77 — "ลืมรหัสผ่าน?" hands the guest to the concierge (no self-serve reset).
import { whatsappDeepLink } from "@/config/concierge";

const SERIF = '"Fraunces", "Playfair Display", Georgia, serif';
const ROSE = "#D97C95";
const ROSE_HOVER = "#C96F89";

// 🆕 28w.76 (founder "ไม่เห็นข้อมูลในกล่อง · แก้ทั้ง 2 หน้า") — the outline and
//   label were themed but the INPUT TEXT never was, so MUI fell back to its
//   light-theme ink (#232B36) and painted near-black on the dark panel:
//   1.11:1 contrast — what you type is invisible. Pin text/placeholder/caret to
//   theme tokens and neutralise the browser's autofill repaint. Extracted to
//   one const (was duplicated inline on both fields) and mirrored in
//   RegisterPage so the two auth screens can't drift apart again.
const fieldSx = {
  mb: 2,
  "& .MuiOutlinedInput-root": {
    borderRadius: "16px",
    "& fieldset": { borderColor: "rgba(217, 124, 149, 0.55)" },
    "&:hover fieldset": { borderColor: ROSE },
    "&.Mui-focused fieldset": { borderColor: ROSE },
  },
  "& .MuiOutlinedInput-input": {
    color: "var(--sr-ink)",
    caretColor: "var(--sr-ink)",
    "&::placeholder": { color: "var(--sr-muted)", opacity: 1 },
    "&:-webkit-autofill": {
      WebkitTextFillColor: "var(--sr-ink)",
      WebkitBoxShadow: "0 0 0 1000px var(--sr-panel-2) inset",
      caretColor: "var(--sr-ink)",
      transition: "background-color 9999s ease-in-out 0s",
    },
  },
  "& label": { color: "var(--sr-muted)" },
  "& label.Mui-focused": { color: ROSE },
} as const;

type LoginRole = "admin" | "therapist" | "user";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // redirect กลับหน้าเดิมถ้า PrivateRoute ส่งมา; default ไปหน้าโปรไฟล์
  const fromPath =
    (location.state as { from?: string } | null)?.from ?? null;

  // 🆕 Round 28w.81 — was `email`. Now holds whatever the guest types: a phone
  //   number, a username, or an email. resolveLoginId() maps it to the address
  //   Firebase Auth actually signs in with.
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // 🆕 Round 28w.81 — a failed sign-in used to surface the raw SDK string
  //   ("Login failed: Firebase: Error (auth/invalid-credential)."), which tells
  //   a guest nothing and looks broken. Modern Firebase deliberately collapses
  //   wrong-password and no-such-account into ONE code (email-enumeration
  //   protection), so we must not claim to know which it was — one honest
  //   message covers both, and quietly preserves that privacy property.
  const friendlyAuthError = (err: unknown): string => {
    const code = (err as { code?: string })?.code ?? "";
    switch (code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Wrong login or password. Forgotten it? Tap “ลืมรหัสผ่าน?” below.";
      case "auth/too-many-requests":
        return "Too many attempts. Wait a moment, or message the concierge.";
      case "auth/network-request-failed":
        return "No connection. Check your network and try again.";
      case "auth/user-disabled":
        return "This account is disabled. Please contact the concierge.";
      default:
        return `Login failed: ${getErrorMessage(err)}`;
    }
  };

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
    if (!loginId || !password) {
      return setSnackbar({
        open: true,
        message: "Please enter your phone, username, or email — and your password",
        severity: "error",
      });
    }

    // 🆕 Round 28w.81 — resolve phone / username / email to the Auth address.
    const resolved = resolveLoginId(loginId);
    if (!resolved) {
      return setSnackbar({
        open: true,
        message: "That doesn't look like a phone number, username, or email",
        severity: "error",
      });
    }

    setLoading(true);

    try {
      const userCred = await signInWithEmailAndPassword(auth, resolved.authEmail, password);
      const uid = userCred.user.uid;
      const userEmail = userCred.user.email ?? "";

      const role = await getUserRole(uid, userEmail);

      setSnackbar({
        open: true,
        message: "Login successful",
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
        message: friendlyAuthError(err),
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
          background: "var(--sr-bg)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          p: 2,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: "100%",
            maxWidth: 320,
            textAlign: "center",
            p: 4,
            borderRadius: 6,
            background: "var(--sr-panel)",
            color: "var(--sr-ink)",
            border: "1px solid var(--sr-hairline)",
            boxShadow: "var(--sr-card-shadow)",
          }}
        >
          {/* Avatar */}
          <Box sx={{ textAlign: "center", mt: -12 }}>
            <Box
              component="img"
              src="/images/icon/User.webp"
              alt="User Icon"
              width={120}
              height={120}
              loading="eager"
              decoding="async"
              sx={{
                width: 120,
                height: 120,
                borderRadius: "50%",
                boxShadow: "0 6px 18px rgba(138, 58, 87, 0.20)",
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
              fontFamily: SERIF,
              fontSize: "2rem",
              color: "var(--sr-ink)",
            }}
          >
            Login
          </Typography>

          {/* Form — Enter submits */}
          <Box
            component="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!loading) void handleLogin();
            }}
          >
            {/* 🆕 Round 28w.81 — one field, three accepted forms. type="text"
                (not "email") or the browser's own validation rejects a phone
                number before our resolver ever sees it. */}
            <TextField
              label="Phone, username, or email"
              type="text"
              autoComplete="username"
              fullWidth
              size="small"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              helperText="เบอร์โทร · ชื่อผู้ใช้ · หรืออีเมล"
              FormHelperTextProps={{
                sx: { color: "var(--sr-muted)", fontSize: 11, ml: 0.5, mt: 0.25 },
              }}
              sx={fieldSx}
            />

            <TextField
              label="Password"
              type="password"
              autoComplete="current-password"
              fullWidth
              size="small"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={fieldSx}
            />

            {/* LOGIN BUTTON */}
            <Button
              type="submit"
              fullWidth
              sx={{
                mt: 1,
                py: 1.2,
                fontWeight: "bold",
                borderRadius: "20px",
                background: ROSE,
                color: "#fff",
                "&:hover": { background: ROSE_HOVER },
              }}
              disabled={loading}
            >
              {loading ? (
                <CircularProgress size={22} sx={{ color: "#fff" }} />
              ) : (
                "LOGIN"
              )}
            </Button>
          </Box>

          {/* Register */}
          <Typography mt={3} fontSize={14} sx={{ color: "var(--sr-body)" }}>
            Don&apos;t have an account?{" "}
            <Link to="/register" style={{ color: ROSE, fontWeight: "bold" }}>
              Sign up
            </Link>
          </Typography>

          {/* 🆕 28w.77 (founder "ใส่ ลืมรหัสผ่าน? แล้วให้ลิ้งไปที่แอดมิน") — no
              self-serve reset flow exists, so this hands the guest straight to
              the concierge with a pre-filled request instead of a dead end. */}
          <Typography mt={1} fontSize={14} sx={{ color: "var(--sr-body)" }}>
            <Box
              component="a"
              href={whatsappDeepLink(
                "Hi SunRed concierge, I've forgotten my account password. Could you help me reset it?"
              )}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: ROSE,
                fontWeight: "bold",
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                "&:hover": { color: ROSE_HOVER },
              }}
            >
              ลืมรหัสผ่าน?
            </Box>
          </Typography>
        </Paper>
        <Typography mt={4} fontSize={14} sx={{ color: "var(--sr-muted)" }} textAlign="center">
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
