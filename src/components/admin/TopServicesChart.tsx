import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Box, Typography, Paper } from '@mui/material';

interface Props {
  data: Record<string, number>;
}

const TopServicesChart: React.FC<Props> = ({ data }) => {
  if (!data || Object.keys(data).length === 0) {
    return (
      <Box mt={4}>
        <Typography variant="h6" gutterBottom>🧴 Top Booked Services</Typography>
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography color="text.secondary">No data available</Typography>
        </Paper>
      </Box>
    );
  }

  const chartData = Object.entries(data).map(([service, count]) => ({
    service,
    count,
  }));

  return (
    <Box mt={4}>
      <Typography variant="h6" gutterBottom>
        🧴 Top Booked Services
      </Typography>
      <Paper sx={{ p: 2 }}>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="service" angle={-20} textAnchor="end" interval={0} height={60} />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="count" fill="#82ca9d" name="Bookings" />
          </BarChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
};

export default TopServicesChart;