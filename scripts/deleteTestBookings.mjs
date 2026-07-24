// scripts/deleteTestBookings.mjs
// ────────────────────────────────────────────────────────────────────────
// 🆕 Round 28x.113 (founder: "ช่วยลบออเดอร์เทส … ที่มีชื่อหรือข้อมูลสถานที่นี้
// ซ้ำๆ ออกจากฐานระบบ") — permanently remove QA/founder booking-flow test
// bookings, identified by the go-to test LOCATION signatures (NOT by the
// SUNRED name / 0634350987 phone — those mark 126 REAL placeholder bookings,
// see isReservedShopBooking in src/utils/membership.ts).
//
// Signatures (locationName OR address, case-insensitive) — the same set as
// isTestLocationBooking after the 28x.113 expansion:
//   • "aspire"            (Aspire Asoke-Ratchada condo)
//   • "ซอย พร้อมพันธ์"     (779 & 70ค. Soi Prompan)
//   • "qh86+45p"          (the plus-code)
//   • "distribute the total"   (nonsense placeholder typed in the field)
//   • "[test]"            (explicit marker)
//
// SAFETY:
//   • Dry run by default — prints count + a sample, writes a full JSON backup,
//     deletes NOTHING.
//   • --apply deletes, but ONLY after writing the backup (recoverable).
//   • The district name "Din Daeng" is deliberately NOT a signature — it's a
//     large district with real guests.
//
// Run:  node scripts/deleteTestBookings.mjs            (dry run + backup)
//       node scripts/deleteTestBookings.mjs --apply    (backup, then delete)
// ────────────────────────────────────────────────────────────────────────

import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const require = createRequire(import.meta.url);
const APPLY = process.argv.includes("--apply");
const HERE = dirname(fileURLToPath(import.meta.url));

initializeApp({ credential: cert(require("./serviceAccountKey.json")) });
const db = getFirestore();

const SIGNATURES = [
  "aspire",
  "ซอย พร้อมพันธ์",
  "qh86+45p",
  "distribute the total",
  "[test]",
];

// Manually reviewed as POSSIBLY REAL — never auto-delete. EkY48Qvh: name
// "Ah Seng", Singapore +65 phone, locationName "Sivatel Bangkok" (a real
// hotel); only the ADDRESS field carries the test signature, so it might be a
// genuine (cancelled) booking rather than a test. Held for the founder to call.
const HOLD_IDS = new Set(["EkY48QvheKoprc86v1qA"]);

function isTestBooking(id, d) {
  if (HOLD_IDS.has(id)) return false;
  const hay = `${d.locationName ?? ""} ${d.address ?? ""} ${d.addressDetails ?? ""} ${d.locationAddress ?? ""}`.toLowerCase();
  return SIGNATURES.some((s) => hay.includes(s));
}

const snap = await db.collection("bookings").get();
const matches = [];
snap.forEach((doc) => {
  const d = doc.data();
  if (isTestBooking(doc.id, d)) matches.push({ id: doc.id, d });
});

console.log(`Scanned ${snap.size} bookings · ${matches.length} match a TEST signature\n`);

// Which signature caught each — so a wrong match is obvious in the log.
const bySig = Object.fromEntries(SIGNATURES.map((s) => [s, 0]));
for (const { d } of matches) {
  const hay = `${d.locationName ?? ""} ${d.address ?? ""} ${d.addressDetails ?? ""} ${d.locationAddress ?? ""}`.toLowerCase();
  for (const s of SIGNATURES) if (hay.includes(s)) bySig[s]++;
}
console.log("Matches per signature:");
for (const s of SIGNATURES) console.log(`  ${bySig[s].toString().padStart(4)}  ${s}`);

console.log("\nSample (first 12) — verify none look like a REAL guest:");
for (const { id, d } of matches.slice(0, 12)) {
  const who = d.contactName ?? d.customerName ?? "(no name)";
  const loc = (d.locationName ?? d.address ?? "").slice(0, 46);
  console.log(
    `  ${id.slice(0, 8)} | ${String(d.status ?? "").padEnd(10)} | ${String(who).slice(0, 16).padEnd(16)} | ${loc}`
  );
}

// Full backup — always, even on a dry run, so a later --apply has a fresh one.
const backup = matches.map(({ id, d }) => ({ id, ...d }));
const stamp = process.argv.find((a) => a.startsWith("--stamp="))?.split("=")[1] ?? "run";
const backupPath = join(HERE, `../.backups/test-bookings-${stamp}.json`);
try {
  writeFileSync(backupPath, JSON.stringify(backup, null, 2), "utf8");
  console.log(`\nBackup written: ${backupPath}`);
} catch (e) {
  // .backups may not exist on first run — fall back to the scripts dir.
  const alt = join(HERE, `test-bookings-backup-${stamp}.json`);
  writeFileSync(alt, JSON.stringify(backup, null, 2), "utf8");
  console.log(`\nBackup written: ${alt}`);
}

if (!APPLY) {
  console.log(`\nDRY RUN — nothing deleted. Re-run with --apply to delete ${matches.length}.`);
  process.exit(0);
}

// Delete in batches of 400 (Firestore batch cap 500).
let done = 0;
for (let i = 0; i < matches.length; i += 400) {
  const batch = db.batch();
  for (const { id } of matches.slice(i, i + 400)) {
    batch.delete(db.collection("bookings").doc(id));
  }
  await batch.commit();
  done += Math.min(400, matches.length - i);
  console.log(`  deleted ${done}/${matches.length}`);
}
console.log(`\nDELETED ${matches.length} test bookings.`);
process.exit(0);
