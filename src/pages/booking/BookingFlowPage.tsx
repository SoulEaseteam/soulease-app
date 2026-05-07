
import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  Button,
  TextField,
  InputAdornment,
  Fade,
} from "@mui/material";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import {
  useNavigate,
  useParams,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  addDoc,
  collection,
  Timestamp,
  serverTimestamp,
} from "firebase/firestore";
import { toast } from "react-toastify";
import dayjs from "dayjs";
// 🆕 Round 28an — BKK-anchored time helpers.
// 🆕 Round 28b15 — `prettyHHMM` for 24h + AM/PM display.
import { fmtBKK, sameDayBKK, nowBKK, prettyHHMM } from "@/utils/time";
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
// 🆕 Round 28b8 — CheckCircleRoundedIcon retired with the
//   "Within free distance" chip when GrabCar pricing replaced the
//   0-4km subsidy.
import SavingsRoundedIcon from "@mui/icons-material/SavingsRounded";
import UmbrellaRoundedIcon from "@mui/icons-material/UmbrellaRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";

// 🆕 Round 8 (founder 2026-05-01): PreferencesSheet + SelectionCell +
//    inline Notes textarea all dropped from this page. Confirm Order is
//    now strictly: Therapist → Address → Pricing → Confirm. Special
//    requests go via admin chat.
// PaymentMethod / PaymentPicker dropped 2026-05-01 (founder feedback).
import type { AddressNavState } from "@/pages/booking/SelectLocationPage";
// 🆕 Round 14 (founder 2026-05-01): Payment detail tile + Payment Methods page.
import {
  readSelectedPaymentMethod,
  PAYMENT_LABELS,
  type PaymentMethodId,
} from "@/pages/booking/PaymentMethodsPage";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import PaymentRoundedIcon from "@mui/icons-material/PaymentRounded";

import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { isInappropriate } from "@/utils/moderate";
import { sendBookingNotification } from "@/utils/telegram";
// 🆕 Round 28b21 — Phase 4 of conversion plan: cart abandonment tracker.
//   Records partial bookings to Firestore the moment the customer has
//   given us a phone number, so we can chase the lead if they bail.
import {
  useAbandonedCartTracker,
  markCartConfirmed,
} from "@/hooks/useAbandonedCartTracker";
import {
  estimateTaxiFare,
  calcTaxiFare,
  ADMIN_QUOTE_KM,
} from "@/utils/taxiFare";
// 🆕 Round 28b35 — Live therapist Holiday/override gate.
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";
import { useTherapistLiveStatus } from "@/hooks/useTherapistLiveStatus";
// 🆕 Round 28b49 — derive activeBooking + busyUntil from live bookings
//   collection so cancelled bookings auto-clear without a Cloud Function.
import {
  useTherapistBookings,
  findActiveBooking,
} from "@/utils/useTherapistBookings";
// 🆕 Round 28b25/28b32 — Google Distance Matrix API for real road
//   distance + traffic-aware ETA. Falls back to time-of-day speed
//   estimates (BKK rush vs off-peak) when API is offline.
import {
  fetchDrivingDistance,
  estimateEtaMin,
  type RouteResult,
} from "@/utils/directionsApi";
import { useGoogleMaps } from "@/context/GoogleMapsContext";
import {
  getCachedRainStatus,
  getRainStatus,
  type RainStatus,
} from "@/utils/weather";
import { priceForDuration, formatTHB } from "@/utils/servicePricing";
import { bayesianRatingFromAggregate, formatRating } from "@/utils/rating";
import services from "@/data/services";
import therapistsData from "@/data/therapists";
// 🆕 Round 28b7 — Cloudinary helper for the rounded therapist photo.
import { enhanceImage } from "@/utils/cloudinary";
import { ADDONS, type AddOn } from "@/data/bookingExtras";
// 🆕 Round 28r10 (founder 2026-05-06) — File-split refactor.
//   Extracted helpers + subcomponents to keep BookingFlowPage focused
//   on the booking orchestration logic. Each piece now lives in its
//   own file so finding/editing them isn't an exercise in scrolling
//   2,000+ lines.
import useTweenedNumber from "@/hooks/useTweenedNumber";
import {
  type BookingFormState,
  initialFormState,
  readPersistedForm,
  writePersistedForm,
  clearPersistedForm,
} from "@/utils/bookingFormStorage";
import SectionCard from "@/components/booking/SectionCard";
import FareChip from "@/components/booking/FareChip";
import PriceRow from "@/components/booking/PriceRow";
import AddressTile from "@/components/booking/AddressTile";
import ConfirmBar from "@/components/booking/ConfirmBar";
// 🆕 Round 28r13 — Funnel analytics: booking_start (page open) +
//   booking_complete (addDoc success).
import {
  trackBookingStart,
  trackBookingComplete,
} from "@/utils/analytics";
// 🆕 Round 28r14 — Discount validator (FIRST10 + SUN-XXXX referral).
//   Pure function; client-side validation only. Admin still
//   confirms / overrides via Telegram before payment.
import { validateDiscount, getInitialDiscountCode } from "@/utils/discount";
// 🆕 Round 28r18 — Persist booking-flow errors so admin can triage
//   "tried to reserve online but doesn't work" complaints without
//   needing repro steps from the customer.
import { logBookingError } from "@/utils/bookingError";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// 🆕 Round 28r10 (founder 2026-05-06) — File-split refactor.
//   - useTweenedNumber → @/hooks/useTweenedNumber
//   - BookingFormState + initialFormState + persisted-form helpers
//     → @/utils/bookingFormStorage
//   - SectionCard / FareChip / PriceRow / AddressTile / ConfirmBar
//     → @/components/booking/*
//   ~480 lines moved out of this file. The orchestration logic
//   (state, derived prices, submit handler) stays here.

const BookingFlowPage: React.FC = () => {
  const { id: therapistId } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const routerLoc = useLocation();
  const { t } = useTranslation();
  // 🆕 Round 28r24 (founder 2026-05-07) — Admin override mode.
  //   Founder direction "แอดมินจองหน้าเว็บได้อิสละ": when an admin
  //   is signed in and books on behalf of a customer through the
  //   regular customer flow, we bypass the guards meant to protect
  //   guests from over-eager booking:
  //     • therapist availability gate (admin can override holiday /
  //       statusOverride / busyUntil)
  //     • 10-minute hold (admin booking is already confirmed at
  //       source; the hold-release timer would just confuse them)
  //     • working-hours window check (admin can schedule outside
  //       working hours when the practitioner has agreed offline)
  //     • inappropriate-notes filter (admin trust)
  //   Customer-facing fields (price, location, etc.) still validate
  //   normally so the booking record stays clean.
  const { user, role } = useAuth();
  const isAdminBooking = role === "admin";

  // ── Pre-fill from URL params (DetailPage StickyBookCTA forwards these)
  const preService = searchParams.get("service");
  const preDuration = searchParams.get("duration");
  const preDate = searchParams.get("date");
  const preTime = searchParams.get("time");

  const [submitting, setSubmitting] = useState(false);

  // 🆕 Round 28r13 — Fire booking_start once per therapist mount.
  useEffect(() => {
    trackBookingStart(therapistId ?? null);
  }, [therapistId]);

  const [paymentMethod, setPaymentMethod] =
    useState<PaymentMethodId>(readSelectedPaymentMethod);
  useEffect(() => {
    const handler = () => setPaymentMethod(readSelectedPaymentMethod());
    window.addEventListener("focus", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("focus", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);


  const [form, setForm] = useState<BookingFormState>(() => {
    const persisted = readPersistedForm(therapistId);
    // 🆕 Round 28r14 — Auto-fill discount code from URL referral
    //   (?ref=SUN-XXXX captured on home-page mount). Only when the
    //   persisted form doesn't already carry a code — guest's
    //   manual entry always wins over auto-fill.
    const autoCode = persisted?.discountCode ?? getInitialDiscountCode() ?? "";
    return {
      ...initialFormState,
      ...(persisted ?? {}),
      therapistId: therapistId ?? null,
      serviceId: preService ?? persisted?.serviceId ?? null,
      duration:
        preDuration != null
          ? parseInt(preDuration, 10)
          : persisted?.duration ?? null,
      date: preDate ?? persisted?.date ?? null,
      time: preTime ?? persisted?.time ?? null,
      discountCode: autoCode,
    };
  });

  // Persist on every form change so a back-nav from /payment-methods
  // survives. Skipped during SSR (typeof window check inside helper).
  useEffect(() => {
    writePersistedForm(therapistId, form);
  }, [form, therapistId]);

  // 🌧 Warm the rain-status cache on mount — surcharge surfaces in the
  //    pricing card without an extra round-trip when location is set.
  //
  // 🆕 Round 28r33 (founder 2026-05-07) — rain status is now reactive.
  //    Previously this useEffect did `void getRainStatus()` (fire-and-
  //    forget) which populated the localStorage cache but didn't
  //    re-render the pricing card. So even if Bangkok was actively
  //    raining, the taxi useMemo (which reads `getCachedRainStatus()`
  //    SYNCHRONOUSLY inside calcTaxiFare) would compute on first paint
  //    with an empty cache → "Clear" → no surcharge ever shown.
  //    Founder spotted this on a rainy night with the surcharge
  //    silently absent. Fix: hold rain in state, await the fetch,
  //    setState on resolve, and pass the value through to calcTaxiFare
  //    via the new `rainOverride` parameter.
  const [rainStatus, setRainStatus] = useState<RainStatus>(() =>
    getCachedRainStatus()
  );
  useEffect(() => {
    let cancelled = false;
    getRainStatus().then((status) => {
      if (!cancelled) setRainStatus(status);
    });
    return () => {
      cancelled = true;
    };
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
  // 🆕 Round 28b35 — Live Firestore status overlay. Without this, the
  //   submit guard below would let a customer book a therapist whom
  //   admin had marked Holiday (since static data has no isHoliday).
  const therapistLive = useTherapistLiveStatus(form.therapistId);
  // 🆕 Round 28b49 (founder 2026-05-05) — Live bookings collection.
  //   Used to derive activeBooking + busyUntil so admin's cancellation
  //   self-heals without needing a Cloud Function. See TherapistDetailPage
  //   for the same logic; both pages must agree to avoid the engine
  //   reporting "Currently Busy" when bookings/{id}.status === "cancelled".
  const therapistLiveBookings = useTherapistBookings(form.therapistId);
  const therapistActiveBooking = findActiveBooking(therapistLiveBookings);
  const therapistMerged = therapist
    ? {
        ...therapist,
        ...(therapistLive.exists
          ? {
              isHoliday: therapistLive.isHoliday ?? therapist.isHoliday,
              statusOverride:
                therapistLive.statusOverride ?? therapist.statusOverride,
              startTime: therapistLive.startTime ?? therapist.startTime,
              endTime: therapistLive.endTime ?? therapist.endTime,
            }
          : {}),
        // Always derived from live bookings — ignores any stale persisted
        // value on therapists/{id} that admin's cancel button never clears.
        activeBooking: !!therapistActiveBooking,
        busyUntil: therapistActiveBooking?.endAt ?? null,
      }
    : null;
  const therapistEngineStatus = therapistMerged
    ? calculateTherapistStatus(therapistMerged).status
    : "resting";
  const therapistIsBookable = therapistEngineStatus !== "resting";
  const service = useMemo(
    () => services.find((s) => s.id === form.serviceId) ?? null,
    [form.serviceId]
  );
  const selectedAddons = useMemo<AddOn[]>(
    () => ADDONS.filter((a) => form.selectedAddons.includes(a.id)),
    [form.selectedAddons]
  );
 
  const cartSnapshot = useMemo(
    () =>
      form.therapistId
        ? {
            therapistId: form.therapistId,
            therapistName: therapist?.name ?? null,
            serviceName: service?.name ?? null,
            serviceId: service?.id ?? null,
            duration: form.duration,
            date: form.date,
            time: form.time,
            contactName: form.contactName,
            phone: form.customerPhone,
            language: form.language,
            locationName: form.locationName,
          }
        : null,
    [
      form.therapistId,
      therapist?.name,
      service?.name,
      service?.id,
      form.duration,
      form.date,
      form.time,
      form.contactName,
      form.customerPhone,
      form.language,
      form.locationName,
    ]
  );
  useAbandonedCartTracker(cartSnapshot);

  // ── Pricing
  const servicePrice =
    service && form.duration
      ? priceForDuration(service, form.duration)
      : service?.price ?? 0;
  const addonsTotal = selectedAddons.reduce((sum, a) => sum + a.price, 0);


  const [travelTipOpen, setTravelTipOpen] = useState<boolean>(false);
  const [travelTipShown, setTravelTipShown] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.sessionStorage.getItem("sunred_travelTipShown") === "1";
  });
  useEffect(() => {
    if (travelTipShown) return;
    // Don't auto-pop on reduced-motion devices — feels jarring without fade.
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      window.sessionStorage.setItem("sunred_travelTipShown", "1");
      setTravelTipShown(true);
      return;
    }
    const showTimer = window.setTimeout(() => setTravelTipOpen(true), 600);
    const hideTimer = window.setTimeout(() => {
      setTravelTipOpen(false);
      window.sessionStorage.setItem("sunred_travelTipShown", "1");
      setTravelTipShown(true);
    }, 4100); // 600ms delay + ~3.5s visible
    return () => {
      window.clearTimeout(showTimer);
      window.clearTimeout(hideTimer);
    };
  }, [travelTipShown]);

  const locationSet = form.lat != null && form.lng != null;

  
  const { ready: mapsReady, loadIfNeeded: loadMaps } = useGoogleMaps();
  useEffect(() => {
    // Trigger Maps SDK load when we have coords + need a route. The
    // GoogleMapsContext is idempotent (loads exactly once per session).
    if (locationSet && therapist?.lat && therapist.lng && !mapsReady) {
      loadMaps();
    }
  }, [locationSet, therapist?.lat, therapist?.lng, mapsReady, loadMaps]);

  const [route, setRoute] = useState<RouteResult | null>(null);
  useEffect(() => {
    if (!locationSet) {
      setRoute(null);
      return;
    }
    if (!therapist?.lat || !therapist.lng) return;
    if (!mapsReady) return; // wait for SDK
    let cancelled = false;
    void (async () => {
      try {
        const r = await fetchDrivingDistance(
          { lat: therapist.lat!, lng: therapist.lng! },
          { lat: form.lat!, lng: form.lng! }
        );
        if (!cancelled) setRoute(r);
      } catch {
        // fetchDrivingDistance already falls back to haversine internally
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locationSet, mapsReady, therapist?.lat, therapist?.lng, form.lat, form.lng]);

  // Build the taxi result. If the real route has resolved, use that
  // distance. Otherwise we render with the haversine quick estimate
  // so the page never flickers an empty fare line.
  const taxi = useMemo(() => {
    if (!locationSet) return { distanceKm: 0, fare: 0, result: undefined };
    if (route) {
      // 🆕 Round 28r33 — pass rainStatus so a fetched-mid-session
      //   surcharge actually surfaces.
      const result = calcTaxiFare(route.kmRoad, rainStatus);
      return {
        distanceKm: route.kmRoad,
        fare: result.fare ?? 0,
        result,
      };
    }
    return estimateTaxiFare(
      {
        therapistLat: therapist?.lat,
        therapistLng: therapist?.lng,
        customerLat: form.lat,
        customerLng: form.lng,
        durationMin: form.duration ?? service?.duration ?? 60,
      },
      rainStatus
    );
  }, [
    locationSet,
    route,
    therapist?.lat,
    therapist?.lng,
    form.lat,
    form.lng,
    form.duration,
    service?.duration,
    // 🆕 Round 28r33 — recompute when weather state changes.
    rainStatus,
  ]);
  const distanceKm = taxi.distanceKm;
  const taxiFare = taxi.fare;
  const taxiResult = taxi.result;
  const adminQuoteRequired = taxiResult?.tier === "admin";
  /** True while Directions API hasn't resolved yet — shows "≈" + spinner hint. */
  const distanceIsEstimate = !route && locationSet;

  // 🆕 Round 10 (founder 2026-05-01): Distance + ETA line on Confirm
  //    Order. ETA = travel time from distance + a prep buffer
  //    (staff getting ready + calling taxi). Average urban Bangkok /
  //    Grab speed: 35 km/h (mix of city + sois). Tune AVG_SPEED_KMH /
  //    STAFF_PREP_MIN if real-world ETAs drift from observed values.
  // 🆕 Round 28b24 (founder 2026-05-04) — Rainy weather pushes the
  //    prep buffer from 15 → 20 min because (a) drivers take longer
  //    to accept rides in rain, (b) traffic slows. We read the same
  //    cached rain status the fare surcharge uses, so the two
  //    surcharges (price + ETA) are always in sync.
  const STAFF_PREP_MIN_DRY = 15;
  const STAFF_PREP_MIN_RAIN = 20;
  const isRaining =
    taxiResult?.rain && taxiResult.rain.tier !== "none";
  const staffPrepMin = isRaining ? STAFF_PREP_MIN_RAIN : STAFF_PREP_MIN_DRY;
  // 🆕 Round 28b32 (founder 2026-05-04) — Real-traffic-aware ETA.
  //   Priority order:
  //     1. `route.durationMin` from Google Distance Matrix with
  //        `departureTime: now` → already includes live BKK traffic.
  //     2. `estimateEtaMin(km)` — time-of-day fallback:
  //          07:00–10:59 → 18 km/h
  //          17:00–20:59 → 16 km/h
  //          else        → 25 km/h
  //        Floors at 3 min so we never claim sub-minute deliveries.
  //   Replaces the old constant `AVG_SPEED_KMH = 35` which over-
  //   estimated speed during Bangkok rush hours.
  const drivingMin = route?.durationMin
    ? route.durationMin
    : distanceKm > 0
    ? estimateEtaMin(distanceKm)
    : 0;
  const etaMinutes = drivingMin > 0 ? Math.round(drivingMin + staffPrepMin) : 0;

  // 🆕 Round 28r14 — Pre-discount subtotal first; discount validates
  //   against THIS, then total subtracts it. Order matters because
  //   FIRST10's 10% cap is computed against the subtotal (not the
  //   raw service price), so add-ons + travel get included in the
  //   percentage base — fairer for guests who picked add-ons.
  // 🆕 Round 28r20 — Pass bookingHourBKK so time-restricted codes
  //   (TONIGHT500) can validate against the actual booking start
  //   time (BKK timezone), not the user's current local time.
  // 🆕 Round 28r27 — Discount applies to (service + addons) only,
  //   taxi pass-through. Round 28r28 — FREETAXI is the exception:
  //   it subtracts from taxi instead (premium-tier waiver).
  const discountableBase = servicePrice + addonsTotal;
  const subtotal = discountableBase + taxiFare;
  const bookingHourBKK = form.time
    ? parseInt(form.time.split(":")[0], 10)
    : undefined;
  const discount = validateDiscount(form.discountCode, discountableBase, {
    bookingHourBKK,
    serviceId: form.serviceId,
    // 🆕 Round 28r28 — FREETAXI needs the taxi fare to compute its
    //   discount amount. Other codes ignore it.
    taxiFareTHB: taxiFare,
  });
  const discountAmount = discount.valid ? discount.amount : 0;
  // 🆕 Round 28r28 — Total calc branches on FREETAXI vs others:
  //   FREETAXI: total = service + addons + (taxi - discount=taxi) = service + addons
  //   Other codes: total = (service + addons - discount) + taxi
  const isFreeTaxi = discount.valid && discount.code === "FREETAXI";
  const calculatedTotal = isFreeTaxi
    ? discountableBase
    : Math.max(
        taxiFare,
        discountableBase - discountAmount + taxiFare
      );

  // 🆕 Round 28r25 (founder 2026-05-07) — Owner price override.
  //   Founder direction "ทำทุกอย่างได้ เพราะเป็นเจ้าของ" — when
  //   admin is booking, they can type a custom final total that
  //   replaces the calculated price entirely. Useful for: VIP
  //   comp, complaint refund, one-time deals not covered by
  //   discount codes, partial-pay arrangements. Empty string =
  //   use the calculated total normally.
  const [adminOverrideRaw, setAdminOverrideRaw] = useState("");
  const adminOverrideTotal =
    isAdminBooking && adminOverrideRaw.trim() !== ""
      ? Math.max(0, parseInt(adminOverrideRaw.replace(/[^0-9]/g, ""), 10) || 0)
      : null;
  const total =
    adminOverrideTotal != null ? adminOverrideTotal : calculatedTotal;

  // 🆕 Round 28b46 (founder 2026-05-05) — Pre-surcharge baseline so we
  //   can render "~~฿1,800~~ ฿2,018" when rain or admin-quote bumps the
  //   total. baseFareBeforeRain comes back from estimateTaxiFare even
  //   when rain.tier === "none" (in which case it equals taxiFare and
  //   the strikethrough silently no-ops).
  const baseTotal =
    servicePrice +
    addonsTotal +
    (taxiResult?.baseFareBeforeRain ?? taxiFare);
  const hasSurcharge = total > baseTotal + 0.5; // guard against rounding noise

  // 🆕 Round 28r29 (founder 2026-05-07) — "Original price" + total
  //   savings for the receipt-style display. Founder direction:
  //   "ใส่ราคาต้นมาด้วยจะได้ดูคุ้ม · เอาส่วนลดเอาประโยชน์มาใส่ด้วย
  //   ให้ลูกค้าเห็นว่ามันคุ้ม". The customer should always see the
  //   un-discounted reference price (service + full-meter taxi)
  //   strikethrough next to the total they actually pay, plus a
  //   summary of every saving they got.
  //
  //   originalPrice = service + addons + un-routed taxi (highest
  //                    price they would have paid without our magic)
  //   savingsRouting = taxi-meter savings (Smart Routing chip)
  //   savingsDiscount = promo / VIP / referral amount
  //   totalSavings = sum (drives the "You saved ฿X" pill)
  //
  // 🆕 Round 28r32 (founder 2026-05-07) — Bug fix: pill was using
  //   `baseFareBeforeRain` (= post-routing fare, only adds rain on top)
  //   so savingsRouting always evaluated to 0 and the pill missed the
  //   ฿44 Smart Routing savings. View saw "−฿100 saved" pill with a
  //   "−฿44" Smart Routing chip floating loose → "ลด 100 เหา ทำให้
  //   จาง ลง". Fix: use `listPriceTravel` (the un-routed standard rate
  //   anchor) for originalPrice, and `sunredPromoDiscount` (already
  //   computed in taxiFare.ts as listPriceTravel − fare) for routing
  //   savings. Now the pill aggregates both savings → "−฿144" with
  //   ฿44 Smart Routing + ฿100 promo broken down underneath.
  const meterTaxi = taxiResult?.listPriceTravel ?? taxiFare;
  const originalPrice = servicePrice + addonsTotal + meterTaxi;
  const savingsRouting = taxiResult?.sunredPromoDiscount ?? 0;
  const savingsDiscount = discount.valid ? discountAmount : 0;
  const totalSavings = savingsRouting + savingsDiscount;
  const hasSavings = totalSavings > 0.5;

  // 🆕 Round 28b46 — Tweened total digits. Smoothly count from previous
  //   total → new total over 380ms with ease-out so the number doesn't
  //   "snap" when distance/rain recomputes. Honors prefers-reduced-motion.
  const animatedTotal = useTweenedNumber(total);
  const animatedBaseTotal = useTweenedNumber(baseTotal);

  // Brief glow when the total changes (CSS class flip).
  const totalChangedKey = useRef(0);
  const lastSeenTotalRef = useRef(total);
  if (lastSeenTotalRef.current !== total) {
    lastSeenTotalRef.current = total;
    totalChangedKey.current += 1;
  }

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
    ? sameDayBKK(form.date, nowBKK())
      ? "Today"
      : sameDayBKK(form.date, nowBKK().add(1, "day"))
      ? "Tomorrow"
      : fmtBKK(form.date, "MMM D")
    : null;

  // ── Submit
  const handleSubmit = async () => {
    if (submitting || !canPlaceOrder) return;
    setSubmitting(true);
    try {
      // 🆕 Round 28b35 (founder 2026-05-04) — Holiday / off-shift /
      //   override-resting gate. The static-data engine call earlier
      //   only knew build-time data; admin's Holiday toggle in
      //   Firestore wasn't visible. Without this guard, customers
      //   could (and did, per founder bug report) book a therapist
      //   marked Holiday, get a "Confirmed" Telegram, and the
      //   therapist had no idea.
      //   We re-check at submit time using the LIVE-overlaid record
      //   so the gate respects whatever admin just toggled. Failing
      //   the check sends the customer back to the therapist detail
      //   page where they'll see the correct "Off duty" pill.
      // 🆕 Round 28r24 — Admin override skips the availability gate.
      //   Founder may need to schedule a therapist who's marked
      //   off-duty / on holiday because they coordinated availability
      //   offline. Customer flow keeps the gate.
      if (!therapistIsBookable && !isAdminBooking) {
        toast.error(
          t(
            "booking.error.therapistUnavailable",
            "This therapist is no longer available. Please choose another."
          )
        );
        setSubmitting(false);
        if (form.therapistId) {
          void navigate(`/therapists/${form.therapistId}`);
        } else {
          void navigate("/");
        }
        return;
      }

      // 🆕 Round 28r24 — Admin notes bypass the moderation filter.
      //   Admin uses notes for internal context ("VIP, hotel security
      //   needs ID at desk", etc.) that may include sensitive words.
      if (form.notes && !isAdminBooking && (await isInappropriate(form.notes))) {
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
        // 🆕 Round 13: discount code (admin verifies + applies after booking)
        discountCode: form.discountCode || null,
        // 🆕 Round 28r14 — Discount apply logic: store the validated
        //   amount + label on the booking doc so historical bookings
        //   stay reconstructable even if the FIRST10 / referral code
        //   schemas change in the future. Subtotal is the
        //   pre-discount baseline; total stays AFTER discount.
        discountAmount: discount.valid ? discountAmount : null,
        discountLabel: discount.valid ? discount.label : null,
        subtotalPrice: subtotal,
        // 🆕 Round 14: customer-selected payment method label (admin still
        // confirms via Telegram, but we capture intent here).
        payment: PAYMENT_LABELS[paymentMethod],
        paymentMethodId: paymentMethod,
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
        // 🆕 Round 16: align with Firestore architecture spec.
        paymentStatus: "unpaid", // → "paid" once admin confirms via Telegram
        // 🆕 Round 28b21 (founder 2026-05-04) — Phase 2: TIME-LIMITED
        //   HOLD. Customer has 10 minutes to contact admin and confirm
        //   their booking before the slot is released back to availability.
        //   `holdExpiresAt` is read by:
        //     • Booking Success page → countdown component
        //     • releaseExpiredHolds Cloud Function (runs every 5 min,
        //       sets holdState="expired" on stale active holds)
        //   `holdState` lifecycle: "active" → "confirmed" (admin) | "expired"
        //   We use server-side dayjs so device clock skew can't extend
        //   the hold artificially. The 10-minute window is configurable
        //   by changing the constant below.
        // 🆕 Round 28r24 — Admin bookings are pre-confirmed, no
        //   countdown. Customer bookings still get the 10-min hold.
        holdState: isAdminBooking ? "confirmed" : "active",
        holdExpiresAt: isAdminBooking
          ? null
          : Timestamp.fromDate(dayjs().add(10, "minute").toDate()),
        holdDurationMin: isAdminBooking ? 0 : 10,
        // 🆕 Round 28r24 — flag the booking as admin-created for
        //   downstream filters (analytics dashboard, admin-only
        //   reports). Customer bookings keep the field undefined.
        createdByAdmin: isAdminBooking ? user?.uid ?? null : null,
        // 🆕 Round 28r25 — Owner price override audit trail. When
        //   admin typed a custom total, store both the calculated
        //   and the override so the booking history can show
        //   "Owner-priced ฿X (calc was ฿Y)" forever.
        adminOverrideTotal: adminOverrideTotal,
        calculatedTotal: calculatedTotal,
        // 🆕 Round 28r29 — Save the "original price" + total savings
        //   so the receipt-style success page can render the same
        //   "you saved ฿X" message without recomputing from scratch.
        originalPrice: Math.round(originalPrice),
        savingsTotal: Math.round(totalSavings),
        savingsRouting: Math.round(savingsRouting),
        savingsDiscount: Math.round(savingsDiscount),
        yearMonth: dayjs(startDate.toDate()).format("YYYY-MM"), // analytics
        createdAt: serverTimestamp(), // server clock — gracefully handles user device clock skew
      });

      // 🆕 Round 16: write an in-app notification for the customer so the
      //    /notifications screen has something to show. Fail-open (admin
      //    flow is unaffected if this write errors out).
      try {
        if (user?.uid) {
          await addDoc(collection(db, "notifications"), {
            userId: user.uid,
            type: "bookingConfirmed",
            title: "Booking confirmed",
            content: `Your session with ${therapist.name} is set for ${
              form.date ?? "—"
            } at ${form.time ?? "—"}.`,
            link: `/booking/success/${ref.id}`,
            read: false,
            priority: "normal",
            createdAt: serverTimestamp(),
          });
        }
      } catch (notifErr) {
        console.warn("[booking] in-app notification write failed:", notifErr);
      }

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
        note: form.addressNote || form.notes, // prefer address note
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
        // 🆕 Round 13: extra fields for the new Telegram template
        discountCode: form.discountCode || null,
        // 🆕 Round 28r14 — Send the validated discount amount alongside
        //   the code so admin sees exactly what was applied (no
        //   ambiguity if the code is FIRST10 vs SUN-XXX). Stored as
        //   integer THB; null when no valid discount.
        discountAmount: discount.valid ? discountAmount : null,
        discountLabel: discount.valid ? discount.label : null,
        subtotalPrice: subtotal,
        // 🆕 Round 14: send chosen payment method label to Telegram so
        //    admin sees what the customer selected (e.g. "PromptPay").
        payment: PAYMENT_LABELS[paymentMethod],
      });

      // 🆕 Round 28b7 — booking confirmed → clear the persisted WIP
      //   form so the next visit to this therapist starts clean.
      clearPersistedForm(therapistId);
      // 🆕 Round 28b21 — Phase 4: silence the abandoned-cart recovery
      //   scheduler for this customer. Fail-open if the write errors.
      if (form.therapistId) {
        void markCartConfirmed(form.therapistId).catch(() => {});
      }
      // 🆕 Round 28r13 — Funnel analytics: full-conversion event.
      //   Captures serviceId + duration + final total so we can
      //   compute conversion-by-service and average-order-value
      //   without touching booking docs (analytics_events stays
      //   PII-clean).
      trackBookingComplete(
        service.id,
        form.duration ?? service.duration,
        Math.round(total)
      );
      void navigate(`/booking/success/${ref.id}`);
    } catch (err) {
      // 🆕 Round 28r18 — Persist the error so admin can triage from
      //   /admin/analytics-style queries instead of asking "what
      //   happened?" via chat. Includes form context (no PII beyond
      //   the booking doc fields). Falls through to the existing
      //   user-facing toast — guests see the same retry message.
      logBookingError(err, {
        step: "addDoc_or_notify",
        therapistId: form.therapistId,
        serviceId: form.serviceId,
        duration: form.duration,
        date: form.date,
        time: form.time,
        locationName: form.locationName,
        address: form.locationAddress,
        paymentMethod: PAYMENT_LABELS[paymentMethod],
      });
      toast.error(
        t(
          "booking.error.submitFailed",
          "Could not create booking. Tap Concierge button below or try again."
        )
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
        background: "linear-gradient(180deg, #FAFBFC 0%, #F1F3F5 100%)",
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

        {/* 🆕 Round 28r24 (founder 2026-05-07) — Admin override banner.
            Shows ONLY when an admin is booking through the customer
            flow. Confirms which guards have been bypassed so admin
            doesn't expect the 10-min-hold countdown to appear later. */}
        {isAdminBooking && (
          <Box
            sx={{
              mb: 1.5,
              p: "10px 12px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, rgba(254, 9, 68, 0.10), rgba(254, 122, 82, 0.06))",
              border: "1px solid rgba(254, 9, 68, 0.28)",
              display: "flex",
              alignItems: "flex-start",
              gap: "10px",
            }}
          >
            <Box
              aria-hidden
              sx={{
                width: 22,
                height: 22,
                borderRadius: "50%",
                background: "#FE0944",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              ✓
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: 9.5,
                  fontWeight: 800,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "#9F0731",
                  lineHeight: 1,
                }}
              >
                Admin booking · Free schedule
              </Box>
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: 11.5,
                  color: "rgba(60, 30, 20, 0.7)",
                  marginTop: "3px",
                  lineHeight: 1.35,
                }}
              >
                Holiday / off-duty / working-hours / 10-min-hold all
                bypassed. Auto-confirmed on submit.
              </Box>
            </Box>
          </Box>
        )}

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
            {/* 🆕 Round 28b7 — Confirm Order therapist photo:
                circular brown disc → rounded-square thumbnail with
                actual photo. enhanceImage(card) sized for 56px.
                Falls back to brand red→coral gradient when image
                missing (matches HomeMapBrowse fallback). */}
            <Box
              sx={{
                width: 56,
                height: 56,
                flexShrink: 0,
                borderRadius: "12px",
                background: therapist?.image
                  ? `center / cover no-repeat url("${enhanceImage(
                      therapist.image,
                      { variant: "card" }
                    )}"), linear-gradient(135deg, #FE0944, #FE7A52)`
                  : "linear-gradient(135deg, #FE0944, #FE7A52)",
                border: "1px solid rgba(15, 23, 42, 0.06)",
                boxShadow:
                  "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 10px rgba(15, 23, 42, 0.06)",
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
                  ? `${dateLabel} · ${prettyHHMM(form.time)}`
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
            // 🆕 Round 28b66 (founder 2026-05-05) — Inline icons get
            //   mini color-tinted discs ("ตกแต่งไอคอนให้สวยเหมือน
            //   Payment Methods"). Distance = blue (route), ETA =
            //   mint (time), Travel fee = amber (money). Each disc
            //   is 22×22 rounded-7 — small enough to live inside the
            //   text row without dominating, large enough to read
            //   as a "labelled metric" tile pattern.
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
              }}
            >
              <Box
                component="span"
                sx={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 22,
                    height: 22,
                    flexShrink: 0,
                    borderRadius: "7px",
                    background: "rgba(59, 130, 246, 0.12)",
                    color: "#2563eb",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    "& svg": { fontSize: 14 },
                  }}
                >
                  <PlaceRoundedIcon />
                </Box>
                Distance:&nbsp;
                <Box component="strong" sx={{ color: "#3c1e14" }}>
                  {distanceIsEstimate ? "≈ " : ""}
                  {distanceKm.toFixed(1)} km
                </Box>
                {/* 🆕 Round 28b25 — small "Live route" pill once Google
                    Directions has resolved, so the customer knows the
                    distance is real road km not a straight-line guess. */}
                {route && route.source !== "haversine" && (
                  <Box
                    component="span"
                    sx={{
                      marginLeft: "4px",
                      paddingX: "5px",
                      paddingY: "1px",
                      borderRadius: "999px",
                      background: "rgba(22, 163, 74, 0.10)",
                      color: "#15803d",
                      fontFamily: SANS,
                      fontSize: "9.5px",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      lineHeight: 1.3,
                    }}
                  >
                    Live route
                  </Box>
                )}
              </Box>
              <Box component="span" sx={{ opacity: 0.5 }}>
                •
              </Box>
              <Box
                component="span"
                sx={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Box
                  aria-hidden
                  sx={{
                    width: 22,
                    height: 22,
                    flexShrink: 0,
                    borderRadius: "7px",
                    background: "rgba(20, 184, 166, 0.12)",
                    color: "#14b8a6",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    "& svg": { fontSize: 14 },
                  }}
                >
                  <AccessTimeRoundedIcon />
                </Box>
                ETA:&nbsp;
                <Box component="strong" sx={{ color: "#3c1e14" }}>
                  {etaMinutes} min
                </Box>
                {/* 🆕 Round 28b24 — small "+5 min rain" hint when the
                    rain surcharge bumped the prep buffer from 15→20 min.
                    Lets the customer know the longer ETA is weather-
                    related, not us being slow. */}
                {isRaining && (
                  <Box
                    component="span"
                    sx={{
                      marginLeft: "4px",
                      paddingX: "5px",
                      paddingY: "1px",
                      borderRadius: "999px",
                      background: "rgba(245, 158, 11, 0.14)",
                      color: "#b45309",
                      fontFamily: SANS,
                      fontSize: "9.5px",
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      lineHeight: 1.3,
                    }}
                  >
                    +5 min · rain
                  </Box>
                )}
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
                  gap: "7px",
                }}
              >
                {/* 🆕 Round 28b66 — Travel fee mini-disc (amber for
                    money/taxi) matching Distance + ETA pattern. */}
                <Box
                  aria-hidden
                  sx={{
                    width: 24,
                    height: 24,
                    flexShrink: 0,
                    borderRadius: "7px",
                    background: "rgba(245, 158, 11, 0.12)",
                    color: "#d97706",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    "& svg": { fontSize: 15 },
                  }}
                >
                  <LocalTaxiRoundedIcon />
                </Box>
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
              {/* 🆕 Round 28b22 — Travel-fee tooltip is now CONTROLLED so
                  it can auto-pop on first mount (see travelTipOpen state).
                  • `open={travelTipOpen}` is the source of truth.
                  • onOpen/onClose still let the user hover/focus the (i)
                    icon to manually toggle it after the auto-pop has
                    finished.
                  • Fade transition is slowed to 700ms exit so the
                    auto-dismiss feels intentional, not abrupt. */}
              <Tooltip
                open={travelTipOpen}
                onOpen={() => setTravelTipOpen(true)}
                onClose={() => setTravelTipOpen(false)}
                TransitionComponent={Fade}
                TransitionProps={{ timeout: { enter: 350, exit: 700 } }}
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
                      Travel Fee · SunRed Smart Routing
                    </Typography>
                    <Typography sx={{ fontFamily: SANS, fontSize: "11.5px", lineHeight: 1.6 }}>
                      ≤ 1 km · <strong>฿45</strong> base fare
                      <br />
                      1–6 km · +฿8/km
                      <br />
                      6–40 km · +฿7/km
                      <br />
                      &gt; {ADMIN_QUOTE_KM} km · +฿10/km · admin quote
                      <br />
                      <Box
                        component="span"
                        sx={{
                          display: "block",
                          marginTop: "6px",
                          fontWeight: 700,
                          color: "#16a34a",
                        }}
                      >
                        Return leg · 40 % off the meter
                      </Box>
                      <Box component="span" sx={{ opacity: 0.85, display: "block" }}>
                        (outbound full + return 60 % · auto-applied)
                      </Box>
                      <Box
                        component="span"
                        sx={{ opacity: 0.85, display: "block", marginTop: "6px" }}
                      >
                        Rain may add 15-30 % surcharge · ETA +5 min.
                      </Box>
                    </Typography>
                  </Box>
                }
                placement="top"
                arrow
              >
                {/* 🆕 Round 28b22 — subtle attention pulse on the (i) icon
                    while the auto-popped tooltip is up. Tells the user
                    "this is the trigger if you want to see it again". */}
                <InfoOutlinedIcon
                  sx={{
                    fontSize: 14,
                    color: travelTipOpen
                      ? "#FE0944"
                      : "rgba(60, 30, 20, 0.5)",
                    cursor: "help",
                    transition: "color 0.3s ease, transform 0.3s ease",
                    transform: travelTipOpen ? "scale(1.15)" : "scale(1)",
                  }}
                />
              </Tooltip>
            </Box>
            {/* 🆕 Round 28b24 (founder 2026-05-04) — Strike-through
                "list price" + actual fare, in the same UX pattern Grab
                uses with their internal promos (struck-out original on
                the right, real price on the left). The list price is
                a SunRed-owned reference (= one-way × 2, the
                "standard rate"), and the chip below explains the
                discount as "SunRed Smart Routing". We no longer compare
                to Grab anywhere — it's all our brand. */}
            <Box sx={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              {locationSet &&
                !adminQuoteRequired &&
                taxiResult &&
                taxiResult.sunredPromoDiscount > 0 && (
                  <Typography
                    component="span"
                    sx={{
                      fontFamily: SANS,
                      fontSize: "11.5px",
                      fontWeight: 500,
                      color: "rgba(60, 30, 20, 0.42)",
                      textDecoration: "line-through",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatTHB(taxiResult.listPriceTravel)}
                  </Typography>
                )}
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
            {/* 🆕 Round 28b24 (founder 2026-05-04) — Pivoted from
                "Save ฿X vs Grab" → SunRed-OWNED promo branding.
                The dollar amount is identical (still listPrice − fare),
                but the framing is now our own product feature
                ("Smart Routing 20 % off") rather than a competitor
                comparison. Founder's call: "เราไม่เอาโปรแกรป
                เราเอาโปรตัวเอง" — keep the brand on us, not Grab. */}
            {locationSet &&
              taxiResult &&
              taxiResult.sunredPromoDiscount > 0 &&
              !adminQuoteRequired && (
                <FareChip color="green" icon={<SavingsRoundedIcon />}>
                  Smart Routing · {formatTHB(taxiResult.sunredPromoDiscount)} off
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

          {/* 🆕 Founder 2026-05-01 round 13: Discount code input. No
              backend validation yet — admin verifies and applies it
              manually after seeing the booking in Telegram. */}
          <Box sx={{ marginTop: "10px" }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Discount code (optional)"
              value={form.discountCode}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  discountCode: e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9-]/g, ""),
                }))
              }
              inputProps={{ maxLength: 20 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LocalOfferRoundedIcon
                      sx={{ fontSize: 16, color: "#FE0944" }}
                    />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  background: "#fff",
                  borderRadius: "12px",
                  fontFamily: SANS,
                  fontSize: "13.5px",
                  letterSpacing: "0.04em",
                  fontVariantNumeric: "tabular-nums",
                  "& fieldset": { borderColor: "rgba(0, 0, 0, 0.08)" },
                  "&:hover fieldset": {
                    borderColor: "rgba(254, 9, 68, 0.4)",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#FE0944",
                    borderWidth: "1.5px",
                  },
                },
              }}
            />
            {/* 🆕 Round 28r14 — Live validation feedback. Replaces the
                old "we'll apply at confirmation" placeholder note —
                FIRST10 + SUN-XXXX codes now subtract immediately so
                the guest sees the discount at the same time they
                type. Unknown codes show a quiet hint ("not recognised
                — concierge may apply manually") without blocking the
                booking. */}
            {form.discountCode && (
              <Box sx={{ marginTop: "6px", paddingLeft: "8px" }}>
                {discount.valid ? (
                  <Box>
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: "11.5px",
                        fontWeight: 700,
                        color: "#16a34a",
                        display: "flex",
                        alignItems: "center",
                        gap: "5px",
                      }}
                    >
                      <Box component="span" sx={{ fontWeight: 800 }}>
                        ✓
                      </Box>
                      {discount.label} — saves {formatTHB(discount.amount)}
                    </Typography>
                    {/* 🆕 Round 28r27 — Make taxi-pass-through visible
                        so guests don't expect their travel fee to also
                        be discounted. */}
                    {taxiFare > 0 && (
                      <Typography
                        sx={{
                          fontFamily: SANS,
                          fontSize: "10px",
                          color: "rgba(60, 30, 20, 0.55)",
                          marginTop: "2px",
                          fontStyle: "italic",
                        }}
                      >
                        Travel fee ({formatTHB(taxiFare)}) is at cost — not
                        included in promo.
                      </Typography>
                    )}
                  </Box>
                ) : (() => {
                  // 🆕 Round 28r27 — Smart hint: distinguish between
                  //   "code unknown" vs "code blocked for this tier".
                  const isPremiumService =
                    form.serviceId === "SR-HJ2200" ||
                    form.serviceId === "SR-B2B3200";
                  const looksLikeRealCode = /^(FIRST|WELCOME|TONIGHT|SAMMY)/i.test(
                    form.discountCode
                  );
                  if (isPremiumService && looksLikeRealCode) {
                    return (
                      <Typography
                        sx={{
                          fontFamily: SANS,
                          fontSize: "10.5px",
                          color: "#9F0731",
                          fontWeight: 600,
                        }}
                      >
                        Promo codes don't apply to this premium ritual.
                        Use a referral code (SUN-XXXXXX) or chat with
                        the concierge for a custom arrangement.
                      </Typography>
                    );
                  }
                  return (
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: "10.5px",
                        color: "rgba(60, 30, 20, 0.55)",
                        fontStyle: "italic",
                      }}
                    >
                      Code not recognised — the concierge can apply
                      custom codes manually after seeing your booking.
                    </Typography>
                  );
                })()}
              </Box>
            )}
          </Box>

          {/* 🆕 Round 28r14 — Discount row in the price breakdown.
              Only renders when a valid code is applied. Shows the
              code + green amount struck through the subtotal. */}
          {discount.valid && discountAmount > 0 && (
            <Box sx={{ marginTop: "6px" }}>
              <PriceRow
                label={`Discount · ${discount.code}`}
                value={
                  <Box
                    component="span"
                    sx={{ color: "#16a34a", fontWeight: 700 }}
                  >
                    −{formatTHB(discountAmount)}
                  </Box>
                }
              />
            </Box>
          )}

          {/* 🆕 Round 28r29 (founder 2026-05-07) — "You saved" pill.
              Sits ABOVE the Total row so the customer reads the
              positive number first. Renders only when there's a real
              saving (Smart Routing or applied promo). Listing each
              source one-line keeps it scannable. */}
          {hasSavings && (
            <Box
              sx={{
                marginTop: "10px",
                padding: "12px 14px",
                borderRadius: "14px",
                background:
                  "linear-gradient(135deg, rgba(22, 163, 74, 0.16), rgba(22, 163, 74, 0.06))",
                border: "1px solid rgba(22, 163, 74, 0.36)",
                boxShadow:
                  "0 1px 0 rgba(22, 163, 74, 0.12), inset 0 0 0 1px rgba(255,255,255,0.4)",
              }}
            >
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "baseline",
                  fontFamily: SANS,
                }}
              >
                <Box
                  component="span"
                  sx={{
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#15803d",
                  }}
                >
                  ✨ You saved tonight
                </Box>
                {/* 🆕 Round 28r32 — Beefed up the headline number from
                    17px → 22px serif w/ heavy weight + tabular nums.
                    Founder feedback: "ลด 100 เหา ทำให้ จาง ลง" — the
                    saving needs to read as the loudest number on the
                    receipt now that it aggregates Smart Routing + promo. */}
                <Box
                  component="span"
                  sx={{
                    fontFamily: SERIF,
                    fontSize: 22,
                    fontWeight: 800,
                    lineHeight: 1,
                    color: "#16a34a",
                    fontVariantNumeric: "tabular-nums",
                    letterSpacing: "-0.01em",
                  }}
                >
                  −{formatTHB(Math.round(totalSavings))}
                </Box>
              </Box>
              <Box
                sx={{
                  marginTop: "4px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                {savingsRouting > 0 && (
                  <Box
                    component="span"
                    sx={{
                      fontFamily: SANS,
                      fontSize: 11,
                      color: "rgba(20, 83, 45, 0.85)",
                    }}
                  >
                    🚖 Smart Routing — {formatTHB(Math.round(savingsRouting))}
                  </Box>
                )}
                {savingsDiscount > 0 && (
                  <Box
                    component="span"
                    sx={{
                      fontFamily: SANS,
                      fontSize: 11,
                      color: "rgba(20, 83, 45, 0.85)",
                    }}
                  >
                    🏷 {discount.label} — {formatTHB(Math.round(savingsDiscount))}
                  </Box>
                )}
              </Box>
            </Box>
          )}

          <Box
            sx={{
              borderTop: "1px solid rgba(0, 0, 0, 0.08)",
              marginTop: "12px",
              paddingTop: "10px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: "12px",
            }}
          >
            <Typography
              sx={{ fontFamily: SERIF, fontSize: "16px", fontWeight: 600 }}
            >
              Total
            </Typography>
            {/* 🆕 Round 28b46 — Animated total + before/after strikethrough.
                When a surcharge applies (rain / admin quote), we render the
                pre-surcharge price ghosted with a line-through, then the
                live total in brand red. The numbers themselves smoothly
                tween via useTweenedNumber so they don't snap on changes. */}
            <Box
              sx={{
                display: "flex",
                alignItems: "baseline",
                gap: "8px",
                flexWrap: "wrap",
                justifyContent: "flex-end",
              }}
            >
              {hasSurcharge && (
                <Typography
                  aria-hidden
                  sx={{
                    fontFamily: SERIF,
                    fontSize: "16px",
                    fontWeight: 500,
                    color: "rgba(60, 30, 20, 0.42)",
                    textDecoration: "line-through",
                    letterSpacing: "-0.01em",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatTHB(Math.round(animatedBaseTotal))}
                </Typography>
              )}
              {/* 🆕 Round 28r29 — Strikethrough "Original price"
                  next to the Total when there's any saving (Smart
                  Routing or promo). Only renders if the original is
                  meaningfully higher than the total — so we don't
                  show "฿3,433 → ฿3,433" no-op. Hidden when surcharge
                  strike is already showing (would clash visually). */}
              {!hasSurcharge && hasSavings && originalPrice > total + 0.5 && (
                <Typography
                  aria-hidden
                  sx={{
                    fontFamily: SERIF,
                    fontSize: "16px",
                    fontWeight: 500,
                    color: "rgba(60, 30, 20, 0.42)",
                    textDecoration: "line-through",
                    letterSpacing: "-0.01em",
                    lineHeight: 1,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {formatTHB(Math.round(originalPrice))}
                </Typography>
              )}
              <Typography
                key={totalChangedKey.current}
                sx={{
                  fontFamily: SERIF,
                  fontSize: "24px",
                  fontWeight: 700,
                  color: "#FE0944",
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                  // Pulse glow when the value changes — only when motion
                  //   is allowed. Brief opacity dip + scale for a soft
                  //   "ka-ching" feedback. The `key` bump above forces
                  //   re-mount so the keyframes restart on each change.
                  "@media (prefers-reduced-motion: no-preference)": {
                    animation: "totalPulse 0.42s ease-out",
                  },
                  "@keyframes totalPulse": {
                    "0%": {
                      transform: "scale(0.96)",
                      filter:
                        "drop-shadow(0 0 0 rgba(254, 9, 68, 0))",
                    },
                    "40%": {
                      transform: "scale(1.04)",
                      filter:
                        "drop-shadow(0 0 8px rgba(254, 9, 68, 0.45))",
                    },
                    "100%": {
                      transform: "scale(1)",
                      filter:
                        "drop-shadow(0 0 0 rgba(254, 9, 68, 0))",
                    },
                  },
                }}
              >
                {formatTHB(Math.round(animatedTotal))}
              </Typography>
            </Box>
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

          {/* 🆕 Round 28r25 (founder 2026-05-07) — Owner price
              override field. Visible ONLY for admin sessions.
              When filled, replaces the calculated total entirely
              (no min/max guard — owner can charge whatever they
              want, including ฿0 for full comp). */}
          {isAdminBooking && (
            <Box
              sx={{
                marginTop: "12px",
                padding: "12px",
                borderRadius: "12px",
                background:
                  "linear-gradient(135deg, rgba(254, 9, 68, 0.06), rgba(254, 122, 82, 0.04))",
                border: "1px dashed rgba(254, 9, 68, 0.40)",
              }}
            >
              <Box
                sx={{
                  fontFamily: SANS,
                  fontSize: 9.5,
                  fontWeight: 800,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "#9F0731",
                  marginBottom: "6px",
                }}
              >
                Owner override · Final total
              </Box>
              <TextField
                fullWidth
                size="small"
                placeholder={`e.g. ${calculatedTotal} (leave blank to use calculated)`}
                value={adminOverrideRaw}
                onChange={(e) =>
                  setAdminOverrideRaw(e.target.value.replace(/[^0-9]/g, ""))
                }
                inputProps={{
                  inputMode: "numeric",
                  pattern: "[0-9]*",
                  maxLength: 7,
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">฿</InputAdornment>
                  ),
                }}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    background: "#fff",
                    borderRadius: "10px",
                    fontFamily: SANS,
                    fontSize: "14px",
                    fontVariantNumeric: "tabular-nums",
                  },
                }}
              />
              {adminOverrideTotal != null && (
                <Box
                  sx={{
                    fontFamily: SANS,
                    fontSize: 11,
                    color: "#9F0731",
                    marginTop: "6px",
                    fontWeight: 600,
                  }}
                >
                  ✓ Total locked at {formatTHB(adminOverrideTotal)}
                  {adminOverrideTotal !== calculatedTotal && (
                    <Box
                      component="span"
                      sx={{
                        marginLeft: "6px",
                        color: "rgba(60, 30, 20, 0.55)",
                        fontWeight: 500,
                      }}
                    >
                      (calculated was {formatTHB(calculatedTotal)})
                    </Box>
                  )}
                </Box>
              )}
            </Box>
          )}
        </SectionCard>

        {/* 🆕 Round 14 (founder 2026-05-01): Payment detail cell —
            tap → navigate to /payment-methods to pick the method.
            Mirrors the AddressTile pattern for visual consistency. */}
        <Box
          role="button"
          tabIndex={0}
          onClick={() => void navigate("/payment-methods")}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              void navigate("/payment-methods");
            }
          }}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 16px",
            borderRadius: "16px",
            background: "rgba(255, 255, 255, 0.7)",
            border: "1px solid rgba(255, 255, 255, 0.6)",
            boxShadow: "0 4px 14px rgba(126, 30, 46, 0.06)",
            cursor: "pointer",
            transition: "background 0.15s ease",
            "&:hover": { background: "rgba(255, 255, 255, 0.9)" },
            "&:focus-visible": {
              outline: "2px solid #FE0944",
              outlineOffset: "2px",
            },
          }}
        >
          <Box
            aria-hidden
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: "10px",
              background: "rgba(254, 9, 68, 0.10)",
              color: "#FE0944",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              "& svg": { fontSize: 20 },
            }}
          >
            <PaymentRoundedIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "11px",
                fontWeight: 700,
                color: "rgba(60, 30, 20, 0.55)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "2px",
              }}
            >
              Payment detail
            </Typography>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: "15px",
                fontWeight: 600,
                color: "#3c1e14",
                lineHeight: 1.2,
              }}
            >
              {PAYMENT_LABELS[paymentMethod]}
            </Typography>
          </Box>
          <ChevronRightRoundedIcon
            sx={{ color: "rgba(60, 30, 20, 0.4)", fontSize: 22 }}
          />
        </Box>

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


// 🆕 Round 28r10 — Subcomponents (SectionCard / FareChip / PriceRow /
//   AddressTile / ConfirmBar) extracted to @/components/booking/*.
//   ~390 lines moved out — find them via the imports at the top.


export default BookingFlowPage;
