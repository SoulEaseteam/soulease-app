type PaymentMethod = "Cash" | "Transfer" | "Card" | string;

export function composeStaffBookingMessage(args: {
  userId?: string | null;          // ผู้จอง (uid)
  therapistName: string;           // Therapist
  bookingTime: string;             // เวลาสร้างใบจอง (เช่น 2025-08-10 02:42)
  selectedTime: string;            // เวลาที่ลูกค้าเลือกเข้ารับบริการ (HH:mm)
  address: string;                 // สถานที่/โรงแรม
  note?: string;                   // หมายเหตุ (เลขห้อง/ล็อบบี้ ฯลฯ)
  serviceName: string;             // คอร์ส
  servicePrice: number;            // ราคา
  durationText: string;            // "70" หรือ "60 min"
  payment: PaymentMethod;          // "Cash" | "Transfer" | ...
  taxiFee: number;                 // ค่าเดินทาง
  totalPrice: number;              // ราคารวม (service + taxi)
  phone: string;                   // เบอร์ลูกค้า
  googleMapLink?: string;          // ลิงก์แม็พ (อาจว่างได้)
}) {
  const {
    userId,
    therapistName,
    bookingTime,
    selectedTime,
    address,
    note,
    serviceName,
    servicePrice,
    durationText,
    payment,
    taxiFee,
    totalPrice,
    phone,
    googleMapLink,
  } = args;

  const lines = [
    // ส่วนหัว
    userId ? `📣 <b>${userId}</b>` : "📣 <b>New Booking</b>",
    "──────────────",
    "⏰ Booking Now",

    // ข้อมูลหลัก
    `👤 Therapist: ${therapistName}`,
    `🗓️ ${bookingTime}`,
    `⏰ Service Time: ${selectedTime}`,
    "────────────────────",

    // สถานที่/หมายเหตุ
    `🏨 ${address}`,
    `📝 ${note?.trim() || "-"}`,

    // คอร์ส/ราคา
    `💆 ${serviceName}`,
    `💵 ${servicePrice.toLocaleString()}/${durationText} ${payment}`,

    // เดินทาง/รวม
    `🚖 Taxi: ฿${Math.round(taxiFee).toLocaleString()}`,
    `💰 Total: ฿${Math.round(totalPrice).toLocaleString()}`,
    "────────────────────",

    // ติดต่อ/แผนที่
    `📞 Phone: ${phone}`,
    googleMapLink ? `🗺️ <a href="${googleMapLink}">View Google Map</a>` : undefined,
  ].filter(Boolean);

  return lines.join("\n").trim();
}