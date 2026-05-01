// src/utils/telegram.ts
//
// 📱 Client wrapper for the `notifyBooking` Cloud Function.
//
// Sends a formatted Telegram message to the SunRed staff chat whenever
// a booking is created. Token + chat id live as Firebase secrets in
// functions/src/index.ts — never sent from the client.
//
// Failure is fail-open: if Telegram delivery fails (token missing,
// network error, etc.) we log and return; we do NOT throw, because
// the booking has already been written to Firestore and we shouldn't
// bounce the user back to the form just because Telegram is flaky.

import { getFunctions, httpsCallable } from "firebase/functions";
import { app as firebaseApp } from "@/lib/firebase";
import dayjs from "dayjs";

/**
 * Telegram MarkdownV2 escape — covers the special characters we
 * emit in our booking template. Mirrors the legacy `escapeMd` used
 * by the old BookingPage.tsx.
 */
export function escapeMd(s = ""): string {
  return s
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*")
    .replace(/\[/g, "\\[")
    .replace(/`/g, "\\`");
}

/**
 * Build a Google Maps deep link from name/address/coords.
 * Matches the legacy buildGoogleMapsUrl helper.
 */
export function buildGoogleMapsUrl(
  name: string | null,
  address: string | null,
  lat: number | null,
  lng: number | null
): string {
  const base = "https://www.google.com/maps/search/?api=1&query=";
  if (name?.trim()) return base + encodeURIComponent(name);
  if (address?.trim()) return base + encodeURIComponent(address);
  if (lat != null && lng != null) return base + `${lat},${lng}`;
  return "";
}

interface NotifyPayload {
  bookingId: string;
  therapistName: string | null;
  serviceName: string;
  duration: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  startAt: Date;
  locationName: string | null;
  address: string | null;
  addressDetails: string;
  contactName: string;
  phone: string;
  note: string;
  servicePrice: number;
  taxiFee: number;
  total: number;
  distanceKm: number;
  payment: string | null;
  language: string;
  addons: { name: string; price: number }[];
  rainTier: string;
  meetingPoint: string | null;
  locationType: string | null;
  mapUrl: string | null;
}

/**
 * Format the booking into a Telegram message body, then ship it via
 * the `notifyBooking` callable. Never throws — logs to console on
 * failure so booking flow always completes.
 */
export async function sendBookingNotification(
  payload: NotifyPayload
): Promise<void> {
  const message = formatMessage(payload);
  try {
    const functions = getFunctions(firebaseApp, "asia-southeast1");
    const notifyBooking = httpsCallable<
      { message: string },
      { ok: boolean }
    >(functions, "notifyBooking");
    await notifyBooking({ message });
  } catch (err) {
    // Fail-open — booking is already in Firestore, just log.
    console.error("[telegram] notifyBooking failed:", err);
  }
}

function formatMessage(p: NotifyPayload): string {
  const when = dayjs(p.startAt).format("DD/MM/YYYY HH:mm");
  const map = p.mapUrl || buildGoogleMapsUrl(p.locationName, p.address, null, null);
  const addonsLine =
    p.addons.length === 0
      ? "—"
      : p.addons
          .map((a) => `${escapeMd(a.name)} (+${a.price.toLocaleString()}฿)`)
          .join(", ");
  const lines = [
    `🆕 *New Booking* · ${escapeMd(when)}`,
    `🧾 ID: \`${p.bookingId}\``,
    "",
    `Therapist: ${escapeMd(p.therapistName ?? "—")}`,
    `Service: ${escapeMd(p.serviceName)} · ${p.duration} min`,
    `When: ${escapeMd(p.date)} · ${escapeMd(p.time)}`,
    p.rainTier !== "none" ? `Weather: ${escapeMd(p.rainTier)} (surcharge applied)` : null,
    "────────────────────",
    `📍 ${escapeMd(p.locationName ?? "—")}`,
    `   ${escapeMd(p.address ?? "—")}`,
    p.addressDetails ? `   ${escapeMd(p.addressDetails)}` : null,
    p.meetingPoint ? `   Meeting: ${escapeMd(p.meetingPoint)}` : null,
    p.locationType ? `   Type: ${escapeMd(p.locationType)}` : null,
    `   Distance: ${p.distanceKm.toFixed(1)} km`,
    "────────────────────",
    `Contact: ${escapeMd(p.contactName)}`,
    `Phone: ${escapeMd(p.phone)}`,
    `Language: ${escapeMd(p.language)}`,
    `Add-ons: ${addonsLine}`,
    p.note ? `Note: ${escapeMd(p.note)}` : null,
    "────────────────────",
    `💼 Service: ${p.servicePrice.toLocaleString()}฿`,
    `🚖 Taxi: ${p.taxiFee.toLocaleString()}฿`,
    `💰 Total: ${p.total.toLocaleString()}฿`,
    `Payment: ${escapeMd(p.payment ?? "—")}`,
    map ? `🗺️ ${map}` : null,
  ].filter(Boolean);
  return lines.join("\n");
}
