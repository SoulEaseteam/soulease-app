import React from "react";
import { Box, Typography, Button, Stack, Paper, useTheme } from "@mui/material";
import { useNavigate } from "react-router-dom";

const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor:
          theme.palette.mode === "dark" ? "#1d1d1d" : "linear-gradient(#fff6f6, #ffecec)",
        px: 2,
      }}
    >
      <Paper
        elevation={8}
        sx={{
          borderRadius: 5,
          maxWidth: 400,
          width: "100%",
          overflow: "hidden",
          bgcolor: theme.palette.background.paper,
        }}
      >
        {/* Header */}
        <Box
          sx={{
            height: 160,
            background:
              "#B4000A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontWeight: "bold",
            fontSize: 52,
            letterSpacing: 2,
            textShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          404
        </Box>

        {/* Content */}
        <Stack spacing={2.2} sx={{ p: 3, textAlign: "center" }}>
          <Typography variant="h6" fontWeight="bold">
            Page Not Found
          </Typography>

          <Typography variant="body2" color="text.secondary">
            The page you are trying to access doesn’t exist or may have been moved.
          </Typography>

          <Box
            component="img"
            src="https://i.ibb.co/vZpPKkX/sad-cat-404.png"
            alt="not found"
            sx={{
              width: 140,
              mx: "auto",
              mt: 1,
              opacity: 0.95,
              filter: "drop-shadow(0 3px 6px rgba(0,0,0,0.15))",
            }}
          />

          <Button
            onClick={() => navigate("/")}
            variant="contained"
            sx={{
              mt: 2,
              py: 1.3,
              borderRadius: 3,
              fontWeight: "bold",
              background: "#B4000A",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              textTransform: "none",
              "&:hover": {
                background: "#7C0007",
              },
            }}
          >
             Back to Home
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
};

export default NotFoundPage;