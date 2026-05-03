// scripts/migrateTherapistProfiles.ts
//
// 🔄 One-shot migration: copy the rich profile fields added in
// Round 28z (founder 2026-05-02) from `src/data/therapists.ts` into
// Firestore. Each therapist doc gets:
//
//   • experience          — total years (number)
//   • area                — neighborhood string
//   • rebookRate          — 0–100 integer
//   • totalSessions       — cumulative completed sessions
//   • credentials[]       — license / diploma / background-check
//   • serviceExperience[] — per-service years + sessionCount
//   • languageSkills[]    — structured proficiency per language
//
// Usage from the project root:
//
//   cd scripts
//   npx tsx migrateTherapistProfiles.ts
//
// (or `node --import tsx migrateTherapistProfiles.ts` on newer setups)
//
// Requires `scripts/serviceAccountKey.json` (Firebase Admin SDK service
// account, same file `setIsBookedFalse.ts` uses).
//
// Idempotent: re-running just overwrites the same fields with the same
// values. Existing fields not listed here are preserved (we use update,
// not set).

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";

import therapists from "../src/data/therapists";

const require = createRequire(import.meta.url);
const serviceAccount = require("./serviceAccountKey.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

interface ProfileExtras {
  experience?: number;
  area?: string;
  rebookRate?: number;
  totalSessions?: number;
  credentials?: unknown[];
  serviceExperience?: unknown[];
  languageSkills?: unknown[];
  /** Round 28ac — write email so setRoleOnSignup can auto-link. */
  email?: string;
  /** Round 28at — full standby address for admin / dispatch. */
  homeAddress?: string;
  /** Round 28at — coordinates for map / distance calc. */
  lat?: number;
  lng?: number;
}

/** Pick only the new profile fields off a therapist record. */
function extractExtras(
  t: (typeof therapists)[number]
): ProfileExtras {
  const out: ProfileExtras = {};
  if (typeof t.experience === "number") out.experience = t.experience;
  if (typeof t.area === "string") out.area = t.area;
  if (typeof t.rebookRate === "number") out.rebookRate = t.rebookRate;
  if (typeof t.totalSessions === "number") out.totalSessions = t.totalSessions;
  if (Array.isArray(t.credentials)) out.credentials = t.credentials;
  if (Array.isArray(t.serviceExperience))
    out.serviceExperience = t.serviceExperience;
  if (Array.isArray(t.languageSkills)) out.languageSkills = t.languageSkills;
  if (typeof t.email === "string" && t.email.trim().length > 0) {
    out.email = t.email.toLowerCase().trim();
  }
  // Round 28at — push standby address + coords so Firestore stays in
  // sync with the canonical data file.
  if (typeof t.homeAddress === "string" && t.homeAddress.trim().length > 0) {
    out.homeAddress = t.homeAddress.trim();
  }
  if (typeof t.lat === "number") out.lat = t.lat;
  if (typeof t.lng === "number") out.lng = t.lng;
  return out;
}

async function migrate() {
  console.log(`📄 Migrating ${therapists.length} therapist profiles…`);

  let updated = 0;
  let skipped = 0;
  let created = 0;

  for (const t of therapists) {
    const extras = extractExtras(t);
    if (Object.keys(extras).length === 0) {
      skipped++;
      console.log(`  · ${t.id}: no extras to write — skipped`);
      continue;
    }

    const ref = db.collection("therapists").doc(t.id);
    const snap = await ref.get();

    if (!snap.exists) {
      // Brand-new doc — write the whole therapist record so the doc has
      // baseline fields (id, name, image, rating, etc.) too.
      const baseline = {
        id: t.id,
        name: t.name,
        image: t.image,
        rating: t.rating,
        reviews: t.reviews,
        startTime: t.startTime,
        endTime: t.endTime,
        servicesAvailable: t.servicesAvailable,
        gallery: t.gallery,
        features: t.features,
        ...extras,
      };
      await ref.set(baseline, { merge: false });
      created++;
      console.log(`  + ${t.id}: created with profile extras`);
    } else {
      await ref.update(extras);
      updated++;
      console.log(`  ✓ ${t.id}: profile extras updated`);
    }
  }

  console.log(
    `\n✅ Done. Created ${created}, updated ${updated}, skipped ${skipped}.`
  );
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  });
