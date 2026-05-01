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
  /** Optional — payment is now collected via admin chat (founder 2026-05-01). */
  payment?: string | null;
  language: string;
  addons: { name: string; price: number }[];
  rainTier: string;
  meetingPoint: string | null;
  locationType: string | null;
  mapUrl: string | null;
  /** 🆕 Round 13 (founder 2026-05-01): customer-entered discount code,
   *  admin verifies + applies after booking. Null when not entered. */
  discountCode?: string | null;
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

/**
 * 🆕 Founder 2026-05-01 round 13: rewrite Telegram template to match
 * the founder's reference layout. Sections separated by 35× underscore
 * lines so the message reads cleanly on Telegram clients of any width.
 *
 * Template:
 *
 *   dd/mm/yyyy hh:mm AM/PM (เวลาจอง)
 *   🧾 Booking ID: <id>
 *
 *   Therapist: <name>
 *   Booking Time: <YYYY-MM-DD HH:mm>
 *   ___________________________________
 *
 *   📍 Address:
 *   <full address>
 *
 *   Service: <name>
 *   Duration: <X> minute
 *   Payment: Cash
 *   Price: ฿<price>
 *
 *   🚖 Taxi: ฿<fee>
 *   💰 Total: ฿<total>
 *   [💸 Discount: <code>]    ← only when present
 *   ___________________________________
 *
 *   👤 Contact Person: <name>
 *   📞 Phone: <phone>
 *   Note: <note>
 *   ___________________________________
 *
 *   🗺 Map: <url>
 */
function formatMessage(p: NotifyPayload): string {
  const when = dayjs(p.startAt).format("DD/MM/YYYY hh:mm A");
  const bookingTime = `${p.date} · ${p.time}`;
  const map =
    p.mapUrl || buildGoogleMapsUrl(p.locationName, p.address, null, null);
  const divider = "___________________________________";

  // Build full address: name + address + addressDetails (room/floor)
  const addressLines: string[] = [];
  if (p.locationName) addressLines.push(escapeMd(p.locationName));
  if (p.address) addressLines.push(escapeMd(p.address));
  if (p.addressDetails) addressLines.push(escapeMd(p.addressDetails));
  if (p.meetingPoint) addressLines.push(`Meeting: ${escapeMd(p.meetingPoint)}`);
  const addressBlock =
    addressLines.length > 0 ? addressLines.join("\n") : "—";

  // Add-ons line (only when present)
  const addonsLine =
    p.addons.length > 0
      ? p.addons
          .map((a) => `${escapeMd(a.name)} (+${a.price.toLocaleString()}฿)`)
          .join(", ")
      : null;

  const lines: (string | null)[] = [
    `${escapeMd(when)} (เวลาจอง)`,
    `🧾 Booking ID: \`${p.bookingId}\``,
    "",
    `Therapist: ${escapeMd(p.therapistName ?? "—")}`,
    `Booking Time: ${escapeMd(bookingTime)}`,
    divider,
    "",
    `📍 Address:`,
    addressBlock,
    "",
    `Service: ${escapeMd(p.serviceName)}`,
    `Duration: ${p.duration} minute`,
    `Payment: ${escapeMd(p.payment ?? "Cash")}`,
    `Price: ฿${p.servicePrice.toLocaleString()}`,
    addonsLine ? `Add-ons: ${addonsLine}` : null,
    "",
    `🚖 Taxi: ฿${p.taxiFee.toLocaleString()}`,
    `💰 Total: ฿${p.total.toLocaleString()}`,
    p.discountCode ? `💸 Discount: \`${escapeMd(p.discountCode)}\`` : null,
    p.rainTier !== "none"
      ? `🌧 Weather: ${escapeMd(p.rainTier)} (surcharge applied)`
      : null,
    divider,
    "",
    `👤 Contact Person: ${escapeMd(p.contactName)}`,
    `📞 Phone: ${escapeMd(p.phone)}`,
    p.note ? `Note: ${escapeMd(p.note)}` : `Note: —`,
    `Language: ${escapeMd(p.language)}`,
    divider,
    "",
    map ? `🗺 Map: ${map}` : null,
  ];
  return lines.filter((l) => l !== null).join("\n");
}
