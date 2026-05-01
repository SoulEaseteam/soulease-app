// src/pages/booking/BookingFlowPage.tsx
//
// 🎨 Phase 4 — Single-page Confirm Order.
//
// Page title: "Confirm Order" (centered) + ← back. Below, a stacked
// card layout per founder-approved pattern combo (1A·4A·5A·7A from
// Aine reference + 2B·3B·6B·8B keeping our patterns):
//
//   ┌─ Confirm Order ─────────────────────────────┐
//   │                                              │
//   │  📍 Address tile  (tap → Location sheet)     │
//   │                                              │
//   │  📑 Order Details                            │
//   │  [avatar] Mai · ★4.7 (29 reviews)  EDIT      │
//   │           Today · 17:00                      │
//   │  ─────────                                   │
//   │  Thai Massage              90 min · ฿1,800   │
//   │                                              │
//   │  📞 Phone Number  (inline input)             │
//   │                                              │
//   │  🌐 Preferred language   ›   (sheet cell)    │
//   │  ➕ Add-ons              ›   (sheet cell)    │
//   │  💳 Payment method       ›   (sheet cell)    │
//   │                                              │
//   │  📝 Notes for {name}  (inline textarea)      │
//   │                                              │
//   │  💵 Pricing                                  │
//   │  Service fee                       ฿1,800    │
//   │  Travel fee ⓘ                      ฿0        │
//   │     ✓ Within free distance (4km)             │
//   │  Total                             ฿1,800    │
//   │                                              │
//   │  Cancellation: free up to 30 min …           │
//   └──────────────────────────────────────────────┘
//   ┌─ Sticky bottom: TOTAL ฿1,800   [Confirm] ─┐
//
// Booking submission writes the same Firestore booking schema as before;
// only the visual layout changes.

import React, { useState, useMemo, useEffect } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Button,
} from "@mui/material";
import {
  useNavigate,
  useParams,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
// 🆕 Round 11 (founder 2026-05-01): replace emoji icons across Confirm
//   Order with MUI icons in the same pink-boxed style as the address tile.
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import PaidRoundedIcon from "@mui/icons-material/PaidRounded";
import PlaceRoundedIcon from "@mui/icons-material/PlaceRounded";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import LocalTaxiRoundedIcon from "@mui/icons-material/LocalTaxiRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import UmbrellaRoundedIcon from "@mui/icons-material/UmbrellaRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";

// 🆕 Round 8 (founder 2026-05-01): PreferencesSheet + SelectionCell +
//    inline Notes textarea all dropped from this page. Confirm Order is
//    now strictly: Therapist → Address → Pricing → Confirm. Special
//    requests go via admin chat.
// PaymentMethod / PaymentPicker dropped 2026-05-01 (founder feedback).
import type { AddressNavState } from "@/pages/booking/SelectLocationPage";

import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { isInappropriate } from "@/utils/moderate";
import { sendBookingNotification } from "@/utils/telegram";
import {
  estimateTaxiFare,
  FREE_DISTANCE_KM,
  ADMIN_QUOTE_KM,
} from "@/utils/taxiFare";
import { getRainStatus } from "@/utils/weather";
import { priceForDuration, formatTHB } from "@/utils/servicePricing";
import { bayesianRatingFromAggregate, formatRating } from "@/utils/rating";
import services from "@/data/services";
import therapistsData from "@/data/therapists";
import { ADDONS, type AddOn } from "@/data/bookingExtras";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

export interface BookingFormState {
  serviceId: string | null;
  duration: number | null;
  date: string | null;
  time: string | null;
  locationName: string | null;
  locationAddress: string | null;
  lat: number | null;
  lng: number | null;
  addressDetails: string;
  /** Customer's contact name — required, captured on Select Location page */
  contactName: string;
  customerPhone: string;
  /** Note attached to the address (Floor/Room/Landmarks) */
  addressNote: string;
  /** Optional meeting-point convention (lobby / lift / direct) */
  meetingPoint: string | null;
  /** Optional building category (hotel / condo / house / office / other) */
  locationType: string | null;
  /** Auto-generated Google Maps deep-link to the pinned location */
  mapUrl: string | null;
  language: string;
  selectedAddons: string[];
  notes: string;
  therapistId: string | null;
}

const initialFormState: BookingFormState = {
  serviceId: null,
  duration: null,
  date: null,
  time: null,
  locationName: null,
  locationAddress: null,
  lat: null,
  lng: null,
  addressDetails: "",
  contactName: "",
  customerPhone: "",
  addressNote: "",
  meetingPoint: null,
  locationType: null,
  mapUrl: null,
  language: "en",
  selectedAddons: [],
  notes: "",
  therapistId: null,
};

const BookingFlowPage: React.FC = () => {
  const { id: therapistId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const routerLoc = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();

  // ── Pre-fill from URL params (DetailPage StickyBookCTA forwards these)
  const preService = searchParams.get("service");
  const preDuration = searchParams.get("duration");
  const preDate = searchParams.get("date");
  const preTime = searchParams.get("time");

  const [submitting, setSubmitting] = useState(false);

  // Preferences sheet (Language + Add-ons) was removed 2026-05-01 round 8
  // (founder feedback). Language defaults to 'en'; admin handles requests.

  const [form, setForm] = useState<BookingFormState>({
    ...initialFormState,
    therapistId: therapistId ?? null,
    serviceId: preService ?? null,
    duration: preDuration ? parseInt(preDuration, 10) : null,
    date: preDate ?? null,
    time: preTime ?? null,
  });

  // 🌧 Warm the rain-status cache on mount — surcharge surfaces in the
  //    pricing card without an extra round-trip when location is set.
  useEffect(() => {
    void getRainStatus();
  }, []);

  // 🔁 When SelectLocationPage navigates back with state, merge it in.
  //    Reads the address payload once, then clears it from history state
  //    so a refresh doesn't re-apply.
  //    🆕 Round 9: also rehydrate Order Details (service / duration /
  //       date / time) from the state payload — backup for cases where
  //       URL params get stripped between navigations.
  useEffect(() => {
    const incoming = routerLoc.state as Partial<AddressNavState> | null;
    if (incoming?.lat == null || incoming.lng == null) return;
    setForm((p) => ({
      ...p,
      locationName: incoming.locationName ?? p.locationName,
      locationAddress: incoming.locationAddress ?? p.locationAddress,
      lat: incoming.lat ?? p.lat,
      lng: incoming.lng ?? p.lng,
      addressDetails: incoming.addressDetails ?? p.addressDetails,
      contactName: incoming.contactName ?? p.contactName,
      customerPhone: incoming.customerPhone ?? p.customerPhone,
      addressNote: incoming.addressNote ?? p.addressNote,
      meetingPoint: incoming.meetingPoint ?? p.meetingPoint,
      locationType: incoming.locationType ?? p.locationType,
      mapUrl: incoming.mapUrl ?? p.mapUrl,
      // 🆕 Order Details fallback — only fill when the form's missing
      //    them (URL params take precedence on initial mount).
      serviceId: p.serviceId ?? incoming.serviceId ?? null,
      duration: p.duration ?? incoming.duration ?? null,
      date: p.date ?? incoming.date ?? null,
      time: p.time ?? incoming.time ?? null,
    }));
    // Clear the state so a manual refresh doesn't re-merge stale data.
    void navigate(routerLoc.pathname + routerLoc.search, {
      replace: true,
      state: null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goEditAddress = () => {
    // 🆕 Round 8 (founder 2026-05-01): 'พอเลือกโลเคชั่นเสร็จ ดึงข้อมูล
    //    ค้างไว้ Confirm Order'. The /address detour is in a separate
    //    component (not preserved in memory), and SelectLocationPage
    //    navigates back with `replace: true` — so without forwarding
    //    the booking context, service/duration/date/time get reset to
    //    null on remount. Forward them as URL params; SelectLocationPage
    //    preserves location.search on its way back.
    const params = new URLSearchParams();
    if (form.serviceId) params.set("service", form.serviceId);
    if (form.duration != null) params.set("duration", String(form.duration));
    if (form.date) params.set("date", form.date);
    if (form.time) params.set("time", form.time);
    const qs = params.toString();
    void navigate(
      `/booking/${therapistId ?? ""}/address${qs ? `?${qs}` : ""}`,
      {
        state: {
          locationName: form.locationName,
          locationAddress: form.locationAddress,
          lat: form.lat,
          lng: form.lng,
          addressDetails: form.addressDetails,
          contactName: form.contactName,
          customerPhone: form.customerPhone || "+66",
          addressNote: form.addressNote,
          meetingPoint: form.meetingPoint,
          locationType: form.locationType,
          mapUrl: form.mapUrl,
          // 🆕 Round 9: backup channel for Order Details — survives
          //    even if the URL params get stripped somewhere.
          serviceId: form.serviceId,
          duration: form.duration,
          date: form.date,
          time: form.time,
        },
      }
    );
  };

  // ── Resolved entities
  const therapist = useMemo(
    () => therapistsData.find((tt) => tt.id === form.therapistId) ?? null,
    [form.therapistId]
  );
  const service = useMemo(
    () => services.find((s) => s.id === form.serviceId) ?? null,
    [form.serviceId]
  );
  const selectedAddons = useMemo<AddOn[]>(
    () => ADDONS.filter((a) => form.selectedAddons.includes(a.id)),
    [form.selectedAddons]
  );
  // selectedLanguage removed — Preferences cell was dropped 2026-05-01.

  // ── Pricing
  const servicePrice =
    service && form.duration
      ? priceForDuration(service, form.duration)
      : service?.price ?? 0;
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);

  const locationSet = form.lat != null && form.lng != null;
  const taxi = locationSet
    ? estimateTaxiFare({
        therapistLat: therapist?.lat,
        therapistLng: therapist?.lng,
        customerLat: form.lat,
        customerLng: form.lng,
        durationMin: form.duration ?? service?.duration ?? 60,
      })
    : { distanceKm: 0, fare: 0, result: undefined };
  const distanceKm = taxi.distanceKm;
  const taxiFare = taxi.fare;
  const taxiResult = taxi.result;
  const adminQuoteRequired = taxiResult?.tier === "admin";

  // 🆕 Round 10 (founder 2026-05-01): Distance + ETA line on Confirm
  //    Order. ETA = travel time from distance + a 10-min prep buffer
  //    (staff getting ready + calling taxi). Average urban Bangkok /
  //    Grab speed: 35 km/h (mix of city + sois). Tune AVG_SPEED_KMH /
  //    STAFF_PREP_MIN if real-world ETAs drift from observed values.
  const AVG_SPEED_KMH = 35;
  const STAFF_PREP_MIN = 10;
  const etaMinutes =
    distanceKm > 0
      ? Math.round((distanceKm * 60) / AVG_SPEED_KMH + STAFF_PREP_MIN)
      : 0;

  const total = servicePrice + addonsTotal + taxiFare;

  // ── Validation. Phone + contact name are captured on the dedicated
  //    SelectLocationPage; if they've been filled there, they come back
  //    on the form. Fallback validation is "non-empty" — the address
  //    page already enforces shape.
  const phoneValid = form.customerPhone.replace(/\D/g, "").length >= 10;
  const canPlaceOrder =
    !!form.serviceId &&
    !!form.duration &&
    !!form.date &&
    !!form.time &&
    locationSet &&
    !adminQuoteRequired && // > 20 km bookings require admin contact first
    form.contactName.trim().length >= 2 &&
    phoneValid;

  // ── Header summary line
  const dateLabel = form.date
    ? dayjs(form.date).isSame(dayjs(), "day")
      ? "Today"
      : dayjs(form.date).isSame(dayjs().add(1, "day"), "day")
      ? "Tomorrow"
      : dayjs(form.date).format("MMM D")
    : null;

  // ── Submit
  const handleSubmit = async () => {
    if (submitting || !canPlaceOrder) return;
    setSubmitting(true);
    try {
      if (form.notes && (await isInappropriate(form.notes))) {
        toast.error(
          t(
            "booking.error.inappropriateNotes",
            "Notes contain inappropriate content. Please revise."
          )
        );
        setSubmitting(false);
        return;
      }
      if (!service || !therapist || !form.date || !form.time) {
        toast.error("Missing booking details");
        setSubmitting(false);
        return;
      }

      let startDate = dayjs(`${form.date}T${form.time}`);
      const startMin =
        parseInt(therapist.startTime.split(":")[0]) * 60 +
        parseInt(therapist.startTime.split(":")[1]);
      const endMin =
        parseInt(therapist.endTime.split(":")[0]) * 60 +
        parseInt(therapist.endTime.split(":")[1]);
      const slotMin = startDate.hour() * 60 + startDate.minute();
      if (endMin <= startMin && slotMin < startMin) {
        startDate = startDate.add(1, "day");
      }
      const endDate = startDate.add(
        form.duration ?? service.duration,
        "minute"
      );

      const ref = await addDoc(collection(db, "bookings"), {
        userId: user?.uid ?? null,
        therapistId: form.therapistId,
        therapistName: therapist.name,
        serviceId: service.id,
        serviceName: service.name,
        servicePrice,
        basePrice: service.price,
        duration: form.duration ?? service.duration,
        date: form.date,
        time: form.time,
        startAt: Timestamp.fromDate(startDate.toDate()),
        endAt: Timestamp.fromDate(endDate.toDate()),
        locationName: form.locationName,
        address: form.locationAddress,
        addressDetails: form.addressDetails,
        location: { lat: form.lat, lng: form.lng },
        mapUrl: form.mapUrl,
        meetingPoint: form.meetingPoint,
        locationType: form.locationType,
        addressNote: form.addressNote,
        contactName: form.contactName,
        phone: form.customerPhone,
        language: form.language,
        addons: form.selectedAddons,
        addonsTotal,
        note: form.notes,
        // payment field intentionally omitted — collected via admin chat.
        taxiFee: taxiFare,
        taxiTier: taxiResult?.tier ?? null,
        taxiBaseFee: taxiResult?.baseFareBeforeRain ?? taxiFare,
        rainTier: taxiResult?.rain.tier ?? "none",
        rainSurchargePct: taxiResult?.rain.surchargePct ?? 0,
        grabEstimate: taxiResult?.grabEstimate ?? null,
        savingsVsGrab: taxiResult?.savingsVsGrab ?? 0,
        distanceKm,
        totalPrice: total,
        status: "confirmed",
        createdAt: Timestamp.now(),
      });

      // 📱 Notify staff via Telegram bot — fail-open (logged on error).
      //    Not awaited; the user shouldn't wait for Telegram on success
      //    redirect. The Cloud Function persists its own delivery log.
      void sendBookingNotification({
        bookingId: ref.id,
        therapistName: therapist.name,
        serviceName: service.name,
        duration: form.duration ?? service.duration,
        date: form.date,
        time: form.time,
        startAt: startDate.toDate(),
        locationName: form.locationName,
        address: form.locationAddress,
        addressDetails: form.addressDetails,
        contactName: form.contactName,
        phone: form.customerPhone,
        note: form.notes,
        servicePrice,
        taxiFee: taxiFare,
        total,
        distanceKm,
        language: form.language,
        addons: selectedAddons.map((a) => ({ name: a.name, price: a.price })),
        rainTier: taxiResult?.rain.tier ?? "none",
        meetingPoint: form.meetingPoint,
        locationType: form.locationType,
        mapUrl: form.mapUrl,
      });

      void navigate(`/booking/success/${ref.id}`);
    } catch (err) {
      console.error("[booking] submit failed", err);
      toast.error(
        t("booking.error.submitFailed", "Could not create booking. Try again.")
      );
      setSubmitting(false);
    }
  };

  // ── Render
  return (
    <Box
      sx={{
        // 🆕 Phase 5 — Match the rest of the site (HomePage / TherapistDetailPage
        //   / TherapistsBrowsePage all use a 430px max-width 'phone' shell on
        //   desktop). Without this, the booking page rendered full-width.
        maxWidth: "430px",
        margin: "0 auto",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FFF8F0 0%, #FCEBDC 100%)",
        paddingBottom: "210px",
        fontFamily: SANS,
        position: "relative",
      }}
    >
      {/* ─────────── Page header ─────────── */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(255, 248, 240, 0.92)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid rgba(0, 0, 0, 0.04)",
          display: "flex",
          alignItems: "center",
          padding: "14px 16px",
        }}
      >
        <IconButton
          aria-label="back"
          onClick={() => void navigate(-1)}
          sx={{
            width: 36,
            height: 36,
            background: "rgba(255, 255, 255, 0.7)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            color: "#3c1e14",
            "&:hover": { background: "rgba(255, 255, 255, 0.9)" },
          }}
        >
          <ArrowBackRoundedIcon fontSize="small" />
        </IconButton>
        <Typography
          component="h1"
          sx={{
            flex: 1,
            textAlign: "center",
            fontFamily: SERIF,
            fontSize: "18px",
            fontWeight: 600,
            color: "#3c1e14",
            letterSpacing: "-0.01em",
            marginRight: "36px", // visual balance for the left icon button
          }}
        >
          Confirm Order
        </Typography>
      </Box>

      <Box
        sx={{
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {/* ─────────── Address tile (tap → /booking/:id/address) ─────────── */}
        <AddressTile
          location={{
            name: form.locationName,
            address: form.locationAddress,
            addressDetails: form.addressDetails,
            hasCoords: locationSet,
            contactName: form.contactName,
            phone: form.customerPhone,
          }}
          onTap={goEditAddress}
        />

        {/* ─────────── Order Details card (pattern 4A) ─────────── */}
        <SectionCard label="Order Details" icon={<ReceiptLongRoundedIcon />}>
          {/* Therapist row + EDIT */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                flexShrink: 0,
                borderRadius: "50%",
                background: therapist?.image
                  ? `center / cover no-repeat url("${therapist.image}"), linear-gradient(135deg, #d4a574, #8b6f47)`
                  : "linear-gradient(135deg, #d4a574, #8b6f47)",
                border: "2px solid #fff",
                boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#3c1e14",
                  lineHeight: 1.2,
                }}
              >
                {therapist?.name ?? "Therapist"}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "3px",
                }}
              >
                <Typography
                  component="span"
                  sx={{
                    fontFamily: SANS,
                    fontSize: "12px",
                    fontWeight: 700,
                    color: "#FE0944",
                  }}
                >
                  ★{" "}
                  {therapist
                    ? formatRating(
                        bayesianRatingFromAggregate(
                          therapist.rating * (therapist.reviews ?? 0),
                          therapist.reviews ?? 0
                        )
                      )
                    : "—"}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: SANS,
                    fontSize: "11.5px",
                    color: "rgba(60, 30, 20, 0.6)",
                  }}
                >
                  ({therapist?.reviews ?? 0} reviews)
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "11px",
                  color: "rgba(60, 30, 20, 0.55)",
                  marginTop: "2px",
                }}
              >
                {dateLabel && form.time
                  ? `${dateLabel} · ${form.time}`
                  : "Pick date & time on the detail page"}
              </Typography>
            </Box>
            <Button
              size="small"
              onClick={() =>
                void navigate(`/therapists/${form.therapistId ?? ""}`)
              }
              startIcon={<EditRoundedIcon sx={{ fontSize: "14px !important" }} />}
              sx={{
                fontFamily: SANS,
                fontSize: "11px",
                fontWeight: 800,
                color: "#FE0944",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: "rgba(254, 9, 68, 0.08)",
                borderRadius: "10px",
                padding: "4px 10px",
                "&:hover": { background: "rgba(254, 9, 68, 0.14)" },
              }}
            >
              Edit
            </Button>
          </Box>

          {/* Service summary row */}
          <Box
            sx={{
              borderTop: "1px solid rgba(0, 0, 0, 0.06)",
              paddingTop: "12px",
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: "12px",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: "15px",
                  fontWeight: 600,
                  color: "#3c1e14",
                }}
              >
                {service?.name ?? "—"}
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "11.5px",
                  color: "rgba(60, 30, 20, 0.6)",
                  marginTop: "2px",
                }}
              >
                {form.duration ? `${form.duration} mins` : "—"}
              </Typography>
            </Box>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: "18px",
                fontWeight: 700,
                color: "#3c1e14",
                letterSpacing: "-0.02em",
                flexShrink: 0,
              }}
            >
              {formatTHB(servicePrice)}
            </Typography>
          </Box>
        </SectionCard>

        {/* 🆕 Founder 2026-05-01 round 8 (founder feedback):
            • Preferences cell ลบ — language defaults to 'en', add-ons unused
            • Deposit info tip ลบ — Travel fee chip below already surfaces
              long-distance / admin-quote state
            • Notes-for-therapist textarea ลบ — keep page focused on the
              must-do (location). Special requests go via admin chat. */}

        {/* ─────────── Pricing card (pattern 5A) ─────────── */}
        <SectionCard label="Pricing" icon={<PaidRoundedIcon />}>
          <PriceRow
            label={`Service fee${
              form.duration ? ` · ${form.duration} min` : ""
            }`}
            value={formatTHB(servicePrice)}
          />
          {selectedAddons.length > 0 && (
            <PriceRow
              label={`Add-ons (${selectedAddons.length})`}
              value={`+${formatTHB(addonsTotal)}`}
            />
          )}

          {/* 🆕 Round 10 (founder 2026-05-01): Distance + ETA line. ETA
              factors in a 10-min staff prep buffer + travel time from
              the configured average city speed. Only renders once a
              location is set so we have a real distance to show. */}
          {locationSet && distanceKm > 0 && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "8px",
                fontFamily: SANS,
                fontSize: "12px",
                color: "rgba(60, 30, 20, 0.65)",
                marginBottom: "8px",
                "& svg": { fontSize: 14, color: "#FE0944" },
              }}
            >
              <Box
                component="span"
                sx={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <PlaceRoundedIcon />
                Distance:&nbsp;
                <Box component="strong" sx={{ color: "#3c1e14" }}>
                  {distanceKm.toFixed(1)} km
                </Box>
              </Box>
              <Box component="span" sx={{ opacity: 0.5 }}>
                •
              </Box>
              <Box
                component="span"
                sx={{ display: "inline-flex", alignItems: "center", gap: "4px" }}
              >
                <AccessTimeRoundedIcon />
                ETA:&nbsp;
                <Box component="strong" sx={{ color: "#3c1e14" }}>
                  {etaMinutes} min
                </Box>
              </Box>
            </Box>
          )}

          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "6px",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <Typography
                component="div"
                sx={{
                  fontFamily: SANS,
                  fontSize: "13px",
                  color: "rgba(60, 30, 20, 0.7)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  "& > svg": { fontSize: 16, color: "#FE0944" },
                }}
              >
                <LocalTaxiRoundedIcon />
                Travel fee
                {locationSet && taxiResult && taxiResult.tier !== "free" && (
                  <Box
                    component="span"
                    sx={{
                      fontFamily: SANS,
                      fontSize: "10.5px",
                      color: "rgba(60, 30, 20, 0.5)",
                      marginLeft: "2px",
                    }}
                  >
                    · {taxiResult.label}
                  </Box>
                )}
              </Typography>
              <Tooltip
                title={
                  <Box sx={{ padding: "2px 0" }}>
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: "12px",
                        fontWeight: 700,
                        marginBottom: "4px",
                      }}
                    >
                      Travel Fee — Tiered
                    </Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: "11.5px", lineHeight: 1.6 }}>
                      0–4 km · <strong>FREE</strong> (free zone)
                      <br />
                      4–8 km · ฿200 flat
                      <br />
                      8–12 km · ฿350 flat
                      <br />
                      12–{ADMIN_QUOTE_KM} km · ฿350 + ฿20/km beyond 12
                      <br />
                      &gt; {ADMIN_QUOTE_KM} km · admin quote + deposit
                      <br />
                      <Box component="span" sx={{ opacity: 0.85, display: "block", marginTop: "6px" }}>
                        Rain may add 15-30% surcharge.
                      </Box>
                    </Typography>
                  </Box>
                }
                placement="top"
                arrow
              >
                <InfoOutlinedIcon
                  sx={{
                    fontSize: 14,
                    color: "rgba(60, 30, 20, 0.5)",
                    cursor: "help",
                  }}
                />
              </Tooltip>
            </Box>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "13px",
                fontWeight: 600,
                color: locationSet
                  ? adminQuoteRequired
                    ? "#f97316"
                    : taxiFare === 0
                    ? "#16a34a"
                    : "#3c1e14"
                  : "rgba(60, 30, 20, 0.5)",
                fontStyle: locationSet ? "normal" : "italic",
              }}
            >
              {!locationSet
                ? "Set address"
                : adminQuoteRequired
                ? "Admin quote"
                : taxiFare === 0
                ? "FREE"
                : formatTHB(taxiFare)}
            </Typography>
          </Box>

          {/* Tier chips — shown below the row depending on state */}
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
              marginBottom: "8px",
            }}
          >
            {locationSet && distanceKm <= FREE_DISTANCE_KM && (
              <FareChip color="green" icon={<CheckCircleRoundedIcon />}>
                Within free distance ({FREE_DISTANCE_KM} km)
              </FareChip>
            )}
            {locationSet &&
              taxiResult &&
              taxiResult.savingsVsGrab > 0 &&
              !adminQuoteRequired && (
                <FareChip color="green" icon={<SavingsRoundedIcon />}>
                  Save {formatTHB(taxiResult.savingsVsGrab)} vs Grab
                </FareChip>
              )}
            {locationSet &&
              taxiResult &&
              taxiResult.rain.tier !== "none" && (
                <FareChip color="amber" icon={<UmbrellaRoundedIcon />}>
                  {taxiResult.rain.label}
                </FareChip>
              )}
            {adminQuoteRequired && (
              <FareChip color="amber" icon={<SupportAgentRoundedIcon />}>
                Long-distance · contact admin to confirm
              </FareChip>
            )}
          </Box>

          <Box
            sx={{
              borderTop: "1px solid rgba(0, 0, 0, 0.08)",
              marginTop: "8px",
              paddingTop: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
            }}
          >
            <Typography
              sx={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 600 }}
            >
              Total
            </Typography>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: "24px",
                fontWeight: 700,
                color: "#FE0944",
                letterSpacing: "-0.02em",
                lineHeight: 1,
              }}
            >
              {formatTHB(total)}
            </Typography>
          </Box>
          {!locationSet && (
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "10.5px",
                color: "rgba(60, 30, 20, 0.55)",
                marginTop: "6px",
                fontStyle: "italic",
              }}
            >
              Total updates when address is set.
            </Typography>
          )}
        </SectionCard>

        {/* ─────────── Cancellation policy ─────────── */}
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "10.5px",
            color: "rgba(60, 30, 20, 0.55)",
            lineHeight: 1.5,
            padding: "0 8px",
          }}
        >
          <Box component="span" sx={{ fontWeight: 700 }}>
            Cancellation:
          </Box>{" "}
          Free up to 30 minutes before booking time. After that, 50% of the
          service fee.
        </Typography>
      </Box>

      {/* ─────────── Sticky bottom (pattern 7A: Total left + Confirm right) ─────────── */}
      <ConfirmBar
        total={total}
        canPlace={canPlaceOrder}
        submitting={submitting}
        onConfirm={() => void handleSubmit()}
      />

      {/* PreferencesSheet removed 2026-05-01 round 8 — no in-page sheets
          on the Confirm Order page anymore; the only out-of-page detour
          is the dedicated /address route. */}
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

// Card with eyebrow label + emoji icon (Order Details / Pricing / etc.)
const SectionCard: React.FC<{
  label: string;
  /** MUI icon node (preferred) — rendered inside a soft pink rounded box
   *  matching the address tile. Plain string emoji is still accepted for
   *  back-compat. */
  icon?: React.ReactNode;
  tight?: boolean;
  children: React.ReactNode;
}> = ({ label, icon, tight, children }) => (
  <Box
    sx={{
      padding: tight ? "14px 14px 16px" : "14px 16px 18px",
      borderRadius: "16px",
      background: "rgba(255, 255, 255, 0.7)",
      border: "1px solid rgba(255, 255, 255, 0.6)",
      boxShadow: "0 4px 14px rgba(126, 30, 46, 0.06)",
    }}
  >
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
        marginBottom: "12px",
      }}
    >
      {icon && (
        <Box
          aria-hidden
          sx={{
            width: 30,
            height: 30,
            flexShrink: 0,
            borderRadius: "9px",
            background: "rgba(254, 9, 68, 0.10)",
            color: "#FE0944",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "& svg": { fontSize: 18 },
          }}
        >
          {icon}
        </Box>
      )}
      <Typography
        sx={{
          fontFamily: SERIF,
          fontSize: "15px",
          fontWeight: 600,
          color: "#3c1e14",
        }}
      >
        {label}
      </Typography>
    </Box>
    {children}
  </Box>
);

// Small inline chip used under the Travel fee row to communicate context
// (free zone, savings vs Grab, rain surcharge, admin quote requirement).
const FareChip: React.FC<{
  color: "green" | "amber";
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ color, icon, children }) => {
  const palette =
    color === "green"
      ? { bg: "rgba(22, 163, 74, 0.1)", fg: "#16a34a" }
      : { bg: "rgba(249, 115, 22, 0.1)", fg: "#d97706" };
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        gap: "5px",
        padding: "5px 10px",
        background: palette.bg,
        color: palette.fg,
        borderRadius: "999px",
        fontFamily: SANS,
        fontSize: "11px",
        fontWeight: 700,
        "& svg": { fontSize: 13 },
      }}
    >
      <Box
        component="span"
        sx={{ display: "inline-flex", alignItems: "center" }}
      >
        {icon}
      </Box>
      {children}
    </Box>
  );
};

const PriceRow: React.FC<{ label: string; value: React.ReactNode }> = ({
  label,
  value,
}) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "baseline",
      marginBottom: "6px",
    }}
  >
    <Typography
      sx={{
        fontFamily: SANS,
        fontSize: "13px",
        color: "rgba(60, 30, 20, 0.7)",
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontFamily: SANS,
        fontSize: "13px",
        fontWeight: 600,
        color: "#3c1e14",
      }}
    >
      {value}
    </Typography>
  </Box>
);

// Address tile — summary only. Tap to open the full Select Location page.
const AddressTile: React.FC<{
  location: {
    name: string | null;
    address: string | null;
    addressDetails: string;
    hasCoords: boolean;
    contactName: string;
    phone: string;
  };
  onTap: () => void;
}> = ({ location, onTap }) => {
  const phoneClean = location.phone.replace(/\D/g, "");
  const phoneOk = phoneClean.length >= 10;
  const fullySet = location.hasCoords && location.contactName.trim() && phoneOk;

  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onTap();
        }
      }}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
        padding: "14px",
        borderRadius: "16px",
        cursor: "pointer",
        background: "rgba(255, 255, 255, 0.85)",
        border: fullySet
          ? "1.5px solid #FE0944"
          : "1px solid rgba(0, 0, 0, 0.06)",
        transition: "all 0.15s ease",
        "&:hover": { background: "rgba(255, 255, 255, 0.95)" },
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: "10px",
          background: location.hasCoords
            ? "linear-gradient(135deg, rgba(254, 9, 68, 0.14), rgba(254, 122, 82, 0.14))"
            : "rgba(254, 201, 167, 0.35)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FE0944",
        }}
      >
        <LocationOnRoundedIcon fontSize="small" />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        {location.hasCoords ? (
          <>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: "14px",
                fontWeight: 600,
                color: "#3c1e14",
                lineHeight: 1.2,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {location.name ?? "Pinned location"}
            </Typography>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "11px",
                color: "rgba(60, 30, 20, 0.6)",
                marginTop: "2px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {location.addressDetails || location.address || "—"}
            </Typography>
            {fullySet && (
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "11px",
                  color: "rgba(60, 30, 20, 0.55)",
                  marginTop: "3px",
                }}
              >
                👤 {location.contactName} · 📞 {location.phone}
              </Typography>
            )}
            {!fullySet && (
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "11px",
                  color: "#FE0944",
                  fontWeight: 600,
                  marginTop: "3px",
                }}
              >
                ⚠ Add contact name + phone
              </Typography>
            )}
          </>
        ) : (
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "14px",
              fontWeight: 600,
              color: "rgba(60, 30, 20, 0.55)",
              lineHeight: 1.2,
            }}
          >
            Tap to set your location
          </Typography>
        )}
      </Box>
      <Box
        aria-hidden
        sx={{
          fontSize: "20px",
          color: fullySet ? "#FE0944" : "rgba(60, 30, 20, 0.35)",
          flexShrink: 0,
          fontWeight: 800,
        }}
      >
        ›
      </Box>
    </Box>
  );
};

// Sticky bottom — Total left + Confirm right (pattern 7A)
const ConfirmBar: React.FC<{
  total: number;
  canPlace: boolean;
  submitting: boolean;
  onConfirm: () => void;
}> = ({ total, canPlace, submitting, onConfirm }) => (
  <Box
    sx={{
      position: "fixed",
      bottom: "calc(100px + env(safe-area-inset-bottom, 0px))",
      left: "50%",
      transform: "translateX(-50%)",
      width: "100%",
      maxWidth: "430px",
      zIndex: 50,
      background: "rgba(255, 248, 240, 0.92)",
      backdropFilter: "blur(30px) saturate(180%)",
      WebkitBackdropFilter: "blur(30px) saturate(180%)",
      borderTop: "1px solid rgba(0, 0, 0, 0.06)",
      borderRadius: "20px 20px 0 0",
      padding: "12px 16px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      boxShadow: "0 -8px 24px rgba(126, 30, 46, 0.08)",
    }}
  >
    <Box>
      <Typography
        sx={{
          fontFamily: SANS,
          fontSize: "10px",
          fontWeight: 700,
          color: "rgba(60, 30, 20, 0.55)",
          textTransform: "uppercase",
          letterSpacing: "0.08em",
        }}
      >
        Total
      </Typography>
      <Typography
        sx={{
          fontFamily: SERIF,
          fontSize: "22px",
          fontWeight: 700,
          color: "#FE0944",
          letterSpacing: "-0.02em",
          lineHeight: 1,
          marginTop: "2px",
        }}
      >
        {formatTHB(total)}
      </Typography>
    </Box>
    <Button
      onClick={onConfirm}
      disabled={!canPlace || submitting}
      sx={{
        flex: 1,
        height: 50,
        borderRadius: "999px",
        background: "linear-gradient(135deg, #FE0944, #FE7A52)",
        color: "#fff",
        fontFamily: SANS,
        fontSize: "15px",
        fontWeight: 700,
        letterSpacing: "0.02em",
        textTransform: "none",
        boxShadow: "0 6px 20px rgba(254, 9, 68, 0.35)",
        "&:hover": {
          background: "linear-gradient(135deg, #E50840, #E56A47)",
        },
        "&.Mui-disabled": {
          background: "rgba(0, 0, 0, 0.12)",
          color: "rgba(0, 0, 0, 0.35)",
          boxShadow: "none",
        },
      }}
    >
      {submitting ? "..." : "Confirm"}
    </Button>
  </Box>
);

export default BookingFlowPage;
