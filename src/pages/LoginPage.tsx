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
import { signInWithEmailAndPassword } from "firebase/auth";
import { collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "../firebase";
import BottomNav from "../components/BottomNav";
import "@fontsource/chonburi";

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error",
  });

  // ✅ ฟังก์ชันหาว่า User มี role อะไร
  const getUserRole = async (email: string) => {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", email.toLowerCase().trim()));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const userData = snapshot.docs[0].data();
      return userData.role || "customer";
    }
    return "customer";
  };

 const handleLogin = async () => {
  if (!email || !password) {
    setSnackbar({
      open: true,
      message: "❌ Please enter email and password",
      severity: "error",
    });
    return;
  }

  setLoading(true);
  try {
    // ✅ Firebase Auth
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userEmail = userCredential.user.email ?? "";

    // ✅ อ่าน role จาก Firestore (collection users)
    const role = await getUserRole(userEmail);

    setSnackbar({
      open: true,
      message: "🎉 Login successful!",
      severity: "success",
    });

    // ✅ Navigate ตาม role
    setTimeout(() => {
      if (role === "admin") {
        navigate("/admin");
      } else if (role === "therapist") {
        navigate("/therapist/profile");
      } else {
        navigate("/profile"); // ผู้ใช้ทั่วไป
      }
    }, 800);
  } catch (err: any) {
    setSnackbar({
      open: true,
      message: `❌ Login failed: ${err.message}`,
      severity: "error",
    });
  } finally {
    setLoading(false);
  }
};

  return (
    <>
      <Box
        sx={{
          minHeight: "100vh",
          background: "#1c2a3a",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          p: 2,
        }}
      >
        <Paper
          elevation={16}
          sx={{
            width: "100%",
            maxWidth: 360,
            textAlign: "center",
            p: 4,
            borderRadius: 4,
            background: "linear-gradient(to bottom, #fff, #f8f8f8)",
            color: "#2b3b53",
          }}
        >
          {/* 🔹 โลโก้ */}
          <Box sx={{ textAlign: "center", mt: -16 }}>
            <Box sx={{ display: "inline-block", p: 1, borderRadius: "50%", bgcolor: "#fff" }}>
              <Box sx={{ display: "inline-block", p: 1.2, borderRadius: "50%", bgcolor: "#2b3b53" }}>
                <Box
                  component="img"
                  src="/images/icon/support-service.png"
                  alt="User Icon"
                  sx={{
                    width: 150,
                    height: 150,
                    borderRadius: "50%",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                  }}
                />
              </Box>
            </Box>
          </Box>

          <Typography
            variant="h6"
            fontWeight="bold"
            mt={4}
            mb={4}
            sx={{ fontFamily: "Chonburi, serif", fontSize: "2rem" }}
          >
            Login
          </Typography>

          {/* 🔹 Email */}
          <TextField
            placeholder="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            variant="outlined"
            size="small"
            fullWidth
            sx={{
              mb: 2,
              input: { color: "#999" },
              "& .MuiOutlinedInput-root": {
                borderRadius: "16px",
                "& fieldset": { borderColor: "#a4b0ba" },
                "&:hover fieldset": { borderColor: "#7b8b99" },
                "&.Mui-focused fieldset": { borderColor: "#2b3b53" },
              },
            }}
          />

          {/* 🔹 Password */}
          <TextField
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            size="small"
            fullWidth
            sx={{
              mb: 2,
              input: { color: "#999" },
              "& .MuiOutlinedInput-root": {
                borderRadius: "16px",
                "& fieldset": { borderColor: "#a4b0ba" },
                "&:hover fieldset": { borderColor: "#7b8b99" },
                "&.Mui-focused fieldset": { borderColor: "#2b3b53" },
              },
            }}
          />

          {/* 🔹 ปุ่ม Login */}
          <Button
            onClick={handleLogin}
            disabled={loading}
            fullWidth
            variant="contained"
            sx={{
              mt: 1,
              py: 1.2,
              px: 5,
              fontWeight: "bold",
              fontSize: 14,
              borderRadius: "20px",
              color: "#fff",
              textTransform: "uppercase",
              maxWidth: 150,
              backgroundColor: "#2b3b53",
              boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
              "&:hover": { backgroundColor: "#7b8b99", transform: "scale(1.02)" },
              transition: "0.2s ease-in-out",
            }}
          >
            {loading ? <CircularProgress size={24} sx={{ color: "#fff" }} /> : "LOGIN"}
          </Button>

          <Typography mt={3} fontSize={14}>
            Don&apos;t have an account?{" "}
            <Link to="/register" style={{ color: "#1976d2", textDecoration: "underline" }}>
              Sign up
            </Link>
          </Typography>
        </Paper>

        <Typography mt={3} color="#ccc" fontSize={14}>
          You can proceed to book without an account.
        </Typography>
      </Box>

      <BottomNav />

      {/* 🔹 Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          severity={snackbar.severity}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default LoginPage;