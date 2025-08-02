import React from "react";
import { Grid, Paper, Typography } from "@mui/material";

interface Props {
  todayBookings: number;
  earningsToday: number;
  earningsMonth: number;
  rating: number;
}

const ProfileSummaryCard: React.FC<Props> = ({ todayBookings, earningsToday, earningsMonth, rating }) => (
  <Grid container spacing={2} mb={2}>
    <Grid item xs={6}>
      <Paper sx={{ p: 2, textAlign: "center", borderRadius: 3 }}>
        <Typography variant="body1">Today's Bookings</Typography>
        <Typography variant="h5" color="primary">{todayBookings}</Typography>
      </Paper>
    </Grid>
    <Grid item xs={6}>
      <Paper sx={{ p: 2, textAlign: "center", borderRadius: 3 }}>
        <Typography variant="body1">Today's Earnings</Typography>
        <Typography variant="h5" color="success.main">฿{earningsToday}</Typography>
      </Paper>
    </Grid>
    <Grid item xs={6}>
      <Paper sx={{ p: 2, textAlign: "center", borderRadius: 3 }}>
        <Typography variant="body1">This Month</Typography>
        <Typography variant="h5" color="success.main">฿{earningsMonth}</Typography>
      </Paper>
    </Grid>
    <Grid item xs={6}>
      <Paper sx={{ p: 2, textAlign: "center", borderRadius: 3 }}>
        <Typography variant="body1">Rating</Typography>
        <Typography variant="h5" color="warning.main">{rating} ⭐</Typography>
      </Paper>
    </Grid>
  </Grid>
);

export default ProfileSummaryCard;