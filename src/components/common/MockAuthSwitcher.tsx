import React from "react";
import { Box, Button, Stack, Typography, Paper } from "@mui/material";
import { useAuth } from "@/providers/MockAuthProvider";

const roles = [
  { key: "admin", label: "Admin", color: "error" },
  { key: "therapist", label: "Therapist", color: "secondary" },
  { key: "customer", label: "Customer", color: "primary" },
];

const MockAuthSwitcher: React.FC = () => {
  const { user, loginAs, logout } = useAuth();

  return (
    <Paper
      elevation={4}
      sx={{
        p: 3,
        borderRadius: 3,
        maxWidth: 380,
        mx: "auto",
        mt: 4,
        background: "linear-gradient(to bottom, #ffffff, #fafafa)",
      }}
    >
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        🔑 Mock Auth Switcher
      </Typography>

      {user ? (
        <Box
          sx={{
            mt: 2,
            p: 2,
            borderRadius: 2,
            border: "1px solid #ddd",
            bgcolor: "#fff",
          }}
        >
          <Typography fontSize={16} fontWeight="600">
            Logged in as:
          </Typography>

          <Typography mt={0.5}>
            👤 <b>{user.displayName}</b>
          </Typography>

          <Typography mt={0.5}>
            🎭 Role: <b style={{ textTransform: "capitalize" }}>{user.role}</b>
          </Typography>

          <Button
            fullWidth
            variant="contained"
            color="error"
            onClick={logout}
            sx={{ mt: 2, fontWeight: "bold" }}
          >
            Logout
          </Button>
        </Box>
      ) : (
        <Stack spacing={2} sx={{ mt: 2 }}>
          {roles.map((r) => (
            <Button
              key={r.key}
              variant="contained"
              color={r.color as any}
              onClick={() => loginAs(r.key, `${r.label} Test`)}
              sx={{ fontWeight: "bold" }}
            >
              Login as {r.label}
            </Button>
          ))}
        </Stack>
      )}
    </Paper>
  );
};

export default MockAuthSwitcher;