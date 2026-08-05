// scripts/verifySunPoints.mjs
//
// READ-ONLY verification of the phone-keyed SunPoints ledger (28x.141).
// Replicates src/utils/sunPoints.ts against real production bookings so the
// design can be sanity-checked BEFORE any money-drawer code is wired up.
// Writes NOTHING — only .get() calls.
//
//   earned   = Σ over DELIVERED bookings of pointsFor(menuSpend, ×2 if campaign)
//   redeemed = Σ of `pointsRedeemed` stamped on the customer's bookings
//   balance  = max(0, earned − redeemed)

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
initializeApp({ credential: cert(require("./serviceAccountKey.json")) });
const db = getFirestore();

// --- mirror src/config/anniversary.ts ---
const EARN_PER_THB = 100;   // DEFAULT_EARN_PER_THB
const REDEEM_THB = 1;       // DEFAULT_REDEEM_THB (points → ฿)
const CAMP_START = new Date("2026-07-15T00:00:00+07:00").getTime();
const CAMP_END = new Date("2026-08-15T23:59:59+07:00").getTime();

// --- mirror src/utils/sunPoints.ts ---
const SERVED = new Set(["completed", "done"]);
const pointsFor = (spend, mult) => Math.floor(Math.max(0, spend) / EARN_PER_THB) * mult;
const menuSpend = (b) =>
  typeof b.servicePrice === "number"
    ? b.servicePrice
    : Math.max(0, (b.totalPrice ?? 0) - (b.taxiFee ?? 0) - (b.paymentFee ?? 0));
const multiplierForMs = (ms) => (ms && ms >= CAMP_START && ms <= CAMP_END ? 2 : 1);
const normPhone = (p) => {
  if (typeof p !== "string") return "";
  const c = p.replace(/[^\d+]/g, "");
  return c.length >= 6 ? c : "";
};
const toMs = (v) => {
  if (!v) return 0;
  if (typeof v === "object") {
    if (typeof v.toMillis === "function") return v.toMillis();
    if (typeof v._seconds === "number") return v._seconds * 1000;
    if (typeof v.seconds === "number") return v.seconds * 1000;
  }
  if (typeof v === "number") return v;
  if (typeof v === "string") { const t = Date.parse(v); return Number.isFinite(t) ? t : 0; }
  return 0;
};

// test/placeholder exclusion (customer-facing) — mirrors membership.ts
const isReserved = (b) => {
  const name = `${b.contactName ?? ""} ${b.customerName ?? ""}`.toLowerCase();
  return name.includes("sunred") || String(b.phone ?? "").includes("634350987");
};
const isTestLoc = (b) => {
  const loc = `${b.locationName ?? ""} ${b.address ?? ""}`.toLowerCase();
  return loc.includes("aspire") || loc.includes("พร้อมพันธ์") || loc.includes("qh86+45p");
};

const snap = await db.collection("bookings").get();
console.log(`bookings scanned: ${snap.size}`);

const byPhone = new Map(); // normPhone -> { name, earned, redeemed, served, campHits, redeemDocs }
let anyPointsRedeemedField = 0;
let servedTotal = 0;
let campBookings = 0;

for (const doc of snap.docs) {
  const b = doc.data();
  if (isReserved(b) || isTestLoc(b)) continue;
  const key = normPhone(b.phone);
  if (!key) continue;

  const rec = byPhone.get(key) ?? {
    name: b.contactName || b.customerName || "(no name)",
    earned: 0, redeemed: 0, served: 0, campHits: 0,
  };

  const status = String(b.status ?? "").toLowerCase();
  if (SERVED.has(status)) {
    const ms = toMs(b.startAt ?? b.createdAt ?? b.date);
    const mult = multiplierForMs(ms);
    rec.earned += pointsFor(menuSpend(b), mult);
    rec.served += 1;
    servedTotal += 1;
    if (mult === 2) { rec.campHits += 1; campBookings += 1; }
  }
  if (typeof b.pointsRedeemed === "number" && b.pointsRedeemed > 0) {
    rec.redeemed += Math.floor(b.pointsRedeemed);
    anyPointsRedeemedField += 1;
  }
  byPhone.set(key, rec);
}

const rows = [...byPhone.entries()]
  .map(([phone, r]) => ({ phone, ...r, balance: Math.max(0, r.earned - r.redeemed) }))
  .sort((a, b) => b.earned - a.earned);

console.log(`\ncustomers (real, phone-keyed): ${rows.length}`);
console.log(`served bookings counted: ${servedTotal}  (in-campaign 2×: ${campBookings})`);
console.log(`bookings already carrying pointsRedeemed>0: ${anyPointsRedeemedField}  <-- expect 0 (new field)\n`);

console.log("TOP 12 by earned points:");
console.log("earned  redeem  balance  ฿value  served  2x   phone           name");
for (const r of rows.slice(0, 12)) {
  const val = Math.round(r.balance * REDEEM_THB);
  console.log(
    `${String(r.earned).padStart(6)}  ${String(r.redeemed).padStart(6)}  ${String(r.balance).padStart(7)}  ${String(val).padStart(6)}  ${String(r.served).padStart(6)}  ${String(r.campHits).padStart(2)}   ${r.phone.padEnd(14)}  ${r.name}`,
  );
}

const totalEarned = rows.reduce((s, r) => s + r.earned, 0);
const totalBalance = rows.reduce((s, r) => s + r.balance, 0);
console.log(`\nTOTAL earned across all real customers: ${totalEarned} pts (= ฿${Math.round(totalBalance * REDEEM_THB)} liability at balance)`);
