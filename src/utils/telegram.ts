// src/utils/telegram.ts

import { getFunctions, httpsCallable } from "firebase/functions";
import { app as firebaseApp } from "@/lib/firebase";
import { fmtBKK } from "@/utils/time";

/**
 * Telegram MarkdownV2 escape
 * ป้องกันตัวละครพิเศษทำให้ Format พัง
 */
export function escapeMd(s = ""): string {
  return s
    .replace(/_/g, "\\_")
    .replace(/\*/g, "\\*")
    .replace(/\[/g, "\\[")
    .replace(/\]/g, "\\]")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/~/g, "\\~")
    .replace(/`/g, "\\`")
    .replace(/>/g, "\\>")
    .replace(/#/g, "\\#")
    .replace(/\+/g, "\\+")
    .replace(/-/g, "\\-")
    .replace(/=/g, "\\=")
    .replace(/\|/g, "\\|")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\./g, "\\.")
    .replace(/!/g, "\\!");
}

/**
 * สร้าง Google Maps URL
 */
export function buildGoogleMapsUrl(
  name: string | null,
  address: string | null,
  lat: number | null,
  lng: number | null
): string {
  const base = "https://www.google.com/maps/search/?api=1&query=";
  if (lat != null && lng != null) return base + `${lat},${lng}`;
  if (name?.trim()) return base + encodeURIComponent(name);
  if (address?.trim()) return base + encodeURIComponent(address);
  return "";
}

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
}

export async function sendBookingNotification(
  payload: NotifyPayload
): Promise<void> {
  const message = formatMessage(payload);
  try {
    const functions = getFunctions(firebaseApp, "asia-southeast1");
    const notifyBooking = httpsCallable<{ message: string }, { ok: boolean }>(
      functions,
      "notifyBooking"
    );
    await notifyBooking({ message });
  } catch (err) {
    console.error("[telegram] notifyBooking failed:", err);
  }
}

function formatMessage(p: NotifyPayload): string {
  // 1. ปรับเวลาเป็น HH:mm A (24ชม + AM/PM) ตาม Bangkok Time
  const when = fmtBKK(p.startAt, "DD/MM/YYYY HH:mm A");
  const bookingTime = fmtBKK(p.startAt, "YYYY-MM-DD HH:mm A");
  
  // จัดการ Map Link (ถ้ามีลิงก์ maps.app.goo.gl ส่งมาจะถูกใช้ทันที)
  const mapUrl = p.mapUrl || buildGoogleMapsUrl(p.locationName, p.address, null, null);
  const divider = "___________________________________";

  // 2. จัดการ Address Block และเว้นบรรทัด Meeting Point
  const addressLines: string[] = [];
  if (p.locationName) addressLines.push(escapeMd(p.locationName));
  if (p.address) addressLines.push(escapeMd(p.address));
  if (p.addressDetails) addressLines.push(escapeMd(p.addressDetails));
  
  const addressContent = addressLines.length > 0 ? addressLines.join("\n") : "—";
  
  // ถ้ามี Meeting Point ให้เว้นบรรทัดห่างจาก Address
  const meetingBlock = p.meetingPoint 
    ? `\n\n*Meeting:* ${escapeMd(p.meetingPoint)}` 
    : "";

  // 3. จัดการ Add-ons ให้ ฿ อยู่ด้านหลัง
  const addonsLine =
    p.addons.length > 0
      ? p.addons
          .map((a) => `${escapeMd(a.name)} \\(\\+${a.price.toLocaleString()}฿\\)`)
          .join(", ")
      : null;

  const lines: (string | null)[] = [
    `${escapeMd(when)} \\(เวลาจอง\\)`,
    `🧾 *Booking ID:* \`${p.bookingId}\``,
    "",
    `*Therapist:* ${escapeMd(p.therapistName ?? "—")}`,
    `*Booking Time:* ${escapeMd(bookingTime)}`,
    divider,
    "",
    `📍 *Address:*`,
    addressContent,
    meetingBlock, // จะว่างหรือจะขยับบรรทัดลงมาตามเงื่อนไขด้านบน
    "",
    `*Service:* ${escapeMd(p.serviceName)}`,
    `*Duration:* ${p.duration} minute`,
    `*Payment:* ${escapeMd(p.payment ?? "Cash")}`,
    `*Price:* ${p.servicePrice.toLocaleString()}฿`,
    addonsLine ? `*Add-ons:* ${addonsLine}` : null,
    "",
    `🚖 *Taxi:* ${p.taxiFee.toLocaleString()}฿`,
    `💰 *Total:* ${p.total.toLocaleString()}฿`,
    p.discountCode ? `💸 *Discount:* \`${escapeMd(p.discountCode)}\`` : null,
    p.rainTier !== "none"
      ? `🌧 *Weather:* ${escapeMd(p.rainTier)} \\(surcharge applied\\)`
      : null,
    divider,
    "",
    `👤 *Contact customer:* ${escapeMd(p.contactName)}`,
    `📞 *Phone:* ${escapeMd(p.phone)}`,
    `*Note:* ${p.note ? escapeMd(p.note) : "—"}`,
    divider,
    "",
    // ส่งเป็น Hyperlink เพื่อความสวยงามและรองรับ Short Link
    mapUrl ? `🗺 [คลิกเพื่อเปิด Google Maps](${mapUrl})` : null,
  ];

  return lines.filter((l) => l !== null).join("\n");
}