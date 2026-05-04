// scripts/backfillServiceIdInBookings.ts
//
// 🆕 Round 28b18 (founder 2026-05-04) — backfill `serviceId` on
// every booking document that has `serviceName` but no `serviceId`.
//
// Background:
//   Bookings created before the `serviceId` field was added store
//   only the display name ("Gentleman's Signature Therapy"). After
//   Round 28b16 we normalised lookups to read from data/services.ts
//   via getServiceLabel(serviceId) — but old bookings have no id, so:
//     • useServiceUsageStats can't aggregate them
//     • Renaming a service in data/services.ts won't propagate
//     • Admin dashboard / history can't filter by service id
//
// What this script does:
//   1. Reads every doc in `bookings` collection
//   2. For each doc WITHOUT `serviceId`, maps `serviceName` → id
//      using a hard-coded NAME_TO_ID table (keep in sync with
//      src/data/services.ts catalog name field)
//   3. Adds `serviceId` to the doc (atomic update — other fields
//      untouched). Original `serviceName` is kept for backward
//      compatibility (the catalog lookup still falls back to it
//      if a service is later deleted).
//   4. Prints summary: total / matched / patched / skipped / unknown
//
// Safety:
//   • Dry-run by default — pass `--apply` to actually write
//   • Won't overwrite an existing `serviceId` (idempotent — safe
//     to run multiple times)
//   • Doesn't touch any other field
//
// Usage:
//   1. Place serviceAccountKey.json in scripts/ (download from Firebase
//      Console → Project Settings → Service accounts)
//   2. Dry run:   npx tsx scripts/backfillServiceIdInBookings.ts
//   3. Apply:     npx tsx scripts/backfillServiceIdInBookings.ts --apply

import * as admin from "firebase-admin";
import * as fs from "node:fs";
import * as path from "node:path";

// ─── Initialise Firebase Admin ───────────────────────────────────────
const keyPath = path.resolve(__dirname, "serviceAccountKey.json");
if (!fs.existsSync(keyPath)) {
  console.error(
    `❌ Service account key not found at:\n   ${keyPath}\n\n` +
      `Download from Firebase Console → Project Settings → Service accounts → Generate new private key`
  );
  process.exit(1);
}
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

// ─── Service catalog: name → SKU id ──────────────────────────────────
//
// Round 28b18: SKU codes are now the source-of-truth in
// data/services.ts. Every legacy display name AND every legacy slug
// resolves to the new SKU here so backfill is idempotent and total.
//
//   xSR-Thai      → Thai Massage
//   SR-Aroma      → Aromatherapy Massage
//   SR-HJ2200     → Gentleman's Signature Therapy
//   SR-B2B3200    → SunRed Therapeutic Experience
const NAME_TO_ID: Record<string, string> = {
  // Current names (must match data/services.ts `name` field)
  "Thai Massage": "xSR-Thai",
  "Aromatherapy Massage": "SR-Aroma",
  "Gentleman's Signature Therapy": "SR-HJ2200",
  "Gentleman’s Signature Therapy": "SR-HJ2200", // curly apostrophe
  "SunRed Therapeutic Experience": "SR-B2B3200",

  // Legacy display names that mapped to the same SKU
  "Gentleman's Recovery Massage": "SR-HJ2200",
  "Gentleman’s Recovery Massage": "SR-HJ2200",
  "Gentleman's Recovery": "SR-HJ2200",
  "Gentleman’s Recovery": "SR-HJ2200",
  "SunRed Signature Massage": "SR-B2B3200",
  "SunRed Signature Ritual": "SR-B2B3200",
  "SunRed Signature": "SR-B2B3200",
  "Aromatherapy": "SR-Aroma",
  "Thai Traditional": "xSR-Thai",
  "Oil Relaxation Massage": "SR-Aroma", // legacy oil-massage → folded into Aroma
  "Oil Relaxation": "SR-Aroma",
  "Sport Recovery Massage": "SR-HJ2200", // sport-massage → folded into Gentleman's
  "Sport Recovery": "SR-HJ2200",
  "Deep Tissue Massage": "SR-HJ2200",
  "Deep Tissue": "SR-HJ2200",
  "Pre-natal Massage": "SR-Aroma",
  "Pre-natal": "SR-Aroma",
  "Foot Massage": "SR-Aroma",
  "Head Massage": "SR-Aroma",
  "Hot Stone Massage": "SR-Aroma",
  "Hot Stone": "SR-Aroma",
};

// Slug → SKU mapping for bookings that have an old `serviceId` but
// not the new SKU. Run this in addition to name-based resolution.
const LEGACY_SLUG_TO_SKU: Record<string, string> = {
  "thai-massage": "xSR-Thai",
  "aromatherapy": "SR-Aroma",
  "oil-massage": "SR-Aroma",
  "gentlemans-recovery": "SR-HJ2200",
  "sport-massage": "SR-HJ2200",
  "deep-tissue": "SR-HJ2200",
  "prenatal-massage": "SR-Aroma",
  "foot-massage": "SR-Aroma",
  "head-massage": "SR-Aroma",
  "hot-stone": "SR-Aroma",
  "sunred-signature": "SR-B2B3200",
};

function resolveIdFromName(name: string | undefined | null): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (NAME_TO_ID[trimmed]) return NAME_TO_ID[trimmed];
  // Try a case-insensitive match — last resort
  const lower = trimmed.toLowerCase();
  for (const key of Object.keys(NAME_TO_ID)) {
    if (key.toLowerCase() === lower) return NAME_TO_ID[key];
  }
  return null;
}

// ─── Run ─────────────────────────────────────────────────────────────
const APPLY = process.argv.includes("--apply");

async function main() {
  console.log(
    APPLY
      ? "🚀 APPLY mode — writing changes to Firestore"
      : "🔍 DRY-RUN mode — no writes (pass --apply to actually patch)"
  );
  console.log("");

  const snap = await db.collection("bookings").get();
  console.log(`Read ${snap.size} bookings`);
  console.log("");

  let alreadyHasSku = 0;
  let patched = 0;
  let upgradedFromSlug = 0;
  let unknown: Array<{ id: string; serviceName: string; serviceId?: string }> = [];
  let noNameNoId = 0;
  const updates: Array<{
    ref: FirebaseFirestore.DocumentReference;
    sid: string;
    via: string;
  }> = [];

  // Set of valid current SKUs for fast "already migrated" check
  const VALID_SKUS = new Set([
    "xSR-Thai",
    "SR-Aroma",
    "SR-HJ2200",
    "SR-B2B3200",
  ]);

  snap.forEach((doc) => {
    const data = doc.data();
    const currentId = (data.serviceId as string | undefined) ?? null;
    const name = (data.serviceName as string | undefined) ?? null;

    // Already on a valid SKU → skip
    if (currentId && VALID_SKUS.has(currentId)) {
      alreadyHasSku++;
      return;
    }

    // Has a legacy slug id → upgrade to SKU
    if (currentId && LEGACY_SLUG_TO_SKU[currentId]) {
      const sku = LEGACY_SLUG_TO_SKU[currentId];
      updates.push({ ref: doc.ref, sid: sku, via: `slug:${currentId}` });
      upgradedFromSlug++;
      return;
    }

    // No id at all → resolve from serviceName
    if (!name) {
      if (!currentId) noNameNoId++;
      else unknown.push({ id: doc.id, serviceName: "(none)", serviceId: currentId });
      return;
    }
    const sid = resolveIdFromName(name);
    if (!sid) {
      unknown.push({ id: doc.id, serviceName: name, serviceId: currentId ?? undefined });
      return;
    }
    updates.push({ ref: doc.ref, sid, via: `name:"${name}"` });
    patched++;
  });

  console.log(`✅ Already on current SKU:   ${alreadyHasSku}`);
  console.log(`🔄 Upgrade from legacy slug: ${upgradedFromSlug}`);
  console.log(`📝 Patch from serviceName:   ${patched}`);
  console.log(`❓ Unknown service:          ${unknown.length}`);
  console.log(`⚠️  No name + no id:          ${noNameNoId}`);
  console.log("");

  if (unknown.length > 0) {
    console.log("Unknown services (need manual mapping):");
    for (const u of unknown.slice(0, 10)) {
      console.log(
        `   • [${u.id}] name="${u.serviceName}"${
          u.serviceId ? ` id="${u.serviceId}"` : ""
        }`
      );
    }
    if (unknown.length > 10) {
      console.log(`   ... and ${unknown.length - 10} more`);
    }
    console.log("");
  }

  if (!APPLY) {
    console.log("Dry-run done. Run with --apply to write changes.");
    process.exit(0);
  }

  if (updates.length === 0) {
    console.log("Nothing to update.");
    process.exit(0);
  }

  console.log(`Writing ${updates.length} updates in batches of 400...`);
  // Firestore batch limit is 500 — use 400 for safety
  const BATCH_SIZE = 400;
  let written = 0;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const slice = updates.slice(i, i + BATCH_SIZE);
    for (const u of slice) {
      batch.update(u.ref, { serviceId: u.sid });
    }
    await batch.commit();
    written += slice.length;
    console.log(`  …${written}/${updates.length}`);
  }
  console.log("");
  console.log(`✅ Patched ${written} bookings with serviceId.`);
  console.log("");
  console.log(
    "Next: rename a service in src/data/services.ts and reload the site —" +
      "\n      every UI surface will reflect the new name automatically."
  );
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
