// src/pages/user/EditProfilePage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Avatar,
  TextField,
  Button,
  Paper,
  CircularProgress,
  useTheme,
} from "@mui/material";
import { useAuth } from "@/providers/AuthProvider";
import { db } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { toast } from "react-toastify";

const EditProfilePage: React.FC = () => {
  const { user } = useAuth();
  const theme = useTheme();

  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoURL, setPhotoURL] = useState("");

  useEffect(() => {
    if (!user?.uid) return;

    const fetchUser = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          const data = snap.data();
          setDisplayName(data.displayName || "");
          setPhone(data.phone || "");
          setPhotoURL(data.photoURL || "");
        }
      } catch (err) {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [user]);

  const handleSave = async () => {
    if (!user?.uid) return;
    if (!displayName.trim() || !phone.trim()) {
      toast.warn("Please fill in all fields");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        displayName: displayName.trim(),
        phone: phone.trim(),
      });
      toast.success("Profile updated successfully!");
    } catch (err) {
      toast.error("Update failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: theme.palette.mode === "dark" ? "#0f0f0f" : "#fff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        p: -2,
      }}
    >
      <Paper
        elevation={2}
        sx={{
          width: "100%",
          maxWidth: 430,
          borderRadius: 6,
          p: 2,
          textAlign: "center",
          background: "#fff",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        }}
      >
        <Avatar
          src={photoURL || "/images/massage/user.png"}
          sx={{
            width: 120,
            height: 120,
            mx: "auto",
            boxShadow: 2,
            mb: 2,
            
          }}
        />
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{ mb: 2, fontFamily: "Playfair Display" }}
        >
          Edit My Profile
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 10 }}>
          Keep your contact info updated
        </Typography>

        <TextField
          fullWidth
          label="Display Name"
          variant="outlined"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          sx={{ mb: 3 }}
        />

        <TextField
          fullWidth
          label="Phone Number"
          variant="outlined"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          sx={{ mb: 2 }}
          
        />

        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleSave}
          disabled={saving}
          sx={{
            py: 1.5,
            borderRadius: 8,
            background: "#FB8085",
            color: "#fff",
            fontWeight: "bold",
            fontSize: "1rem",
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            "&:hover": {
              background: "#F9C1B1",
            },
          }}
        >
          {saving ? "Saving..." : "Save Changes"}
        </Button>
      </Paper>
    </Box>
  );
};

export default EditProfilePage;