import React from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import { useAuth } from "@/providers/MockAuthProvider";

const MockAuthSwitcher: React.FC = () => {
  const { user, loginAs, logout } = useAuth();

  return (
    <Box p={3}>
      <Typography variant="h6" gutterBottom>
        🔑 Mock Auth Switcher
      </Typography>

      {user ? (
        <>
          <Typography>
           Logged in as: {user.displayName} ({user.role})
          </Typography>
          <Button
            variant="contained"
            color="error"
            onClick={logout}
            sx={{ mt: 2 }}
          >
            Logout
          </Button>
        </>
      ) : (
        <Stack spacing={2} direction="row" sx={{ mt: 2 }}>
          <Button variant="contained" onClick={() => loginAs("admin", "Admin Test")}>
            Login as Admin
          </Button>
          <Button variant="contained" color="secondary" onClick={() => loginAs("therapist", "Therapist Test")}>
            Login as Therapist
          </Button>
          <Button variant="outlined" onClick={() => loginAs("customer", "Customer Test")}>
            Login as Customer
          </Button>
        </Stack>
      )}
    </Box>
  );
};

export default MockAuthSwitcher;