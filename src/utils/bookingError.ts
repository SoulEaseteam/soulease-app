// src/utils/bookingError.ts
//
// 🆕 Round 28r18 (founder 2026-05-07) — Booking-flow error capture.
//
// Why this exists:
//   The founder kept seeing customers say "tried to reserve online but
//   doesn't work" via Telegram chat — and we had no way to know what
//   actually broke. console.error in the browser is invisible to View.
//
//   This helper writes a single Firestore doc per failed booking
//   submit, capturing enough context for View to triage from the
//   admin panel without bothering the customer for repro steps.
//
// What it captures (no PII beyond what booking docs already store):
//   • errorMessage / errorName / errorStack (truncated to 1KB)
//   • therapistId / serviceId / duration / date / time
//   • locationName + address (truncated)
//   • paymentMethod label
//   • userAgent + viewport size + locale + concierge mode
//   • timestamp
//
// What it does NOT capture:
//   • Customer phone / contact name (PII; admin can pull from
//     abandoned_bookings instead if they need to reach out)
//   • Full address details / addressNote (might leak room numbers)
//   • Discount code (irrelevant to error triage)

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const TRUNC = (s: string | null | undefined, max = 1000): string =>
  (s ?? "").slice(0, max);

interface BookingErrorContext {
  therapistId?: string | null;
  serviceId?: string | null;
  duration?: number | null;
  date?: string | null;
  time?: string | null;
  locationName?: string | null;
  address?: string | null;
  paymentMethod?: string | null;
  /** Step where the failure happened — submit / validation / notify. */
  step?: string;
}

/**
 * Persist a booking-flow error to Firestore for admin triage.
 * Fail-and-forget: if Firestore itself is broken, we won't make
 * things worse by throwing — just swallow and console.error.
 */
export function logBookingError(
  err: unknown,
  ctx: BookingErrorContext = {}
): void {
  if (typeof window === "undefined") return;

  // Always echo to console for the developer / live debug session.
  // eslint-disable-next-line no-console
  console.error("[booking-error]", err, ctx);

  const error = err instanceof Error ? err : new Error(String(err));

  // Detect concierge mode at fire time so admin can correlate
  // "all errors happen at 23:00 prime hours" type patterns.
  const hour = new Date().getUTCHours() + 7; // BKK is UTC+7
  const bkkHour = ((hour % 24) + 24) % 24;
  const mode =
    bkkHour >= 22 || bkkHour < 4
      ? "prime"
      : bkkHour >= 4 && bkkHour < 9
      ? "off"
      : bkkHour >= 17 && bkkHour < 22
      ? "evening"
      : "day";

  void addDoc(collection(db, "booking_errors"), {
    errorName: TRUNC(error.name, 200),
    errorMessage: TRUNC(error.message, 1000),
    errorStack: TRUNC(error.stack, 1500),
    step: ctx.step ?? "submit",
    therapistId: ctx.therapistId ?? null,
    serviceId: ctx.serviceId ?? null,
    duration: ctx.duration ?? null,
    date: ctx.date ?? null,
    time: ctx.time ?? null,
    locationName: TRUNC(ctx.locationName, 200) || null,
    address: TRUNC(ctx.address, 200) || null,
    paymentMethod: ctx.paymentMethod ?? null,
    // Non-PII browser context for triage.
    userAgent: TRUNC(navigator.userAgent, 400),
    viewport:
      typeof window !== "undefined"
        ? `${window.innerWidth}x${window.innerHeight}`
        : null,
    lang: navigator.language ?? null,
    online: navigator.onLine,
    mode,
    path: window.location.pathname,
    ts: serverTimestamp(),
  }).catch((writeErr) => {
    // Even the error log failed — don't recurse, just console.
    // eslint-disable-next-line no-console
    console.error("[booking-error] failed to persist:", writeErr);
  });
}
