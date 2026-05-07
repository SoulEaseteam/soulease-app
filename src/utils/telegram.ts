import { getFunctions, httpsCallable } from "firebase/functions";
import { app as firebaseApp } from "@/lib/firebase";
import { fmtBKK } from "@/utils/time";

/**
 * Escape Telegram MarkdownV2 (ครบ spec)
 */
export function escapeMd(s = ""): string {
  if (!s) return "—";
  return s.replace(/[_*[\]()~`>#+=|{}.!-]/g, "\\$&");
}

/**
 * Build Google Maps URL (priority logic)
 *
 * 🆕 Round 28b54 (founder 2026-05-05) — Prioritise the Places-search
 *   format whenever a POI name is available, because Telegram's link
 *   preview unfurls the search URL into a clean card with the place's
 *   photo + address, whereas the older `?q=lat,lng(label)` form gives
 *   a generic "Google Maps" card with no thumbnail.
 *
 *   Order:
 *     1. Explicit `mapUrl` (e.g. a real Place link from the search box).
 *     2. `locationName` is a real POI (different from `address`)
 *        → search URL by place name (best Telegram preview).
 *     3. `lat/lng` available → coords + label fallback (always opens
 *        the exact pin even if the name is generic).
 *     4. `locationName` (even if same as address) → search URL.
 *     5. `address` → search URL.
 */
function buildMapUrl(p: NotifyPayload): string {
  // 1. ใช้ mapUrl ถ้ามี (ดีที่สุด เช่น place link / short link)
  if (p.mapUrl?.trim()) {
    return p.mapUrl;
  }

  const norm = (s: string | null | undefined) =>
    (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  const isPoiName =
    !!p.locationName?.trim() &&
    norm(p.locationName) !== norm(p.address);

  // 2. POI name → search URL (Telegram unfurls into a rich card)
  //    e.g. "Mercure Bangkok Sukhumvit 11" → maps/search/?api=1&query=...
  if (isPoiName) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      p.locationName!
    )}`;
  }

  // 3. lat/lng + label — pin-accurate fallback for plain addresses
  if (p.lat && p.lng) {
    const label = p.locationName || p.address || "Location";
    return `https://www.google.com/maps?q=${p.lat},${p.lng}(${encodeURIComponent(
      label
    )})`;
  }

  // 4. locationName (same as address) → search URL
  if (p.locationName?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      p.locationName
    )}`;
  }

  // 5. address → search URL
  if (p.address?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      p.address
    )}`;
  }

  return "";
}

/**
 * Payload
 */
interface NotifyPayload {
  bookingId: string;
  therapistName: string | null;
  serviceName: string;
  duration: number;
  date: string;
  time: string;
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
  payment?: string | null;
  language: string;
  addons: { name: string; price: number }[];
  rainTier: string;
  meetingPoint: string | null;
  locationType: string | null;
  mapUrl: string | null;
  discountCode?: string | null;
  // 🆕 Round 28r14 — Discount apply logic surfaces these on the
  //   admin Telegram so the operator sees what was applied without
  //   needing to recompute. discountAmount stays in THB, label is
  //   the human-friendly description ("First booking — 10% off").
  discountAmount?: number | null;
  discountLabel?: string | null;
  subtotalPrice?: number | null;
  lat?: number | null;
  lng?: number | null;
}

/**
 * Send to Firebase Function
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
    console.error("[telegram] notifyBooking failed:", err);
  }
}

function formatMessage(p: NotifyPayload): string {
  const date24 = fmtBKK(p.startAt, "DD/MM/YYYY");
  const time24 = fmtBKK(p.startAt, "HH:mm");

  const divider = "────────────────────";

  // Address: prefer placeName (POI), fall back to address
  const norm  = (s: string | null | undefined) => (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  const place = p.locationName?.trim() || p.address?.trim() || "";
  const extra = p.address?.trim() && norm(p.address) !== norm(p.locationName) ? p.address.trim() : "";
  const addressLine = [place, extra].filter(Boolean).join(", ") || "—";
  const meetingLine = p.meetingPoint ? `\nMeeting: 👉🏻 ${escapeMd(p.meetingPoint)}` : "";

  // Map URL (raw — Telegram previews raw URLs only)
  const finalMapUrl = buildMapUrl(p);
  const mapBlock = finalMapUrl ? `🗺️ Map:\n${finalMapUrl}` : "🗺️ Map: —";

  const lines: (string | null)[] = [
    `${escapeMd(date24)} ${escapeMd(time24)}`,
    `🧾 Booking ID: ${escapeMd(`SR-${p.bookingId.slice(0, 8).toUpperCase()}`)}`,
    "",

    `Therapist: ${escapeMd(p.therapistName ?? "—")}`,
    `Time: ${escapeMd(time24)}`,

    divider,
    `📍 Address: ${escapeMd(addressLine)}${meetingLine}`,
    "",

    `Service: ${escapeMd(p.serviceName)}`,
    `Duration: ${p.duration} min`,
    `Price: ${p.servicePrice.toLocaleString()} ฿`,
    "",

    `🚖 Taxi: ${p.taxiFee.toLocaleString()} ฿`,
    `💰 Total: ${p.total.toLocaleString()} ฿`,
    "",

    `📞 Phone: ${escapeMd(p.phone)}`,
    `👤 Name: ${escapeMd(p.contactName)}`,
    `Note: ${p.note ? escapeMd(p.note) : "\\-"}`,

    divider,
    mapBlock,
  ];

  return lines.filter((l) => l !== null).join("\n");
}