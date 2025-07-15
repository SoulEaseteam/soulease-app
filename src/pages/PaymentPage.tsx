// src/pages/PaymentPage.tsx
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
} from '@mui/material';
import CustomAppBar from '../components/CustomAppBar';
import { motion } from 'framer-motion';
import dayjs from 'dayjs';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    bookingId,
    therapistName = 'Therapist',
    serviceName = 'Service',
    serviceDuration = '60 mins',
    date = 'Unknown date',
    time = 'Unknown time',
    distance = 'N/A',
    total = 1100,
  } = (location.state || {}) as {
    bookingId?: string;
    therapistName?: string;
    serviceName?: string;
    serviceDuration?: string;
    date?: string;
    time?: string;
    distance?: string;
    total?: number;
  };

  useEffect(() => {
    if (!location.state) navigate('/');
  }, [location.state, navigate]);

  const handlePayment = async () => {
    if (!bookingId) return;
    const ref = doc(db, 'bookings', bookingId);
    await updateDoc(ref, { paymentStatus: 'paid' });
    alert('✅ Payment Successful!');
    navigate('/booking/history');
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        pb: 10,
        background: 'linear-gradient(to bottom, #e1f1ff, #fff)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <CustomAppBar title="Payment" />

      <Box sx={{ width: '100%', maxWidth: 430, px: 2, mt: 3 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Paper
            elevation={4}
            sx={{
              p: 3,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
            }}
          >
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Booking Details
            </Typography>

            <Typography fontSize={14} mb={1}>
              👤 Therapist: <b>{therapistName}</b>
            </Typography>
            <Typography fontSize={14} mb={1}>
              🧖‍♀️ Service: {serviceName} ({serviceDuration})
            </Typography>
            <Typography fontSize={14} mb={1}>
              📅 Date: {dayjs(date).format('DD MMM YYYY')} ⏰ Time: {time}
            </Typography>
            <Typography fontSize={14} mb={2}>
              🚗 Distance: {distance} (round trip incl.)
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography fontWeight="bold">Total</Typography>
              <Typography fontWeight="bold" color="success.main">
                ฿{total.toLocaleString()}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" mt={1} mb={3}>
              * Simulation only. Payment gateway not yet active.
            </Typography>

            <Button
              fullWidth
              variant="contained"
              color="success"
              onClick={handlePayment}
              sx={{
                py: 1.5,
                fontWeight: 'bold',
                fontSize: 16,
                borderRadius: 3,
              }}
            >
              ✅ Confirm Payment
            </Button>
          </Paper>
        </motion.div>
      </Box>
    </Box>
  );
};

export default PaymentPage;