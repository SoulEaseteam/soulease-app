// src/components/admin/TopTherapistsChart.tsx
import React, { useEffect, useState, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
  LabelList,
} from 'recharts';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  TextField,
} from '@mui/material';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/firebase';
import dayjs from 'dayjs';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const TopTherapistsChart: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [startDate, setStartDate] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [endDate, setEndDate] = useState(dayjs().format('YYYY-MM-DD'));
  const chartRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
    const therapistCount: Record<string, number> = {};

    const start = dayjs(startDate).startOf('day').toDate();
    const end = dayjs(endDate).endOf('day').toDate();

    bookingsSnapshot.forEach((doc) => {
      const data = doc.data();
      const createdAt: Timestamp = data.createdAt;

      if (createdAt && createdAt.toDate() >= start && createdAt.toDate() <= end) {
        const therapist = data.therapistName || 'Unknown';
        therapistCount[therapist] = (therapistCount[therapist] || 0) + 1;
      }
    });

    const totalBookings = Object.values(therapistCount).reduce((sum, v) => sum + v, 0);

    const chartData = Object.entries(therapistCount)
      .map(([name, count]) => ({
        name,
        bookings: count,
        percentage: ((count / totalBookings) * 100).toFixed(1),
      }))
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 10);

    setData(chartData);
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const handleExportPNG = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current);
    const link = document.createElement('a');
    link.download = 'top-therapists-chart.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const handleExportPDF = async () => {
    if (!chartRef.current) return;
    const canvas = await html2canvas(chartRef.current);
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('landscape');
    pdf.text('Top Booked Therapists Report', 15, 10);
    pdf.addImage(imgData, 'PNG', 10, 20, 270, 100);
    pdf.save('top-therapists.pdf');
  };

  return (
    <Box mt={4}>
      <Typography variant="h6" gutterBottom>
        👩‍⚕️ Top Booked Therapists ({startDate} → {endDate})
      </Typography>

      <Paper sx={{ p: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={6} md={3}>
            <TextField
              type="date"
              label="Start Date"
              value={startDate}
              fullWidth
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={6} md={3}>
            <TextField
              type="date"
              label="End Date"
              value={endDate}
              fullWidth
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>

        {data.length === 0 ? (
          <Typography color="text.secondary" align="center" mt={3}>
            No booking data available for selected range
          </Typography>
        ) : (
          <>
            <Box mt={3} ref={chartRef}>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={data}
                  margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-15} textAnchor="end" interval={0} height={70} />
                  <YAxis allowDecimals={false} />
                  <Tooltip
                    formatter={(value, name, props) => {
                      if (name === 'Bookings') return [`${value} ครั้ง`, 'จำนวนจอง'];
                      if (name === 'percentage') return [`${value}%`, 'สัดส่วน'];
                      return value;
                    }}
                  />
                  <Legend />
                  <Bar dataKey="bookings" fill="#82ca9d" name="Bookings">
                    <LabelList dataKey="percentage" position="top" formatter={(val) => `${val}%`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
            <Box mt={2} display="flex" gap={2} justifyContent="flex-end">
              <Button variant="outlined" onClick={handleExportPNG}>📤 Export PNG</Button>
              <Button variant="outlined" onClick={handleExportPDF}>📄 Export PDF</Button>
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default TopTherapistsChart;