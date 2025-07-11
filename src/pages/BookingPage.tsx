import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, CircularProgress, Stack, Avatar
} from '@mui/material';
import { useLocation, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, updateDoc, addDoc, collection, Timestamp } from 'firebase/firestore';
import { calculateDistanceKm } from '../utils/calculateDistance';

const ratePerKm = 10;

const BookingPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [therapist, setTherapist] = useState<any>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [travelFee, setTravelFee] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const {
    service,
    userLocation,
    selectedTherapist,
    date,
    time,
    phone,
    address,
    note,
  } = location.state || {};

  useEffect(() => {
    const calculate = async () => {
      if (!selectedTherapist || !userLocation) return;

      const therapistLocation = selectedTherapist.currentLocation || {
        lat: selectedTherapist.lat,
        lng: selectedTherapist.lng,
      };

      const dist = await calculateDistanceKm(therapistLocation, userLocation);
      const fee = Math.round(dist * ratePerKm * 2);
      const total = service.price + fee;

      setTherapist(selectedTherapist);
      setDistance(dist);
      setTravelFee(fee);
      setTotalPrice(total);
      setLoading(false);
    };

    calculate();
  }, [selectedTherapist, userLocation, service]);

  const sendTelegramMessage = async (message: string) => {
    const token = 'YOUR_BOT_TOKEN';
    const chatId = 'YOUR_CHAT_ID';
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
      });

      if (!res.ok) console.error('Telegram Error:', await res.text());
    } catch (err) {
      console.error('Telegram Network Error:', err);
    }
  };

  const handleConfirmBooking = async () => {
    if (!therapist || !userLocation) return;

    const booking = {
      userId: 'guest',
      therapistId: therapist.id,
      therapistName: therapist.name,
      service: service.name,
      servicePrice: service.price,
      date,
      time,
      address,
      phone,
      note,
      total: totalPrice,
      travelFee,
      distance,
      location: userLocation,
      status: 'confirmed',
      createdAt: Timestamp.now(),
    };

    const mapLink = `https://maps.google.com/?q=${userLocation.lat},${userLocation.lng}`;
    const message = `
*🧖 Booking Confirmed!*

🗓️ Date: ${date}

👩‍💼 Therapist: ${therapist.name}
🛀 Service: ${service.name}
————————
⏰ Time: ${time}
📍 Address: ${address}
📝 Note: ${note || '-'}
🚕 Travel Fee: ฿${travelFee}
💰 Total: ฿${totalPrice}
📞 Phone: ${phone}
————————
🌍 Map: ${mapLink}
`.trim();

    try {
      await addDoc(collection(db, 'bookings'), booking);
      await sendTelegramMessage(message);
      alert('✅ Booking Confirmed!');
      navigate('/booking/history');
    } catch (err) {
      console.error(err);
      alert('❌ Failed to book.');
    }
  };

  const handleReturnHome = async () => {
    if (!therapist?.homeLocation) {
      alert('❌ No home location set.');
      return;
    }

    await updateDoc(doc(db, 'therapists', therapist.id), {
      currentLocation: therapist.homeLocation,
      updatedAt: new Date(),
    });

    alert('🏡 Therapist returned to home.');
  };

  if (loading || !therapist) {
    return <Box p={3} textAlign="center"><CircularProgress /></Box>;
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>Booking Summary</Typography>

      <Paper sx={{ p: 2, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Avatar src={therapist.image} sx={{ width: 64, height: 64 }} />
          <Box>
            <Typography fontWeight="bold">{therapist.name}</Typography>
            <Typography fontSize={14} color="text.secondary">Rating: {therapist.rating}</Typography>
          </Box>
        </Stack>
        <Typography>🛀 Service: {service.name}</Typography>
        <Typography>📆 Date: {date} / ⏰ Time: {time}</Typography>
        <Typography>💰 Service Price: ฿{service.price.toLocaleString()}</Typography>
        <Typography>🚗 Travel Fee: ฿{travelFee.toLocaleString()}</Typography>
        <Typography fontWeight="bold" mt={1}>🧾 Total: ฿{totalPrice.toLocaleString()}</Typography>
      </Paper>

      <Button fullWidth variant="contained" sx={{ mt: 3 }} onClick={handleConfirmBooking}>
        Confirm Booking
      </Button>

      <Button fullWidth variant="outlined" sx={{ mt: 2 }} onClick={handleReturnHome}>
        Return Therapist to Home
      </Button>

      {userLocation && (
        <iframe
          title="Google Map"
          width="100%"
          height="200"
          style={{ marginTop: 16, borderRadius: 8 }}
          src={`https://maps.google.com/maps?q=${userLocation.lat},${userLocation.lng}&z=15&output=embed`}
        />
      )}
    </Box>
  );
};

export default BookingPage;