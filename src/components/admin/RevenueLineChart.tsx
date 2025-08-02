// src/components/admin/RevenueLineChart.tsx
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
import { Box, Typography } from '@mui/material';

const RevenueLineChart: React.FC = () => {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const snapshot = await getDocs(collection(db, 'bookings'));
      const revenueByDate: Record<string, number> = {};

      for (let i = 6; i >= 0; i--) {
        const date = dayjs().subtract(i, 'day').format('YYYY-MM-DD');
        revenueByDate[date] = 0;
      }

      snapshot.forEach((doc) => {
        const data = doc.data();
        const createdAt = data.createdAt?.toDate?.();
        const totalAmount = data.totalAmount || 0;

        if (createdAt) {
          const dateKey = dayjs(createdAt).format('YYYY-MM-DD');
          if (dateKey in revenueByDate) {
            revenueByDate[dateKey] += totalAmount;
          }
        }
      });

      const chartData = Object.entries(revenueByDate).map(([date, total]) => ({
        date: dayjs(date).format('ddd, DD MMM'),
        revenue: total,
      }));

      setData(chartData);
    };

    fetchData();
  }, []);

  return (
    <Box mt={4}>
      <Typography variant="h6" gutterBottom>
        💰 Revenue (Last 7 Days)
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="revenue"
            stroke="#4caf50"
            strokeWidth={3}
            name="Revenue (฿)"
          />
        </LineChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default RevenueLineChart;
