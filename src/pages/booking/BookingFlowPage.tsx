// src/pages/booking/BookingFlowPage.tsx
//
// 🎨 Phase 4 — Single-page Reservation Order.
//
// Replaces the Phase-3 5-step wizard with a single scrollable form.
// Service + Date + Time are picked on the DetailPage and passed in via
// URL search params (?service=…&duration=…&date=…&time=…). This page
// only collects what's left:
//
//   ┌─────────────────────────────────────────────┐
//   │  [avatar] Mai · ★4.7                    EDIT│  Therapist header
//   │           Today · 17:00 · Thai 60min        │
//   ├─────────────────────────────────────────────┤
//   │  ADDRESS                                    │
//   │  📍 Tap to set your location          ›     │
//   │                                             │
//   │  PHONE NUMBER                               │
//   │  +66 [────────────────────]                 │
//   │                                             │
//   │  PREFERRED LANGUAGE                         │
//   │  [🇨🇳 中文] [🇬🇧 English] [🇯🇵 日本語] [🇰🇷 한국어]
//   │                                             │
//   │  OPTIONAL ADD-ONS                           │
//   │  ☐ Hot stone therapy            +฿400      │
//   │  ☐ Premium oil upgrade          +฿200      │
//   │  ☐ Pair booking                 +฿2,500    │
//   │                                             │
//   │  NOTES FOR MAI (optional)                   │
//   │  [textarea ──────────────────────]          │
//   │                                             │
//   │  Service                          ฿1,800   │
//   │  Add-ons                          ฿0       │
//   │  🚖 Taxi (round-trip)              —       │
//   │  Total                          ฿1,800     │
//   └─────────────────────────────────────────────┘
//   [ ← back ]  [ Place Order · ฿1,800 ]   ← sticky
//
// Taxi fare is gated — shows "—" until the customer picks a location.
// All inputs persist locally; submit fires Firestore addDoc + redirects
// to /booking/success/:id.

import React, { useState, useMemo } from "react";
import { Box, Typography, TextField, IconButton } from "@mui/material";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { toast } from "react-toastify";
import dayjs from "dayjs";
import PhoneInput, { isValidPhoneNumber } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";

import BookingNavBar from "@/components/booking/BookingNavBar";
import LocationSheet from "@/components/booking/LocationSheet";
import PaymentPicker, {
  type PaymentMethod,
} from "@/components/booking/PaymentPicker";

import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { isInappropriate } from "@/utils/moderate";
import { estimateTaxiFare } from "@/utils/taxiFare";
import { priceForDuration, formatTHB } from "@/utils/servicePricing";
import { bayesianRatingFromAggregate, formatRating } from "@/utils/rating";
import services from "@/data/services";
import therapistsData from "@/data/therapists";
import { ADDONS, LANGUAGE_OPTIONS } from "@/data/bookingExtras";

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
  customerPhone: string;
  language: string; // language code "zh" | "en" | "ja" | "ko"
  selectedAddons: string[]; // ADDON ids
  notes: string;
  paymentMethod: PaymentMethod | null;
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
  customerPhone: "",
  language: "en",
  selectedAddons: [],
  notes: "",
  paymentMethod: null,
  therapistId: null,
};

const BookingFlowPage: React.FC = () => {
  const { id: therapistId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  // Pre-fill from URL params (DetailPage StickyBookCTA forwards these)
  const preService = searchParams.get("service");
  const preDuration = searchParams.get("duration");
  const preDate = searchParams.get("date");
  const preTime = searchParams.get("time");

  const [submitting, setSubmitting] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [locationSheetOpen, setLocationSheetOpen] = useState(false);
  const [form, setForm] = useState<BookingFormState>({
    ...initialFormState,
    therapistId: therapistId ?? null,
    serviceId: preService ?? null,
    duration: preDuration ? parseInt(preDuration, 10) : null,
    date: preDate ?? null,
    time: preTime ?? null,
  });

  // ── Resolve therapist + service for header + summary
  const therapist = useMemo(
    () => therapistsData.find((tt) => tt.id === form.therapistId) ?? null,
    [form.therapistId]
  );
  const service = useMemo(
    () => services.find((s) => s.id === form.serviceId) ?? null,
    [form.serviceId]
  );

  // ── Pricing
  const servicePrice =
    service && form.duration
      ? priceForDuration(service, form.duration)
      : service?.price ?? 0;
  const addonsTotal = ADDONS.filter((a) =>
    form.selectedAddons.includes(a.id)
  ).reduce((sum, a) => sum + a.price, 0);

  // 🚖 Taxi — gated on a real location being picked. Per founder request:
  //    "ตอนยังไม่จองจะยังไม่คิด หลังจากทราบตำแหน่งจะคำนวนแท็กซี่"
  const locationSet = form.lat != null && form.lng != null;
  const { distanceKm, fare: taxiFare } = locationSet
    ? estimateTaxiFare({
        therapistLat: therapist?.lat,
        therapistLng: therapist?.lng,
        customerLat: form.lat,
        customerLng: form.lng,
        durationMin: form.duration ?? service?.duration ?? 60,
      })
    : { distanceKm: 0, fare: 0 };

  const total = servicePrice + addonsTotal + taxiFare;

  // ── Validation: ready to place order
  const phoneValid =
    form.customerPhone.trim().length >= 8 &&
    isValidPhoneNumber(form.customerPhone);
  const canPlaceOrder =
    !!form.serviceId &&
    !!form.duration &&
    !!form.date &&
    !!form.time &&
    locationSet &&
    phoneValid &&
    !!form.paymentMethod;

  // ── Format header summary line: "Today · 17:00 · Thai 60min"
  const summaryLine = (() => {
    const parts: string[] = [];
    if (form.date) {
      const d = dayjs(form.date);
      parts.push(
        d.isSame(dayjs(), "day")
          ? "Today"
          : d.isSame(dayjs().add(1, "day"), "day")
          ? "Tomorrow"
          : d.format("MMM D")
      );
    }
    if (form.time) parts.push(form.time);
    if (service && form.duration) {
      parts.push(`${service.name} · ${form.duration}min`);
    }
    return parts.join(" · ");
  })();

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

      // Compose start/end Timestamps (overnight-shift handling)
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
        phone: form.customerPhone,
        language: form.language,
        addons: form.selectedAddons,
        addonsTotal,
        note: form.notes,
        payment: form.paymentMethod,
        taxiFee: taxiFare,
        distanceKm,
        totalPrice: total,
        status: "confirmed",
        createdAt: Timestamp.now(),
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

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FFF8F0 0%, #FCEBDC 100%)",
        // Room for stacked sticky CTA + global BottomNavGlass
        paddingBottom: "210px",
        fontFamily: SANS,
      }}
    >
      {/* ── Therapist header card ─────────────────────────────────── */}
      <Box sx={{ padding: "16px 16px 12px" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px",
            borderRadius: "18px",
            background: "rgba(255, 255, 255, 0.7)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.6)",
            boxShadow: "0 4px 14px rgba(126, 30, 46, 0.06)",
          }}
        >
          {/* Avatar */}
          <Box
            sx={{
              width: 48,
              height: 48,
              flexShrink: 0,
              borderRadius: "50%",
              background: therapist?.image
                ? `center / cover no-repeat url("${therapist.image}"), linear-gradient(135deg, #d4a574, #8b6f47)`
                : "linear-gradient(135deg, #d4a574, #8b6f47)",
              border: "2px solid #fff",
              boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
            }}
          />
          {/* Name + summary */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "baseline",
                gap: "8px",
                marginBottom: "2px",
              }}
            >
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "#3c1e14",
                  lineHeight: 1.1,
                }}
              >
                {therapist?.name ?? "Therapist"}
              </Typography>
              <Typography
                component="span"
                sx={{
                  fontFamily: SANS,
                  fontSize: "11.5px",
                  color: "rgba(60, 30, 20, 0.7)",
                  fontWeight: 600,
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
            </Box>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "12px",
                color: "rgba(60, 30, 20, 0.6)",
                lineHeight: 1.3,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {summaryLine || "Tap EDIT to pick a service & time"}
            </Typography>
          </Box>
          {/* EDIT — back to detail page to change service/date/time */}
          <IconButton
            aria-label="edit"
            onClick={() =>
              void navigate(`/therapists/${form.therapistId ?? ""}`)
            }
            sx={{
              flexShrink: 0,
              color: "#FE0944",
              fontFamily: SANS,
              fontSize: "11px",
              fontWeight: 800,
              borderRadius: "10px",
              padding: "6px 10px",
              gap: "4px",
              "&:hover": { background: "rgba(254, 9, 68, 0.08)" },
            }}
          >
            <EditRoundedIcon fontSize="small" />
            <Typography
              component="span"
              sx={{
                fontFamily: SANS,
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.06em",
              }}
            >
              EDIT
            </Typography>
          </IconButton>
        </Box>
      </Box>

      {/* ── Form sections ─────────────────────────────────────────── */}
      <Box sx={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Address tile */}
        <FormSection label="Address">
          <AddressTile
            location={{
              name: form.locationName,
              address: form.locationAddress,
              addressDetails: form.addressDetails,
              hasCoords: locationSet,
            }}
            onTap={() => setLocationSheetOpen(true)}
          />
        </FormSection>

        {/* Phone */}
        <FormSection label="Phone number">
          <Box>
            <PhoneInput
              international
              defaultCountry="TH"
              value={form.customerPhone || undefined}
              onChange={(val) =>
                setForm((p) => ({ ...p, customerPhone: val ?? "" }))
              }
              onBlur={() => setPhoneTouched(true)}
              placeholder="Enter phone number"
              className={
                phoneTouched && form.customerPhone && !phoneValid
                  ? "PhoneInput--invalid"
                  : undefined
              }
            />
            <PhoneStyleInjector />
            {phoneTouched && form.customerPhone && !phoneValid && (
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "11.5px",
                  color: "#FE0944",
                  marginTop: "6px",
                  paddingLeft: "8px",
                }}
              >
                Please enter a valid phone number with country code
              </Typography>
            )}
          </Box>
        </FormSection>

        {/* Language */}
        <FormSection label="Preferred language with therapist">
          <Box
            role="radiogroup"
            sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}
          >
            {LANGUAGE_OPTIONS.map((l) => {
              const isActive = form.language === l.code;
              return (
                <Box
                  key={l.code}
                  role="radio"
                  aria-checked={isActive}
                  tabIndex={0}
                  onClick={() =>
                    setForm((p) => ({ ...p, language: l.code }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      setForm((p) => ({ ...p, language: l.code }));
                    }
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    cursor: "pointer",
                    background: isActive
                      ? "rgba(254, 9, 68, 0.08)"
                      : "rgba(255, 255, 255, 0.7)",
                    border: isActive
                      ? "1.5px solid #FE0944"
                      : "1px solid rgba(0, 0, 0, 0.06)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Box sx={{ fontSize: "16px" }}>{l.flag}</Box>
                  <Typography
                    sx={{
                      fontFamily: SANS,
                      fontSize: "13.5px",
                      fontWeight: 600,
                      color: isActive ? "#FE0944" : "#3c1e14",
                    }}
                  >
                    {l.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </FormSection>

        {/* Add-ons */}
        <FormSection label="Optional add-ons">
          <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {ADDONS.map((a) => {
              const isSelected = form.selectedAddons.includes(a.id);
              return (
                <Box
                  key={a.id}
                  role="checkbox"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onClick={() =>
                    setForm((p) => ({
                      ...p,
                      selectedAddons: isSelected
                        ? p.selectedAddons.filter((x) => x !== a.id)
                        : [...p.selectedAddons, a.id],
                    }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      setForm((p) => ({
                        ...p,
                        selectedAddons: isSelected
                          ? p.selectedAddons.filter((x) => x !== a.id)
                          : [...p.selectedAddons, a.id],
                      }));
                    }
                  }}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "12px 14px",
                    borderRadius: "14px",
                    cursor: "pointer",
                    background: "rgba(255, 255, 255, 0.7)",
                    border: isSelected
                      ? "1.5px solid #FE0944"
                      : "1px solid rgba(0, 0, 0, 0.06)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      flexShrink: 0,
                      borderRadius: "10px",
                      background: isSelected
                        ? "linear-gradient(135deg, #FE0944, #FE7A52)"
                        : "rgba(254, 201, 167, 0.35)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "18px",
                    }}
                  >
                    {a.icon}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography
                      sx={{
                        fontFamily: SERIF,
                        fontSize: "13.5px",
                        fontWeight: 600,
                        color: "#3c1e14",
                        lineHeight: 1.2,
                      }}
                    >
                      {a.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: "11.5px",
                        color: "rgba(60, 30, 20, 0.6)",
                        marginTop: "2px",
                      }}
                    >
                      {a.description}
                    </Typography>
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: SERIF,
                      fontSize: "14px",
                      fontWeight: 700,
                      color: "#FE0944",
                      flexShrink: 0,
                    }}
                  >
                    +{formatTHB(a.price)}
                  </Typography>
                  <Box
                    aria-hidden
                    sx={{
                      width: 22,
                      height: 22,
                      flexShrink: 0,
                      borderRadius: "6px",
                      border: isSelected
                        ? "none"
                        : "2px solid rgba(0, 0, 0, 0.2)",
                      background: isSelected ? "#FE0944" : "transparent",
                      color: "#fff",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "14px",
                      fontWeight: 800,
                    }}
                  >
                    {isSelected && "✓"}
                  </Box>
                </Box>
              );
            })}
          </Box>
        </FormSection>

        {/* Notes */}
        <FormSection
          label={`Notes for ${therapist?.name ?? "your therapist"} (optional)`}
        >
          <TextField
            fullWidth
            multiline
            minRows={3}
            maxRows={6}
            placeholder="e.g. Focus on lower back, prefer firm pressure, allergies, mobility limitations…"
            value={form.notes}
            onChange={(e) =>
              setForm((p) => ({ ...p, notes: e.target.value }))
            }
            inputProps={{ maxLength: 500 }}
            sx={{
              "& .MuiOutlinedInput-root": {
                background: "rgba(255, 255, 255, 0.7)",
                borderRadius: "14px",
                fontFamily: SANS,
                fontSize: "13.5px",
                "& fieldset": { borderColor: "rgba(0, 0, 0, 0.08)" },
                "&:hover fieldset": { borderColor: "rgba(254, 9, 68, 0.4)" },
                "&.Mui-focused fieldset": {
                  borderColor: "#FE0944",
                  borderWidth: "1.5px",
                },
              },
            }}
          />
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "11px",
              color: "rgba(60, 30, 20, 0.5)",
              marginTop: "6px",
              paddingLeft: "8px",
              textAlign: "right",
            }}
          >
            {form.notes.length}/500 · Reviewed for safety before delivery
          </Typography>
        </FormSection>

        {/* Payment method */}
        <FormSection label="Payment method">
          <PaymentPicker
            value={form.paymentMethod}
            onChange={(paymentMethod) =>
              setForm((p) => ({ ...p, paymentMethod }))
            }
          />
        </FormSection>

        {/* Price breakdown */}
        <Box
          sx={{
            padding: "16px 18px",
            borderRadius: "16px",
            background: "rgba(255, 255, 255, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.6)",
            boxShadow: "0 4px 14px rgba(126, 30, 46, 0.06)",
          }}
        >
          <PriceRow
            label={`Service${form.duration ? ` (${form.duration} min)` : ""}`}
            value={formatTHB(servicePrice)}
          />
          {form.selectedAddons.length > 0 && (
            <PriceRow
              label={`Add-ons (${form.selectedAddons.length})`}
              value={formatTHB(addonsTotal)}
            />
          )}
          <PriceRow
            label={`🚖 Taxi (round-trip${
              locationSet ? ` · ${distanceKm.toFixed(1)} km` : ""
            })`}
            value={
              locationSet ? formatTHB(taxiFare) : "Set address to calculate"
            }
            muted={!locationSet}
          />
          <Box
            sx={{
              borderTop: "1px solid rgba(0, 0, 0, 0.08)",
              marginTop: "10px",
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
                fontSize: "26px",
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
        </Box>

        {/* Cancellation policy */}
        <Box
          sx={{
            padding: "12px 14px",
            borderRadius: "12px",
            background: "rgba(0, 0, 0, 0.03)",
            fontFamily: SANS,
          }}
        >
          <Typography
            sx={{
              fontSize: "11px",
              color: "rgba(60, 30, 20, 0.6)",
              lineHeight: 1.5,
            }}
          >
            <Box component="span" sx={{ fontWeight: 700 }}>
              Cancellation:
            </Box>{" "}
            Free up to 30 minutes before booking time. After that, 50% of the
            service fee.
          </Typography>
        </Box>
      </Box>

      {/* ── Sticky bottom CTA ─────────────────────────────────────── */}
      <BookingNavBar
        ctaLabel={`Place Order · ${formatTHB(total)}`}
        onNext={() => void handleSubmit()}
        onBack={() => void navigate(-1)}
        disabled={!canPlaceOrder || submitting}
        loading={submitting}
      />

      {/* ── Address bottom sheet ──────────────────────────────────── */}
      <LocationSheet
        open={locationSheetOpen}
        onClose={() => setLocationSheetOpen(false)}
        initial={{
          locationName: form.locationName,
          locationAddress: form.locationAddress,
          lat: form.lat,
          lng: form.lng,
          addressDetails: form.addressDetails,
        }}
        onConfirm={(next) => {
          setForm((p) => ({ ...p, ...next }));
          setLocationSheetOpen(false);
        }}
      />
    </Box>
  );
};

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────

const FormSection: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <Box>
    <Typography
      sx={{
        fontFamily: SANS,
        fontSize: "10.5px",
        fontWeight: 800,
        color: "rgba(60, 30, 20, 0.55)",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: "8px",
        paddingLeft: "2px",
      }}
    >
      {label}
    </Typography>
    {children}
  </Box>
);

const PriceRow: React.FC<{
  label: string;
  value: React.ReactNode;
  muted?: boolean;
}> = ({ label, value, muted }) => (
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
        color: muted ? "rgba(60, 30, 20, 0.5)" : "rgba(60, 30, 20, 0.7)",
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontFamily: SANS,
        fontSize: "13px",
        fontWeight: 600,
        color: muted ? "rgba(60, 30, 20, 0.5)" : "#3c1e14",
        fontStyle: muted ? "italic" : "normal",
      }}
    >
      {value}
    </Typography>
  </Box>
);

// Inline address tile shown on the form (tap → bottom sheet)
const AddressTile: React.FC<{
  location: {
    name: string | null;
    address: string | null;
    addressDetails: string;
    hasCoords: boolean;
  };
  onTap: () => void;
}> = ({ location, onTap }) => (
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
      background: "rgba(255, 255, 255, 0.7)",
      border: location.hasCoords
        ? "1.5px solid #FE0944"
        : "1px solid rgba(0, 0, 0, 0.06)",
      transition: "all 0.15s ease",
      "&:hover": { background: "rgba(255, 255, 255, 0.85)" },
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
              fontSize: "11.5px",
              color: "rgba(60, 30, 20, 0.6)",
              marginTop: "2px",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {location.addressDetails || location.address || "—"}
          </Typography>
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
        color: location.hasCoords ? "#FE0944" : "rgba(60, 30, 20, 0.35)",
        flexShrink: 0,
        fontWeight: 800,
      }}
    >
      ›
    </Box>
  </Box>
);

// Scoped CSS injector for react-phone-number-input — same recipe used in
// the legacy StepDetails (kept here so this single-page form is self-contained).
const PhoneStyleInjector: React.FC = () => {
  React.useEffect(() => {
    const id = "sunred-phone-style";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      .PhoneInput {
        background: rgba(255, 255, 255, 0.7);
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 14px;
        padding: 12px 14px;
        font-family: 'Inter', sans-serif;
        font-size: 13.5px;
        transition: border-color 0.15s ease;
      }
      .PhoneInput:focus-within { border-color: #FE0944; border-width: 1.5px; padding: calc(12px - 0.5px) calc(14px - 0.5px); }
      .PhoneInput--invalid { border-color: #FE0944; }
      .PhoneInputInput { background: transparent; border: none; outline: none; font-family: inherit; font-size: inherit; color: #3c1e14; }
      .PhoneInputCountrySelect { margin-right: 8px; }
    `;
    document.head.appendChild(style);
  }, []);
  return null;
};

export default BookingFlowPage;
