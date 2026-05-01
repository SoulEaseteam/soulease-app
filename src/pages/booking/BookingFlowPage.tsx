// src/pages/booking/BookingFlowPage.tsx
//
// 🎨 Phase 3 Booking — 5-step wizard orchestrator.
//
// Replaces legacy BookingPage.tsx (761 lines) with a step-by-step flow:
//   1. Service       — pick a licensed therapeutic service
//   2. DateTime      — choose date + time slot
//   3. Location      — Google Maps + saved hotels
//   4. Details       — name, phone, room, notes (with profanity moderation)
//   5. Confirm + Pay — order summary + payment method picker
//
// 🚧 SCAFFOLD COMMIT 1 — only the shell, indicator, nav, and step
//    placeholders. Each step's UI lands in its own commit (2-6) with
//    full validation + i18n. Logic ports (Firestore booking creation,
//    time conflict checks, moderation) come in commit 6.
//
// Architecture notes:
//   • Step state is local — keeps URL stable at /booking, allows back-
//     button navigation between steps without page reload.
//   • Form state lives in `formState` — typed, immutable updates per step.
//   • Therapist preselection: if /booking/:therapistId, we pre-pick that
//     therapist and skip nothing (user can still change service freely).
//   • Validation is per-step — `canAdvance` derived from formState shape.
//
// 🔌 Wiring (deferred to commit 6):
//   • runTransaction(db) booking creation pattern from old BookingPage
//   • calculateTherapistStatus availability check
//   • isInappropriate() profanity gate

import React, { useState, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { toast } from "react-toastify";
import dayjs from "dayjs";

import StepIndicator from "@/components/booking/StepIndicator";
import BookingNavBar from "@/components/booking/BookingNavBar";
import StepService from "@/components/booking/StepService";
import StepDateTime from "@/components/booking/StepDateTime";
import StepLocation from "@/components/booking/StepLocation";
import StepDetails from "@/components/booking/StepDetails";
import StepConfirm from "@/components/booking/StepConfirm";
import { isValidPhoneNumber } from "react-phone-number-input";

import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { isInappropriate } from "@/utils/moderate";
import { estimateTaxiFare } from "@/utils/taxiFare";
import { priceForDuration } from "@/utils/servicePricing";
import services from "@/data/services";
import therapistsData from "@/data/therapists";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// ── Form state — single source of truth across steps
export interface BookingFormState {
  // Step 1 — Service
  serviceId: string | null;
  duration: number | null; // minutes
  // Step 2 — DateTime
  date: string | null; // YYYY-MM-DD
  time: string | null; // HH:mm
  // Step 3 — Location
  locationName: string | null;
  locationAddress: string | null;
  lat: number | null;
  lng: number | null;
  /**
   * Free-text refinement on top of the picked location — room number,
   * floor, building, side entrance, gate code, etc. Independent from
   * `locationAddress` (which holds the canonical address from the picked
   * place). Surfaces in the booking confirmation + therapist's en-route view.
   */
  addressDetails: string;
  // Step 4 — Details
  customerName: string;
  customerPhone: string;
  notes: string;
  // Step 5 — Payment
  paymentMethod: "card" | "wechat" | "alipay" | "promptpay" | "cash" | null;
  // Therapist context (preselected from /booking/:therapistId)
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
  customerName: "",
  customerPhone: "",
  notes: "",
  paymentMethod: null,
  therapistId: null,
};

const TOTAL_STEPS = 5;

const BookingFlowPage: React.FC = () => {
  const { id: therapistId } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [form, setForm] = useState<BookingFormState>({
    ...initialFormState,
    therapistId: therapistId ?? null,
  });

  // Per-step validation — drives BookingNavBar `disabled` state.
  const canAdvance = useMemo(() => {
    switch (step) {
      case 1:
        return !!form.serviceId;
      case 2:
        return !!form.date && !!form.time;
      case 3:
        return !!form.lat && !!form.lng;
      case 4:
        return (
          form.customerName.trim().length >= 2 &&
          form.customerPhone.trim().length >= 8 &&
          isValidPhoneNumber(form.customerPhone)
        );
      case 5:
        return !!form.paymentMethod;
      default:
        return false;
    }
  }, [step, form]);

  const ctaLabel = useMemo(() => {
    if (step === TOTAL_STEPS) {
      return t("booking.cta.confirmAndPay", "Confirm & Pay");
    }
    return t("booking.cta.continue", "Continue");
  }, [step, t]);

  const stepTitle = useMemo(() => {
    const titles = [
      t("booking.step.service", "Choose your service"),
      t("booking.step.dateTime", "When works for you?"),
      t("booking.step.location", "Where should we go?"),
      t("booking.step.details", "Your details"),
      t("booking.step.confirm", "Review & pay"),
    ];
    return titles[step - 1];
  }, [step, t]);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Profanity moderation on notes (server-side OpenAI Moderation).
      // Fail-open via isInappropriate's catch — only block when explicitly
      // flagged.
      if (form.notes && (await isInappropriate(form.notes))) {
        toast.error(t(
          "booking.error.inappropriateNotes",
          "Notes contain inappropriate content. Please revise."
        ));
        setSubmitting(false);
        return;
      }

      const service = services.find((s) => s.id === form.serviceId);
      const therapist = therapistsData.find(
        (tt) => tt.id === form.therapistId
      );
      if (!service || !form.date || !form.time) {
        toast.error("Missing booking details");
        setSubmitting(false);
        return;
      }

      // Compose start/end timestamps. For overnight shifts, slot times
      // before the therapist's startTime are assumed to be next-day —
      // we add 1 day in that case so startAt sorts correctly.
      let startDate = dayjs(`${form.date}T${form.time}`);
      if (therapist) {
        const startMin = parseInt(therapist.startTime.split(":")[0]) * 60 +
          parseInt(therapist.startTime.split(":")[1]);
        const endMin = parseInt(therapist.endTime.split(":")[0]) * 60 +
          parseInt(therapist.endTime.split(":")[1]);
        const slotMin = startDate.hour() * 60 + startDate.minute();
        if (endMin <= startMin && slotMin < startMin) {
          // overnight + slot looks early-morning → it's actually next day
          startDate = startDate.add(1, "day");
        }
      }
      const endDate = startDate.add(form.duration ?? service.duration, "minute");

      // 🚖 Taxi fare (round-trip from therapist's home → customer location)
      const { distanceKm, fare: taxiFee } = estimateTaxiFare({
        therapistLat: therapist?.lat,
        therapistLng: therapist?.lng,
        customerLat: form.lat,
        customerLng: form.lng,
        durationMin: form.duration ?? service.duration,
      });
      // Service price scales with chosen duration (60/90/120 multipliers).
      const servicePrice = priceForDuration(
        service,
        form.duration ?? service.duration
      );
      const totalPrice = servicePrice + taxiFee;

      const ref = await addDoc(collection(db, "bookings"), {
        userId: user?.uid ?? null,
        therapistId: form.therapistId,
        therapistName: therapist?.name ?? null,
        serviceId: service.id,
        serviceName: service.name,
        servicePrice,
        basePrice: service.price, // canonical 60-min price for analytics
        duration: form.duration ?? service.duration,
        date: form.date,
        time: form.time,
        startAt: Timestamp.fromDate(startDate.toDate()),
        endAt: Timestamp.fromDate(endDate.toDate()),
        locationName: form.locationName,
        address: form.locationAddress,
        addressDetails: form.addressDetails,
        location:
          form.lat != null && form.lng != null
            ? { lat: form.lat, lng: form.lng }
            : null,
        customerName: form.customerName,
        phone: form.customerPhone,
        note: form.notes,
        payment: form.paymentMethod,
        taxiFee,
        distanceKm,
        totalPrice,
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

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      void handleSubmit();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      void navigate(-1);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FFF8F0 0%, #FCEBDC 100%)",
        paddingBottom: "120px", // room for sticky BookingNavBar
        fontFamily: SANS,
      }}
    >
      {/* Top bar — step indicator + title */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "rgba(255, 248, 240, 0.85)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid rgba(0, 0, 0, 0.06)",
        }}
      >
        <StepIndicator current={step} total={TOTAL_STEPS} />
        <Box sx={{ padding: "4px 20px 14px" }}>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "11px",
              fontWeight: 600,
              color: "rgba(60, 30, 20, 0.55)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {t("booking.stepCount", "Step {{current}} of {{total}}", {
              current: step,
              total: TOTAL_STEPS,
            })}
          </Typography>
          <Typography
            component="h1"
            sx={{
              fontFamily: SERIF,
              fontSize: "26px",
              fontWeight: 500,
              letterSpacing: "-0.02em",
              color: "#3c1e14",
              marginTop: "2px",
            }}
          >
            {stepTitle}
          </Typography>
        </Box>
      </Box>

      {/* Step content — components land step-by-step across commits 2-6 */}
      <Box sx={{ padding: "20px 16px" }}>
        {step === 1 && (
          <StepService
            value={form.serviceId}
            selectedDuration={form.duration}
            therapistId={form.therapistId}
            onChange={(serviceId, duration) =>
              setForm((prev) => ({ ...prev, serviceId, duration }))
            }
          />
        )}

        {step === 2 && (
          <StepDateTime
            date={form.date}
            time={form.time}
            durationMin={form.duration}
            therapistId={form.therapistId}
            onChange={({ date, time }) =>
              setForm((prev) => ({ ...prev, date, time }))
            }
          />
        )}

        {step === 3 && (
          <StepLocation
            locationName={form.locationName}
            locationAddress={form.locationAddress}
            lat={form.lat}
            lng={form.lng}
            addressDetails={form.addressDetails}
            onChange={(next) =>
              setForm((prev) => ({ ...prev, ...next }))
            }
            onChangeAddressDetails={(addressDetails) =>
              setForm((prev) => ({ ...prev, addressDetails }))
            }
          />
        )}

        {step === 4 && (
          <StepDetails
            customerName={form.customerName}
            customerPhone={form.customerPhone}
            notes={form.notes}
            onChange={(next) =>
              setForm((prev) => ({ ...prev, ...next }))
            }
          />
        )}

        {step === 5 && (
          <StepConfirm
            form={form}
            onChangePayment={(paymentMethod) =>
              setForm((prev) => ({ ...prev, paymentMethod }))
            }
          />
        )}
      </Box>

      {/* Sticky bottom nav */}
      <BookingNavBar
        ctaLabel={ctaLabel}
        onNext={handleNext}
        onBack={handleBack}
        disabled={!canAdvance || submitting}
        loading={submitting}
      />
    </Box>
  );
};

export default BookingFlowPage;
