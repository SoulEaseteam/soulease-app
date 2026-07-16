
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
  CircularProgress,
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
  getDoc,
  getDocs,
  query,
  where,
  limit as fbLimit,
  doc,
} from "firebase/firestore";
import { normPhone } from "@/utils/phoneCountry";
import { toast } from "react-toastify";
// Round 28s4 — Direct `dayjs` import removed; all time math now goes
// through `@/utils/time` helpers anchored at Asia/Bangkok.
// 🆕 Round 28an — BKK-anchored time helpers.
// 🆕 Round 28b15 — `prettyHHMM` for 24h + AM/PM display.
import {
  fmtBKK,
  sameDayBKK,
  nowBKK,
  prettyHHMM,
  parseDateTimeBKK,
} from "@/utils/time";
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
// 🆕 Round 28x.35 — returning-vs-new status, to pick the welcome code that
//   auto-fills for a signed-in guest.
import { useAnniversaryClaim } from "@/hooks/useAnniversaryClaim";
import { isInappropriate } from "@/utils/moderate";
import { getAttribution } from "@/utils/attribution";
// Round 28s81 — client no longer sends the Telegram notification; the
//   onBookingCreate Cloud Function trigger is the single source (see
//   the submit handler). sendBookingNotification import removed.
// 🆕 Round 28b21 — Phase 4 of conversion plan: cart abandonment tracker.
//   Records partial bookings to Firestore the moment the customer has
//   given us a phone number, so we can chase the lead if they bail.
import {
  useAbandonedCartTracker,
  markCartConfirmed,
} from "@/hooks/useAbandonedCartTracker";
import {
  estimateTaxiFare,
  ADMIN_QUOTE_KM,
  DISPATCH_BASE,
  travelFareDisplay,
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
  getRainForecast,
  rainStatusFromForecast,
  type RainStatus,
  type RainForecast,
} from "@/utils/weather";
import { priceForDuration, formatTHB, isServiceEnabled } from "@/utils/servicePricing";
// 🆕 28w.43 — freeze the split on admin-created (born-confirmed) bookings; a
//   customer booking (born pending) gets stamped when the admin confirms it.
import { stampSplit } from "@/utils/commission";
import { formatRating } from "@/utils/rating";
import services from "@/data/services";
import { getServiceById } from "@/utils/serviceCatalog";
import therapistsData from "@/data/therapists";
import type { Therapist } from "@/types/therapist";
// 🆕 Round 28b7 — Cloudinary helper for the rounded therapist photo.
import { enhanceImage } from "@/utils/cloudinary";
// 🆕 Round 28r49 (founder 2026-07-08 — "Add-ons · บริการเสริม เอาออกจาก
//   ทุกที่ที่มี") — the customer add-on picker (28s302) is fully removed.
//   `form.selectedAddons` stays initialized to `[]` in bookingFormStorage
//   for backward compat with existing booking docs, and always writes `[]`
//   / addonsTotal=0. The `AddOn`/`ADDONS` reference data survives in
//   src/data/bookingExtras.ts for legacy lookups; nothing here imports it.
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
// 🆕 Round 28r63 — trackReferralTierApplied (referral tier unlocked).
import {
  trackBookingStart,
  trackBookingComplete,
  trackReferralTierApplied,
} from "@/utils/analytics";
// 🆕 Round 28r14 — Discount validator (FIRST10 + SUN-XXXX referral).
//   Pure function; client-side validation only. Admin still
//   confirms / overrides via Telegram before payment.
import {
  validateDiscount,
  getInitialDiscountCode,
  getCustomPromoLimits,
  // 🆕 Round 28x.35 — brand welcome code auto-filled for a signed-in guest.
  welcomeCodeFor,
  // 🆕 Round 28r63 — resolves the exact tier that fired for the
  //   current count + live REFERRAL override, so the analytics event
  //   logs a real tierMinRedeems (not a heuristic) and the tier chip
  //   shows the admin-set label.
  getActiveReferralTier,
} from "@/utils/discount";
// 🆕 Round 28r63 (r59 follow-up) — customer-flow wiring for the
//   referral tier system built in r59. Populates ctx.referralRedeemCount
//   so tiers actually activate at checkout instead of always defaulting
//   to the base amount. Fails open (permission blip / rules gate on
//   unsigned guest → count 0 → base tier still applies).
import { useReferralRedeemCount } from "@/hooks/useReferralRedeemCount";
// 🆕 Round 28s84 — shared promo kill-switch (home banner + discount field).
import { PROMOS_ENABLED } from "@/config/featureFlags";
import { bookingAuthor } from "@/utils/bookingAuthor";
import { useAdminIdentity } from "@/hooks/useAdminIdentity";
// 🆕 Round 28r52 — Phase 3.1 responsive shell.
// 🆕 Round 28r56 — Phase 3.5 responsive typography for headings.
import { responsiveShellNarrow, responsiveType } from "@/theme/breakpoints";
// 🆕 Round 28s77 — WeChat/Alipay transfer surcharge (5% + ฿200).
import {
  paymentSurcharge,
  SURCHARGE_PCT,
  SURCHARGE_FLAT,
} from "@/utils/paymentSurcharge";
// 🆕 Round 28r18 — Persist booking-flow errors so admin can triage
//   "tried to reserve online but doesn't work" complaints without
//   needing repro steps from the customer.
import { logBookingError } from "@/utils/bookingError";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// Round 28s71 (audit) — defensive HH:mm → minutes parse. Returns NaN
//   for missing / malformed values instead of NaN-poisoning the
//   overnight booking math (therapist.startTime/endTime are static but
//   may be overlaid by live Firestore values that could be cleared).
function hhmmToMin(hhmm: string | null | undefined): number {
  if (!hhmm || typeof hhmm !== "string" || !hhmm.includes(":")) return NaN;
  const [h, m] = hhmm.split(":").map((x) => parseInt(x, 10));
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : NaN;
}

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
  // 🆕 Round 28x.35 — signed-in guest gets their SunRed welcome code
  //   auto-filled (returning → ฿200 tier, new → ฿100). Concierge/admin
  //   bookings are excluded: the concierge enters codes by hand.
  const { signedIn, isReturning, loading: memberLoading } = useAnniversaryClaim();
  // 🆕 28x.3 — the concierge's own phone, stamped onto anything they book.
  const { phone: adminPhone } = useAdminIdentity();

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

  // 🆕 Round 28x.35 (founder: "สมาชิก login แล้วโค้ดเด้งใส่ให้เลยอัตโนมัติ") —
  //   auto-fill the brand welcome code for a signed-in guest once their
  //   returning-vs-new status has resolved. Fires at most once per mount
  //   (the ref) and ONLY when the field is empty — so a captured ?ref= /
  //   ?promo= code, a persisted manual entry, or a code the guest cleared
  //   on purpose all win over the auto-fill. Concierge/admin bookings are
  //   skipped (they set codes by hand). The min-spend floor + View's
  //   Telegram confirmation still gate whether it actually discounts.
  const autoFilledWelcome = useRef(false);
  useEffect(() => {
    if (autoFilledWelcome.current) return;
    if (!PROMOS_ENABLED || !signedIn || isAdminBooking || memberLoading) return;
    autoFilledWelcome.current = true;
    setForm((prev) =>
      prev.discountCode?.trim()
        ? prev
        : { ...prev, discountCode: welcomeCodeFor(isReturning) },
    );
  }, [signedIn, isReturning, isAdminBooking, memberLoading]);

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
  // 🆕 Round 28s310 — real hourly forecast; the fare prices rain from the
  //   forecast at the booking's scheduled date+hour, falling back to the
  //   current-weather `rainStatus` when the slot isn't covered.
  const [forecast, setForecast] = useState<RainForecast | null>(null);
  useEffect(() => {
    let cancelled = false;
    getRainStatus().then((status) => {
      if (!cancelled) setRainStatus(status);
    });
    getRainForecast().then((fc) => {
      if (!cancelled) setForecast(fc);
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
      // 🆕 Round 28s73 (audit) — `||` not `??`. SelectLocationPage no
      //   longer has an address-details field and always hands back
      //   addressDetails: "", which with `??` (only null/undefined)
      //   wiped any value the guest had entered on every round-trip.
      //   `||` keeps the existing value when incoming is an empty string.
      addressDetails: incoming.addressDetails || p.addressDetails,
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
  // 🚨 Round 28r68 HOTFIX — Firestore fallback so admin-created
  //   practitioners (e.g. PareSunRed, MiloSunRed) don't show as a
  //   generic "Practitioner" placeholder on Order Details. Same
  //   pattern as r66 TherapistDetailPage.tsx: hardcoded lookup wins
  //   fast for the 12 originals (zero extra reads); Firestore falls
  //   through only when the hardcoded lookup misses. Founder:
  //   "Order Details ไม่เชื่อมต่อ" — was reading Pare's booking URL
  //   and rendering blank name/photo/rating.
  const hardcodedTherapist = useMemo(
    () =>
      form.therapistId
        ? therapistsData.find((tt) => tt.id === form.therapistId) ?? null
        : null,
    [form.therapistId]
  );
  const [firestoreTherapist, setFirestoreTherapist] =
    useState<Therapist | null>(null);
  const [firestoreTherapistLoading, setFirestoreTherapistLoading] =
    useState(false);
  useEffect(() => {
    // Only reach Firestore when the hardcoded lookup missed. Fast-path
    //   exit for the 12 originals means zero extra read on the paths
    //   customers hit today.
    const tid = form.therapistId;
    if (!tid || hardcodedTherapist) {
      setFirestoreTherapist(null);
      setFirestoreTherapistLoading(false);
      return;
    }
    let cancelled = false;
    setFirestoreTherapistLoading(true);
    (async () => {
      try {
        const snap = await getDoc(doc(db, "therapists", tid));
        if (cancelled) return;
        if (snap.exists()) {
          const data = snap.data() as Partial<Therapist> &
            Record<string, unknown>;
          // Safe defaults for required Therapist fields — the JS spread
          //   below only overwrites keys that are actually present on
          //   `data`, so defaults survive for any field the Firestore
          //   doc simply doesn't have.
          const defaults: Omit<Therapist, "id"> = {
            name: tid,
            image: "",
            rating: 0,
            reviews: 0,
            startTime: "10:00",
            endTime: "22:00",
            gallery: [],
            features: {
              age: "",
              height: "",
              weight: "",
              bodyType: "",
              language: "",
            },
          };
          const rec = {
            ...defaults,
            ...data,
            id: tid,
          } as Therapist;
          setFirestoreTherapist(rec);
        } else {
          setFirestoreTherapist(null);
        }
      } catch (err) {
        // Fail closed → treat as not-found rather than crash. Rules
        //   allow `read: if true` on therapists so the only way this
        //   throws in production is a network hiccup.
        console.warn(
          "[BookingFlowPage] Firestore therapist fallback failed:",
          err
        );
        if (!cancelled) setFirestoreTherapist(null);
      } finally {
        if (!cancelled) setFirestoreTherapistLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [form.therapistId, hardcodedTherapist]);
  const therapist: Therapist | null =
    hardcodedTherapist ?? firestoreTherapist;
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
  // 🆕 Round 28s301 — resolve via getServiceById so admin-created custom
  //   services (not in the hardcoded `services` array) also resolve, with
  //   live name/price overrides applied.
  const service = useMemo(
    () => getServiceById(form.serviceId) ?? services.find((s) => s.id === form.serviceId) ?? null,
    [form.serviceId]
  );
  // 🆕 Round 28r49 (founder 2026-07-08) — the add-on picker (28s302) is
  //   removed. `form.selectedAddons` stays [] and addonsTotal is 0. The
  //   `SectionCard` block below (formerly the picker) is deleted.

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
  // 🆕 Round 28r49 — hardcoded to 0 after add-on removal. Kept as a named
  //   const so every downstream reference (discountableBase, subtotal,
  //   originalPrice, baseTotal, the booking doc `addonsTotal` field for
  //   backward-compat) stays untouched.
  const addonsTotal = 0;


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
    if (!form.lat || !form.lng) return;
    if (!mapsReady) return; // wait for SDK
    let cancelled = false;
    void (async () => {
      try {
        // 🆕 Round 28s233 — origin is the single DISPATCH_BASE (not the
        //   per-therapist coord) so the same destination always quotes the
        //   same fare regardless of which practitioner is assigned.
        const r = await fetchDrivingDistance(
          { lat: DISPATCH_BASE.lat, lng: DISPATCH_BASE.lng },
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
  }, [locationSet, mapsReady, form.lat, form.lng]);

  // Build the taxi result. If the real route has resolved, use that
  // distance. Otherwise we render with the haversine quick estimate
  // so the page never flickers an empty fare line.
  const taxi = useMemo(() => {
    if (!locationSet) return { distanceKm: 0, fare: 0, result: undefined, taxiOriginal: null, taxiSave: 0 };
    // 🆕 Round 28w.11 (founder) — taxi fee now comes from the SAME fixed
    //   travel-budget bands as the near-me estimator (calcTravelBudgetResult),
    //   NOT the GrabCar meter. Flat by real distance; excludes weather/traffic
    //   surge (those are dropped, per the founder's budget table). Distance is
    //   the real route km when available, else the dispatch-base haversine.
    const distanceKm = route
      ? route.kmRoad
      : estimateTaxiFare({
          // 🆕 Round 28s233 — single dispatch base origin (see useEffect above).
          therapistLat: DISPATCH_BASE.lat,
          therapistLng: DISPATCH_BASE.lng,
          customerLat: form.lat,
          customerLng: form.lng,
          durationMin: form.duration ?? service?.duration ?? 60,
        }).distanceKm;
    if (!distanceKm) return { distanceKm: 0, fare: 0, result: undefined, taxiOriginal: null, taxiSave: 0 };
    // 🆕 28x.48 — REAL metered fare (round-trip + booking fee + time/rain surge)
    //   for the booking's own hour, with the online saving on top. `result` now
    //   carries the surge/rain tiers so the chips below still light up.
    const hour = form.time ? parseInt(form.time.split(":")[0], 10) : undefined;
    const disp = travelFareDisplay(distanceKm, rainStatus, hour);
    const result = disp.result;
    const fare = disp.youPay ?? 0;
    return { distanceKm, fare, result, taxiOriginal: disp.original, taxiSave: disp.save };
  }, [
    locationSet,
    route,
    form.lat,
    form.lng,
    form.duration,
    form.time,
    service?.duration,
    rainStatus,
  ]);
  const distanceKm = taxi.distanceKm;
  const taxiFare = taxi.fare;
  const taxiOriginal = taxi.taxiOriginal;
  const taxiSave = taxi.taxiSave;
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
  // 🆕 Round 28r63 (r59 follow-up) — referral tier count. Bounded
  //   getCountFromServer, cached per-code in a module Map, fails open
  //   on permission errors so a rules blip can't block a real referral.
  //   Non-referral codes (FIRST10 / WELCOME20 / etc.) return count=0
  //   from the hook and validateDiscount just ignores the field.
  //   `isTierEligible` from the hook isn't consumed here — we resolve
  //   the exact active tier below via `getActiveReferralTier` instead,
  //   which is truthy only when a tier's minRedeems actually matched.
  const { count: referralRedeemCount } = useReferralRedeemCount(
    form.discountCode
  );

  // 🆕 Round 28s71 (audit perf) — memoized. validateDiscount used to
  //   re-run on EVERY render, including all ~30 frames of the total's
  //   count-up tween (useTweenedNumber below), on every keystroke, and
  //   on each distance/rain recompute. Now it only recomputes when an
  //   actual input changes.
  const discount = useMemo(
    () =>
      validateDiscount(form.discountCode, discountableBase, {
        bookingHourBKK,
        serviceId: form.serviceId,
        // 🆕 Round 28r28 — FREETAXI needs the taxi fare to compute its
        //   discount amount. Other codes ignore it.
        taxiFareTHB: taxiFare,
        // 🆕 Round 28r63 — SUN-XXXX referral tiers. When the REFERRAL
        //   override carries a `tiers` list, validateDiscount picks the
        //   highest tier whose minRedeems<=count. Ignored for every
        //   non-referral code.
        referralRedeemCount,
      }),
    [
      form.discountCode,
      discountableBase,
      bookingHourBKK,
      form.serviceId,
      taxiFare,
      referralRedeemCount,
    ]
  );
  // 🆕 Round 28r63 (r59 follow-up) — resolve which tier (if any)
  //   fired for the current SUN-XXXX code + count, so we can (a) show
  //   the tier label chip in the "You saved" pill and (b) log a
  //   truthful referral_tier_applied analytics event. Returns null on
  //   non-referral codes / codes with no configured tiers / counts
  //   that don't cross any threshold.
  const isReferralCode =
    discount.valid && /^SUN-[A-Z0-9]{4,8}$/.test(discount.code);
  const activeReferralTier = useMemo(
    () => (isReferralCode ? getActiveReferralTier(referralRedeemCount) : null),
    [isReferralCode, referralRedeemCount]
  );

  // Fire the referral_tier_applied event when a tier is actually
  // active AND the code is currently valid. Deduped in trackEvent per
  // (code, tierMinRedeems) so the ~30 tween frames + every keystroke
  // can't fire it repeatedly. Only fires in production (analytics.ts
  // skips dev/localhost/preview builds).
  useEffect(() => {
    if (
      PROMOS_ENABLED &&
      discount.valid &&
      isReferralCode &&
      activeReferralTier
    ) {
      trackReferralTierApplied(
        discount.code,
        referralRedeemCount,
        activeReferralTier.minRedeems,
        activeReferralTier.amount,
      );
    }
  }, [
    discount.valid,
    discount.code,
    isReferralCode,
    referralRedeemCount,
    activeReferralTier,
  ]);

  // 🆕 Round 28s83 — promos OFF: force ฿0 discount regardless of code.
  const discountAmount =
    PROMOS_ENABLED && discount.valid ? discount.amount : 0;
  // 🆕 Round 28r28 — Total calc branches on FREETAXI vs others:
  //   FREETAXI: total = service + addons + (taxi - discount=taxi) = service + addons
  //   Other codes: total = (service + addons - discount) + taxi
  const isFreeTaxi =
    PROMOS_ENABLED && discount.valid && discount.code === "FREETAXI";
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
  // 🆕 Round 28s77 (founder 2026-05-31) — WeChat / Alipay transfer
  //   surcharge (5% of the order total + ฿200 flat). Applied to the
  //   customer-calculated total only; an admin owner-override types
  //   the final figure directly, so no surcharge is layered on top.
  const paymentFee =
    adminOverrideTotal != null
      ? 0
      : paymentSurcharge(paymentMethod, calculatedTotal);
  const total =
    (adminOverrideTotal != null ? adminOverrideTotal : calculatedTotal) +
    paymentFee;

  // 🆕 Round 28b46 (founder 2026-05-05) — Pre-surcharge baseline so we
  //   can render "~~฿1,800~~ ฿2,018" when rain or admin-quote bumps the
  //   total. baseFareBeforeRain comes back from estimateTaxiFare even
  //   when rain.tier === "none" (in which case it equals taxiFare and
  //   the strikethrough silently no-ops).
  const baseTotal =
    servicePrice +
    addonsTotal +
    (taxiResult?.baseFareBeforeRain ?? taxiFare) +
    // 🆕 Round 28s77 — include the payment surcharge in the baseline
    //   too, so the WeChat/Alipay fee doesn't falsely trip the
    //   rain-style "~~strikethrough~~" (that's reserved for rain /
    //   admin-quote bumps). The fee shows as its own price row instead.
    paymentFee;
  const hasSurcharge = total > baseTotal + 0.5; // guard against rounding noise

  // 🆕 Round 28s308 (founder: "ไปเต็มราคา + กลับตามจริง — ลบค่าทั้งหมดที่เคย
  //   คำนวน") — the strike-through anchor + "Smart Routing" travel saving
  //   are gone; travel is charged at the actual round-trip. `savingsRouting`
  //   is kept as a hard 0 so the receipt's "You saved" pill + strikethrough
  //   logic still compile and simply reflect only a real promo code.
  //   originalPrice = service + addons + actual round-trip taxi.
  const originalPrice = servicePrice + addonsTotal + taxiFare;
  const savingsRouting = 0;
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
      ? t("common.today", "Today")
      : sameDayBKK(form.date, nowBKK().add(1, "day"))
      ? t("common.tomorrow", "Tomorrow")
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
        toast.error(t("booking.error.missingDetails", "Missing reservation details"));
        setSubmitting(false);
        return;
      }
      // 🆕 Round 28s300 — a service admin disabled from /admin/promotions
      //   is filtered out of the picker, but guard the submit too (a
      //   stale form or a direct-URL serviceId could still carry it).
      //   Admin bookings bypass, same as the other availability guards.
      if (!isAdminBooking && !isServiceEnabled(service.id)) {
        toast.error(
          t("booking.error.serviceUnavailable", "This service is not available right now. Please choose another.")
        );
        setSubmitting(false);
        return;
      }

      // Round 28s4 — Was `dayjs(\`${form.date}T${form.time}\`)` which
      // parses in browser-local tz. A JST/CST customer typing "21:00"
      // wrote the WRONG wall-clock time to Firestore (21:00 JST =
      // 19:00 BKK; practitioner arrived 2 hours early). `parseDateTimeBKK`
      // anchors at Asia/Bangkok so the wall-clock the customer typed
      // is the wall-clock the practitioner reads.
      const parsedStart = parseDateTimeBKK(form.date, form.time);
      if (!parsedStart) {
        toast.error(t("booking.error.invalidTime", "Invalid reservation time"));
        setSubmitting(false);
        return;
      }
      let startDate = parsedStart;
      // Round 28s71 (audit) — guard the overnight-shift adjustment with
      //   finite-checked working hours. A malformed startTime/endTime
      //   used to NaN-poison this math and write a wrong startAt/endAt.
      const startMin = hhmmToMin(therapist.startTime);
      const endMin = hhmmToMin(therapist.endTime);
      if (Number.isFinite(startMin) && Number.isFinite(endMin)) {
        const slotMin = startDate.hour() * 60 + startDate.minute();
        if (endMin <= startMin && slotMin < startMin) {
          startDate = startDate.add(1, "day");
        }
      }
      // Round 28s71 (audit) — reject bookings whose start time has
      //   already passed. Without this a guest could pick a time gone
      //   earlier today; the overnight branch above would then silently
      //   shove it to tomorrow (booking moved 24h with no warning).
      //   Admin may back-date an offline-coordinated booking, so the
      //   guard is customer-only.
      if (!isAdminBooking && startDate.isBefore(nowBKK())) {
        toast.error(
          t(
            "booking.error.pastTime",
            "That time has already passed. Please pick a later time."
          )
        );
        setSubmitting(false);
        return;
      }
      const endDate = startDate.add(
        form.duration ?? service.duration,
        "minute"
      );

      // 🆕 Round 28s293 — /admin/blocked-devices used to block a
      //   "deviceId" nothing in the app ever generated, so a block never
      //   actually stopped anyone from booking. Real, enforceable
      //   version: check the phone the guest just typed against the
      //   `blockedPhones` list (same normPhone() key the CRM already
      //   uses). Admin-initiated bookings bypass, same as the other
      //   guards above — a founder coordinating an exception offline
      //   shouldn't be blocked by her own blocklist.
      if (!isAdminBooking) {
        try {
          const blockSnap = await getDoc(
            doc(db, "blockedPhones", normPhone(form.customerPhone))
          );
          if (blockSnap.exists()) {
            toast.error(
              t(
                "booking.error.blocked",
                "Unable to complete this booking right now. Please contact us directly via LINE/Telegram."
              )
            );
            setSubmitting(false);
            return;
          }
        } catch (err) {
          // Never let a failed block-check itself break a legitimate
          // booking — fail open, same spirit as logAdminAction's guard.
          console.warn("[booking] blockedPhones check failed:", err);
        }
      }

      // 🆕 Round 28s296 — minAdvanceMins/maxFutureDays on
      //   AdminAdvancedSettingsPage used to save to Firestore with
      //   nothing anywhere reading it back — the toggle did nothing.
      //   Real enforcement: pull the live booking-eligibility window
      //   from the public `adminSettings/publicRules` doc. Missing
      //   values default to 0 (= no restriction), so an admin who never
      //   touches Settings sees no change from today's behavior.
      if (!isAdminBooking) {
        try {
          const rulesSnap = await getDoc(doc(db, "adminSettings", "publicRules"));
          const rules = rulesSnap.data() as
            | { minAdvanceMins?: number; maxFutureDays?: number }
            | undefined;
          const minAdvanceMins = rules?.minAdvanceMins ?? 0;
          const maxFutureDays = rules?.maxFutureDays ?? 0;
          if (minAdvanceMins > 0 && startDate.diff(nowBKK(), "minute") < minAdvanceMins) {
            toast.error(
              t(
                "booking.error.tooSoon",
                `Please book at least ${minAdvanceMins} minutes in advance.`
              )
            );
            setSubmitting(false);
            return;
          }
          if (maxFutureDays > 0 && startDate.diff(nowBKK(), "day") > maxFutureDays) {
            toast.error(
              t(
                "booking.error.tooFarAhead",
                `Bookings can only be made up to ${maxFutureDays} days ahead.`
              )
            );
            setSubmitting(false);
            return;
          }
        } catch (err) {
          console.warn("[booking] publicRules check failed:", err);
        }
      }

      // 🆕 Round 28r59 (Phase 4 feature #1 "FIRST10 first-time enforcement")
      //   — FIRST10 was trust-based: no phone check, so a tourist could
      //   reuse it session-to-session. Now, if the guest's phone already
      //   has a non-cancelled booking, FIRST10 gets silently invalidated
      //   at submit (discount amount → 0, code kept in `discountCode` for
      //   admin visibility with a `first10Abused: true` flag). Admin can
      //   still hand-apply the discount via concierge if she chooses.
      //
      //   Fails OPEN: any query error → let the discount ride. A permission
      //   or index hiccup shouldn't block a legitimate booking on the
      //   customer's most-common promo. Admin bypass, same as every guard
      //   above. Only fires when the code passed validateDiscount, so an
      //   invalidated / mistyped code never touches this loop.
      let first10Abused = false;
      if (
        !isAdminBooking &&
        PROMOS_ENABLED &&
        discount.valid &&
        discount.code === "FIRST10"
      ) {
        try {
          const myPhone = normPhone(form.customerPhone);
          if (myPhone) {
            const priorSnap = await getDocs(
              query(
                collection(db, "bookings"),
                where("phone", "==", form.customerPhone),
                fbLimit(3),
              ),
            );
            const priorNonCancelled = priorSnap.docs.some((d) => {
              const s = String(
                (d.data() as { status?: string }).status ?? "",
              ).toLowerCase();
              return (
                s !== "cancelled" &&
                s !== "canceled" &&
                s !== "refunded" &&
                s !== "no_show" &&
                s !== "rejected" &&
                s !== "failed" &&
                s !== ""
              );
            });
            if (priorNonCancelled) first10Abused = true;
          }
        } catch (err) {
          // fail open — never block a legitimate booking on a permission
          // or index blip.
          console.warn("[booking] FIRST10 first-time check failed:", err);
        }
      }

      // 🆕 Round 28s299 — redemption caps on admin-created promo codes.
      //   Enforced here (not in the pure validateDiscount) because it
      //   needs a live count of how many times the code was already
      //   used. getCustomPromoLimits returns null for built-in codes or
      //   codes with no caps, so this whole block no-ops in the common
      //   case. Admin bookings bypass, same as the other guards. Fails
      //   open — a failed count read never blocks a legitimate booking.
      if (!isAdminBooking && PROMOS_ENABLED && discount.valid) {
        const limits = getCustomPromoLimits(discount.code);
        if (limits && (limits.maxRedemptions || limits.perPhoneLimit)) {
          try {
            const usedSnap = await getDocs(
              query(
                collection(db, "bookings"),
                where("discountCode", "==", discount.code),
                fbLimit(1000)
              )
            );
            const myPhone = normPhone(form.customerPhone);
            let total = 0;
            let byPhone = 0;
            usedSnap.forEach((d) => {
              total += 1;
              if (normPhone(String((d.data() as { phone?: string }).phone ?? "")) === myPhone) {
                byPhone += 1;
              }
            });
            if (limits.maxRedemptions && total >= limits.maxRedemptions) {
              toast.error(
                t("booking.error.promoExhausted", "This promo code has reached its usage limit.")
              );
              setSubmitting(false);
              return;
            }
            if (limits.perPhoneLimit && byPhone >= limits.perPhoneLimit) {
              toast.error(
                t("booking.error.promoAlreadyUsed", "You've already used this promo code.")
              );
              setSubmitting(false);
              return;
            }
          } catch (err) {
            console.warn("[booking] promo redemption check failed:", err);
          }
        }
      }

      const attribution = getAttribution();
      // 🆕 Round 28r59 (feature #1) — if FIRST10 was first-time-abused,
      //   silently zero the discount at the booking-doc level: the
      //   customer sees no error and the booking still writes, but the
      //   total no longer reflects the abused discount. Admin gets a
      //   `first10Abused` flag on the doc so she can see what happened.
      //   For any other code, `effectiveDiscountAmount === discountAmount`
      //   so this is byte-identical to pre-r59 behaviour.
      const effectiveDiscountAmount = first10Abused ? 0 : (discount.valid ? discountAmount : null);
      const effectiveDiscountCode = first10Abused ? null : (discount.valid ? discount.code : (form.discountCode || null));
      const effectiveDiscountLabel = first10Abused ? null : (discount.valid ? discount.label : null);
      // When abused, add the discount back into the total so nothing is
      // silently under-charged. `total` was memoized with the discount
      // applied; adding `discountAmount` back mirrors "as if the code
      // wasn't valid".
      const effectiveTotalPrice = first10Abused ? Math.round(total + discountAmount) : total;
      const ref = await addDoc(collection(db, "bookings"), {
        // 🆕 28x.3 (founder: "จะระบุได้ไง ใครจอง") — this page is ALSO how the
        //   concierge books (isAdminBooking), and it recorded no author at all.
        //   A guest booking themselves stamps createdBy:"guest" and no identity.
        ...bookingAuthor({
          isAdmin: isAdminBooking,
          uid: user?.uid,
          email: user?.email,
          displayName: user?.displayName,
          phone: adminPhone,
        }),
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
        // 🆕 Round 28s299 — when the code is VALID, store its canonical
        //   uppercased form (discount.code), not the raw-cased user
        //   input, so the redemption-cap count query (which matches on
        //   the uppercase code) and the Promotions usage stats can't
        //   miss a booking on a case mismatch. Invalid/absent → keep raw
        //   input (or null) so admin can still see what was typed.
        discountCode: effectiveDiscountCode,
        // 🆕 Round 28r14 — Discount apply logic: store the validated
        //   amount + label on the booking doc so historical bookings
        //   stay reconstructable even if the FIRST10 / referral code
        //   schemas change in the future. Subtotal is the
        //   pre-discount baseline; total stays AFTER discount.
        // 🆕 Round 28r59 (feature #1) — `effective*` fields reflect the
        //   FIRST10-abuse silent-zero when applicable; identical to
        //   pre-r59 values in every other case.
        discountAmount: effectiveDiscountAmount,
        discountLabel: effectiveDiscountLabel,
        // 🆕 Round 28r59 (feature #1) — surfaces the abuse attempt to
        //   admin without customer-side friction. Cloud Function's
        //   Telegram formatter can key off this if founder wants the
        //   admin ping to call it out; for now, the flag on the doc is
        //   enough to make the pattern visible in the admin dashboard.
        ...(first10Abused
          ? { first10Abused: true, first10AttemptCode: "FIRST10" }
          : {}),
        subtotalPrice: subtotal,
        // 🆕 Round 14: customer-selected payment method label (admin still
        // confirms via Telegram, but we capture intent here).
        payment: PAYMENT_LABELS[paymentMethod],
        paymentMethodId: paymentMethod,
        // 🆕 Round 28s77 — WeChat/Alipay transfer surcharge (0 for
        //   other methods). `totalPrice` already includes it.
        paymentFee,
        taxiFee: taxiFare,
        taxiTier: taxiResult?.tier ?? null,
        taxiBaseFee: taxiResult?.baseFareBeforeRain ?? taxiFare,
        rainTier: taxiResult?.rain.tier ?? "none",
        rainSurchargePct: taxiResult?.rain.surchargePct ?? 0,
        distanceKm,
        totalPrice: effectiveTotalPrice,
        // 🆕 Round 28s227 (FIX — orders were invisible) — customer bookings
        //   must land as "pending" so they surface in the admin dashboard's
        //   "Needs Confirmation" panel (AdminDashboardPage queries
        //   status=="pending") and the Booking List's default Pending tab.
        //   Previously every customer order was written "confirmed", so the
        //   dashboard showed "Pending 0 / all up to date" and real orders
        //   silently filed themselves under Confirmed as if already actioned
        //   — a primary cause of the order drought. Admin-created bookings
        //   stay pre-confirmed (mirrors the holdState split below). The
        //   onBookingCreate trigger fires on create regardless of status,
        //   so Telegram alerts are unaffected; the admin "Confirm" button
        //   promotes pending → confirmed.
        status: isAdminBooking ? "confirmed" : "pending",
        // 🆕 28w.43 — admin bookings are born confirmed → freeze the split now
        //   (from the current split table). Customer bookings start pending and
        //   get stamped when the admin confirms them (AdminBookingListPage).
        ...(isAdminBooking
          ? stampSplit({
              serviceId: service.id,
              servicePrice,
              discountAmount: effectiveDiscountAmount,
              duration: form.duration ?? service.duration,
            })
          : {}),
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
        //   NOTE (Round 28s71 audit): holdExpiresAt is derived from the
        //   CLIENT clock (nowBKK() = dayjs on the device), so a skewed
        //   device clock can shift the hold window. The authoritative
        //   release is the `releaseExpiredHolds` Cloud Function, which
        //   compares against the SERVER `createdAt` — that's what
        //   actually prevents a tampered clock from extending a hold.
        // 🆕 Round 28r24 — Admin bookings are pre-confirmed, no
        //   countdown. Customer bookings still get the 10-min hold.
        holdState: isAdminBooking ? "confirmed" : "active",
        holdExpiresAt: isAdminBooking
          ? null
          : Timestamp.fromDate(nowBKK().add(10, "minute").toDate()),
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
        yearMonth: startDate.format("YYYY-MM"), // BKK-anchored (Round 28s4)
        // 🆕 Round 28s229 — first-touch marketing attribution (which channel +
        //   landing page the order came from). Surfaced on the admin Telegram
        //   so View can see where each booking originated. Country is derived
        //   from the phone dial code in the onBookingCreate function.
        attributionSource: attribution?.source ?? null,
        utmSource: attribution?.utmSource ?? null,
        utmMedium: attribution?.utmMedium ?? null,
        utmCampaign: attribution?.utmCampaign ?? null,
        landingPath: attribution?.landingPath ?? null,
        referrerHost: attribution?.referrerHost ?? null,
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
            title: t("booking.notif.title", "Reservation confirmed"),
            content: t(
              "booking.notif.body",
              "Your session with {{name}} is set for {{date}} at {{time}}.",
              {
                name: therapist.name,
                date: form.date ?? "—",
                time: form.time ?? "—",
              }
            ),
            link: `/booking/success/${ref.id}`,
            read: false,
            priority: "normal",
            createdAt: serverTimestamp(),
          });
        }
      } catch (notifErr) {
        console.warn("[booking] in-app notification write failed:", notifErr);
      }

      // 🆕 Round 28s81 (audit) — the client no longer fires the Telegram
      //   notification. The `onBookingCreate` Cloud Function trigger
      //   already sends the admin message (richer: therapist DM +
      //   Holiday gate + delivery log) the moment this addDoc lands.
      //   Calling notifyBooking from the client too produced DUPLICATE
      //   admin messages per booking, and the public callable was a
      //   spam vector (no auth). Removed — the server trigger is the
      //   single source of truth now.

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
      // Round 28s71 (audit) — no longer pass locationName / address
      //   to the error log; they revealed where the guest is staying
      //   and were echoed to the production console. Triage only needs
      //   the non-PII booking context below.
      logBookingError(err, {
        step: "addDoc_or_notify",
        therapistId: form.therapistId,
        serviceId: form.serviceId,
        duration: form.duration,
        date: form.date,
        time: form.time,
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
        // 🆕 Round 28r52 — narrow responsive shell so the checkout form
        //   stays readable on desktop instead of stretching to 1200.
        // 🆕 Round 28r56 — Phase 3.5 desktop redesign: widen the shell at
        //   md+ so the 2-column layout (form left / sticky pricing right)
        //   has real room to breathe. Mobile shell width unchanged.
        ...responsiveShellNarrow,
        maxWidth: {
          xs: "430px",
          sm: "600px",
          md: "900px",
          lg: "1200px",
        },
        minHeight: "100vh",
        background: "var(--sr-bg)",
        // 🚨 Round 28r67 HOTFIX — ConfirmBar is no longer position:fixed
        //   on mobile (renders in-flow at the natural end of content), so
        //   we no longer reserve space for a floating CTA. Mobile just
        //   needs enough padding to clear BottomNavGlass (~64px + safe
        //   area). Desktop (md+) unchanged since ConfirmBar is
        //   display:none there.
        paddingBottom: {
          xs: "100px",
          md: "48px",
        },
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
          background: "var(--sr-panel)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid var(--sr-hairline)",
          display: "flex",
          alignItems: "center",
          padding: "14px 16px",
        }}
      >
        <IconButton
          aria-label={t("common.back", "Back")}
          onClick={() => void navigate(-1)}
          sx={{
            width: 44,
            height: 44,
            background: "var(--sr-panel)",
            border: "1px solid var(--sr-hairline)",
            color: "var(--sr-ink)",
            "&:hover": { background: "var(--sr-panel)" },
            "&:focus-visible": {
              outline: "2px solid var(--sr-ink)",
              outlineOffset: 2,
            },
          }}
        >
          <ArrowBackRoundedIcon fontSize="small" />
        </IconButton>
        {/* 🆕 Round 28s211 — Page title sans-serif for legibility,
            matching Services / How-to-book audit (28s199 / 28s202).
            🆕 Round 28r56 — bumps at md+ via responsiveType.h6 so the
            desktop header reads as a real page title, not a phone chip. */}
        <Typography
          component="h1"
          sx={{
            flex: 1,
            textAlign: "center",
            fontFamily: SANS,
            ...responsiveType.h6,
            fontWeight: 700,
            color: "var(--sr-ink)",
            letterSpacing: "-0.005em",
            marginRight: "36px", // visual balance for the left icon button
          }}
        >
          {t("booking.confirm.title", "Confirm Reservation")}
        </Typography>
      </Box>

      {/* 🆕 Round 28r56 (Phase 3.5 desktop redesign) — content grid.
          Mobile (xs–sm): single-column flex-column stack, ordering
          preserved 100% (tile → banner → orderDetails → pricing →
          payment → policy → discreet). Desktop (md+): 2-column CSS
          grid with a sticky pricing sidebar on the right and the
          form sections stacked in the left column. Uses gridTemplate-
          Areas so the same JSX renders both layouts with no duplicate
          mounts (Pricing is a single React subtree either way — no
          state duplication risk). Sticky sidebar top offset accounts
          for the sticky page header above (~64px + a small buffer). */}
      <Box
        sx={{
          padding: "16px",
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            md: "minmax(0, 1fr) minmax(320px, 380px)",
          },
          gridTemplateAreas: {
            xs: `"tile"
                 "banner"
                 "orderDetails"
                 "pricing"
                 "payment"
                 "policy"
                 "discreet"`,
            md: `"tile pricing"
                 "banner pricing"
                 "orderDetails pricing"
                 "payment pricing"
                 "policy pricing"
                 "discreet pricing"`,
          },
          gap: { xs: "14px", md: "16px 24px" },
          alignItems: "start",
        }}
      >
        {/* ─────────── Address tile (tap → /booking/:id/address) ─────────── */}
        <Box sx={{ gridArea: "tile", minWidth: 0 }}>
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
        </Box>

        {/* 🆕 Round 28r24 (founder 2026-05-07) — Admin override banner.
            Shows ONLY when an admin is booking through the customer
            flow. Confirms which guards have been bypassed so admin
            doesn't expect the 10-min-hold countdown to appear later. */}
        {isAdminBooking && (
          <Box
            sx={{
              gridArea: "banner",
              minWidth: 0,
              mb: 1.5,
              p: "10px 12px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, rgba(15, 23, 42, 0.10), rgba(214, 40, 40, 0.06))",
              border: "1px solid rgba(15, 23, 42, 0.28)",
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
                background: "#D97C95",
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
                  color: "var(--sr-body)",
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
        <Box sx={{ gridArea: "orderDetails", minWidth: 0 }}>
        <SectionCard
          label={t("booking.section.orderDetails", "Order Details")}
          sublabel={t("booking.orderDetails", "Order details")}
          icon={<ReceiptLongRoundedIcon />}
        >
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
                    )}"), var(--sr-ink)`
                  : "var(--sr-ink)",
                border: "1px solid var(--sr-hairline)",
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
                  color: "var(--sr-ink)",
                  lineHeight: 1.2,
                }}
              >
                {therapist?.name ??
                  (firestoreTherapistLoading ? (
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <CircularProgress size={12} thickness={5} sx={{ color: "var(--sr-body)" }} />
                      <Box
                        component="span"
                        sx={{
                          fontFamily: SANS,
                          fontSize: "13px",
                          fontWeight: 500,
                          color: "var(--sr-muted)",
                        }}
                      >
                        {t("booking.therapist.loading", "Loading practitioner…")}
                      </Box>
                    </Box>
                  ) : (
                    t("booking.therapist.fallback", "Practitioner")
                  ))}
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
                    color: "var(--sr-body)",
                  }}
                >
                  ★{" "}
                  {/* 🆕 28x.5 (founder: screenshot showed 4.5 · 0 reviews here while
                      every other screen said 4.7 · 10) — this was applying the
                      Bayesian smoothing a SECOND time. Since 28x.1, therapists/{id}
                      .rating is ALREADY the Bayesian display value, so multiplying
                      it back out by the review count to fake a "sum" and re-smoothing
                      pulled it toward the 4.5 prior all over again: 4.7 → 4.6, and
                      4.5 flat for anyone the doc hadn't been synced for.
                      The doc value IS the number. Show it. */}
                  {therapist && (therapist.reviews ?? 0) > 0
                    ? formatRating(therapist.rating)
                    : "—"}
                </Typography>
                <Typography
                  component="span"
                  sx={{
                    fontFamily: SANS,
                    fontSize: "11.5px",
                    color: "var(--sr-body)",
                  }}
                >
                  {t("booking.reviewsCount", "({{count}} reviews)", {
                    count: therapist?.reviews ?? 0,
                  })}
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "11px",
                  color: "var(--sr-muted)",
                  marginTop: "2px",
                }}
              >
                {dateLabel && form.time
                  ? `${dateLabel} · ${prettyHHMM(form.time)}`
                  : t("booking.pickDateTimeHint", "Pick date & time on the detail page")}
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
                color: "var(--sr-body)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                background: "var(--sr-hairline)",
                borderRadius: "10px",
                padding: "4px 10px",
                "&:hover": { background: "rgba(15, 23, 42, 0.14)" },
              }}
            >
              {t("common.edit", "Edit")}
            </Button>
          </Box>

          {/* Service summary row */}
          <Box
            sx={{
              borderTop: "1px solid var(--sr-hairline)",
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
                  color: "var(--sr-ink)",
                }}
              >
                {service?.name ?? "—"}
              </Typography>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "11.5px",
                  color: "var(--sr-body)",
                  marginTop: "2px",
                }}
              >
                {form.duration
                  ? t("booking.minsShort", "{{n}} min", { n: form.duration })
                  : "—"}
              </Typography>
            </Box>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--sr-ink)",
                letterSpacing: "-0.02em",
                flexShrink: 0,
              }}
            >
              {formatTHB(servicePrice)}
            </Typography>
          </Box>
        </SectionCard>
        </Box>{/* end orderDetails grid area */}

        {/* 🆕 Round 28r49 (founder 2026-07-08 — "Add-ons · บริการเสริม
            เอาออกจากทุกที่ที่มี") — the add-ons customer picker (28s302)
            has been removed. addonsTotal is hardcoded to 0 above and the
            booking doc still writes `addons: []` for backward compat. */}

        {/* 🆕 Founder 2026-05-01 round 8 (founder feedback):
            • Preferences cell ลบ — language defaults to 'en'
            • Deposit info tip ลบ — Travel fee chip below already surfaces
              long-distance / admin-quote state
            • Notes-for-therapist textarea ลบ — keep page focused on the
              must-do (location). Special requests go via admin chat.
            (add-ons re-added above as a real picker, round 28s302) */}

        {/* ─────────── Pricing card (pattern 5A) + sticky desktop sidebar ───────────
            🆕 Round 28r56 — on md+ this Box pins to the right column and
            becomes sticky so guests always see the running total while
            they fill in details on the left. The desktop-only Place
            Order button lives directly below the Pricing card here. */}
        <Box
          sx={{
            gridArea: "pricing",
            minWidth: 0,
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            position: { md: "sticky" },
            top: { md: "76px" },
            // Cap the sidebar so long guests-on-a-tall-screen still see
            // the button without needing to scroll the sidebar itself.
            maxHeight: { md: "calc(100vh - 96px)" },
            overflowY: { md: "auto" },
          }}
        >
        <SectionCard
          label={t("booking.section.pricing", "Pricing")}
          sublabel={t("booking.price", "Price")}
          icon={<PaidRoundedIcon />}
        >
          <PriceRow
            label={`${t("booking.priceRow.serviceFee", "Service fee")}${
              form.duration
                ? ` · ${t("booking.minsShort", "{{n}} min", { n: form.duration })}`
                : ""
            }`}
            value={formatTHB(servicePrice)}
          />
          {/* 🆕 Round 28r49 — Add-ons removed; the PriceRow that showed
              their subtotal is gone with addonsTotal always 0. */}

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
                color: "var(--sr-body)",
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
                {t("booking.distance", "Distance")}:&nbsp;
                <Box component="strong" sx={{ color: "var(--sr-ink)" }}>
                  {distanceIsEstimate ? "≈ " : ""}
                  {distanceKm.toFixed(1)} {t("common.km", "km")}
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
                    {t("booking.liveRoute", "Live route")}
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
                    background: "rgba(217, 124, 149, 0.12)",
                    color: "#D97C95",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    "& svg": { fontSize: 14 },
                  }}
                >
                  <AccessTimeRoundedIcon />
                </Box>
                {t("booking.eta", "ETA")}:&nbsp;
                <Box component="strong" sx={{ color: "var(--sr-ink)" }}>
                  {etaMinutes} {t("common.min", "min")}
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
                    {t("booking.rainEta", "+5 min · rain")}
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
                  color: "var(--sr-body)",
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
                {t("booking.priceRow.travelFee", "Travel fee")}
                {locationSet && taxiResult && taxiResult.tier !== "free" && (
                  <Box
                    component="span"
                    sx={{
                      fontFamily: SANS,
                      fontSize: "10.5px",
                      color: "var(--sr-muted)",
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
                      {t("booking.travelTip.title", "Travel Fee · SunRed Smart Routing")}
                    </Typography>
                    {/* 🆕 28x.48 (founder: "ใช้ราคาจริงแบบเดิม · มิเตอร์จริง + surge") —
                        reverted from flat bands back to the real metered fare, so
                        the tooltip again explains the meter that actually produces
                        the number: round-trip distance + booking fee + surge, with
                        the online saving on top. Long trips route to a quote. */}
                    <Typography sx={{ fontFamily: SANS, fontSize: "11.5px", lineHeight: 1.6 }}>
                      {t("booking.travelTip.meter", "Real metered fare · charged round-trip (both legs) + booking fee, by your actual route.")}
                      <br />
                      &gt; {ADMIN_QUOTE_KM} km ·{" "}
                      {t("booking.conciergeQuote", "Concierge quote")}
                      <Box
                        component="span"
                        sx={{
                          display: "block",
                          marginTop: "6px",
                          fontWeight: 700,
                          color: "var(--sr-ink)",
                        }}
                      >
                        {t("booking.travelTip.online", "Booking online saves you a little off the meter.")}
                      </Box>
                      <Box
                        component="span"
                        sx={{ opacity: 0.85, display: "block", marginTop: "6px" }}
                      >
                        {t(
                          "booking.travelTip.surge",
                          "Rush hours, peak demand & rain may add a surcharge."
                        )}
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
                      ? "var(--sr-ink)"
                      : "var(--sr-muted)",
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
              {/* 🆕 28x.47 — struck standard band fare (the REAL "before" rate,
                  not a fake anchor) when the online saving actually applies. */}
              {locationSet && !adminQuoteRequired && taxiFare > 0 && taxiSave > 0 && taxiOriginal != null && (
                <Typography
                  sx={{
                    fontFamily: SANS,
                    fontSize: "11px",
                    fontWeight: 600,
                    color: "var(--sr-muted)",
                    textDecoration: "line-through",
                  }}
                >
                  {formatTHB(taxiOriginal)}
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
                      : "var(--sr-ink)"
                    : "var(--sr-muted)",
                  fontStyle: locationSet ? "normal" : "italic",
                }}
              >
                {!locationSet
                  ? t("booking.setAddress", "Set address")
                  : adminQuoteRequired
                  ? t("booking.conciergeQuote", "Concierge quote")
                  : taxiFare === 0
                  ? t("booking.free", "FREE")
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
            {/* 🆕 28x.47 — REAL online-booking saving (youPay < band). Honest,
                unlike the 28s308 fake anchor: the struck price above is the
                actual standard band and this is the money genuinely saved. */}
            {locationSet && !adminQuoteRequired && taxiFare > 0 && taxiSave > 0 && (
              <FareChip color="green" icon={<LocalOfferRoundedIcon />}>
                {t("booking.taxiSaved", "You save ฿{{n}} booking online", { n: taxiSave })}
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
                {t(
                  "booking.longDistance",
                  "Long trip · contact the concierge — a deposit may apply"
                )}
              </FareChip>
            )}
          </Box>

          {/* 🆕 Founder 2026-05-01 round 13: Discount code input. No
              backend validation yet — admin verifies and applies it
              manually after seeing the booking in Telegram.
              🆕 Round 28s83 — hidden while PROMOS_ENABLED is off. */}
          {PROMOS_ENABLED && (
          <Box sx={{ marginTop: "10px" }}>
            <TextField
              fullWidth
              size="small"
              placeholder={t("booking.discountPlaceholder", "Discount code (optional)")}
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
                      sx={{ fontSize: 16, color: "var(--sr-body)" }}
                    />
                  </InputAdornment>
                ),
              }}
              sx={{
                "& .MuiOutlinedInput-root": {
                  background: "var(--sr-panel)",
                  borderRadius: "12px",
                  fontFamily: SANS,
                  fontSize: "13.5px",
                  letterSpacing: "0.04em",
                  fontVariantNumeric: "tabular-nums",
                  // 🆕 28x.46 — explicit themed text + placeholder so they stay
                  //   readable on the dark panel (default MUI text was dark-on-dark).
                  color: "var(--sr-ink)",
                  "& input::placeholder": { color: "var(--sr-muted)", opacity: 1 },
                  "& fieldset": { borderColor: "var(--sr-hairline)" },
                  "&:hover fieldset": {
                    borderColor: "rgba(15, 23, 42, 0.40)",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "var(--sr-ink)",
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
                      {t("booking.discountSaves", "{{label}} · saves {{amount}}", {
                        label: discount.label,
                        amount: formatTHB(discount.amount),
                      })}
                    </Typography>
                    {/* 🆕 Round 28r27 — Make taxi-pass-through visible
                        so guests don't expect their travel fee to also
                        be discounted. */}
                    {taxiFare > 0 && (
                      <Typography
                        sx={{
                          fontFamily: SANS,
                          fontSize: "10px",
                          color: "var(--sr-muted)",
                          marginTop: "2px",
                          fontStyle: "italic",
                        }}
                      >
                        {t(
                          "booking.discountTravelNote",
                          "Travel fee ({{fare}}) is at cost — not included in promo.",
                          { fare: formatTHB(taxiFare) }
                        )}
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
                        {t(
                          "booking.discountPremiumBlocked",
                          "Promo codes don't apply to this premium ritual. Use a referral code (SUN-XXXXXX) or chat with the concierge for a custom arrangement."
                        )}
                      </Typography>
                    );
                  }
                  return (
                    <Typography
                      sx={{
                        fontFamily: SANS,
                        fontSize: "10.5px",
                        color: "var(--sr-muted)",
                        fontStyle: "italic",
                      }}
                    >
                      {t(
                        "booking.discountUnknown",
                        "Code not recognised — the concierge can apply custom codes manually after seeing your reservation."
                      )}
                    </Typography>
                  );
                })()}
              </Box>
            )}
          </Box>
          )}

          {/* 🆕 Round 28r14 — Discount row in the price breakdown.
              Only renders when a valid code is applied. Shows the
              code + green amount struck through the subtotal. */}
          {discount.valid && discountAmount > 0 && (
            <Box sx={{ marginTop: "6px" }}>
              <PriceRow
                label={t("booking.priceRow.discount", "Discount · {{code}}", {
                  code: discount.code,
                })}
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

          {/* 🆕 Round 28s77 — WeChat/Alipay transfer surcharge row.
              Only renders when one of those methods is selected.
              🆕 28r121 — flat ฿200 handling retired; row now reads
              "Transfer fee (7%)". */}
          {paymentFee > 0 && (
            <Box sx={{ marginTop: "6px" }}>
              <PriceRow
                label={
                  SURCHARGE_FLAT > 0
                    ? t(
                        "booking.priceRow.paymentFee",
                        "Transfer fee ({{pct}}% + ฿{{flat}})",
                        { pct: SURCHARGE_PCT, flat: SURCHARGE_FLAT }
                      )
                    : t(
                        "booking.priceRow.paymentFeePctOnly",
                        "Transfer fee ({{pct}}%)",
                        { pct: SURCHARGE_PCT }
                      )
                }
                value={`+${formatTHB(paymentFee)}`}
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
                  {t("booking.savedTonight", "You saved tonight")}
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
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <LocalTaxiRoundedIcon sx={{ fontSize: 13 }} />
                    {t("booking.savedRouting", "Smart Routing · {{amount}}", {
                      amount: formatTHB(Math.round(savingsRouting)),
                    })}
                  </Box>
                )}
                {savingsDiscount > 0 && (
                  <Box
                    component="span"
                    sx={{
                      fontFamily: SANS,
                      fontSize: 11,
                      color: "rgba(20, 83, 45, 0.85)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      flexWrap: "wrap",
                    }}
                  >
                    <LocalOfferRoundedIcon sx={{ fontSize: 13 }} />
                    {t("booking.savedDiscount", "{{label}} · {{amount}}", {
                      label: discount.label,
                      amount: formatTHB(Math.round(savingsDiscount)),
                    })}
                    {/* 🆕 Round 28r63 (r59 follow-up) — active tier chip.
                        `discount.label` already reflects the tier's
                        admin-set label (validateDiscount picks it), but a
                        small "tier · N+ redeems" pill adds the earned
                        context so the guest sees WHY they're getting
                        more than the base referral amount. */}
                    {activeReferralTier && (
                      <Box
                        component="span"
                        sx={{
                          fontFamily: SANS,
                          fontSize: 9.5,
                          fontWeight: 800,
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                          padding: "2px 7px",
                          borderRadius: "999px",
                          background: "rgba(22, 163, 74, 0.18)",
                          color: "#15803d",
                          border: "1px solid rgba(22, 163, 74, 0.35)",
                        }}
                      >
                        {t(
                          "booking.referralTierBadge",
                          "Tier · {{count}}+ redeems",
                          { count: activeReferralTier.minRedeems }
                        )}
                      </Box>
                    )}
                  </Box>
                )}
              </Box>
            </Box>
          )}

          <Box
            sx={{
              borderTop: "1px solid var(--sr-hairline)",
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
              {t("common.total", "Total")}
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
                    color: "var(--sr-muted)",
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
                    color: "var(--sr-muted)",
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
                  color: "var(--sr-body)",
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
                        "drop-shadow(0 0 0 rgba(45, 45, 43, 0))",
                    },
                    "40%": {
                      transform: "scale(1.04)",
                      filter:
                        "drop-shadow(0 0 8px rgba(15, 23, 42, 0.45))",
                    },
                    "100%": {
                      transform: "scale(1)",
                      filter:
                        "drop-shadow(0 0 0 rgba(45, 45, 43, 0))",
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
                color: "var(--sr-muted)",
                marginTop: "6px",
                fontStyle: "italic",
              }}
            >
              {t("booking.totalPendingAddress", "Total updates when address is set.")}
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
                  "var(--sr-hairline)",
                border: "1px dashed rgba(15, 23, 42, 0.40)",
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
                    background: "var(--sr-panel)",
                    borderRadius: "10px",
                    fontFamily: SANS,
                    fontSize: "14px",
                    fontVariantNumeric: "tabular-nums",
                    // 🆕 28x.46 — readable text + placeholder on the dark panel.
                    color: "var(--sr-ink)",
                    "& input::placeholder": { color: "var(--sr-muted)", opacity: 1 },
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
                        color: "var(--sr-muted)",
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

        {/* 🆕 Round 28r56 — Desktop-only in-flow Place Order button.
            On mobile the sticky bottom ConfirmBar is the primary CTA
            (see below, hidden on md+). On desktop the ConfirmBar is
            hidden and THIS button in the sticky sidebar becomes the
            primary submit surface — same onClick / disabled logic as
            ConfirmBar so behavior stays identical across breakpoints. */}
        <Button
          onClick={() => void handleSubmit()}
          disabled={!canPlaceOrder || submitting}
          sx={{
            display: { xs: "none", md: "flex" },
            height: 52,
            borderRadius: "999px",
            background: "#D97C95",
            color: "#fff",
            fontFamily: SANS,
            fontSize: "15px",
            fontWeight: 700,
            letterSpacing: "0.02em",
            textTransform: "none",
            boxShadow: "0 6px 20px rgba(217, 124, 149, 0.40)",
            "&:hover": {
              background: "#C96F89",
              boxShadow: "0 10px 26px rgba(217, 124, 149, 0.46)",
            },
            "&.Mui-disabled": {
              background: "var(--sr-panel-2)",
              color: "var(--sr-muted)",
              boxShadow: "none",
            },
          }}
        >
          {/* 🚨 Round 28r69 — Founder direction "ทุกอย่างที่เป็นปุ่ม
              ให้เอาภาษาไทยออก" (2026-07-08). r61 Thai subtitle removed
              from every primary CTA button; button label English-only.
              Section headers/eyebrows keep their Thai subtitle. */}
          {submitting
            ? t("booking.placing", "Placing…")
            : t("booking.placeOrder", "Confirm Reservation")}
        </Button>
        </Box>{/* end pricing sticky sidebar */}

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
            gridArea: "payment",
            minWidth: 0,
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "14px 16px",
            borderRadius: "16px",
            background: "var(--sr-panel)",
            border: "1px solid var(--sr-panel)",
            boxShadow: "var(--sr-card-shadow)",
            cursor: "pointer",
            transition: "background 0.15s ease",
            "&:hover": { background: "var(--sr-panel)" },
            "&:focus-visible": {
              outline: "2px solid var(--sr-ink)",
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
              background: "var(--sr-hairline)",
              color: "var(--sr-body)",
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
                color: "var(--sr-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginBottom: "2px",
              }}
            >
              {t("booking.paymentDetail", "Payment detail")}
              {/* 🆕 Round 28r61 — bilingual pass: tiny Thai inline. */}
              <Box
                component="span"
                sx={{
                  fontWeight: 500,
                  color: "var(--sr-muted)",
                  marginLeft: "6px",
                  letterSpacing: "0.02em",
                  textTransform: "none",
                }}
              >
                · {t("booking.payment", "Payment")}
              </Box>
            </Typography>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: "15px",
                fontWeight: 600,
                color: "var(--sr-ink)",
                lineHeight: 1.2,
              }}
            >
              {PAYMENT_LABELS[paymentMethod]}
            </Typography>
          </Box>
          <ChevronRightRoundedIcon
            sx={{ color: "var(--sr-muted)", fontSize: 22 }}
          />
        </Box>

        {/* ─────────── Cancellation policy ─────────── */}
        <Typography
          sx={{
            gridArea: "policy",
            minWidth: 0,
            fontFamily: SANS,
            fontSize: "10.5px",
            color: "var(--sr-muted)",
            lineHeight: 1.5,
            padding: "0 8px",
          }}
        >
          <Box component="span" sx={{ fontWeight: 700 }}>
            {t("booking.cancellation.label", "Cancellation")}:
          </Box>{" "}
          {t(
            "booking.cancellation.body",
            "Free up to 30 minutes before your reservation. After that, 50% of the service fee."
          )}
        </Typography>
        {/* 🆕 Round 28s104 (conversion) — discretion reassurance at the
            decision moment; trust is everything for this guest. */}
        <Typography
          sx={{
            gridArea: "discreet",
            minWidth: 0,
            fontFamily: SANS,
            fontSize: "10.5px",
            color: "rgba(22, 163, 74, 0.85)",
            fontWeight: 600,
            lineHeight: 1.5,
            padding: "6px 8px 0",
          }}
        >
          {t(
            "booking.discreetNote",
            "Discreet arrival · plain-card billing · your details stay private.",
          )}
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
