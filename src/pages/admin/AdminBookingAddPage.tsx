// src/pages/admin/AdminBookingAddPage.tsx
//
// Round 28c22 (founder 2026-05-06) — Google Places search + auto taxi.
//   • Location field uses Autocomplete → gets placeName, lat, lng, address
//   • Taxi fee auto-calculated from haversine distance (editable override)
//   • mapUrl built from placeName for clean Telegram link
//   • No working-hour / holiday checks (admin privilege)

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Select,
  FormControl,
  CircularProgress,
  IconButton,
  InputAdornment,
} from "@mui/material";
import { motion } from "framer-motion";
import { collection, getDocs, addDoc, updateDoc, doc, Timestamp } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import services from "@/data/services";
import { priceForDuration, durationsFor, formatTHB } from "@/utils/servicePricing";
import { sendBookingNotification } from "@/utils/telegram";
import { estimateTaxiFare } from "@/utils/taxiFare";
import { useGoogleMaps } from "@/context/GoogleMapsContext";
import {
  ArrowLeft, CalendarBlank, Clock, User, Phone, MapPin,
  Note, CurrencyCircleDollar, Taxi, MagnifyingGlass,
} from "phosphor-react";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { brand, fonts } from "@/theme";

// ── constants ─────────────────────────────────────────────────────────
const SERIF = fonts.brandSerif ?? '"Fraunces", serif';
const SANS  = fonts.body       ?? '"Inter", sans-serif';

// SunRed base location (Sukhumvit area) — used when therapist lat/lng unknown
const BASE_LAT = 13.736717;
const BASE_LNG = 100.523186;

const PAYMENT_OPTIONS = [
  { value: "cash",      label: "เงินสด (Cash)" },
  { value: "transfer",  label: "โอนเงิน (Transfer)" },
  { value: "card",      label: "บัตร (Card)" },
  { value: "promptpay", label: "PromptPay" },
];

const MENU_PROPS = {
  PaperProps: {
    sx: {
      background: "#fff",
      boxShadow: "0 8px 24px rgba(0,0,0,0.14)",
      borderRadius: "14px",
      border: "1px solid rgba(60,30,20,0.08)",
      mt: 0.5,
    },
  },
};

type Errors = Partial<Record<string, string>>;

const fadeUp = (delay = 0) => ({
  initial:    { opacity: 0 },
  animate:    { opacity: 1 },
  transition: { duration: 0.22, delay, ease: "easeOut" as const },
});

// ── location state ────────────────────────────────────────────────────
interface LocationState {
  placeName: string;
  address: string;
  lat: number | null;
  lng: number | null;
  mapUrl: string | null;
}

const EMPTY_LOC: LocationState = {
  placeName: "",
  address: "",
  lat: null,
  lng: null,
  mapUrl: null,
};

function buildMapUrl(placeName: string, lat: number | null, lng: number | null): string | null {
  if (placeName) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(placeName)}`;
  if (lat != null && lng != null) return `https://www.google.com/maps?q=${lat},${lng}`;
  return null;
}

// ── component ─────────────────────────────────────────────────────────
const AdminBookingAddPage: React.FC = () => {
  const navigate = useNavigate();
  const { ready, loadIfNeeded } = useGoogleMaps();

  // therapists
  const [therapists, setTherapists] = useState<{ id: string; name: string; lat?: number; lng?: number }[]>([]);
  const [therapistId, setTherapistId] = useState("");

  // service + duration
  const [serviceId, setServiceId]   = useState("");
  const [duration,  setDuration]    = useState(60);

  // customer
  const [customerName, setCustomerName] = useState("");
  const [phone,        setPhone]        = useState("");

  // datetime
  const [date, setDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [time, setTime] = useState("10:00");

  // location — via Places Autocomplete
  const [loc, setLoc] = useState<LocationState>(EMPTY_LOC);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<unknown>(null);

  // extras
  const [note,    setNote]    = useState("");
  const [taxiFee, setTaxiFee] = useState<number | "">("");
  const [taxiAuto, setTaxiAuto] = useState<number>(0); // computed value
  const [payment, setPayment] = useState("cash");

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  // ── load therapists ───────────────────────────────────────────────
  useEffect(() => {
    void getDocs(collection(db, "therapists")).then((snap) => {
      setTherapists(
        snap.docs.map((d) => {
          const data = d.data() as any;
          return { id: d.id, name: data.name || d.id, lat: data.lat, lng: data.lng };
        })
      );
    });
  }, []);

  // ── load Google Maps SDK ──────────────────────────────────────────
  useEffect(() => { loadIfNeeded(); }, [loadIfNeeded]);

  // ── init Autocomplete once SDK ready ─────────────────────────────
  useEffect(() => {
    if (!ready || !searchRef.current || autocompleteRef.current) return;

    const w = window as any;
    const G = w.google?.maps;
    if (!G?.places?.Autocomplete) return;

    const ac = new G.places.Autocomplete(searchRef.current, {
      componentRestrictions: { country: "th" },
      fields: ["name", "formatted_address", "geometry", "place_id"],
    });
    autocompleteRef.current = ac;

    ac.addListener("place_changed", () => {
      const place = ac.getPlace();
      const loc   = place.geometry?.location;
      if (!loc) return;
      const lat       = loc.lat() as number;
      const lng       = loc.lng() as number;
      const placeName = place.name ?? place.formatted_address ?? "";
      const address   = place.formatted_address ?? place.name ?? "";
      const mapUrl    = buildMapUrl(placeName, lat, lng);
      setLoc({ placeName, address, lat, lng, mapUrl });
    });

    // PAC dropdown z-index
    const styleId = "sunred-pac-admin";
    if (!document.getElementById(styleId)) {
      const s = document.createElement("style");
      s.id = styleId;
      s.textContent = ".pac-container{z-index:9999!important;border-radius:12px;font-family:'Inter',sans-serif;box-shadow:0 12px 40px rgba(126,30,46,0.18);}";
      document.head.appendChild(s);
    }
  }, [ready]);

  // ── auto taxi when location or therapist changes ──────────────────
  useEffect(() => {
    if (loc.lat == null || loc.lng == null) { setTaxiAuto(0); return; }
    const therapist = therapists.find((t) => t.id === therapistId);
    const { fare } = estimateTaxiFare({
      therapistLat: therapist?.lat ?? BASE_LAT,
      therapistLng: therapist?.lng ?? BASE_LNG,
      customerLat:  loc.lat,
      customerLng:  loc.lng,
      durationMin:  duration,
    });
    setTaxiAuto(fare);
    setTaxiFee(""); // reset override so auto value is used
  }, [loc.lat, loc.lng, therapistId, therapists, duration]);

  // effective taxi = override if set, else auto
  const effectiveTaxi = taxiFee !== "" ? Number(taxiFee) : taxiAuto;

  // ── derived prices ────────────────────────────────────────────────
  const selectedService = useMemo(() => services.find((s) => s.id === serviceId), [serviceId]);
  const availableDurations = useMemo(
    () => (selectedService ? durationsFor(selectedService) : [60, 90, 120]),
    [selectedService]
  );
  const servicePrice = useMemo(
    () => (selectedService ? priceForDuration(selectedService, duration) : 0),
    [selectedService, duration]
  );
  const total = servicePrice + effectiveTaxi;

  const handleServiceChange = (id: string) => {
    setServiceId(id);
    const svc = services.find((s) => s.id === id);
    if (svc) {
      const tiers = durationsFor(svc);
      if (!tiers.includes(duration)) setDuration(tiers[0]);
    }
  };

  // ── validation ────────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Errors = {};
    if (!therapistId)                          e.therapist    = "เลือกนักบำบัด";
    if (!serviceId)                            e.service      = "เลือกบริการ";
    if (!customerName.trim())                  e.customerName = "ระบุชื่อลูกค้า";
    if (!/^[0-9+\s-]{6,15}$/.test(phone.trim())) e.phone   = "เบอร์โทรไม่ถูกต้อง";
    if (!date)                                 e.date         = "เลือกวันที่";
    if (!time)                                 e.time         = "ระบุเวลา";
    if (!loc.address.trim())                   e.address      = "ค้นหาหรือระบุสถานที่";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── submit ────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) { toast.warning("กรุณากรอกข้อมูลให้ครบ"); return; }
    if (!selectedService) return;

    try {
      setSaving(true);
      const startAt   = dayjs(`${date} ${time}`, "YYYY-MM-DD HH:mm").toDate();
      const endAt     = dayjs(startAt).add(duration, "minute").toDate();
      const therapist = therapists.find((t) => t.id === therapistId);
      const mapUrl    = loc.mapUrl ?? buildMapUrl(loc.placeName || loc.address, loc.lat, loc.lng);

      const ref = await addDoc(collection(db, "bookings"), {
        userId:        null,
        customerName:  customerName.trim(),
        therapistId,
        therapistName: therapist?.name ?? "",
        serviceName:   selectedService.name,
        serviceId:     selectedService.id,
        servicePrice,
        duration,
        taxiFee:       effectiveTaxi,
        totalPrice:    total,
        date,
        time,
        startAt:       Timestamp.fromDate(startAt),
        endAt:         Timestamp.fromDate(endAt),
        locationName:  loc.placeName || loc.address,
        address:       loc.address || loc.placeName,
        lat:           loc.lat,
        lng:           loc.lng,
        mapUrl,
        phone:         phone.trim(),
        note:          note.trim(),
        status:        "confirmed",
        payment,
        createdAt:     Timestamp.now(),
        createdBy:     "admin",
      });

      // Write bookingCode after we have the doc ID
      const bookingCode = `SR-${ref.id.slice(0, 8).toUpperCase()}`;
      await updateDoc(doc(db, "bookings", ref.id), { bookingCode });

      void sendBookingNotification({
        bookingId:      ref.id,
        therapistName:  therapist?.name ?? null,
        serviceName:    selectedService.name,
        duration,
        date,
        time,
        startAt,
        locationName:   loc.placeName || null,
        address:        loc.address || loc.placeName,
        addressDetails: "",
        contactName:    customerName.trim(),
        phone:          phone.trim(),
        note:           note.trim(),
        servicePrice,
        taxiFee:        effectiveTaxi,
        total,
        distanceKm:     0,
        payment,
        language:       "th",
        addons:         [],
        rainTier:       "none",
        meetingPoint:   null,
        locationType:   null,
        mapUrl,
        lat:            loc.lat,
        lng:            loc.lng,
      });

      toast.success(`สร้างการจองเรียบร้อย · ${bookingCode}`);
      void navigate("/admin/bookings");
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  };

  // ── UI helpers ────────────────────────────────────────────────────
  const Field = ({
    label, icon, children, error,
  }: { label: string; icon: React.ReactNode; children: React.ReactNode; error?: string }) => (
    <Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
        <Box sx={{ color: brand.red, lineHeight: 0 }}>{icon}</Box>
        <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700,
          textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(60,30,20,0.55)" }}>
          {label}
        </Typography>
      </Box>
      {children}
      {error && (
        <Typography sx={{ fontFamily: SANS, fontSize: 11, color: "#c0392b", mt: 0.5 }}>
          {error}
        </Typography>
      )}
    </Box>
  );

  const inputSx = (hasError?: string) => ({
    "& .MuiOutlinedInput-root": {
      borderRadius: "12px",
      fontFamily: SANS,
      fontSize: 14,
      background: "#fff",
      "& fieldset": { borderColor: hasError ? "#c0392b" : "rgba(60,30,20,0.12)" },
      "&:hover fieldset": { borderColor: hasError ? "#c0392b" : brand.red },
      "&.Mui-focused fieldset": { borderColor: brand.red },
    },
  });

  const Section = ({ title, delay = 0, children }: { title: string; delay?: number; children: React.ReactNode }) => (
    <motion.div {...fadeUp(delay)}>
      <Box sx={{ mb: 3 }}>
        <Typography sx={{
          fontFamily: SERIF, fontSize: 15, fontWeight: 700,
          color: "#1a0805", mb: 1.5,
          borderLeft: `3px solid ${brand.red}`, pl: 1.25,
        }}>
          {title}
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {children}
        </Box>
      </Box>
    </motion.div>
  );

  return (
    <Box sx={{ minHeight: "100vh", background: "#F7F3F1", pb: 6 }}>

      {/* ── Dark hero ── */}
      <motion.div {...fadeUp(0)}>
        <Box sx={{
          background: "linear-gradient(135deg,#1a0805 0%,#3c1010 100%)",
          px: { xs: 2.5, sm: 4 }, pt: 3.5, pb: 3,
          display: "flex", alignItems: "flex-start", gap: 1.5,
        }}>
          <IconButton
            size="small"
            onClick={() => navigate(-1)}
            sx={{ color: "rgba(255,255,255,0.7)", mt: 0.25, "&:hover": { color: "#fff" } }}
          >
            <ArrowLeft size={20} />
          </IconButton>
          <Box>
            <Typography sx={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: "#fff", lineHeight: 1.2 }}>
              จองใหม่ (Admin)
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "rgba(255,255,255,0.55)", mt: 0.5 }}>
              จองได้ทุกเวลา · ล่วงหน้าได้ · ไม่จำกัดวันหยุด
            </Typography>
          </Box>
        </Box>
      </motion.div>

      {/* ── Form body ── */}
      <Box sx={{ maxWidth: 640, mx: "auto", px: { xs: 2, sm: 3 }, pt: 3 }}>

        {/* 1 — นักบำบัด + บริการ */}
        <Section title="นักบำบัด & บริการ" delay={0.05}>
          <Field label="นักบำบัด" icon={<User size={14} />} error={errors.therapist}>
            <FormControl fullWidth size="small" sx={inputSx(errors.therapist)}>
              <Select
                value={therapistId}
                onChange={(e) => setTherapistId(e.target.value)}
                displayEmpty
                MenuProps={MENU_PROPS}
                renderValue={(v) =>
                  v ? therapists.find((t) => t.id === v)?.name ?? v : (
                    <span style={{ color: "rgba(60,30,20,0.35)" }}>เลือกนักบำบัด</span>
                  )
                }
              >
                {therapists.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Field>

          <Field label="บริการ" icon={<Note size={14} />} error={errors.service}>
            <FormControl fullWidth size="small" sx={inputSx(errors.service)}>
              <Select
                value={serviceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                displayEmpty
                MenuProps={MENU_PROPS}
                renderValue={(v) =>
                  v ? services.find((s) => s.id === v)?.name ?? v : (
                    <span style={{ color: "rgba(60,30,20,0.35)" }}>เลือกบริการ</span>
                  )
                }
              >
                {services.map((s) => (
                  <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Field>

          {/* Duration pills */}
          {selectedService && (
            <Box>
              <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.06em",
                color: "rgba(60,30,20,0.55)", mb: 0.75 }}>
                ระยะเวลา
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {availableDurations.map((d) => {
                  const active = d === duration;
                  return (
                    <motion.button
                      key={d}
                      onClick={() => setDuration(d)}
                      style={{
                        border: `1.5px solid ${active ? brand.red : "rgba(60,30,20,0.15)"}`,
                        borderRadius: 12,
                        padding: "8px 18px",
                        cursor: "pointer",
                        background: active ? "linear-gradient(135deg,#FE0944,#FE7A52)" : "#fff",
                        color: active ? "#fff" : "#1a0805",
                        fontFamily: SANS,
                        fontSize: 13,
                        fontWeight: 600,
                        boxShadow: active ? "0 3px 10px rgba(254,9,68,0.25)" : "none",
                      }}
                    >
                      {d} นาที · {formatTHB(priceForDuration(selectedService, d))}
                    </motion.button>
                  );
                })}
              </Box>
            </Box>
          )}
        </Section>

        {/* 2 — ลูกค้า */}
        <Section title="ข้อมูลลูกค้า" delay={0.1}>
          <Field label="ชื่อลูกค้า" icon={<User size={14} />} error={errors.customerName}>
            <TextField
              fullWidth size="small" placeholder="ชื่อ-นามสกุล"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              sx={inputSx(errors.customerName)}
            />
          </Field>
          <Field label="เบอร์โทร" icon={<Phone size={14} />} error={errors.phone}>
            <TextField
              fullWidth size="small" placeholder="0812345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              sx={inputSx(errors.phone)}
            />
          </Field>
        </Section>

        {/* 3 — วันเวลา */}
        <Section title="วันและเวลา" delay={0.14}>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Field label="วันที่" icon={<CalendarBlank size={14} />} error={errors.date}>
              <TextField
                type="date" size="small"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                sx={{ ...inputSx(errors.date), minWidth: 170 }}
                inputProps={{ min: "2020-01-01" }}
              />
            </Field>
            <Field label="เวลา" icon={<Clock size={14} />} error={errors.time}>
              <TextField
                type="time" size="small"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                sx={{ ...inputSx(errors.time), minWidth: 130 }}
              />
            </Field>
          </Box>
          {date && time && (
            <Box sx={{
              p: 1.25, borderRadius: "10px",
              background: "rgba(254,9,68,0.06)",
              border: "1px solid rgba(254,9,68,0.12)",
            }}>
              <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "#1a0805", fontWeight: 600 }}>
                {dayjs(`${date} ${time}`).format("dddd D MMMM YYYY")} · {time} น.
              </Typography>
              {duration > 0 && (
                <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "rgba(60,30,20,0.55)", mt: 0.25 }}>
                  เสร็จ {dayjs(`${date} ${time}`).add(duration, "minute").format("HH:mm")} น.
                </Typography>
              )}
            </Box>
          )}
        </Section>

        {/* 4 — สถานที่ — Google Places */}
        <Section title="สถานที่" delay={0.17}>
          <Field label="ค้นหาสถานที่" icon={<MagnifyingGlass size={14} />} error={errors.address}>
            {/* Google Autocomplete input */}
            <Box sx={{
              position: "relative",
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px", fontFamily: SANS, fontSize: 14, background: "#fff",
                "& fieldset": { borderColor: errors.address ? "#c0392b" : "rgba(60,30,20,0.12)" },
                "&:hover fieldset": { borderColor: errors.address ? "#c0392b" : brand.red },
                "&.Mui-focused fieldset": { borderColor: brand.red },
              },
            }}>
              <TextField
                inputRef={searchRef}
                fullWidth size="small"
                placeholder="ค้นหาโรงแรม คอนโด หรือสถานที่…"
                defaultValue={loc.placeName}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MagnifyingGlass size={16} color="rgba(60,30,20,0.4)" />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Field>

          {/* Location result card */}
          {loc.address && (
            <Box sx={{
              p: 1.5, borderRadius: "12px",
              background: "#fff",
              border: "1px solid rgba(60,30,20,0.08)",
              boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
            }}>
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <MapPin size={16} color={brand.red} weight="fill" style={{ marginTop: 2, flexShrink: 0 }} />
                <Box>
                  {loc.placeName && (
                    <Typography sx={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: "#1a0805" }}>
                      {loc.placeName}
                    </Typography>
                  )}
                  <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "rgba(60,30,20,0.55)", mt: 0.25 }}>
                    {loc.address}
                  </Typography>
                  {loc.mapUrl && (
                    <Typography
                      component="a"
                      href={loc.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ fontFamily: SANS, fontSize: 11, color: brand.red, mt: 0.5, display: "block" }}
                    >
                      ดูใน Google Maps →
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </Section>

        {/* 5 — การชำระเงิน & ค่า Taxi */}
        <Section title="การชำระเงิน & ค่า Taxi" delay={0.20}>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Field label="ช่องทางชำระ" icon={<CurrencyCircleDollar size={14} />}>
              <FormControl size="small" sx={{ ...inputSx(), minWidth: 200 }}>
                <Select
                  value={payment}
                  onChange={(e) => setPayment(e.target.value)}
                  MenuProps={MENU_PROPS}
                >
                  {PAYMENT_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Field>

            <Field label={`ค่า Taxi (฿)${taxiAuto > 0 ? ` — อัตโนมัติ ${formatTHB(taxiAuto)}` : ""}`}
              icon={<Taxi size={14} />}>
              <TextField
                type="number" size="small"
                value={taxiFee}
                onChange={(e) => setTaxiFee(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder={taxiAuto > 0 ? String(taxiAuto) : "0"}
                sx={{ ...inputSx(), width: 140 }}
                inputProps={{ min: 0, step: 10 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "rgba(60,30,20,0.4)" }}>฿</Typography>
                    </InputAdornment>
                  ),
                }}
              />
            </Field>
          </Box>

          {taxiAuto > 0 && taxiFee === "" && (
            <Typography sx={{ fontFamily: SANS, fontSize: 11, color: "rgba(60,30,20,0.45)", mt: -0.5 }}>
              คำนวณจากระยะทาง · แก้ไขได้ในช่องด้านบน
            </Typography>
          )}
        </Section>

        {/* 6 — หมายเหตุ */}
        <Section title="หมายเหตุ (ถ้ามี)" delay={0.23}>
          <Field label="Note" icon={<Note size={14} />}>
            <TextField
              fullWidth size="small" multiline rows={2}
              placeholder="ความต้องการพิเศษ, รหัสเข้าอาคาร, ฯลฯ"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              sx={inputSx()}
            />
          </Field>
        </Section>

        {/* ── Summary card ── */}
        <motion.div {...fadeUp(0.26)}>
          <Box sx={{
            borderRadius: "18px", background: "#fff",
            border: "1px solid rgba(60,30,20,0.08)",
            boxShadow: "0 2px 10px rgba(60,30,20,0.06)",
            overflow: "hidden", mb: 3,
          }}>
            <Box sx={{ background: "linear-gradient(135deg,#1a0805,#3c1010)", px: 2.5, py: 1.75 }}>
              <Typography sx={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: "#fff" }}>
                สรุปคำสั่ง
              </Typography>
            </Box>
            <Box sx={{ px: 2.5, py: 2, display: "flex", flexDirection: "column" }}>
              {[
                { label: "นักบำบัด", value: therapists.find((t) => t.id === therapistId)?.name ?? "—" },
                { label: "บริการ",   value: selectedService ? `${selectedService.name} · ${duration} นาที` : "—" },
                { label: "ลูกค้า",  value: customerName || "—" },
                { label: "วันเวลา", value: date && time ? `${dayjs(date).format("D MMM")} · ${time} น.` : "—" },
                { label: "สถานที่", value: loc.placeName || loc.address || "—" },
              ].map((r, i) => (
                <Box key={i} sx={{
                  display: "flex", justifyContent: "space-between", gap: 2,
                  py: 0.85,
                  borderBottom: i < 4 ? "1px solid rgba(60,30,20,0.06)" : "none",
                }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: 12, color: "rgba(60,30,20,0.45)", fontWeight: 600 }}>
                    {r.label}
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "#1a0805",
                    textAlign: "right", maxWidth: "60%", wordBreak: "break-word" }}>
                    {r.value}
                  </Typography>
                </Box>
              ))}

              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: "1px solid rgba(60,30,20,0.10)" }}>
                {[
                  { label: "ค่าบริการ", value: formatTHB(servicePrice) },
                  { label: "ค่า Taxi",  value: formatTHB(effectiveTaxi) },
                ].map((r, i) => (
                  <Box key={i} sx={{ display: "flex", justifyContent: "space-between", py: 0.6 }}>
                    <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "rgba(60,30,20,0.55)" }}>{r.label}</Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "#1a0805", fontWeight: 600 }}>{r.value}</Typography>
                  </Box>
                ))}
                <Box sx={{ display: "flex", justifyContent: "space-between", mt: 0.75, pt: 1, borderTop: "1px solid rgba(60,30,20,0.10)" }}>
                  <Typography sx={{ fontFamily: SERIF, fontSize: 16, fontWeight: 700, color: "#1a0805" }}>รวมทั้งหมด</Typography>
                  <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 800, color: brand.red }}>{formatTHB(total)}</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </motion.div>

        {/* ── CTA ── */}
        <motion.div {...fadeUp(0.28)}>
          <motion.button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              width: "100%", padding: "17px 24px", borderRadius: 16, border: "none",
              cursor: saving ? "not-allowed" : "pointer",
              background: saving ? "rgba(60,30,20,0.12)" : "linear-gradient(135deg,#FE0944 0%,#FE7A52 100%)",
              color: saving ? "rgba(60,30,20,0.4)" : "#fff",
              fontFamily: SANS, fontSize: 16, fontWeight: 700, letterSpacing: "0.02em",
              boxShadow: saving ? "none" : "0 6px 22px rgba(254,9,68,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}
          >
            {saving
              ? <><CircularProgress size={18} sx={{ color: "rgba(60,30,20,0.4)" }} /> กำลังบันทึก…</>
              : "✅ สร้างการจอง"}
          </motion.button>
        </motion.div>

      </Box>
    </Box>
  );
};

export default AdminBookingAddPage;
