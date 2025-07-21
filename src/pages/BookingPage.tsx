import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Avatar, Stack, Paper, Divider, TextField, Button,
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { collection, addDoc, Timestamp, doc, getDoc } from 'firebase/firestore';
import EditLocationAltIcon from '@mui/icons-material/EditLocationAlt';
import { db } from '../firebase';
import therapists from '../data/therapists';
import services from '../data/services';
import { calculateDistanceKm } from '../utils/calculateDistance';
import { useAuth } from '../providers/AuthProvider'; // ✅ เพิ่มตรงนี้

  const BookingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const queryParams = new URLSearchParams(location.search);
  const therapistId = location.pathname.split('/booking/')[1];
  const selectedServiceName = queryParams.get('service');
  const selectedLat = queryParams.get('selectedLat');
  const selectedLng = queryParams.get('selectedLng');
  const selectedAddress = queryParams.get('selectedAddress');

  const therapist = therapists.find((t) => t.id === therapistId);
  const selectedService = services.find((s) => s.name === selectedServiceName);
  const servicePrice = selectedService?.price || 0;

  const [address, setAddress] = useState(selectedAddress || '');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [distanceKm, setDistanceKm] = useState<number | null>(null);

  const ratePerKm = 10;

  const travelCost = useMemo(() => {
    return distanceKm ? Math.round(distanceKm * 2 * ratePerKm) : 0;
  }, [distanceKm]);

  const isLocationSelected = distanceKm !== null;

  const total = useMemo(() => {
    return isLocationSelected ? servicePrice + travelCost : 0;
  }, [isLocationSelected, servicePrice, travelCost]);

  useEffect(() => {
    const fetchTherapistLocation = async () => {
      if (!therapist?.id || !selectedLat || !selectedLng) return;

      try {
        const ref = doc(db, 'therapists', therapist.id);
        const snap = await getDoc(ref);
        const tData = snap.data();

        if (tData?.currentLocation) {
          const origin = tData.currentLocation;
          const destination = {
            lat: parseFloat(selectedLat),
            lng: parseFloat(selectedLng),
          };
          const km = await calculateDistanceKm(origin, destination);
          setDistanceKm(km);
        }
      } catch (err) {
        console.error('Error fetching therapist location:', err);
      }
    };

    fetchTherapistLocation();
  }, [therapist?.id, selectedLat, selectedLng]);

  const isValidPhone = (phone: string) => /^0[0-9]{8,9}$/.test(phone);

  const handleSelectLocation = () => {
    navigate(`/select-location`, {
      state: { therapistId, service: selectedServiceName },
    });
  };

   const sendTelegramMessage = async (message: string) => {
    const token = '7555034629:AAEH8FQcmQbMlRd1-5Z65XKXaOprWQQ8ahg';
    const chatId = '-1002657430402';
    const url = `https://api.telegram.org/bot${token}/sendMessage`;


    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
      });
    } catch (err) {
      console.error('Telegram Error:', err);
    }
  };

  const handleSubmit = async () => {
    if (loading || !isValidPhone(phone)) return;
    setLoading(true);

    const lat = selectedLat ? parseFloat(selectedLat) : null;
    const lng = selectedLng ? parseFloat(selectedLng) : null;
    const googleMapLink = lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : '-';
    const bookingTime = `${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;

    const message = `
💠 ${bookingTime}

🌟 Therapist: ${therapist?.name}
⏰ Booking: ${date} ${selectedTime}
————————————
🏢 Address: ${address}
🧘🏼‍♀️ Service: ${selectedService?.name} (${selectedService?.duration})
📝 Note: ${note || '-'}
🚕 Taxi: ฿${travelCost.toLocaleString()}

💰 Total: ฿${total.toLocaleString()}
————————————
📞 Phone: ${phone}

🗺 Map: ${googleMapLink}`.trim();

          try {
      await sendTelegramMessage(message);
      await addDoc(collection(db, 'bookings'), {
        therapistId: therapist?.id,
        therapistName: therapist?.name,
        serviceName: selectedService?.name,
        servicePrice,
        date,
        time: selectedTime,
        address,
        phone,
        note,
        total,
        status: 'upcoming',
        createdAt: Timestamp.now(),
        location: lat && lng ? { lat, lng } : null,
        distanceKm,
        travelCost,
      });
      alert('✅ Booking confirmed!');
      navigate('/booking/history');
    } catch (err) {
      console.error(err);
      alert('❌ Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  if (!therapist || !selectedService) {
    return <Box p={4}><Typography>Therapist or service not found.</Typography></Box>;
  }

  return (
    <Box sx={{ pb: 8, pt: 2, bgcolor: '#f5f5f7', minHeight: '100vh', fontFamily: 'Trebuchet MS, sans-serif' }}>
      <Typography fontSize={30} color="#000000" fontWeight="bold" textAlign="center" mt={3}>Booking Confirmation</Typography>

      <Box sx={{ maxWidth: 430, mx: 'auto', px: 2 }}>
        <Paper elevation={3} sx={{ p: 3, borderRadius: 6, mt: 3 }}>

         <Stack direction="row" spacing={2} alignItems="center" mb={2}>
  <Box sx={{ width: 90, height: 90, borderRadius: '50%', overflow: 'hidden', bgcolor: '#f0f0f0' }}>
    <img
      src={therapist.image.startsWith('/') ? therapist.image : `/images/${therapist.image}`}
      alt={therapist.name}
      style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
    />
  </Box>

  <Box>
    <Typography fontSize={26} color="#2b3b53" fontWeight="bold">
      {therapist.name}
    </Typography>

    <Box display="flex" alignItems="center" sx={{ ml: 2 }}>
      <img
        src="/images/icon/star.png"
        alt="star"
        style={{ width: 16, height: 16, marginRight: 4 }}
      />
      <Typography fontSize={14} color="gray">
        {therapist.rating} ({therapist.reviews})
      </Typography>
    </Box>
  </Box>
</Stack>

          <Paper onClick={handleSelectLocation} sx={{ mb: 2, p: 3, borderRadius: 4, cursor: 'pointer', border: '1px solid #ccc' }}>
            <Typography fontWeight="bold" fontSize={14} mb={1}>Address</Typography>
            <Typography fontSize={14} color={address ? 'text.primary' : 'text.secondary'}>
              {address || 'Tap to select your location'}
            </Typography>
            <EditLocationAltIcon color="primary" />
          </Paper>

          <TextField fullWidth label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} size="small"
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 4 } }} />

          <TextField fullWidth label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)}
            size="small" multiline rows={2} sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 4 } }} />

          <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Stack direction="row" spacing={2} mb={2}>
              <DatePicker label="Date" value={dayjs(date || undefined)}
                onChange={(newValue) => setDate(newValue?.format('YYYY-MM-DD') || '')} format="DD/MM/YYYY"
                slotProps={{ textField: { fullWidth: true, size: 'small', sx: { height: 48, '& .MuiOutlinedInput-root': { borderRadius: 4 } } } }} />
              <TextField label="Select time" type="time" value={selectedTime} onChange={(e) => setSelectedTime(e.target.value)}
                inputProps={{ step: 1800 }} fullWidth size="small" InputProps={{
                  sx: { height: 40, '& .MuiOutlinedInput-notchedOutline': { borderRadius: 4 } }
                }} />
            </Stack>
          </LocalizationProvider>

            <Paper variant="outlined" sx={{ p: 2, borderRadius: 4 }}>
            <Stack direction="row" spacing={2}>
              <Avatar
                src={selectedService.image}
                variant="rounded"
                sx={{ width: 80, height: 64, borderRadius: 2 }}
              />
              <Box flex={1}>
                <Typography fontWeight="bold" fontSize={16}>
                  {selectedService.name}
                </Typography>
                <Typography fontSize={13} color="text.secondary" mt={0.5}>
                  {selectedService.desc}
                </Typography>
              <Stack direction="row" justifyContent="flex-end" spacing={1} mt={1}>
                <Typography fontWeight="bold" color="#CC6600">
                  ฿{selectedService.price.toLocaleString()}
                </Typography>
                <Typography fontSize={13}>• ⏱ {selectedService.duration} นาที</Typography>
              </Stack>
              </Box>
            </Stack>
          </Paper>

          <Typography fontSize={14} mt={2} color="text.secondary">
            📍 Distance: {distanceKm?.toFixed(1) || '-'} km
          </Typography>
          <Box display="flex" alignItems="center" mt={-1}>
            <img
              src="/images/icon/Cab Location.gif" // ✅ ใช้ path รูปแท็กซี่ของคุณ
              alt="taxi"
              style={{ width: 55, height: 55, marginRight: 1 }}
            />
            <Typography fontWeight="bold" color="#996600">
              Taxi fare: ฿{travelCost.toLocaleString()}
            </Typography>
          </Box>
          <Box mt={2} bgcolor="#FFF7E0" border="1px solid #FFC107" borderRadius={4} p={2} display="flex" alignItems="flex-start">
            <img src="/badges/idea (1).png" alt="info" style={{ width: 30, height: 30, marginRight: 8, marginTop: 3 }} />
            <Box>
              <Typography fontSize={14} sx={{ fontWeight: 'bold', color: '#5D4037' }}>Tip:</Typography>
              <Typography fontSize={14} sx={{ color: '#4E342E', mt: 0.5 }}>
                After placing your booking, please wait for confirmation from our admin.
              </Typography>
              <Typography fontSize={13} sx={{ color: 'orange', fontWeight: 'bold', mt: 1 }}>
                If you experience any issues with the service or booking process, please report them through our Help Center.
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {!isLocationSelected && (
            <Typography fontSize={12} color="gray" mb={1}>
              * Please select your location to calculate the total cost.
            </Typography>
          )}

      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Box
          component="img"
          src="/images/icon/money-bag_7933010.png" // ✅ ไอคอนแทนคำว่า Total
          alt="Total"
          sx={{ width: 28, height: 28 }}
        />
        <Typography fontWeight="bold" color="#006600">
          Total
        </Typography>
      </Stack>

            <Typography fontWeight="bold" color="#006600">
              ฿{total.toLocaleString()}
            </Typography>
          </Stack>

          <Button
            fullWidth
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !isLocationSelected}
            sx={{ py: 1.4, fontWeight: 'bold', fontSize: 14, borderRadius: 4, background: '#1d3557' }}
          >
            {loading ? 'Processing...' : 'Confirm'}
          </Button>
        </Paper>
      </Box>
    </Box>
  );
};

export default BookingPage;
