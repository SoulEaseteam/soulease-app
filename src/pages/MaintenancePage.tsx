import { Box, Typography, Paper, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import "@fontsource/chonburi";

const MaintenancePage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#F4F6F5",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        px: 2,
      }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 4,
          borderRadius: 5,
          textAlign: "center",
          maxWidth: 420,
          bgcolor: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        }}
      >
        <Typography
          variant="h3"
          sx={{ mb: 1, fontFamily: "Chonburi", color: "#D14124" }}
        >
          🛠️
        </Typography>

        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{ fontFamily: "Chonburi", color: "#C62828" }}
          mb={2}
        >
          We’re Under Maintenance
        </Typography>

        <Typography color="text.secondary" sx={{ mb: 3, fontSize: 15 }}>
          Our system is temporarily unavailable as we work on improvements.
          <br />
          Thank you for your patience ❤️
        </Typography>

        <Button
          variant="contained"
          color="error"
          sx={{
            borderRadius: 3,
            textTransform: "none",
            fontSize: 16,
            py: 1,
          }}
          onClick={() => navigate("/")}
        >
          Back to Home
        </Button>
      </Paper>
    </Box>
  );
};

export default MaintenancePage;