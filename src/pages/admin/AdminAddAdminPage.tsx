import React, { useState } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Stack,
  InputAdornment,
  Snackbar,
  useTheme,
} from "@mui/material";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { setDoc, doc, serverTimestamp, getDocs, collection, query, where } from "firebase/firestore";
import { auth, db } from "@/firebase";
import { useNavigate } from "react-router-dom";
import PersonIcon from "@mui/icons-material/Person";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";

const AdminAddAdminPage: React.FC = () => {
  const theme = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [alert, setAlert] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });

  const navigate = useNavigate();

  const validateEmail = (email: string) => /\S+@\S+\.\S+/.test(email);

  const handleSubmit = async () => {
    if (!name || !email || !password) {
      setAlert({ open: true, message: "⚠️ กรุณากรอกข้อมูลให้ครบ", severity: "error" });
      return;
    }
    if (!validateEmail(email)) {
      setAlert({ open: true, message: "⚠️ อีเมลไม่ถูกต้อง", severity: "error" });
      return;
    }
    if (password.length < 6) {
      setAlert({ open: true, message: "⚠️ รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร", severity: "error" });
      return;
    }

    setLoading(true);

    try {
      const q = query(collection(db, "users"), where("email", "==", email.toLowerCase()));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setAlert({ open: true, message: "❌ อีเมลนี้ถูกใช้งานแล้ว", severity: "error" });
        setLoading(false);
        return;
      }

      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      const adminData = {
        uid,
        name,
        email: email.toLowerCase(),
        role: "admin",
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, "users", uid), adminData);
      await setDoc(doc(db, "admins", uid), adminData);

      setAlert({ open: true, message: "✅ Admin created successfully!", severity: "success" });
      setName("");
      setEmail("");
      setPassword("");

      setTimeout(() => navigate("/admin/manage-admins"), 1500);
    } catch (err: any) {
      setAlert({ open: true, message: `❌ Error: ${err.message}`, severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: "flex", justifyContent: "center", mt: 8, px: 2 }}>
      <Paper
        sx={{
          p: 6,
          maxWidth: 600,
          width: "100%",
          borderRadius: 6,
          boxShadow: theme.palette.mode === "dark" ? "0 6px 18px rgba(0,0,0,0.6)" : "0 6px 18px rgba(0,0,0,0.1)",
          textAlign: "center",
          backgroundColor: theme.palette.mode === "dark" ? "#1e1e1e" : "#fff",
        }}
      >
        <Typography variant="h5" fontWeight="bold" mb={3} color={theme.palette.mode === "dark" ? "#fff" : "#333"}>
          🛠 Add New Admin
        </Typography>

        <Stack spacing={2}>
          <TextField
            fullWidth
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <PersonIcon />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <EmailIcon />
                </InputAdornment>
              ),
            }}
          />

          <TextField
            fullWidth
            label="Temporary Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <LockIcon />
                </InputAdornment>
              ),
            }}
          />

          <Button
            variant="contained"
            fullWidth
            onClick={handleSubmit}
            disabled={loading}
            sx={{
              background: theme.palette.mode === "dark"
                ? "linear-gradient(90deg,#2b5876,#4e4376)"
                : "linear-gradient(90deg,#4facfe,#00f2fe)",
              fontWeight: "bold",
              color: "#fff",
              "&:hover": { opacity: 0.9 },
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : "✅ Create Admin"}
          </Button>

          <Stack direction="row" spacing={2} justifyContent="center" mt={1}>
            <Button
              variant="outlined"
              color="secondary"
              onClick={() => {
                setName("");
                setEmail("");
                setPassword("");
              }}
            >
              Reset Form
            </Button>

            <Button variant="outlined" onClick={() => navigate("/admin/manage-admins")}>
              Back to List
            </Button>
          </Stack>
        </Stack>
      </Paper>

      <Snackbar
        open={alert.open}
        autoHideDuration={3000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity={alert.severity}>{alert.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminAddAdminPage;