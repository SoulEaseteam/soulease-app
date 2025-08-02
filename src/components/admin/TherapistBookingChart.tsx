// src/components/admin/TherapistBookingChart.tsx
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LabelList } from 'recharts';

interface ChartProps {
  data: { name: string; bookings: number }[];
}

const TherapistBookingChart: React.FC<ChartProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 80, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="name" type="category" />
        <Tooltip />
        <Bar dataKey="bookings" fill="#1976d2">
          <LabelList dataKey="bookings" position="right" />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TherapistBookingChart;