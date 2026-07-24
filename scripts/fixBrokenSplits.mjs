// scripts/fixBrokenSplits.mjs
// ────────────────────────────────────────────────────────────────────────
// 🆕 Round 28x.114d (founder: "แก้แค่ 8 งานเสีย") — re-stamp the frozen
// therapistShare/shopShare ONLY on completed bookings whose frozen split is
// CORRUPT: it doesn't reconcile with either the post-discount base OR the full
// service price. Those are jobs where the wrong duration's / wrong service's
// split got stamped (e.g. Gentleman's 70min frozen at 2,000 = the B2B rate;
// Gentleman's 120min frozen at 1,300 = the 70min rate).
//
// DELIBERATELY LEFT ALONE: the ~53 jobs frozen at the old 60% split. They
// reconcile (720+480 = 1,200 full price) and were genuinely paid 60% under the
// old model — re-stamping them would rewrite real historical payouts. Founder
// chose to touch only the broken 8.
//
// New split from the CURRENT table: therapistShare = table[serviceId][duration];
// shopShare = max(0, (servicePrice − discount) − therapistShare).
//
// Run:  node scripts/fixBrokenSplits.mjs            (dry run + backup)
//       node scripts/fixBrokenSplits.mjs --apply    (backup, then write)
// ────────────────────────────────────────────────────────────────────────

import { createRequire } from "node:module";
import { writeFileSync, mkdirSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const require = createRequire(import.meta.url);
const APPLY = process.argv.includes("--apply");
initializeApp({ credential: cert(require("./serviceAccountKey.json")) });
const db = getFirestore();

// Current fixed split table — MUST match SERVICE_SPLIT_DEFAULTS in
// src/utils/commission.ts. (No admin override affects these tiers today.)
const TBL = {
  "xSR-Thai":   { 60: 700, 90: 900, 120: 1200 },
  "SR-Aroma":   { 60: 800, 90: 1100, 120: 1500 },
  "SR-HJ2200":  { 70: 1300, 120: 1800 },
  "SR-B2B3200": { 70: 2000, 120: 2500 },
};
const COUNTED = new Set(["completed", "paid", "done", "in_progress"]);

const snap = await db.collection("bookings").get();
const broken = [];
snap.forEach((doc) => {
  const d = doc.data();
  if (!COUNTED.has(String(d.status || ""))) return;
  if (typeof d.therapistShare !== "number") return;      // no frozen split → uses table already
  const tbl = TBL[d.serviceId]?.[d.duration];
  if (tbl == null) return;                                // odd/legacy duration → leave
  if (d.therapistShare === tbl) return;                   // already matches table
  const price = d.servicePrice || 0;
  const base = Math.max(0, price - (d.discountAmount || 0));
  const sum = (d.therapistShare || 0) + (d.shopShare || 0);
  const reconciles = Math.abs(sum - base) <= 1 || Math.abs(sum - price) <= 1;
  if (reconciles) return;                                 // old-60% job → LEAVE (founder's call)
  // Corrupt: re-stamp from the table.
  const newTherapist = tbl;
  const newShop = Math.max(0, base - newTherapist);
  broken.push({ id: doc.id, d, newTherapist, newShop });
});

console.log(`Corrupt (non-reconciling) frozen splits to fix: ${broken.length}\n`);
for (const b of broken) {
  console.log(
    `  ${(b.d.therapistName || "?").padEnd(9)} ${b.d.serviceId} ${b.d.duration}min ` +
      `price=${b.d.servicePrice} disc=${b.d.discountAmount || 0} | ` +
      `tShare ${b.d.therapistShare}→${b.newTherapist}  shopShare ${b.d.shopShare}→${b.newShop}`
  );
}

// Backup (always).
try { mkdirSync(new URL("../.backups/", import.meta.url), { recursive: true }); } catch {}
const backupPath = new URL("../.backups/broken-splits-before.json", import.meta.url);
writeFileSync(backupPath, JSON.stringify(broken.map((b) => ({ id: b.id, ...b.d })), null, 2), "utf8");
console.log(`\nBackup: ${backupPath.pathname}`);

if (!APPLY) {
  console.log(`\nDRY RUN — nothing written. Re-run with --apply to fix ${broken.length}.`);
  process.exit(0);
}

let done = 0;
for (let i = 0; i < broken.length; i += 400) {
  const batch = db.batch();
  for (const b of broken.slice(i, i + 400)) {
    batch.update(db.collection("bookings").doc(b.id), {
      therapistShare: b.newTherapist,
      shopShare: b.newShop,
      splitFixedBy: "fixBrokenSplits-28x.114d",
    });
  }
  await batch.commit();
  done += Math.min(400, broken.length - i);
  console.log(`  fixed ${done}/${broken.length}`);
}
console.log(`\nFIXED ${broken.length} bookings.`);
process.exit(0);
