import React from "react";
import { Grid, Paper, Typography, Box } from "@mui/material";
import EventIcon from "@mui/icons-material/Event";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CancelIcon from "@mui/icons-material/Cancel";

interface Props {
  todayBookings: number;
  completedJobs: number;
  cancelledJobs: number;
}

const ProfileSummaryCard: React.FC<Props> = ({
  todayBookings,
  completedJobs,
  cancelledJobs,
}) => (
  <Grid container spacing={2} mb={2}>
    {/* Today’s Bookings */}
    <Grid size={4}>
      <Paper
        sx={{
          p: 2,
          textAlign: "center",
          borderRadius: 5,
          background: "linear-gradient(135deg, #fdfbfb, #ebedee)",
          boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
          height: 120,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <EventIcon sx={{ color: "#42a5f5", fontSize: 28, mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          Today’s Bookings
        </Typography>
        <Typography variant="h6" fontWeight="bold" color="primary">
          {todayBookings}
        </Typography>
      </Paper>
    </Grid>

    {/* Completed */}
    <Grid size={4}>
      <Paper
        sx={{
          p: 2,
          textAlign: "center",
          borderRadius: 5,
          background: "linear-gradient(135deg, #fdfbfb, #ebedee)",
          boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
          height: 120,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CheckCircleIcon sx={{ color: "#66bb6a", fontSize: 28, mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          Completed
        </Typography>
        <Typography variant="h6" fontWeight="bold" color="success.main">
          {completedJobs}
        </Typography>
      </Paper>
    </Grid>

    {/* Cancelled */}
    <Grid size={4}>
      <Paper
        sx={{
          p: 2,
          textAlign: "center",
          borderRadius: 5,
          background: "linear-gradient(135deg, #fdfbfb, #ebedee)",
          boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
          height: 120,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CancelIcon sx={{ color: "red", fontSize: 28, mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          Cancelled
        </Typography>
        <Typography variant="h6" fontWeight="bold" color="error.main">
          {cancelledJobs}
        </Typography>
      </Paper>
    </Grid>
  </Grid>
);

export default ProfileSummaryCard;