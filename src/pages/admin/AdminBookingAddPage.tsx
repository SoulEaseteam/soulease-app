// src/pages/admin/AdminBookingAddPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Button,
  Divider,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs, { Dayjs } from "dayjs";
import {
  collection,
  getDocs,
  onSnapshot,
  addDoc,
  Timestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import services from "@/data/services";

// ---------- helpers ----------
const getDurationMinutes = (svc: any): number => {
  if (!svc) return 60;
  const raw = svc.duration ?? svc.durationText ?? 60;
  if (typeof raw === "number") return raw || 60;
  if (typeof raw === "string") {
    const m = raw.match(/\d+/);
    return m ? Number(m[0]) : 60;
  }
  return 60;
};

type TherapistOption = {
  id: string;      // docId
  name: string;
  image?: string;
};

const AdminBookingAddPage: React.FC = () => {
  const navigate = useNavigate();

  // therapists list
  const [therapists, setTherapists] = useState<TherapistOption[]>([]);
  const [therapistId, setTherapistId] = useState<string>("");

  // service
  const [serviceName, setServiceName] = useState<string>("");

  // customer info
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");

  // booking time
  const [date, setDate] = useState<Dayjs | null>(dayjs());
  const [time, setTime] = useState<string>("");

  // address
  const [address, setAddress] = useState("");
  const [locationName, setLocationName] = useState("");

  // payment
  const [paymentMethod, setPaymentMethod] = useState<string>("cash");

  // taxi + total
  const [taxiFee, setTaxiFee] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<any>({});

  // Real-time subscribe to therapists — new therapists appear without page refresh
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "therapists"), (snap) => {
      const list: TherapistOption[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.name || d.id,
          image: data.image,
        };
      });
      setTherapists(list);
    });
    return () => unsub();
  }, []);

  const selectedService = useMemo(
    () => services.find((s) => s.name === serviceName),
    [serviceName]
  );

  const servicePrice = selectedService?.price ?? 0;
  const totalPrice = servicePrice + (taxiFee || 0);

  const handleSubmit = async () => {
    const nextErrors = {
      therapist: !therapistId,
      service: !serviceName,
      customerName: !customerName.trim(),
      phone: !/^\+?[0-9]{6,15}$/.test(phone), // รองรับทุกประเทศ
      date: !date,
      time: !time,
      address: !address.trim(),
    };
    setErrors(nextErrors);

    if (Object.values(nextErrors).some(Boolean)) {
      alert("Please fill out all required fields correctly.");
      return;
    }

    if (!date) return;

    try {
      setSaving(true);

      // ❗ Admin override: ไม่เช็คเวลางาน / ไม่เช็คคิวซ้อน
      const dateStr = date.format("YYYY-MM-DD");
      const startAt = dayjs(`${dateStr} ${time}`, "YYYY-MM-DD HH:mm").toDate();
      const durationMin = getDurationMinutes(selectedService);
      const endAt = dayjs(startAt).add(durationMin, "minute").toDate();

      const therapist = therapists.find((t) => t.id === therapistId);

      const bookingRef = await addDoc(collection(db, "bookings"), {
        userId: null, // admin manual booking
        customerName: customerName.trim(),
        therapistId: therapistId,
        therapistName: therapist?.name || "",
        serviceName: selectedService?.name || "",
        servicePrice,
        taxiFee: taxiFee || 0,
        totalPrice,
        date: dateStr,
        time,
        startAt: Timestamp.fromDate(startAt),
        endAt: Timestamp.fromDate(endAt),
        address,
        locationName: locationName || address,
        phone,
        note,
        status: "confirmed",
        payment: paymentMethod,
        createdAt: Timestamp.now(),
        createdBy: "admin",
      });

      alert(`Booking created successfully. ID: ${bookingRef.id}`);
      navigate("/admin/bookings");
    } catch (err) {
      console.error(err);
      alert("Failed to create booking.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Typography variant="h5" fontWeight="bold" mb={2}>
        🧾 New Booking (Admin)
      </Typography>

      <Paper
        elevation={3}
        sx={{
          p: 3,
          borderRadius: 3,
          maxWidth: 720,
        }}
      >
        {/* Section: Reservation Order */}
        <Box
          sx={{
            borderRadius: 2,
            border: "1px solid rgba(0,0,0,0.08)",
            p: 2.5,
            mb: 3,
            background:
              "linear-gradient(180deg, rgba(254, 244, 240, 1) 0%, #ffffff 45%, #fff7f2 100%)",
          }}
        >
          <Typography
            fontSize={20}
            fontWeight="bold"
            sx={{ color: "#3a3420" }}
            mb={1}
          >
            Reservation Order
          </Typography>
          <Typography fontSize={13} sx={{ color: "#6b6350" }}>
            Create a manual booking for any therapist at any time. This action
            bypasses working hours and conflict checks.
          </Typography>
        </Box>

        {/* Therapist & Service */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={2}>
          <FormControl fullWidth size="small" error={!!errors.therapist}>
            <InputLabel>Therapist</InputLabel>
            <Select
              label="Therapist"
              value={therapistId}
              onChange={(e) => setTherapistId(e.target.value)}
            >
              {therapists.map((t) => (
                <MenuItem key={t.id} value={t.id}>
                  {t.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth size="small" error={!!errors.service}>
            <InputLabel>Service</InputLabel>
            <Select
              label="Service"
              value={serviceName}
              onChange={(e) => setServiceName(e.target.value)}
            >
              {services.map((s) => (
                <MenuItem key={s.name} value={s.name}>
                  {s.name} — {s.price?.toLocaleString()}฿
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>

        {/* Customer */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={2}>
          <TextField
            label="Customer Name"
            fullWidth
            size="small"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            error={!!errors.customerName}
            helperText={errors.customerName ? "Required" : " "}
          />
          <TextField
            label="Phone"
            fullWidth
            size="small"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={!!errors.phone}
            helperText={
              errors.phone
                ? "Enter a valid phone (6–15 digits, with or without +)"
                : " "
            }
          />
        </Stack>

        {/* Date & Time */}
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={2}>
            <DatePicker
              label="Date"
              value={date}
              onChange={(v) => setDate(v)}
              format="DD/MM/YYYY"
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: "small",
                  error: !!errors.date,
                  helperText: errors.date ? "Required" : " ",
                },
              }}
            />
            <TextField
              label="Time"
              type="time"
              fullWidth
              size="small"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              error={!!errors.time}
              helperText={errors.time ? "Required" : " "}
            />
          </Stack>
        </LocalizationProvider>

        {/* Address */}
        <TextField
          label="Location Name (optional)"
          fullWidth
          size="small"
          value={locationName}
          onChange={(e) => setLocationName(e.target.value)}
          sx={{ mb: 1 }}
        />
        <TextField
          label="Address"
          fullWidth
          size="small"
          multiline
          rows={2}
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          error={!!errors.address}
          helperText={errors.address ? "Required" : " "}
          sx={{ mb: 2 }}
        />

        {/* Note */}
        <TextField
          label="Note (optional)"
          fullWidth
          size="small"
          multiline
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          sx={{ mb: 2 }}
        />

        {/* Payment / Taxi */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} mb={2}>
          <FormControl fullWidth size="small">
            <InputLabel>Payment Method</InputLabel>
            <Select
              label="Payment Method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <MenuItem value="cash">Cash</MenuItem>
              <MenuItem value="transfer">Bank Transfer</MenuItem>
              <MenuItem value="card">Card</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Taxi Fee (฿)"
            type="number"
            fullWidth
            size="small"
            value={taxiFee}
            onChange={(e) => setTaxiFee(Number(e.target.value) || 0)}
          />
        </Stack>

        {/* Summary */}
        <Divider sx={{ my: 2 }} />
        <Stack direction="row" justifyContent="space-between" mb={1}>
          <Typography>Service</Typography>
          <Typography>{servicePrice.toLocaleString()}฿</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" mb={1}>
          <Typography>Taxi</Typography>
          <Typography>{(taxiFee || 0).toLocaleString()}฿</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" mb={2}>
          <Typography fontWeight="bold" color="#006600">
            Total
          </Typography>
          <Typography fontWeight="bold" color="#006600">
            {totalPrice.toLocaleString()}฿
          </Typography>
        </Stack>

        <Box
          sx={{
            p: 2,
            borderRadius: 2,
            bgcolor: "#fff7e6",
            mb: 2,
          }}
        >
          <Typography fontSize={13} sx={{ color: "#3a3420" }}>
            Once this booking is created, it will appear in the main booking
            list and be treated as a normal confirmed job.
          </Typography>
        </Box>

        <Button
          variant="contained"
          fullWidth
          sx={{ py: 1.2, borderRadius: 2 }}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? "Saving..." : "Create Booking"}
        </Button>
      </Paper>
    </Box>
  );
};

export default AdminBookingAddPage;