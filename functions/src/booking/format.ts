// functions/src/booking/format.ts
//
// Telegram message formatting for booking notifications. The whole
// attribution chain (DIAL_TO_COUNTRY → countryFromPhone → attributionLine)
// is consumed only by formatBookingForAdmin below, so it stays private to
// this module.

import { Timestamp } from "firebase-admin/firestore";

export interface BookingDocLite {
  therapistId?: string;
  therapistName?: string;
  serviceName?: string;
  duration?: number;
  date?: string;
  time?: string;
  contactName?: string;
  phone?: string;
  address?: string;
  // 🆕 Round 28s228 — fields needed for the clean admin layout.
  locationName?: string;
  meetingPoint?: string;
  note?: string;
  servicePrice?: number;
  taxiFee?: number;
  totalPrice?: number;
  language?: string;
  payment?: string;
  // 🆕 Round 28s81 — WeChat/Alipay service charge (0 / absent otherwise).
  paymentFee?: number;
  holdState?: string;
  holdExpiresAt?: Timestamp;
  mapUrl?: string;
  // 🆕 Round 28s229 — marketing attribution (captured client-side at first
  //   touch). Surfaced on the admin message so View sees where each order
  //   came from. Country is derived from the phone dial code below.
  attributionSource?: string;
  utmSource?: string;
  utmCampaign?: string;
  landingPath?: string;
  referrerHost?: string;
}

// 🆕 Round 28s229 — country from E.164 phone dial code (the markets that
//   matter for SunRed). Longest code wins. Returns null when the number has
//   no "+" prefix (can't tell) so we never show a wrong flag.
const DIAL_TO_COUNTRY: ReadonlyArray<readonly [string, string, string]> = [
  ["+852", "HK", "🇭🇰"], ["+853", "MO", "🇲🇴"], ["+886", "TW", "🇹🇼"],
  ["+971", "AE", "🇦🇪"], ["+972", "IL", "🇮🇱"], ["+855", "KH", "🇰🇭"],
  ["+856", "LA", "🇱🇦"],
  ["+66", "TH", "🇹🇭"], ["+86", "CN", "🇨🇳"], ["+82", "KR", "🇰🇷"],
  ["+81", "JP", "🇯🇵"], ["+65", "SG", "🇸🇬"], ["+60", "MY", "🇲🇾"],
  ["+91", "IN", "🇮🇳"], ["+61", "AU", "🇦🇺"], ["+44", "GB", "🇬🇧"],
  ["+49", "DE", "🇩🇪"], ["+33", "FR", "🇫🇷"], ["+84", "VN", "🇻🇳"],
  ["+62", "ID", "🇮🇩"], ["+63", "PH", "🇵🇭"], ["+95", "MM", "🇲🇲"],
  ["+1", "US/CA", "🇺🇸"], ["+7", "RU/KZ", "🇷🇺"],
];

function countryFromPhone(phone?: string): { code: string; flag: string } | null {
  if (!phone) return null;
  const norm = phone.replace(/[^\d+]/g, "");
  if (!norm.startsWith("+")) return null;
  for (const [dial, code, flag] of DIAL_TO_COUNTRY) {
    if (norm.startsWith(dial)) return { code, flag };
  }
  return null;
}

// Build the "🌐 Source: …" line — channel · country · landing page.
function attributionLine(b: BookingDocLite): string | null {
  const parts: string[] = [];
  const src = b.attributionSource?.trim();
  if (src && src !== "direct") {
    parts.push(b.utmCampaign?.trim() ? `${src} (${b.utmCampaign.trim()})` : src);
  } else if (src === "direct") {
    parts.push("direct");
  }
  const country = countryFromPhone(b.phone);
  if (country) parts.push(`${country.flag} ${country.code}`);
  if (b.landingPath?.trim()) parts.push(b.landingPath.trim());
  return parts.length ? `🌐 Source: ${parts.join(" · ")}` : null;
}

// 🆕 Round 28s228 (founder: "ให้บอทส่งแบบนี้") — clean, structured admin
//   booking message. Plain text (sendTelegram has no parse_mode, so NO
//   markdown escaping — backslashes would show literally). Dropped the
//   confusing "Customer hold — confirm before it expires" line: orders now
//   surface in the dashboard's Needs-Confirmation tab (Round 28s227), so the
//   Telegram message is a clean notification, not an action prompt.
export const formatBookingForAdmin = (
  bookingId: string,
  b: BookingDocLite
): string => {
  const refCode = `SR-${bookingId.slice(0, 8).toUpperCase()}`;
  const divider = "────────────────────";

  // Address: prefer the POI/place name, append the street address if it
  //   differs (so the operator sees both "Rosewood Bangkok" and the road).
  const norm = (s?: string) => (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  const place = b.locationName?.trim() || b.address?.trim() || "—";
  const extra =
    b.address?.trim() && norm(b.address) !== norm(b.locationName)
      ? b.address.trim()
      : "";
  const addressLine = [place, extra].filter(Boolean).join(", ");

  // Map link: explicit mapUrl, else a Places search on name/address.
  const mapUrl =
    b.mapUrl?.trim() ||
    (place && place !== "—"
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          place
        )}`
      : "");

  const lines: (string | null)[] = [
    `${b.date ?? "—"} ${b.time ?? "—"}`,
    `🧾 Booking ID: ${refCode}`,
    "",
    `Therapist: ${b.therapistName ?? "—"}`,
    `Time: ${b.time ?? "—"}`,
    divider,
    `📍 Address: ${addressLine}`,
    b.meetingPoint?.trim() ? `Meeting: 👉🏻 ${b.meetingPoint.trim()}` : null,
    "",
    `Service: ${b.serviceName ?? "—"}`,
    `Duration: ${b.duration ?? "?"} min`,
    `Price: ${(b.servicePrice ?? 0).toLocaleString()} ฿`,
    "",
    `🚖 Taxi: ${(b.taxiFee ?? 0).toLocaleString()} ฿`,
    // Payment method kept (cash vs WeChat/Alipay changes the operation).
    `💳 Payment: ${b.payment ?? "Cash"}`,
    b.paymentFee && b.paymentFee > 0
      ? `   ↳ incl. service charge ${b.paymentFee.toLocaleString()} ฿`
      : null,
    `💰 Total: ${(b.totalPrice ?? 0).toLocaleString()} ฿`,
    "",
    `📞 Phone: ${b.phone ?? "—"}`,
    `👤 Name: ${b.contactName ?? "—"}`,
    `Note: ${b.note?.trim() ? b.note.trim() : "-"}`,
    attributionLine(b),
    divider,
    `🗺️ Map: ${mapUrl || "—"}`,
  ];
  return lines.filter((l) => l !== null).join("\n");
};


export const formatBookingForTherapist = (
  bookingId: string,
  b: BookingDocLite
): string => {
  const refCode = `SR-${bookingId.slice(0, 8).toUpperCase()}`;
  const mapLink = b.mapUrl
    ? `🗺 Map: ${b.mapUrl}`
    : b.address
      ? `🗺 Map: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          b.address
        )}`
      : "";
  const lines = [
    `🔔 NEW JOB · ${refCode}`,
    "",
    `🧖 ${b.serviceName ?? "—"} · ${b.duration ?? "?"} min`,
    `📅 ${b.date ?? "—"}  🕐 ${b.time ?? "—"}`,
    `📍 ${b.address ?? "—"}`,
    mapLink,
    `📞 Customer: ${b.phone ?? "—"}`,
    `🌐 Lang: ${b.language ?? "—"}`,
    "",
    `Reply ACCEPT or DECLINE within 5 min.`,
    `Or call admin if you can't read this message.`,
  ].filter((l) => l.length > 0);
  return lines.join("\n");
};
