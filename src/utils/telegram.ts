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
 */
function buildMapUrl(p: NotifyPayload): string {
  // 1. ใช้ mapUrl ถ้ามี (ดีที่สุด เช่น place link / short link)
  if (p.mapUrl && p.mapUrl.trim()) {
    return p.mapUrl;
  }

  // 2. ใช้ lat/lng + label (ช่วยให้ preview สวยขึ้น)
  if (p.lat && p.lng) {
    const label = p.locationName || p.address || "Location";
    return `https://www.google.com/maps?q=${p.lat},${p.lng}(${encodeURIComponent(
      label
    )})`;
  }

  // 3. fallback → search จากชื่อ
  if (p.locationName?.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      p.locationName
    )}`;
  }

  // 4. fallback → address
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

/**
 * Format Telegram message
 */
function formatMessage(p: NotifyPayload): string {
  // เวลา
  const when = fmtBKK(p.startAt, "DD/MM/YYYY HH:mm A");
  const bookingTime = fmtBKK(p.startAt, "YYYY-MM-DD HH:mm A");

  // map
  const finalMapUrl = buildMapUrl(p);

  const divider = "___________________________________";

  /**
   * Address block.
   * 🆕 Round 28b31 (founder 2026-05-04) — De-duplicate: when the
   *   customer's selected `locationName` (e.g. "Marriott Sukhumvit")
   *   is just the same string as the formatted `address`, don't
   *   print both — admin saw the same line twice in the original bug
   *   report. We compare normalized (whitespace-stripped, lowercase).
   */
  const addressLines: string[] = [];
  const normalizeForCmp = (s: string | null | undefined) =>
    (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();

  if (p.locationName) addressLines.push(escapeMd(p.locationName));
  if (
    p.address &&
    normalizeForCmp(p.address) !== normalizeForCmp(p.locationName)
  ) {
    addressLines.push(escapeMd(p.address));
  }
  if (
    p.addressDetails &&
    normalizeForCmp(p.addressDetails) !== normalizeForCmp(p.address) &&
    normalizeForCmp(p.addressDetails) !== normalizeForCmp(p.locationName)
  ) {
    addressLines.push(escapeMd(p.addressDetails));
  }

  let addressBlock =
    addressLines.length > 0 ? addressLines.join("\n") : "—";

  if (p.meetingPoint) {
    addressBlock += `\n\nMeeting: 👉🏻 ${escapeMd(p.meetingPoint)}`;
  }

  /**
   * Add-ons
   */
  const addonsLine =
    p.addons.length > 0
      ? p.addons
          .map(
            (a) =>
              `${escapeMd(a.name)} (+${a.price.toLocaleString()}฿)`
          )
          .join(", ")
      : null;

  /**
   * Map line (clickable)
   */
  const mapLine = finalMapUrl
    ? `🗺 Map: [Open Location](${finalMapUrl})`
    : "🗺 Map: —";

  /**
   * Message lines
   */
  const lines: (string | null)[] = [
    `${escapeMd(when)} (เวลาจอง)`,
    `🧾 Booking ID: \`${escapeMd(p.bookingId)}\``,
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
    `Price: ${p.servicePrice.toLocaleString()}฿`,

    addonsLine ? `Add-ons: ${addonsLine}` : null,
    "",

    `🚖 Taxi: ${p.taxiFee.toLocaleString()}฿`,
    `💰 Total: ${p.total.toLocaleString()}฿`,

    p.discountCode
      ? `💸 Discount: \`${escapeMd(p.discountCode)}\``
      : null,

    p.rainTier !== "none"
      ? `🌧 Weather: ${escapeMd(
          p.rainTier
        )} (surcharge applied)`
      : null,

    divider,
    "",

    `👤 Customer Name: ${escapeMd(p.contactName)}`,
    `📞 Phone: ${escapeMd(p.phone)}`,
    `Note: ${p.note ? escapeMd(p.note) : "—"}`,

    divider,
    "",

    mapLine,
  ];

  return lines.filter((l) => l !== null).join("\n");
}