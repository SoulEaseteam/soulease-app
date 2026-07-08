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
        // 🎨 Round 28r79 — Nordic sweep · was
        //   `bgcolor: "linear-gradient(#fff6f6, #ffecec)"` which MUI
        //   silently drops (bgcolor doesn't accept gradients). Swapped
        //   to a flat Nordic neutral via `background`.
        background:
          theme.palette.mode === "dark" ? "#1d1d1d" : "#F7F7F6",
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
              "#2D2D2B",
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

          {/* 🆕 Round 28r79 — external i.ibb.co image removed. Loading
              an image from a third-party host when the user has already
              hit a broken URL is both a privacy leak (external network
              call) and a SPOF (ibb goes dark → 404 page also breaks).
              Keeping the page copy-forward instead. */}

          <Button
            onClick={() => navigate("/")}
            variant="contained"
            sx={{
              mt: 2,
              py: 1.3,
              borderRadius: 3,
              fontWeight: "bold",
              background: "#2D2D2B",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
              textTransform: "none",
              "&:hover": {
                background: "#2D2D2B",
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