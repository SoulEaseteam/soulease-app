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
  if (p.mapUrl && p.mapUrl.trim()) {
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
  // 🆕 Round 28b57 (founder 2026-05-05) — Dual time format.
  //   Therapists in Thailand read 24h ("21:30 น.") but Western
  //   customers / OTAs read 12h ("9:30 PM"). Showing both inline
  //   removes the AM/PM ambiguity that was making the night-shift
  //   staff misread booking start times. Pattern:
  //
  //     05/05/2026 · 9:30 PM (เวลาไทย 21:30 น.)
  //
  //   Note: previous format used `HH:mm A` which produced the
  //   awkward "21:30 PM" — we now compose `h:mm A` (12h) plus
  //   `HH:mm` (24h) separately and join them so each is correct.
  const datePart = fmtBKK(p.startAt, "DD/MM/YYYY");
  const time12 = fmtBKK(p.startAt, "h:mm A");
  const time24 = fmtBKK(p.startAt, "HH:mm");
  const when = `${datePart} · ${time12} (เวลาไทย ${time24} น.)`;
  const bookingTime = `${time12} (เวลาไทย ${time24} น.)`;

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
   * 🆕 Round 28b55 (founder 2026-05-05) — Two-line map block:
   *
   *   📍 Mercure Bangkok Sukhumvit 11
   *   https://www.google.com/maps/search/?api=1&query=Mercure+Bangkok+...
   *
   * Why two lines + raw URL?
   *   • Telegram only generates a rich link preview (photo + place
   *     name + address card) when the URL appears RAW in the message,
   *     not when it's wrapped in MarkdownV2 `[label](url)` syntax.
   *   • Bot must call sendMessage with `disable_web_page_preview: false`
   *     for the unfurl to render — see functions/src/index.ts.
   *
   * The first line uses the locationName (POI), falling back to the
   * address. The URL must NOT be MarkdownV2-escaped (raw HTTP URL),
   * so we write it AFTER all other escaped text and don't pass it
   * through escapeMd.
   */
  const mapLabel = p.locationName || p.address || "Location";
  const mapBlock = finalMapUrl
    ? `📍 ${escapeMd(mapLabel)}\n${finalMapUrl}`
    : "📍 —";

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

    mapBlock,
  ];

  return lines.filter((l) => l !== null).join("\n");
}