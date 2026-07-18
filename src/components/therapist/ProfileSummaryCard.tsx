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
    {/* 🆕 28x.75 — these three stat tiles kept a hardcoded #F4F6F5 from the
   pre-Moko light palette. Once the practitioner page moved to the dark theme
   their labels became grey-on-white at 2.85:1 — the counters a practitioner
   checks at a glance were the least readable thing on her screen. */
/* Today’s Bookings */}
    <Grid size={4}>
      <Paper
        sx={{
          p: 2,
          textAlign: "center",
          borderRadius: 5,
          background: "var(--sr-panel)",
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
          background: "var(--sr-panel)",
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
          background: "var(--sr-panel)",
          boxShadow: "0 6px 14px rgba(0,0,0,0.08)",
          height: 120,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CancelIcon sx={{ color: "#F87171", fontSize: 28, mb: 1 }} />
        <Typography variant="body2" color="text.secondary">
          Cancelled
        </Typography>
        {/* 🆕 28x.77 — MUI's error.main (#f44336) on the dark panel is 4.30:1.
            Large-text rules already pass it, but matching the icon keeps every
            figure on this card above 4.5 without changing what it reads as. */}
        <Typography variant="h6" fontWeight="bold" sx={{ color: "#F87171" }}>
          {cancelledJobs}
        </Typography>
      </Paper>
    </Grid>
  </Grid>
);

export default ProfileSummaryCard;