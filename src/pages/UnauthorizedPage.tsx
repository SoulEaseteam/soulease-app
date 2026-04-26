import { Box, Typography, Paper } from "@mui/material";

const UnauthorizedPage: React.FC = () => {
  return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
      <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
        <Typography variant="h4" color="error" gutterBottom>
          Unauthorized
        </Typography>
        <Typography>You do not have permission to access this page.</Typography>
      </Paper>
    </Box>
  );
};

export default UnauthorizedPage;