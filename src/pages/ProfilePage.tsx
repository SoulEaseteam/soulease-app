// src/pages/ProfilePage.tsx
import React from "react";
import {
  Box,
  Avatar,
  Typography,
  Button,
  Stack,
  Paper,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useAuth } from "@/providers/AuthProvider";

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(145deg,#ffdddd,#ffe9e2,#ffffff)",
        display: "flex",
        justifyContent: "center",
        py: 4,
      }}
    >
      <Paper
        elevation={3}
        sx={{
          maxWidth: 430,
          width: "100%",
          borderRadius: 4,
          p: 3,
          background: "rgba(255,255,255,0.65)",
          backdropFilter: "blur(14px)",
          boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
        }}
      >
        <Stack alignItems="center" spacing={2}>
          {/* Avatar */}
          <Avatar
            src={user?.photoURL || "/images/user-default.png"}
            sx={{
              width: 100,
              height: 100,
              mb: 1,
              border: "4px solid rgba(255,255,255,0.7)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          />

          {/* Name */}
          <Typography variant="h6" fontWeight="bold">
            {user?.displayName || "User"}
          </Typography>

          {/* Email */}
          <Typography variant="body2" color="text.secondary">
            {user?.email || "No email"}
          </Typography>

          <Box width="100%" mt={3}>
            <Stack spacing={1.6}>
              {/* Booking History */}
              <Button
                fullWidth
                variant="contained"
                sx={{
                  py: 1.3,
                  borderRadius: 3,
                  background: "#ff6f61",
                  "&:hover": { background: "#ff543f" },
                  fontWeight: 600,
                }}
                onClick={() => navigate("/booking/history")}
              >
                Booking History
              </Button>

              {/* Settings */}
              <Button
                fullWidth
                variant="outlined"
                sx={{
                  py: 1.3,
                  borderRadius: 3,
                  fontWeight: 600,
                  borderColor: "rgba(0,0,0,0.3)",
                }}
                onClick={() => navigate("/settings")}
              >
                Settings
              </Button>

              {/* Logout */}
              <Button
                fullWidth
                variant="outlined"
                color="error"
                sx={{
                  py: 1.3,
                  borderRadius: 3,
                  fontWeight: 600,
                  borderColor: "rgba(255,0,0,0.4)",
                }}
                onClick={handleLogout}
              >
                Logout
              </Button>
            </Stack>
          </Box>
        </Stack>

        {/* Guest message */}
        {!user && (
          <Box mt={4} textAlign="center">
            <Typography fontSize={13} color="text.secondary">
              You are not logged in.
            </Typography>
            <Button
              variant="contained"
              sx={{
                mt: 2,
                borderRadius: 3,
                py: 1.1,
                px: 4,
                fontWeight: 600,
              }}
              onClick={() => navigate("/login")}
            >
              Login
            </Button>
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default ProfilePage;