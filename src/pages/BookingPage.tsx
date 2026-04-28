// src/pages/BookingPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Avatar,
  Stack,
  Paper,
  Divider,
  TextField,
  Button,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DatePicker } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import dayjs from "dayjs";

import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  doc,
  getDoc,
  runTransaction,
  increment,
  Timestamp,
} from "firebase/firestore";

import EditLocationAltIcon from "@mui/icons-material/EditLocationAlt";
import { v4 as uuidv4 } from "uuid";
import "react-phone-number-input/style.css";
import { toast } from "react-toastify";

import { useTranslation } from "react-i18next";
import { db } from "@/lib/firebase";
import services, { type MassageService } from "@/data/services";
import { useAuth } from "@/providers/AuthProvider";
import { calcNextAvailable } from "@/utils/calculateNextAvailable";
import type { Therapist } from "@/types/therapist";
import { getErrorMessage } from "@/utils/getErrorMessage";
import { isInappropriate } from "@/utils/moderate";
import { useGoogleMaps } from "@/context/GoogleMapsContext";

import isSameOrAfter from "dayjs/plugin/isSameOrAfter";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

// ===================== GOOGLE MAPS URL =====================
const buildGoogleMapsUrl = (
  name: string | null,
  address: string | null,
  lat: string,
  lng: string
) => {
  const base = "https://www.google.com/maps/search/?api=1&query=";

  if (name && name.trim() !== "") return base + encodeURIComponent(name);
  if (address && address.trim() !== "") return base + encodeURIComponent(address);

  return base + `${lat},${lng}`;
};

// ===================== UTILS =====================
const isTimeInRangeCrossDay = (startTime: string, endTime: string, target: string) => {
  const s = dayjs(startTime, "HH:mm");
  const e = dayjs(endTime, "HH:mm");
  let t = dayjs(target, "HH:mm");

  if (e.isBefore(s)) {
    if (t.isBefore(s)) t = t.add(1, "day");
    return t.isSameOrAfter(s) && t.isSameOrBefore(e.add(1, "day"));
  }
  return t.isSameOrAfter(s) && t.isSameOrBefore(e);
};

const isTimeRangeOverlap = (startA: Date, endA: Date, startB: Date, endB: Date) =>
  startA < endB && endA > startB;

const buildDateWithCrossDay = (dateStr: string, hhmm: string) =>
  dayjs(`${dateStr} ${hhmm}`, "YYYY-MM-DD HH:mm").toDate();

const BASE_FARE = 25;
const PER_KM = 7;
const PER_MIN = 2;

const calculateGrabFare = (distanceKm: number, durationMin: number) => {
  const oneWay = BASE_FARE + distanceKm * PER_KM + durationMin * PER_MIN;
  return Math.max(0, Math.round(oneWay * 2));
};

const normalize = (s: string) => s.trim().toLowerCase();

const getDurationMinutes = (
  svc: MassageService | null | undefined
): number => {
  if (!svc) return 60;
  // ฟิลด์อย่างเป็นทางการคือ `duration` (number) — fallback เผื่อข้อมูลเก่า
  const raw =
    (svc as MassageService & { durationText?: string | number }).durationText ??
    svc.duration ??
    60;
  if (typeof raw === "number") return raw;
  const m = String(raw).match(/\d+/);
  return m ? Number(m[0]) : 60;
};

// ===================== TYPES =====================
interface BookingLocationState {
  selectedLat?: number | string;
  selectedLng?: number | string;
  selectedAddress?: string;
}

/** keys ตรงกับที่ JSX ใช้:  errors.phone / errors.time / errors.location */
interface BookingFormErrors {
  phone?: boolean;
  time?: boolean;
  location?: boolean;
}

/** narrow shape ของ therapist ที่ BookingPage ใช้จริง — ไม่ต้องคุมทุกฟิลด์ */
type TherapistDoc = Partial<Therapist> & {
  id: string;
  /** ฟิลด์ legacy ที่อาจอยู่ตรงราก doc */
  lat?: number | string;
  lng?: number | string;
};

const escapeMd = (s = "") =>
  s
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*")
    .replace(/\[/g, "\\[")
    .replace(/`/g, "\\`");

// ===================== TELEGRAM =====================
// เรียก Cloud Function (notifyBooking) — token เก็บฝั่ง server เท่านั้น
// ดู functions/src/index.ts สำหรับการตั้ง secret
import { getFunctions, httpsCallable } from "firebase/functions";
import { app as firebaseApp } from "@/lib/firebase";

const sendTelegramMessage = async (message: string) => {
  try {
    const functions = getFunctions(firebaseApp, "asia-southeast1");
    const notifyBooking = httpsCallable<{ message: string }, { ok: boolean }>(
      functions,
      "notifyBooking"
    );
    await notifyBooking({ message });
  } catch (err) {
    // ไม่ throw ออกไปนอก: failure ของ noti ต้องไม่ทำให้ booking flow ล้ม
    console.error("Telegram notify failed:", err);
  }
};

// ===================== MAIN =====================
const BookingPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadIfNeeded: loadGoogleMaps } = useGoogleMaps();

  // ⚡ Lazy-load Google Maps SDK when entering booking page (geocoder + distance)
  useEffect(() => {
    loadGoogleMaps();
  }, [loadGoogleMaps]);

  const queryParams = new URLSearchParams(location.search);
  const state = (location.state ?? null) as BookingLocationState | null;

  const therapistId = location.pathname.split("/booking/")[1] || "";
  const serviceName = queryParams.get("service") || "";

  const selectedService = services.find(
    (s) => normalize(s.name) === normalize(serviceName)
  );

  const selectedLat =
    queryParams.get("selectedLat") ?? state?.selectedLat?.toString() ?? "";

  const selectedLng =
    queryParams.get("selectedLng") ?? state?.selectedLng?.toString() ?? "";

  const selectedAddress =
    queryParams.get("address") ?? state?.selectedAddress ?? "";

  const placeName = queryParams.get("placeName");
  const formattedAddress = queryParams.get("formattedAddress");
  const placeId = queryParams.get("placeId");

  const [therapist, setTherapist] = useState<TherapistDoc | null>(null);
  const [therapistDocId, setTherapistDocId] = useState<string | null>(null);

  const [address, setAddress] = useState(formattedAddress || selectedAddress || "");
  const [locationName, setLocationName] = useState(placeName || "");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [selectedTime, setSelectedTime] = useState("");

  const [distanceKm, setDistanceKm] = useState<number | null>(null);
  const [durationMin, setDurationMin] = useState<number | null>(null);
  const [rainSurcharge, setRainSurcharge] = useState(0);
  const [errors, setErrors] = useState<BookingFormErrors>({});
  const [loading, setLoading] = useState(false);

  const [deviceId, setDeviceId] = useState<string | null>(null);

  const displayAddress = useMemo(() => {
    const raw = locationName || address || "";
    return raw.replace(/,?\s*Thailand$/i, "").trim();
  }, [locationName, address]);

  // DEVICE
  useEffect(() => {
    let id = localStorage.getItem("deviceId");
    if (!id) {
      id = uuidv4();
      localStorage.setItem("deviceId", id);
    }
    setDeviceId(id);
  }, []);

  // FETCH THERAPIST
  useEffect(() => {
    const fetchTherapist = async () => {
      try {
        const snap = await getDoc(doc(db, "therapists", therapistId));
        if (snap.exists()) {
          setTherapistDocId(snap.id);
          setTherapist({ id: snap.id, ...(snap.data() as Partial<Therapist>) });
          return;
        }

        const q = query(collection(db, "therapists"), where("id", "==", therapistId));
        const result = await getDocs(q);
        if (!result.empty) {
          const d = result.docs[0];
          setTherapistDocId(d.id);
          setTherapist({ id: d.id, ...(d.data() as Partial<Therapist>) });
        }
      } catch (err) {
        console.error("Therapist fetch fail:", err);
      }
    };
    if (therapistId) void fetchTherapist();
  }, [therapistId]);

  // GEOCODER
  useEffect(() => {
    if (!selectedLat || !selectedLng) return;
    if (locationName || address) return;

    const g = window.google;
    if (!g?.maps?.Geocoder) return;

    // geocode() คืน Promise (ใหม่) แต่เราใช้ callback signature — void prefix กัน floating
    void new g.maps.Geocoder().geocode(
      { location: { lat: +selectedLat, lng: +selectedLng } },
      (res, status) => {
        if (status === "OK" && res && res.length > 0) {
          setAddress(res[0].formatted_address || "");
        }
      }
    );
  }, [selectedLat, selectedLng, locationName, address]);

  // DISTANCE
  useEffect(() => {
    if (!selectedLat || !selectedLng || !therapist) return;

    const tLat = parseFloat(
      String(therapist.currentLocation?.lat ?? therapist.lat ?? "")
    );
    const tLng = parseFloat(
      String(therapist.currentLocation?.lng ?? therapist.lng ?? "")
    );

    if (!tLat || !tLng) return;

    const g = window.google;
    if (!g?.maps?.DistanceMatrixService) return;

    void new g.maps.DistanceMatrixService().getDistanceMatrix(
      {
        origins: [new g.maps.LatLng(tLat, tLng)],
        destinations: [new g.maps.LatLng(+selectedLat, +selectedLng)],
        travelMode: g.maps.TravelMode.DRIVING,
        unitSystem: g.maps.UnitSystem.METRIC,
      },
      (res, status) => {
        const el = res?.rows[0]?.elements?.[0];
        if (status === "OK" && el?.status === "OK") {
          setDistanceKm(el.distance.value / 1000);
          setDurationMin(Math.ceil(el.duration.value / 60));
        }
      }
    );
  }, [selectedLat, selectedLng, therapist]);

  // WEATHER
  useEffect(() => {
    const key = import.meta.env.VITE_OPENWEATHER_KEY;
    if (!key || !selectedLat || !selectedLng) return;

    interface OWMWeather { main?: string }
    interface OWMResponse { weather?: OWMWeather[] }

    fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${selectedLat}&lon=${selectedLng}&appid=${key}`
    )
      .then((r) => r.json() as Promise<OWMResponse>)
      .then((data) => {
        const raining = (data.weather ?? []).some((w) =>
          String(w.main ?? "").toLowerCase().includes("rain")
        );
        setRainSurcharge(raining ? 0.2 : 0);
      })
      .catch(() => {
        /* fail silently — fallback คือไม่บวก rain surcharge */
      });
  }, [selectedLat, selectedLng]);

  const travelCost = useMemo(() => {
    if (distanceKm === null || durationMin === null) return 0;
    let cost = calculateGrabFare(distanceKm, durationMin);
    if (rainSurcharge > 0) cost = Math.round(cost * (1 + rainSurcharge));
    return cost;
  }, [distanceKm, durationMin, rainSurcharge]);

  const isLocationSelected = !!(
    selectedLat &&
    selectedLng &&
    (locationName || address)
  );

  const total = (selectedService?.price || 0) + travelCost;

  const isWithinWorkingHours = (startDate: Date, endDate: Date): boolean => {
    if (!therapist?.startTime || !therapist.endTime) return true;

    const startHH = dayjs(startDate).format("HH:mm");
    const endHH = dayjs(endDate).format("HH:mm");

    return (
      isTimeInRangeCrossDay(therapist.startTime, therapist.endTime, startHH) &&
      isTimeInRangeCrossDay(therapist.startTime, therapist.endTime, endHH)
    );
  };

  const hasBookingConflict = async (tid: string, start: Date, end: Date) => {
    const qBk = query(
      collection(db, "bookings"),
      where("therapistId", "==", tid),
      where("status", "in", ["confirmed", "paid", "completed", "done"])
    );
    const snap = await getDocs(qBk);

    for (const d of snap.docs) {
      const data = d.data();
      const s = data.startAt?.toDate?.() || data.startAt;
      const e = data.endAt?.toDate?.() || data.endAt;
      if (s && e && isTimeRangeOverlap(start, end, new Date(s), new Date(e))) {
        return true;
      }
    }
    return false;
  };

  // ===================== SUBMIT =====================
  const handleSubmit = async () => {
    const nextErrors = {
      phone: phone.length < 6 || phone.length > 15,
      time: !selectedTime,
      location: !isLocationSelected,
    };
    setErrors(nextErrors);

    if (nextErrors.phone) { toast.warning("Please enter a valid phone number."); return; }
    if (nextErrors.location) { toast.warning("Please select a valid service location."); return; }
    if (nextErrors.time) { toast.warning("Please select booking time."); return; }

    if (!therapist || !selectedService) {
      toast.error("Therapist not found.");
      return;
    }

    setLoading(true);

    try {
      const startDate = buildDateWithCrossDay(date, selectedTime);
      const durationMinLocal = getDurationMinutes(selectedService);
      const endDate = dayjs(startDate).add(durationMinLocal, "minute").toDate();

      if (!isWithinWorkingHours(startDate, endDate)) {
        toast.warning("Selected time is outside working hours.");
        setLoading(false);
        return;
      }

      if (await hasBookingConflict(therapist.id, startDate, endDate)) {
        toast.warning("This time slot is not available.");
        setLoading(false);
        return;
      }

      // 🛡️ ตรวจ note ว่ามีเนื้อหาไม่เหมาะสมไหม (sexual / harassment / spam)
      if (note.trim() && (await isInappropriate(note))) {
        toast.error(
          "Your note contains inappropriate content. Please revise."
        );
        setLoading(false);
        return;
      }

      const bookingRef = await addDoc(collection(db, "bookings"), {
        userId: user?.uid || null,
        therapistId: therapist.id,
        therapistName: therapist.name,
        serviceName: selectedService.name,
        servicePrice: selectedService.price || 0,
        date,
        time: selectedTime,
        startAt: Timestamp.fromDate(startDate),
        endAt: Timestamp.fromDate(endDate),
        address: displayAddress || "-",
        locationName,
        phone,
        note,
        taxiFee: travelCost,
        totalPrice: total,
        distanceKm,
        payment: "Cash",
        status: "confirmed",
        createdAt: Timestamp.now(),
        location:
          selectedLat && selectedLng
            ? { lat: +selectedLat, lng: +selectedLng }
            : null,
        duration: durationMinLocal,
        deviceId,
        placeId,
      });

      // ===================== TELEGRAM MESSAGE =====================
      const bookingTime = dayjs(startDate).format("DD/MM/YYYY HH:mm");

      const mapUrl = buildGoogleMapsUrl(
        locationName,
        displayAddress,
        selectedLat,
        selectedLng
      );

      const message = [
        `${escapeMd(bookingTime)}`,
        `🧾 Booking ID: ${bookingRef.id}`,
        "",
        `Therapist: ${escapeMd(therapist.name || "-")}`,
        `Time: ${escapeMd(selectedTime)}`,
        "────────────────────",
        `📍 Address: ${escapeMd(displayAddress || "-")}`,
        "",
        `Service: ${escapeMd(selectedService.name || "-")}`,
        `Duration: ${durationMinLocal} min`,
        `Price: ${selectedService.price.toLocaleString()} ฿`,
        "",
        `🚖 Taxi: ${travelCost.toLocaleString()} ฿`,
        `💰 Total: ${total.toLocaleString()} ฿`,
        "",
        `📞 Phone: ${escapeMd(phone)}`,
        `Note: ${escapeMd(note || "-")}`,
        "────────────────────",
        `🗺️ Map: ${mapUrl}`,
      ].join("\n");

      await sendTelegramMessage(message);

      // ===================== UPDATE THERAPIST =====================
      if (therapistDocId) {
        await runTransaction(db, async (tx) => {
          const tRef = doc(db, "therapists", therapistDocId);
          const snap = await tx.get(tRef);
          const data = snap.data() || {};

          const busyExisting = data.busyUntil?.toDate?.() || null;

          tx.update(tRef, {
            isBooked: true,
            busyUntil: Timestamp.fromDate(endDate),
            nextAvailable: calcNextAvailable(startDate, durationMinLocal, 10, {
              startTime: therapist.startTime,
              endTime: therapist.endTime,
              busyUntil: busyExisting,
            }),
            todayBookings: increment(1),
            totalBookings: increment(1),
            updatedAt: Timestamp.now(),
          });
        });
      }

      void navigate("/booking/confirm", { state: { bookingId: bookingRef.id } });
    } catch (err) {
      console.error("Booking Error:", err);
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ===================== RENDER =====================
  if (!therapist || !selectedService) {
    return (
      <Box sx={{ maxWidth: 430, mx: "auto", mt: 6, px: 2 }}>
        <Typography align="center">Loading booking details...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 430, mx: "auto", mt: 3, mb: 2, px: 2 }}>
      {/* HEADER */}
      <Box
        sx={{
          background: "linear-gradient(to bottom, #FE0944, #FEC9A7)",
          borderRadius: "20px",
          py: 1,
          px: 4,
          textAlign: "center",
          boxShadow: "0px 10px 25px rgba(0,0,0,0.15)",
        }}
      >
        <Typography
          fontSize={26}
          fontWeight="bold"
          sx={{ color: "#fff", fontFamily: "Chonburi, serif", letterSpacing: 2 }}
        >
          Reservation Order
        </Typography>
      </Box>

      <Paper elevation={3} sx={{ p: 3, borderRadius: 6, mt: 3 }}>
        {/* THERAPIST */}
        <Stack direction="row" spacing={2} alignItems="center" mb={2}>
          <Box sx={{ width: 90, height: 90, borderRadius: "50%", overflow: "hidden" }}>
            <img
              src={
                therapist.image
                  ? therapist.image.startsWith("/")
                    ? therapist.image
                    : `/images/${therapist.image}`
                  : "/images/default-therapist.png"
              }
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </Box>

          <Box>
            <Typography fontSize={26} fontWeight="bold" color="#3a3420">
              {therapist.name}
            </Typography>

            <Box display="flex" alignItems="center" ml={1}>
              <img src="/images/icon/star.png" style={{ width: 16, height: 16 }} />
              <Typography fontSize={14} color="gray" ml={0.5}>
                {therapist.rating}
              </Typography>
            </Box>
          </Box>
        </Stack>

        {/* ADDRESS */}
        <Paper
          sx={{ mb: 2, p: 3, borderRadius: 6, cursor: "pointer" }}
          onClick={() =>
            navigate("/select-location", {
              state: {
                therapistId,
                service: serviceName,
                selectedLat,
                selectedLng,
                selectedAddress: address,
              },
            })
          }
        >
          <Typography fontWeight="bold" mb={1}>
            Address
          </Typography>
          <Typography fontSize={14}>
            {displayAddress || "Tap to select location"}
          </Typography>
          <EditLocationAltIcon color="primary" />
        </Paper>

        {/* PHONE */}
        <TextField
          fullWidth
          label="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          size="small"
          error={!!errors.phone}
          helperText={errors.phone ? "* Please enter a valid phone number" : " "}
          sx={{
            mb: -1,
            "& .MuiOutlinedInput-root": {
              borderRadius: "16px",
            },
          }}
        />

        {/* NOTE */}
        <TextField
          fullWidth
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          size="small"
          multiline
          rows={2}
          sx={{
            mb: 2,
            "& .MuiOutlinedInput-root": { borderRadius: "16px" },
          }}
        />

        {/* DATE + TIME */}
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <Stack direction="row" spacing={2} mb={2}>
            <DatePicker
              label="Date"
              value={dayjs(date)}
              onChange={(v) => setDate(v?.format("YYYY-MM-DD") || "")}
              format="DD/MM/YYYY"
              slotProps={{
                textField: {
                  fullWidth: true,
                  size: "small",
                  sx: {
                    "& .MuiOutlinedInput-root": {
                      borderRadius: "16px",
                    },
                  },
                },
              }}
            />

            <TextField
              label="Time"
              type="time"
              value={selectedTime}
              onChange={(e) => setSelectedTime(e.target.value)}
              error={!!errors.time}
              helperText={errors.time ? "Select time" : " "}
              fullWidth
              size="small"
              sx={{
                "& .MuiOutlinedInput-root": { borderRadius: "16px" },
              }}
            />
          </Stack>
        </LocalizationProvider>

        {/* SERVICE */}
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 4 }}>
          <Stack direction="row" spacing={2}>
            <Avatar
              src={selectedService.image}
              variant="rounded"
              sx={{ width: 80, height: 80, borderRadius: 2 }}
            />
            <Box flex={1}>
              <Typography fontWeight="bold" color="#3a3420">
                {selectedService.name}
              </Typography>
              <Typography fontSize={13} color="text.secondary" mt={0.5}>
                {selectedService.desc}
              </Typography>
              <Stack direction="row" justifyContent="flex-end" spacing={1} mt={1}>
                <Typography fontWeight="bold" color="#CC6600">
                  {(selectedService.price ?? 0).toLocaleString()}฿
                </Typography>
                <Typography fontSize={14}>
                  • ⏱ {getDurationMinutes(selectedService)} min
                </Typography>
              </Stack>
            </Box>
          </Stack>
        </Paper>

        {/* TAXI */}
        <Typography fontSize={14} mt={2} color="text.secondary">
          📍 Distance: {distanceKm !== null ? distanceKm.toFixed(1) : "-"} km{" "}
          {durationMin && <> • ⏱ ETA: {durationMin} min</>}
        </Typography>

        <Box display="flex" alignItems="center" mt={-1}>
          <img src="/images/icon/Cab Location.gif" style={{ width: 55, height: 55 }} />
          <Typography fontWeight="bold" color="#3a3420">
            Taxi fare: ฿{travelCost.toLocaleString()}
          </Typography>
        </Box>

        {rainSurcharge > 0 && (
          <Typography fontSize={13} color="red">
            🌧 Rain detected — taxi fare +20%
          </Typography>
        )}

        {/* NOTICE */}
        <Box sx={{ p: 2, borderRadius: 4, bgcolor: "#fff7e6", mb: 2 }}>
          <Typography fontSize={14} color="#3a3420">
            After placing your booking, please wait for your booking reference number.
          </Typography>
          <Typography
            fontSize={13}
            sx={{ color: "orange", fontWeight: "bold", mt: 1 }}
          >
            If you experience any issues, please contact our Help Center.
          </Typography>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* TOTAL */}
        <Stack direction="row" justifyContent="space-between" mb={2}>
          <Typography fontWeight="bold" color="#006600">
            Total
          </Typography>
          <Typography fontWeight="bold" color="#006600">
            {total.toLocaleString()}฿
          </Typography>
        </Stack>

        {/* BUTTON */}
        <Button
          fullWidth
          variant="contained"
          sx={{
            py: 1.4,
            fontWeight: "bold",
            borderRadius: 6,
            background: "#FEAE96",
          }}
          disabled={loading}
          onClick={handleSubmit}
        >
          {loading ? "Sending..." : "PLACE ORDER"}
        </Button>
      </Paper>
    </Box>
  );
};

export default BookingPage;