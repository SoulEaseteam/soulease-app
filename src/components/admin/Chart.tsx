// src/components/admin/Chart.tsx
import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/firebase';
import dayjs from 'dayjs';
import { Typography, Box } from '@mui/material';

const Chart: React.FC = () => {
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
      const countByDate: Record<string, number> = {};

      // Create the last 7 days date structure
      for (let i = 6; i >= 0; i--) {
        const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
        countByDate[date] = 0;
      }

      // Count bookings by date
      bookingsSnapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.();
        if (createdAt) {
          const dateStr = dayjs(createdAt).format('YYYY-MM-DD');
          if (countByDate.hasOwnProperty(dateStr)) {
            countByDate[dateStr]++;
          }
        }
      });

      // Format data for chart
      const formattedData = Object.entries(countByDate).map(([date, count]) => ({
        date: dayjs(date).format('ddd, DD MMM'),
        bookings: count,
      }));

      setChartData(formattedData);
    };

    fetchData();
  }, []);

  return (
    <Box mt={4}>
      <Typography variant="h6" gutterBottom>
        📊 Booking Trends (Last 7 Days)
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="bookings"
            stroke="#8884d8"
            strokeWidth={3}
            name="Bookings"
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default Chart;
