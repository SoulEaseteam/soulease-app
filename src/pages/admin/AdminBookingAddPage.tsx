// src/pages/admin/AdminBookingAddPage.tsx
//
// Round 28c22 (founder 2026-05-06) — Google Places search + auto taxi.
//   • Location field uses Autocomplete → gets placeName, lat, lng, address
//   • Taxi fee auto-calculated from haversine distance (editable override)
//   • mapUrl built from placeName for clean Telegram link
//   • No working-hour / holiday checks (admin privilege)
//
// 🆕 Round 28s249 (audit "แก้ทั้งหมด") — six fixes:
//   1. DOUBLE TELEGRAM removed. The `onBookingCreate` Cloud Function already
//      alerts the admin group on every booking doc; this page ALSO called the
//      deprecated `notifyBooking` callable → two messages per booking. The
//      client call is gone. It also now writes `contactName` (the field the
//      server formatter reads) so the customer name is no longer blank in
//      that alert — it used to write only `customerName`.
//   2. `Field` / `Section` hoisted to module scope. They were declared inside
//      the component, so every keystroke created new component identities →
//      React remounted the whole form → inputs lost focus mid-typing.
//   3. Taxi origin now the shared `DISPATCH_BASE` (matches the customer flow
//      since 28s233), not the old Sukhumvit constant + unreliable per-therapist
//      placeholder coords — so admin & customer quote the same fare.
//   4. A manual taxi override is no longer wiped when duration/therapist
//      changes; it only resets when a NEW location is picked.
//   5. WeChat / Alipay payment options + the 5%+฿200 transfer surcharge
//      (paymentSurcharge.ts) now apply here too, and write `paymentFee`.
//   6. Restyled onto the shared Ocean Study admin tokens (was still the old
//      customer red/cream theme — inconsistent now the rest of admin is light).

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
// 🆕 28w.43 — freeze the shop/therapist split on admin-created (born-confirmed) bookings.
import { stampSplit } from "@/utils/commission";
import { estimateTaxiFare, resolveFareOrigin } from "@/utils/taxiFare";
import { paymentSurcharge, hasPaymentSurcharge } from "@/utils/paymentSurcharge";
import { useGoogleMaps } from "@/context/GoogleMapsContext";
import {
  ArrowLeft, CalendarBlank, Clock, User, Phone, MapPin,
  Note, CurrencyCircleDollar, Taxi, MagnifyingGlass,
} from "phosphor-react";
import dayjs from "dayjs";
import { toast } from "react-toastify";
import { parseDateTimeBKK } from "@/utils/time";
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";
import { useAdminIdentity } from "@/hooks/useAdminIdentity";
import { bookingAuthor } from "@/utils/bookingAuthor";

// ── constants ─────────────────────────────────────────────────────────
const SERIF = adminFont.serif;
const SANS  = adminFont.sans;

const PAYMENT_OPTIONS = [
  { value: "cash",      label: "เงินสด (Cash)" },
  { value: "transfer",  label: "โอนเงิน (Transfer)" },
  { value: "card",      label: "บัตร (Card)" },
  { value: "promptpay", label: "PromptPay" },
  // 🆕 28s249 — carry the 5% + ฿200 transfer surcharge (paymentSurcharge.ts)
  { value: "wechat",    label: "WeChat Pay (+ค่าธรรมเนียม)" },
  { value: "alipay",    label: "Alipay (+ค่าธรรมเนียม)" },
];

// 🆕 28x.99t (founder: "แก้ tracking ก่อน" — admin-created bookings never
//   captured attributionSource at all, since getAttribution() only runs in
//   the customer-facing BookingFlowPage. Only 32/615 bookings had ANY
//   attribution before this fix, all from that one path. This lets admin
//   self-report the channel when she knows it (guest tells her, or she
//   recognizes the contact channel) — reuses the same `attributionSource`
//   field the customer flow writes, so both paths land in one place.
const SOURCE_OPTIONS = [
  { value: "",             label: "ไม่ระบุ (Unknown)" },
  { value: "telegram",     label: "Telegram (@SunRed_BKK)" },
  { value: "wechat",       label: "WeChat" },
  { value: "line",         label: "LINE OA" },
  { value: "sammyboy",     label: "Sammyboy / Samsguide" },
  { value: "referral",     label: "Referral (แนะนำจากลูกค้าเก่า)" },
  { value: "repeat",       label: "Repeat guest (ลูกค้าประจำ)" },
  { value: "word_of_mouth",label: "Word of mouth / คนขับแท็กซี่" },
  { value: "other",        label: "Other · อื่นๆ" },
];

const MENU_PROPS = {
  PaperProps: {
    sx: {
      background: adminColor.panel,
      boxShadow: "0 8px 24px rgba(31,41,51,0.14)",
      borderRadius: "14px",
      border: `1px solid ${adminColor.line}`,
      mt: 0.5,
    },
  },
};

type Errors = Partial<Record<string, string>>;

// 🆕 Round 28r23 — `fadeUp` neutered (founder: "เอฟเฟต เด้งกิน ทำงานลำบาก").
//   Returns empty props so the motion.div wrappers render inline with no
//   animation instead of ripping them out of the JSX.
const fadeUp = (_delay = 0) => ({});

// ── shared input styling (module scope — not a component, no remount risk) ─
const inputSx = (hasError?: string) => ({
  "& .MuiOutlinedInput-root": {
    borderRadius: "12px",
    fontFamily: SANS,
    fontSize: 14,
    background: adminColor.panel,
    "& fieldset": { borderColor: hasError ? adminColor.red : adminColor.line2 },
    "&:hover fieldset": { borderColor: hasError ? adminColor.red : adminColor.accent },
    "&.Mui-focused fieldset": { borderColor: adminColor.accent },
  },
});

// 🆕 Round 28s249 — Field / Section MUST live at module scope. Declared inside
//   the component they got a fresh identity on every render, so React
//   remounted the whole form on each keystroke and inputs lost focus.
const Field: React.FC<{ label: string; icon: React.ReactNode; children: React.ReactNode; error?: string }> = ({
  label, icon, children, error,
}) => (
  <Box>
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
      <Box sx={{ color: adminColor.accent, lineHeight: 0 }}>{icon}</Box>
      <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: "0.06em", color: adminColor.muted }}>
        {label}
      </Typography>
    </Box>
    {children}
    {error && (
      <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.red, mt: 0.5 }}>
        {error}
      </Typography>
    )}
  </Box>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Box
    sx={{
      mb: 2,
      padding: "16px 18px 18px",
      borderRadius: "18px",
      background: adminColor.panel,
      border: `1px solid ${adminColor.line}`,
      // 🆕 Round 28r48 — deeper shadow (r47 pattern) — subtle depth without a lift.
      boxShadow: "0 2px 10px rgba(31,41,51,0.04), 0 6px 16px rgba(31,41,51,0.06)",
    }}
  >
    <Typography
      sx={{
        fontFamily: SANS,
        fontSize: 10,
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        color: adminColor.muted,
        fontWeight: 700,
        mb: 1.25,
      }}
    >
      {title}
    </Typography>
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.75 }}>
      {children}
    </Box>
  </Box>
);

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
  // 🆕 28x.3 — who is creating this reservation (+ their phone).
  const { uid, email, displayName, phone: adminPhone } = useAdminIdentity();
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
  const [source,  setSource]  = useState("");

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
      const gloc  = place.geometry?.location;
      if (!gloc) return;
      const lat       = gloc.lat() as number;
      const lng       = gloc.lng() as number;
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
      s.textContent = ".pac-container{z-index:9999!important;border-radius:12px;font-family:'Inter',sans-serif;box-shadow:0 12px 40px rgba(31,41,51,0.18);}";
      document.head.appendChild(s);
    }
  }, [ready]);

  // ── auto taxi from the SELECTED practitioner (28x.112) ──────────────
  //   Origin is now the chosen practitioner's own coords (was the fixed
  //   dispatch base), matching the customer flow so an admin-created booking
  //   quotes the same distance the guest would see. Falls back to the dispatch
  //   base if she has no coords. (Admin uses the haversine estimate — the
  //   concierge confirms the final fare — while the customer page fetches the
  //   exact Google route.)
  useEffect(() => {
    if (loc.lat == null || loc.lng == null) { setTaxiAuto(0); return; }
    const origin = resolveFareOrigin(therapists.find((t) => t.id === therapistId));
    const { fare } = estimateTaxiFare({
      therapistLat: origin.lat,
      therapistLng: origin.lng,
      customerLat:  loc.lat,
      customerLng:  loc.lng,
      durationMin:  duration,
    });
    setTaxiAuto(fare);
  }, [loc.lat, loc.lng, duration, therapistId, therapists]);

  // ── reset a manual override ONLY when a new location is picked (fix #4) ─
  useEffect(() => {
    setTaxiFee("");
  }, [loc.lat, loc.lng]);

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
  const baseTotal = servicePrice + effectiveTaxi;
  const paymentFee = paymentSurcharge(payment, baseTotal); // 0 unless WeChat/Alipay
  const total = baseTotal + paymentFee;

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

    // 🚨 Round 28x.148 HOTFIX — same tz bug as AdminBookingListPage's edit
    //   form (see that file's saveEdit comment): a bare `dayjs(...)` parses
    //   in the admin's BROWSER timezone, not Asia/Bangkok, so the wall-clock
    //   time typed here isn't necessarily what gets written to Firestore.
    //   `parseDateTimeBKK` (utils/time.ts) anchors it correctly.
    const parsedStart = parseDateTimeBKK(date, time);
    if (!parsedStart) { toast.error("วันที่/เวลาไม่ถูกต้อง"); return; }

    try {
      setSaving(true);
      const startAt   = parsedStart.toDate();
      const endAt     = dayjs(startAt).add(duration, "minute").toDate();
      const therapist = therapists.find((t) => t.id === therapistId);
      const mapUrl    = loc.mapUrl ?? buildMapUrl(loc.placeName || loc.address, loc.lat, loc.lng);

      const ref = await addDoc(collection(db, "bookings"), {
        userId:        null,
        // 🆕 28s249 — write BOTH: dashboards read customerName; the server
        //   Telegram formatter (formatBookingForAdmin) reads contactName.
        customerName:  customerName.trim(),
        contactName:   customerName.trim(),
        therapistId,
        therapistName: therapist?.name ?? "",
        serviceName:   selectedService.name,
        serviceId:     selectedService.id,
        servicePrice,
        duration,
        taxiFee:       effectiveTaxi,
        paymentFee,
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
        // 🆕 28x.99t — admin-selected, since this booking never passed
        //   through the customer flow's client-side capture.
        attributionSource: source || null,
        status:        "confirmed",
        // 🆕 28w.43 — born confirmed → freeze the split now (from the current
        //   split table). No discount on admin-add, so base = servicePrice.
        ...stampSplit({ serviceId: selectedService.id, servicePrice, duration }),
        payment,
        createdAt:     Timestamp.now(),
        // 🆕 28x.3 (founder: "จะระบุได้ไง ใครจอง") — was the literal string
        //   "admin", which says a human in the back office did it and nothing
        //   else. Stamp WHO.
        ...bookingAuthor({
          isAdmin: true,
          uid,
          email,
          displayName,
          phone: adminPhone,
        }),
      });

      // Write bookingCode after we have the doc ID
      const bookingCode = `SR-${ref.id.slice(0, 8).toUpperCase()}`;
      await updateDoc(doc(db, "bookings", ref.id), { bookingCode });

      // 🆕 28s249 — NO client-side Telegram send. `onBookingCreate` (Cloud
      //   Function) already notifies the admin group + therapist on every
      //   booking doc; the old `sendBookingNotification` call here was a
      //   duplicate.

      toast.success(`สร้างการจองเรียบร้อย · ${bookingCode}`);
      void navigate("/admin/bookings");
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาด กรุณาลองใหม่");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: adminColor.bg,
        pb: 6,
      }}
    >

      {/* ── header ── */}
      <Box
        sx={{
          background: adminColor.bg,
          borderBottom: `1px solid ${adminColor.line}`,
          px: { xs: 2, sm: 3 },
          pt: 2.5,
          pb: 2,
          display: "flex",
          alignItems: "flex-start",
          gap: 1.5,
        }}
      >
        <IconButton
          size="small"
          onClick={() => navigate(-1)}
          sx={{
            color: adminColor.muted,
            mt: 0.25,
            "&:hover": { color: adminColor.accent },
          }}
        >
          <ArrowLeft size={20} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          {/* 🆕 Round 28r48 (bilingual pass) — English-primary header, Thai
              subtitle underneath, matching Dashboard/Bookings/Earnings r35. */}
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: 10,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: adminColor.muted,
              fontWeight: 700,
              mb: 0.25,
            }}
          >
            Admin
          </Typography>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: 22,
              fontWeight: 600,
              color: adminColor.text,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              "& em": { fontStyle: "italic", color: adminColor.accent },
            }}
          >
            New <em>Booking</em>
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.4, letterSpacing: "0.02em" }}>
            จองใหม่
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: 11.5,
              color: adminColor.muted,
              mt: 0.75,
              lineHeight: 1.4,
            }}
          >
            ล่วงหน้าได้ทุกเวลา · ไม่จำกัดวันหยุด · ไม่ผ่าน 10-min hold
          </Typography>
        </Box>
      </Box>

      {/* ── Form body ── */}
      <Box sx={{ maxWidth: 640, mx: "auto", px: { xs: 2, sm: 3 }, pt: 3 }}>

        {/* 1 — นักบำบัด + บริการ */}
        <Section title="Therapist & Service · นักบำบัด & บริการ">
          <Field label="Therapist · นักบำบัด" icon={<User size={14} />} error={errors.therapist}>
            <FormControl fullWidth size="small" sx={inputSx(errors.therapist)}>
              <Select
                value={therapistId}
                onChange={(e) => setTherapistId(e.target.value)}
                displayEmpty
                MenuProps={MENU_PROPS}
                renderValue={(v) =>
                  v ? therapists.find((t) => t.id === v)?.name ?? v : (
                    <span style={{ color: adminColor.dim }}>เลือกนักบำบัด</span>
                  )
                }
              >
                {therapists.map((t) => (
                  <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Field>

          <Field label="Service · บริการ" icon={<Note size={14} />} error={errors.service}>
            <FormControl fullWidth size="small" sx={inputSx(errors.service)}>
              <Select
                value={serviceId}
                onChange={(e) => handleServiceChange(e.target.value)}
                displayEmpty
                MenuProps={MENU_PROPS}
                renderValue={(v) =>
                  v ? services.find((s) => s.id === v)?.name ?? v : (
                    <span style={{ color: adminColor.dim }}>เลือกบริการ</span>
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
                color: adminColor.muted, mb: 0.75 }}>
                Duration · ระยะเวลา
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {availableDurations.map((d) => {
                  const active = d === duration;
                  return (
                    <motion.button
                      key={d}
                      onClick={() => setDuration(d)}
                      style={{
                        border: `1.5px solid ${active ? adminColor.accent : adminColor.line2}`,
                        borderRadius: 12,
                        padding: "8px 18px",
                        cursor: "pointer",
                        background: active ? adminColor.accent : adminColor.panel,
                        color: active ? "#fff" : adminColor.text,
                        fontFamily: SANS,
                        fontSize: 13,
                        fontWeight: 600,
                        boxShadow: active ? "0 3px 10px rgba(78,126,140,0.25)" : "none",
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
        <Section title="Customer · ข้อมูลลูกค้า">
          {/* Field labels dropped Thai per r43 rule (obvious inputs: Name/Phone) */}
          <Field label="Name" icon={<User size={14} />} error={errors.customerName}>
            <TextField
              fullWidth size="small" placeholder="ชื่อ-นามสกุล"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              sx={inputSx(errors.customerName)}
            />
          </Field>
          <Field label="Phone" icon={<Phone size={14} />} error={errors.phone}>
            <TextField
              fullWidth size="small" placeholder="0812345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              sx={inputSx(errors.phone)}
            />
          </Field>
        </Section>

        {/* 3 — วันเวลา */}
        <Section title="Schedule · วันและเวลา">
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Field label="Date" icon={<CalendarBlank size={14} />} error={errors.date}>
              <TextField
                type="date" size="small"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                sx={{ ...inputSx(errors.date), minWidth: 170 }}
                inputProps={{ min: "2020-01-01" }}
              />
            </Field>
            <Field label="Time" icon={<Clock size={14} />} error={errors.time}>
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
              background: adminColor.panel2,
              border: `1px solid ${adminColor.line}`,
            }}>
              <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.text, fontWeight: 600 }}>
                {dayjs(`${date} ${time}`).format("dddd D MMMM YYYY")} · {time} น.
              </Typography>
              {duration > 0 && (
                <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted, mt: 0.25 }}>
                  เสร็จ {dayjs(`${date} ${time}`).add(duration, "minute").format("HH:mm")} น.
                </Typography>
              )}
            </Box>
          )}
        </Section>

        {/* 4 — สถานที่ — Google Places */}
        <Section title="Location · สถานที่">
          <Field label="Search Location · ค้นหา" icon={<MagnifyingGlass size={14} />} error={errors.address}>
            {/* Google Autocomplete input */}
            <Box sx={{
              position: "relative",
              "& .MuiOutlinedInput-root": {
                borderRadius: "12px", fontFamily: SANS, fontSize: 14, background: adminColor.panel,
                "& fieldset": { borderColor: errors.address ? adminColor.red : adminColor.line2 },
                "&:hover fieldset": { borderColor: errors.address ? adminColor.red : adminColor.accent },
                "&.Mui-focused fieldset": { borderColor: adminColor.accent },
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
                      <MagnifyingGlass size={16} color={adminColor.dim} />
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
              background: adminColor.panel2,
              border: `1px solid ${adminColor.line}`,
            }}>
              <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
                <MapPin size={16} color={adminColor.accent} weight="fill" style={{ marginTop: 2, flexShrink: 0 }} />
                <Box>
                  {loc.placeName && (
                    <Typography sx={{ fontFamily: SANS, fontSize: 13, fontWeight: 700, color: adminColor.text }}>
                      {loc.placeName}
                    </Typography>
                  )}
                  <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted, mt: 0.25 }}>
                    {loc.address}
                  </Typography>
                  {loc.mapUrl && (
                    <Typography
                      component="a"
                      href={loc.mapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.accent, mt: 0.5, display: "block" }}
                    >
                      Open in Google Maps →
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </Section>

        {/* 5 — การชำระเงิน & ค่า Taxi */}
        <Section title="Payment & Taxi · การชำระเงิน">
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Field label="Payment · ช่องทาง" icon={<CurrencyCircleDollar size={14} />}>
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

            <Field label={`Taxi (฿)${taxiAuto > 0 ? ` — auto ${formatTHB(taxiAuto)}` : ""}`}
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
                      <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.dim }}>฿</Typography>
                    </InputAdornment>
                  ),
                }}
              />
            </Field>
          </Box>

          {taxiAuto > 0 && taxiFee === "" && (
            <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: -0.5 }}>
              คำนวณจากระยะทาง · แก้ไขได้ในช่องด้านบน
            </Typography>
          )}

          {/* 🆕 28s249 — surcharge notice; recompute stays inside paymentSurcharge.ts */}
          {hasPaymentSurcharge(payment) && paymentFee > 0 && (
            <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: adminColor.amber, fontWeight: 600 }}>
              + Transfer fee {formatTHB(paymentFee)} (7%) · WeChat/Alipay
            </Typography>
          )}

          {/* 🆕 28x.99t — optional channel tag, so ROI on paid/marketing
              channels is actually measurable instead of invisible. */}
          <Field label="ลูกค้ารู้จักจากไหน · Source" icon={<MagnifyingGlass size={14} />}>
            <FormControl size="small" sx={{ ...inputSx(), minWidth: 240 }}>
              <Select
                value={source}
                onChange={(e) => setSource(e.target.value)}
                MenuProps={MENU_PROPS}
              >
                {SOURCE_OPTIONS.map((o) => (
                  <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Field>
        </Section>

        {/* 6 — หมายเหตุ */}
        <Section title="Notes · หมายเหตุ (ถ้ามี)">
          <Field label="Note · โน้ต" icon={<Note size={14} />}>
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
            borderRadius: "18px", background: adminColor.panel,
            border: `1px solid ${adminColor.line}`,
            boxShadow: "0 1px 2px rgba(31,41,51,0.04), 0 6px 16px rgba(31,41,51,0.07)",
            overflow: "hidden", mb: 3,
          }}>
            <Box sx={{ background: adminColor.panel2, borderBottom: `1px solid ${adminColor.line}`, px: 2.5, py: 1.75 }}>
              <Typography sx={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: adminColor.text }}>
                Order Summary · สรุปคำสั่ง
              </Typography>
            </Box>
            <Box sx={{ px: 2.5, py: 2, display: "flex", flexDirection: "column" }}>
              {[
                { label: "Therapist · นักบำบัด", value: therapists.find((t) => t.id === therapistId)?.name ?? "—" },
                { label: "Service · บริการ",   value: selectedService ? `${selectedService.name} · ${duration} นาที` : "—" },
                { label: "Customer · ลูกค้า",  value: customerName || "—" },
                { label: "When · วันเวลา", value: date && time ? `${dayjs(date).format("D MMM")} · ${time} น.` : "—" },
                { label: "Location · สถานที่", value: loc.placeName || loc.address || "—" },
              ].map((r, i) => (
                <Box key={i} sx={{
                  display: "flex", justifyContent: "space-between", gap: 2,
                  py: 0.85,
                  borderBottom: i < 4 ? `1px solid ${adminColor.line}` : "none",
                }}>
                  <Typography sx={{ fontFamily: SANS, fontSize: 12, color: adminColor.muted, fontWeight: 600 }}>
                    {r.label}
                  </Typography>
                  <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.text,
                    textAlign: "right", maxWidth: "60%", wordBreak: "break-word" }}>
                    {r.value}
                  </Typography>
                </Box>
              ))}

              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${adminColor.line2}` }}>
                {[
                  { label: "Service · ค่าบริการ", value: formatTHB(servicePrice) },
                  { label: "Taxi · ค่าเดินทาง",  value: formatTHB(effectiveTaxi) },
                  ...(paymentFee > 0 ? [{ label: "Transfer fee · ค่าธรรมเนียม", value: formatTHB(paymentFee) }] : []),
                ].map((r, i) => (
                  <Box key={i} sx={{ display: "flex", justifyContent: "space-between", py: 0.6 }}>
                    <Typography sx={{ fontFamily: SANS, fontSize: 13, color: adminColor.muted }}>{r.label}</Typography>
                    <Typography sx={{ ...adminFigureSx, fontSize: 13, fontWeight: 600, color: adminColor.text }}>{r.value}</Typography>
                  </Box>
                ))}
                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mt: 0.75, pt: 1, borderTop: `1px solid ${adminColor.line2}` }}>
                  <Typography sx={{ fontFamily: SERIF, fontSize: 16, fontWeight: 600, color: adminColor.text }}>Total · รวมทั้งหมด</Typography>
                  <Typography sx={{ ...adminFigureSx, fontSize: 20, color: adminColor.accent }}>{formatTHB(total)}</Typography>
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
              background: saving ? adminColor.line2 : adminColor.accent,
              color: saving ? adminColor.dim : "#fff",
              fontFamily: SANS, fontSize: 16, fontWeight: 700, letterSpacing: "0.02em",
              boxShadow: saving ? "none" : "0 6px 22px rgba(78,126,140,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}
          >
            {saving
              ? <><CircularProgress size={18} sx={{ color: adminColor.dim }} /> กำลังบันทึก…</>
              : "Create Booking · สร้างการจอง"}
          </motion.button>
        </motion.div>

      </Box>
    </Box>
  );
};

export default AdminBookingAddPage;
