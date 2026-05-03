// src/utils/telegram.ts

import { getFunctions, httpsCallable } from "firebase/functions";
import { app as firebaseApp } from "@/lib/firebase";
import { fmtBKK } from "@/utils/time";

/**
 * Telegram MarkdownV2 escape
 * ปรับให้สะอาดที่สุด ไม่เติม \ หน้าตัวอักษรเยอะเกินไป
 */
export function escapeMd(s = ""): string {
  if (!s) return "—";
  return s
    .replace(/\./g, "\\.")
    .replace(/-/g, "\\-")
    .replace(/!/g, "\\!")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

/**
 * สร้าง Google Maps URL สำรอง
 */
export function buildGoogleMapsUrl(
  name: string | null,
  address: string | null
): string {
  const base = "https://www.google.com/maps/search/?api=1&query=";
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
  lat?: number | null; // เพิ่ม lat เข้ามาใน payload
  lng?: number | null; // เพิ่ม lng เข้ามาใน payload
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
  // 1. เวลา Bangkok (GMT+7) แบบ 20:30 PM
  const when = fmtBKK(p.startAt, "DD/MM/YYYY HH:mm A");
  const bookingTime = fmtBKK(p.startAt, "YYYY-MM-DD HH:mm A");
  
  // 2. Logic แผนที่ตามที่คุณต้องการ
  // เช็ก mapUrl ก่อน -> ถ้าไม่มีเช็ก lat/lng -> ถ้าไม่มีเลยใช้การค้นหาจากชื่อ/ที่อยู่
  const finalMapUrl = p.mapUrl 
    ? p.mapUrl 
    : (p.lat && p.lng) 
      ? `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`
      : buildGoogleMapsUrl(p.locationName, p.address);

  const divider = "___________________________________";

  // ส่วนของที่อยู่
  const addressLines: string[] = [];
  if (p.locationName) addressLines.push(escapeMd(p.locationName));
  if (p.address) addressLines.push(escapeMd(p.address));
  if (p.addressDetails) addressLines.push(escapeMd(p.addressDetails));
  
  let addressBlock = addressLines.length > 0 ? addressLines.join("\n") : "—";
  
  // เว้นบรรทัด Meeting Point ให้เด่นชัด
  if (p.meetingPoint) {
    addressBlock += `\n\nMeeting: 👉🏻 ${escapeMd(p.meetingPoint)}`;
  }

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
    `Price: ${p.servicePrice.toLocaleString()}฿`,
    addonsLine ? `Add-ons: ${addonsLine}` : null,
    "",
    `🚖 Taxi: ${p.taxiFee.toLocaleString()}฿`,
    `💰 Total: ${p.total.toLocaleString()}฿`,
    p.discountCode ? `💸 Discount: \`${escapeMd(p.discountCode)}\`` : null,
    p.rainTier !== "none"
      ? `🌧 Weather: ${escapeMd(p.rainTier)} (surcharge applied)`
      : null,
    divider,
    "",
    `👤 Contact Person: ${escapeMd(p.contactName)}`,
    `📞 Phone: ${escapeMd(p.phone)}`,
    `Note: ${p.note ? escapeMd(p.note) : "—"}`,
    divider,
    "",
    // แสดงลิงก์แผนที่ตามลำดับความสำคัญ
    finalMapUrl ? `🗺 Map: ${finalMapUrl}` : "🗺 Map: —",
  ];

  return lines.filter((l) => l !== null).join("\n");
}