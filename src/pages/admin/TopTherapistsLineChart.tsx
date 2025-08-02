import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { Box, Typography, Paper } from '@mui/material';

interface TopTherapistsLineChartProps {
  data: Record<string, number>; // { therapistName: number of bookings }
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00c49f', '#0088fe'];

const TopTherapistsLineChart: React.FC<TopTherapistsLineChartProps> = ({ data }) => {
  const chartData = Object.entries(data)
    .map(([name, value]) => ({ name, bookings: value }))
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 7); // top 7

  return (
    <Paper sx={{ p: 3, mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        📈 Top Therapists (Line Chart)
      </Typography>
      {chartData.length === 0 ? (
        <Typography>No data available</Typography>
      ) : (
        <Box height={300}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="bookings" stroke={COLORS[0]} strokeWidth={3} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      )}
    </Paper>
  );
};

export default TopTherapistsLineChart;