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
  doc,
  getDoc,
  runTransaction,
  increment,
  Timestamp,
  updateDoc,
} from "firebase/firestore";

import EditLocationAltIcon from "@mui/icons-material/EditLocationAlt";
import { v4 as uuidv4 } from "uuid";
import "react-phone-number-input/style.css";

import { useTranslation } from "react-i18next";
import { db } from "@/lib/firebase";
import services from "@/data/services";
import { useAuth } from "@/providers/AuthProvider";
import { calcNextAvailable } from "@/utils/calculateNextAvailable";

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

const getDurationMinutes = (svc: any): number => {
  if (!svc) return 60;
  const raw = svc.duration ?? svc.durationText ?? 60;
  if (typeof raw === "number") return raw;
  const m = String(raw).match(/\d+/);
  return m ? Number(m[0]) : 60;
};

const escapeMd = (s: string = "") =>
  s
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*")
    .replace(/\[/g, "\\[")
    .replace(/`/g, "\\`");

// ===================== TELEGRAM =====================
// คืนค่า boolean: true = ส่งสำเร็จ, false = ล้มเหลว (จะได้ tracker/log ได้)
const sendTelegramMessage = async (message: string): Promise<boolean> => {
  const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn("[Telegram] missing token/chatId — skipping notification");
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: "Markdown",
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error("[Telegram] non-OK response:", res.status, body);
      return false;
    }
    return true;
  } catch (err) {
    // ไม่ throw — booking ต้องไม่ล้มเหลวเพราะ Telegram ห่วย
    console.error("[Telegram] network/error sending notification:", err);
    return false;
  }
};

// ===================== MAIN =====================
const BookingPage: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const state = location.state as any;

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

  const [therapist, setTherapist] = useState<any>(null);
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
  const [errors, setErrors] = useState<any>({});
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
        let snap = await getDoc(doc(db, "therapists", therapistId));
        if (snap.exists()) {
          setTherapistDocId(snap.id);
          setTherapist({ id: snap.id, ...snap.data() });
          return;
        }

        const q = query(collection(db, "therapists"), where("id", "==", therapistId));
        const result = await getDocs(q);
        if (!result.empty) {
          const d = result.docs[0];
          setTherapistDocId(d.id);
          setTherapist({ id: d.id, ...d.data() });
        }
      } catch (err) {
        console.error("Therapist fetch fail:", err);
      }
    };
    if (therapistId) fetchTherapist();
  }, [therapistId]);

  // GEOCODER
  useEffect(() => {
    if (!selectedLat || !selectedLng) return;
    if (locationName || address) return;

    const g = (window as any).google;
    if (!g?.maps?.Geocoder) return;

    new g.maps.Geocoder().geocode(
      { location: { lat: +selectedLat, lng: +selectedLng } },
      (res: any, status: any) => {
        if (status === "OK" && res?.length) {
          setAddress(res[0].formatted_address || "");
        }
      }
    );
  }, [selectedLat, selectedLng, locationName, address]);

  // DISTANCE
  useEffect(() => {
    if (!selectedLat || !selectedLng || !therapist) return;

    const tLat = parseFloat(therapist?.currentLocation?.lat ?? therapist?.lat ?? "");
    const tLng = parseFloat(therapist?.currentLocation?.lng ?? therapist?.lng ?? "");

    if (!tLat || !tLng) return;

    const g = (window as any).google;
    if (!g?.maps?.DistanceMatrixService) return;

    new g.maps.DistanceMatrixService().getDistanceMatrix(
      {
        origins: [new g.maps.LatLng(tLat, tLng)],
        destinations: [new g.maps.LatLng(+selectedLat, +selectedLng)],
        travelMode: "DRIVING",
        unitSystem: g.maps.UnitSystem.METRIC,
      },
      (res: any, status: any) => {
        if (status === "OK" && res?.rows?.[0]?.elements?.[0]?.status === "OK") {
          const el = res.rows[0].elements[0];
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

    fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${selectedLat}&lon=${selectedLng}&appid=${key}`
    )
      .then((r) => r.json())
      .then((data) => {
        const raining = (data?.weather || []).some((w: any) =>
          String(w.main || "").toLowerCase().includes("rain")
        );
        setRainSurcharge(raining ? 0.2 : 0);
      })
      .catch(() => {});
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
    if (!therapist?.startTime || !therapist?.endTime) return true;

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

    if (nextErrors.phone) return alert(t("booking.errPhone", "Please enter a valid phone number."));
    if (nextErrors.location) return alert(t("booking.errLocation", "Please select a valid service location."));
    if (nextErrors.time) return alert(t("booking.errTime", "Please select booking time."));

    if (!therapist || !selectedService) {
      alert(t("booking.errTherapist", "Therapist not found."));
      return;
    }

    setLoading(true);

    try {
      const startDate = buildDateWithCrossDay(date, selectedTime);
      const durationMinLocal = getDurationMinutes(selectedService);
      const endDate = dayjs(startDate).add(durationMinLocal, "minute").toDate();

      if (!isWithinWorkingHours(startDate, endDate)) {
        alert(t("booking.errHours", "Selected time is outside working hours."));
        setLoading(false);
        return;
      }

      // Pre-check (UX): query existing bookings — give fast feedback before transaction
      if (await hasBookingConflict(therapist.id, startDate, endDate)) {
        alert(t("booking.errUnavailable", "This time slot is not available."));
        setLoading(false);
        return;
      }

      // ===================== ATOMIC BOOKING (race-condition safe) =====================
      // ใช้ deterministic doc ID จาก therapist + เวลาเริ่ม → ถ้า 2 คนกดจองเวลาเดียวกัน
      // คนที่สองจะ collide กับ docId เดียวกัน + busyUntil lock ใน transaction
      const startMs = startDate.getTime();
      const bookingDocId = `${therapist.id}_${startMs}`;
      const bookingRef = doc(db, "bookings", bookingDocId);

      const bookingData = {
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
      };

      try {
        await runTransaction(db, async (tx) => {
          // 1. Slot collision: ห้าม docId ซ้ำ (กันคนกดจองเวลาเดียวเป๊ะพร้อมกัน)
          const existing = await tx.get(bookingRef);
          if (existing.exists()) {
            throw new Error("SLOT_TAKEN");
          }

          // 2. ถ้ามี therapistDocId → เช็ค busyUntil ใน transaction (lock)
          if (therapistDocId) {
            const tRef = doc(db, "therapists", therapistDocId);
            const tSnap = await tx.get(tRef);
            const tData = tSnap.data() || {};
            const busyUntil: Date | null = tData.busyUntil?.toDate?.() || null;
            const now = new Date();

            // ถ้านักนวดยังนัดอยู่และช่วงที่จองทับ — abort
            if (busyUntil && busyUntil > now && startDate < busyUntil) {
              throw new Error("CONFLICT");
            }

            // 3. Update therapist (atomically with booking creation)
            tx.update(tRef, {
              isBooked: true,
              busyUntil: Timestamp.fromDate(endDate),
              nextAvailable: calcNextAvailable(startDate, durationMinLocal, 10, {
                startTime: therapist.startTime,
                endTime: therapist.endTime,
                busyUntil,
              }),
              todayBookings: increment(1),
              totalBookings: increment(1),
              updatedAt: Timestamp.now(),
            });
          }

          // 4. Create booking — ทุก write commit พร้อมกัน
          tx.set(bookingRef, bookingData);
        });
      } catch (err: any) {
        if (err?.message === "SLOT_TAKEN" || err?.message === "CONFLICT") {
          alert(t("booking.errSlotTaken", "⚠️ This time slot was just taken by another customer. Please pick another time."));
          setLoading(false);
          return;
        }
        throw err; // re-throw other errors to outer catch
      }

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

      // หมายเหตุ: ไม่ block booking ถ้า Telegram fail — แต่บันทึกผลไว้ใน booking doc
      // เพื่อให้ admin tools มี way to retry/audit ว่ามี notification ที่หลุด
      const telegramOk = await sendTelegramMessage(message);
      if (!telegramOk && bookingRef?.id) {
        try {
          await updateDoc(doc(db, "bookings", bookingRef.id), {
            telegramNotified: false,
            telegramFailedAt: Timestamp.now(),
          });
        } catch (e) {
          console.error("[Booking] failed to flag telegram failure:", e);
        }
      } else if (telegramOk && bookingRef?.id) {
        // mark success — admin tools can filter/audit easily
        try {
          await updateDoc(doc(db, "bookings", bookingRef.id), {
            telegramNotified: true,
          });
        } catch {
          // not critical
        }
      }

      // หมายเหตุ: therapist update ถูกย้ายไปอยู่ใน atomic transaction ข้างบนแล้ว
      // (ทำพร้อม booking creation เพื่อกัน race condition)

      navigate("/booking/confirm", { state: { bookingId: bookingRef.id } });
    } catch (err: any) {
      console.error("Booking Error:", err);
      // ให้ user เห็น error message ที่ชัดเจน — เผื่อ retry ได้
      const msg = err?.message || "";
      if (msg.includes("network") || msg.includes("offline")) {
        alert(t("booking.errNetwork", "⚠️ Network error. Please check your connection and try again."));
      } else if (msg.includes("permission")) {
        alert(t("booking.errPermission", "⚠️ Permission denied. Please log in and try again."));
      } else {
        alert(t("booking.errGeneric", "⚠️ Booking failed: {{msg}}. Please try again.", { msg: msg || "unknown error" }));
      }
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
                therapist?.image
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
              src={selectedService?.image}
              variant="rounded"
              sx={{ width: 80, height: 80, borderRadius: 2 }}
            />
            <Box flex={1}>
              <Typography fontWeight="bold" color="#3a3420">
                {selectedService?.name}
              </Typography>
              <Typography fontSize={13} color="text.secondary" mt={0.5}>
                {selectedService?.desc}
              </Typography>
              <Stack direction="row" justifyContent="flex-end" spacing={1} mt={1}>
                <Typography fontWeight="bold" color="#CC6600">
                  {(selectedService?.price ?? 0).toLocaleString()}฿
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

        {/* BUTTON — brand gradient + clearer CTA */}
        <Button
          fullWidth
          variant="contained"
          sx={{
            py: 1.7,
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 1,
            borderRadius: 99,
            background: "linear-gradient(180deg, #FE0944 0%, #FEAE96 100%)",
            boxShadow: "0 8px 24px rgba(254,9,68,0.35)",
            textTransform: "none",
            transition: "transform 0.15s ease, box-shadow 0.15s ease",
            "&:hover": {
              background: "linear-gradient(180deg, #E1083C 0%, #FB9078 100%)",
              boxShadow: "0 10px 28px rgba(254,9,68,0.45)",
              transform: "translateY(-1px)",
            },
            "&:active": { transform: "translateY(0)" },
            "&.Mui-disabled": {
              background: "#E5E7EB",
              color: "#9CA3AF",
              boxShadow: "none",
            },
          }}
          disabled={loading}
          onClick={handleSubmit}
        >
          {loading ? "กำลังจอง... / Booking..." : `ยืนยันการจอง • Confirm Booking — ${total.toLocaleString()} ฿`}
        </Button>

        {/* Trust microcopy ใต้ปุ่ม — กระตุ้นให้กดจอง */}
        <Typography
          textAlign="center"
          sx={{ mt: 1.2, fontSize: 11, color: "#888" }}
        >
          🔒 ชำระเงินเมื่อนักนวดมาถึง • Pay on arrival · Cancel anytime before therapist departs
        </Typography>
      </Paper>
    </Box>
  );
};

export default BookingPage;