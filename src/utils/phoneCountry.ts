// src/utils/phoneCountry.ts
//
// 🆕 Round 28s287 (founder: "เพิ่มประเทศด้วย ว่าหมายเลขนี้ประเทศอะไร") —
// resolve a phone number to its country from the dial-code prefix. Same
// country set the booking flow's SelectLocationPage uses. Handles the
// three shapes we store: E.164 ("+66..."), 00-prefix ("0066..."), and
// the local Thai format ("08..." with a leading 0 and no country code).

export interface PhoneCountry {
  code: string; // ISO-3166-1 alpha-2
  flag: string;
  name: string;
  dial: string; // "+66"
}

export const PHONE_COUNTRIES: PhoneCountry[] = [
  { code: "TH", flag: "🇹🇭", name: "Thailand", dial: "+66" },
  { code: "CN", flag: "🇨🇳", name: "China", dial: "+86" },
  { code: "JP", flag: "🇯🇵", name: "Japan", dial: "+81" },
  { code: "KR", flag: "🇰🇷", name: "South Korea", dial: "+82" },
  { code: "SG", flag: "🇸🇬", name: "Singapore", dial: "+65" },
  { code: "MY", flag: "🇲🇾", name: "Malaysia", dial: "+60" },
  { code: "HK", flag: "🇭🇰", name: "Hong Kong", dial: "+852" },
  { code: "TW", flag: "🇹🇼", name: "Taiwan", dial: "+886" },
  { code: "ID", flag: "🇮🇩", name: "Indonesia", dial: "+62" },
  { code: "VN", flag: "🇻🇳", name: "Vietnam", dial: "+84" },
  { code: "PH", flag: "🇵🇭", name: "Philippines", dial: "+63" },
  { code: "IN", flag: "🇮🇳", name: "India", dial: "+91" },
  { code: "AE", flag: "🇦🇪", name: "UAE", dial: "+971" },
  { code: "AU", flag: "🇦🇺", name: "Australia", dial: "+61" },
  { code: "NZ", flag: "🇳🇿", name: "New Zealand", dial: "+64" },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom", dial: "+44" },
  { code: "US", flag: "🇺🇸", name: "United States", dial: "+1" },
  { code: "DE", flag: "🇩🇪", name: "Germany", dial: "+49" },
  { code: "FR", flag: "🇫🇷", name: "France", dial: "+33" },
  { code: "IT", flag: "🇮🇹", name: "Italy", dial: "+39" },
  { code: "ES", flag: "🇪🇸", name: "Spain", dial: "+34" },
  { code: "NL", flag: "🇳🇱", name: "Netherlands", dial: "+31" },
  { code: "RU", flag: "🇷🇺", name: "Russia", dial: "+7" },
  { code: "IL", flag: "🇮🇱", name: "Israel", dial: "+972" },
  { code: "SA", flag: "🇸🇦", name: "Saudi Arabia", dial: "+966" },
];

// Longest dial code first so "+1" doesn't shadow "+1..." specifics, and so
// "+886" matches before "+8" style mistakes.
const BY_LEN = [...PHONE_COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);
const TH = PHONE_COUNTRIES.find((c) => c.code === "TH")!;

/** Resolve a stored phone string to its country, or null if unknown. */
export function countryFromPhone(raw?: string | null): PhoneCountry | null {
  if (!raw) return null;
  let s = raw.trim().replace(/[^\d+]/g, "");
  if (!s) return null;
  if (s.startsWith("00")) s = "+" + s.slice(2);
  // Local Thai format: a leading 0 and no country code (e.g. "0812345678").
  if (/^0\d/.test(s)) return TH;
  if (!s.startsWith("+")) s = "+" + s;
  return BY_LEN.find((c) => s.startsWith(c.dial)) ?? null;
}
