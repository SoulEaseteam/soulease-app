// BookingPage.tsx — เวอร์ชันสมบูรณ์ พร้อมคำนวณค่าเดินทาง 2 เที่ยวจากตำแหน่งล่าสุดของพนักงาน

import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Avatar, Stack, Paper, Divider, TextField, Button
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import therapists from '../data/therapists';
import services from '../data/services';
import { collection, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import BackButton from '../components/BackButton';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import { calculateDistanceKm } from '../utils/calculateDistance';

const BookingPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const state = location.state as {
    selectedLat?: number;
    selectedLng?: number;
    selectedAddress?: string;
  };

  const queryParams = new URLSearchParams(location.search);
  const selectedServiceName = queryParams.get('service');
  const therapist = therapists.find((t) => t.id === id);
  const selectedService = services.find((s) => s.name === selectedServiceName);
  const servicePrice = selectedService?.price || 0;

  const [address, setAddress] = useState(state?.selectedAddress || '');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [travelCost, setTravelCost] = useState<number>(0);

  useEffect(() => {
    const fetchTherapistLocation = async () => {
      if (!therapist?.id || !state?.selectedLat || !state?.selectedLng) return;

      const ref = doc(db, 'therapists', therapist.id);
      const snap = await getDoc(ref);
      const tData = snap.data();

      if (tData?.currentLocation) {
        const origin = tData.currentLocation;
        const destination = { lat: state.selectedLat, lng: state.selectedLng };
        const km = await calculateDistanceKm(origin, destination);
        setDistanceKm(km);

        const pricePerKm = 10;
        const tripCost = km * pricePerKm * 2;
        setTravelCost(Math.round(tripCost));
      }
    };

    fetchTherapistLocation();
  }, [therapist?.id, state?.selectedLat, state?.selectedLng]);

  const total = servicePrice + travelCost;

  const isValidPhone = (phone: string) => /^0[0-9]{8,9}$/.test(phone);

  const handleSelectLocation = () => {
    navigate('/select-location');
  };

  const sendTelegramMessage = async (message: string) => {
    const token = '7555034629:AAEH8FQcmQbMlRd1-5Z65XKXaOprWQQ8ahg';
    const chatId = '-1002657430402';
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' })
      });

      if (!res.ok) {
        console.error('Telegram API Error:', await res.text());
      }
    } catch (err) {
      console.error('Network Error while sending Telegram:', err);
    }
  };

  const handleSubmit = async () => {
    if (loading) return;
    if (!isValidPhone(phone)) {
      alert('⚠️ Invalid phone number format');
      return;
    }

    setLoading(true);

    const now = new Date();
    const bookingTime = `${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    const lat = state?.selectedLat ?? null;
    const lng = state?.selectedLng ?? null;
    const googleMapLink = lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : '-';

    const message = `
💠 ${bookingTime}

💆‍♀️ *Therapist:* ${therapist?.name}
🧘 *Service:* ${selectedService?.name} (${selectedService?.duration})
————————————
⏰ *Booking:* ${time}
🏨 *Address:* ${address}
📞 *Phone:* ${phone}
📝 *Note:* ${note || '-'}
🚗 *Taxi:* ฿${travelCost.toLocaleString()}
💰 *Total:* ฿${total.toLocaleString()}
————————————
📌 *Map:* ${googleMapLink}`.trim();

    try {
      await sendTelegramMessage(message);

      await addDoc(collection(db, 'bookings'), {
        therapistId: therapist?.id,
        therapistName: therapist?.name,
        serviceName: selectedService?.name,
        servicePrice,
        date,
        time,
        address,
        phone,
        note,
        total,
        status: 'upcoming',
        createdAt: Timestamp.now(),
        location: lat && lng ? { lat, lng } : null,
      });

      alert('✅ Booking complete');
      navigate('/booking/history');
    } catch (err) {
      console.error('Booking error:', err);
      alert('❌ Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (!therapist || !selectedService) {
    return <Box p={4}><Typography>Therapist or Service not found.</Typography></Box>;
  }

  return (
    <Box sx={{ pb: 8, pt: 2, bgcolor: '#f5f5f7', minHeight: '100vh', fontFamily: 'Orson, sans-serif', overflowY: 'auto' }}>
      <Box sx={{ position: 'fixed', top: 16, left: 16, zIndex: 2000 }}>
        <BackButton />
      </Box>

      <Typography variant="h6" fontWeight="bold" textAlign="center" mt={2}>
        Booking Confirmation
      </Typography>

      <Box sx={{ maxWidth: 430, mx: 'auto', px: 2 }}>
        <Paper elevation={3} sx={{ p: 2.5, borderRadius: 5, mt: 3 }}>
          <Stack direction="row" spacing={2} alignItems="center" mb={2}>
            <Avatar src={`/images/${therapist.image}`} sx={{ width: 64, height: 64 }} />
            <Box>
              <Typography fontWeight="bold">{therapist.name}</Typography>
              <Typography color="gray">⭐ {therapist.rating} ({therapist.reviews})</Typography>
            </Box>
          </Stack>

          <Paper onClick={handleSelectLocation} sx={{ mb: 2, p: 2, borderRadius: 3, cursor: 'pointer', bgcolor: '#fdfdfd', border: '1px solid #ccc' }}>
            <Box>
              <Typography fontWeight="bold" fontSize={14} mb={0.5}>Address</Typography>
              <Typography fontSize={14} color={address ? 'text.primary' : 'text.secondary'}>
                {address || 'Tap to select location'}
              </Typography>
            </Box>
            <EditLocationAltIcon color="primary" />
          </Paper>

          <TextField fullWidth label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} size="small" sx={{ mb: 2 }} />
          <TextField fullWidth label="Note" value={note} onChange={(e) => setNote(e.target.value)} size="small" multiline rows={2} sx={{ mb: 2 }} />

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack direction="row" spacing={2} mb={2}>
              <DatePicker
                label="Date"
                value={dayjs(date || undefined)}
                onChange={(newValue) => setDate(newValue?.format('YYYY-MM-DD') || '')}
                format="DD/MM/YYYY"
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
              <TimePicker
                label="Time"
                value={dayjs(`${date}T${time}`)}
                onChange={(newValue) => setTime(newValue?.format('HH:mm') || '')}
                ampm={false}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Stack>
          </LocalizationProvider>

          <Typography fontWeight="bold" mb={1}>Service</Typography>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, bgcolor: '#fff' }}>
            <Stack direction="row" spacing={2}>
              <Avatar src={selectedService.image} variant="rounded" sx={{ width: 64, height: 64 }} />
              <Box>
                <Typography fontWeight="bold">{selectedService.name}</Typography>
                <Typography fontSize={14}>{selectedService.duration}</Typography>
              </Box>
            </Stack>
            <Typography align="right" mt={1} fontWeight="bold" color="primary">
              ฿{servicePrice.toLocaleString()}
            </Typography>
          </Paper>

          <Typography fontSize={14} mt={2} color="text.secondary">
            📍 Estimated Distance: {distanceKm?.toFixed(1) || '-'} km
          </Typography>
          <Typography fontWeight="bold" color="primary">
            🚗 Travel Fee (2-way): ฿{travelCost.toLocaleString()}
          </Typography>

          <Divider sx={{ my: 2 }} />
          <Stack direction="row" justifyContent="space-between" mb={2}>
            <Typography fontWeight="bold">Total</Typography>
            <Typography fontWeight="bold" color="primary">฿{total.toLocaleString()}</Typography>
          </Stack>

          {state?.selectedLat && state?.selectedLng && (
            <iframe
              title="Map"
              width="100%"
              height="180"
              frameBorder="0"
              style={{ borderRadius: 8, marginBottom: 16 }}
              src={`https://maps.google.com/maps?q=${state.selectedLat},${state.selectedLng}&z=15&output=embed`}
              allowFullScreen
            />
          )}

          <Button fullWidth variant="contained" onClick={handleSubmit} disabled={loading} sx={{ py: 1.4, fontWeight: 'bold', fontSize: 14, borderRadius: 4, background: '#1d3557' }}>
            {loading ? 'Sending...' : 'PLACE ORDER'}
          </Button>
        </Paper>
      </Box>
    </Box>
  );
};

export default BookingPage;
