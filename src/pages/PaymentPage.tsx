import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Typography,
  Button,
  Paper,
  Divider,
} from "@mui/material";
import CustomAppBar from "../components/common/CustomAppBar";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";

// --------------------------------------------------------

const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // รับค่าจาก BookingPage
  const {
    bookingId,
    therapistName = "Therapist",
    serviceName = "Service",
    serviceDuration = "60 mins",
    date = "",
    time = "",
    distance = "N/A",
    total = 1000,
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

  // ถ้ากดเข้ามาโดยไม่มีข้อมูล → redirect
  useEffect(() => {
    if (!location.state) navigate("/");
  }, [location.state, navigate]);

  // --------------------------------------------------------
  // HANDLE PAYMENT
  // --------------------------------------------------------
  const handlePayment = async () => {
    if (!bookingId) return;

    try {
      const ref = doc(db, "bookings", bookingId);
      await updateDoc(ref, { paymentStatus: "paid" });

      alert("🎉 Payment Successful!");
      navigate("/booking/history");
    } catch (err) {
      console.error(err);
      alert("เกิดข้อผิดพลาดในการชำระเงิน");
    }
  };

  // --------------------------------------------------------
  // UI
  // --------------------------------------------------------
  return (
    <Box
      sx={{
        minHeight: "100vh",
        pb: 10,
        background: "linear-gradient(to bottom, #FFE5E5, #FFF)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <CustomAppBar title="Payment" />

      <Box sx={{ width: "100%", maxWidth: 430, px: 2, mt: 3 }}>
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <Paper
            elevation={6}
            sx={{
              p: 3,
              borderRadius: 4,
              background: "rgba(255, 255, 255, 0.75)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 8px 28px rgba(0,0,0,0.12)",
            }}
          >
            {/* Header */}
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Booking Summary
            </Typography>

            {/* Details */}
            <Typography fontSize={14} mb={1}>
              👤 Therapist: <b>{therapistName}</b>
            </Typography>

            <Typography fontSize={14} mb={1}>
              🧖‍♀️ Service: {serviceName} ({serviceDuration})
            </Typography>

            <Typography fontSize={14} mb={1}>
              📅 Date: {date ? dayjs(date).format("DD MMM YYYY") : "N/A"}
              {"   "} ⏰ {time}
            </Typography>

            <Typography fontSize={14} mb={2}>
              🚗 Distance: {distance} (round trip included)
            </Typography>

            <Divider sx={{ my: 2 }} />

            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
            >
              <Typography fontWeight="bold">Total</Typography>
              <Typography
                fontWeight="bold"
                color="error.main"
                sx={{ fontSize: 20 }}
              >
                ฿{total.toLocaleString()}
              </Typography>
            </Box>

            <Typography
              variant="body2"
              color="text.secondary"
              mt={1}
              mb={3}
              sx={{ fontStyle: "italic" }}
            >
              * Simulation only — Payment Gateway is not active yet.
            </Typography>

            {/* Pay Button */}
            <Button
              fullWidth
              variant="contained"
              onClick={handlePayment}
              sx={{
                py: 1.4,
                fontWeight: "bold",
                fontSize: 16,
                borderRadius: 3,
                background: "linear-gradient(90deg, #C62828, #FF8A65)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                "&:hover": {
                  background: "linear-gradient(90deg, #b32222, #ff7449)",
                },
              }}
            >
              💳 Confirm Payment
            </Button>
          </Paper>
        </motion.div>
      </Box>
    </Box>
  );
};

export default PaymentPage;