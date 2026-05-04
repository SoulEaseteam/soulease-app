

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const serviceAccount = require("./serviceAccountKey.json");

initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

interface TherapistDoc {
  id: string;
  name?: string;
  lat?: number | null;
  lng?: number | null;
  currentLocation?: { lat?: number; lng?: number } | null;
  homeLocation?: { lat?: number; lng?: number } | null;
  area?: string | null;
}

const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

const apply = process.argv.includes("--apply");

async function main(): Promise<void> {
  console.log(
    `\n🔍 Auditing therapist lat/lng — mode: ${apply ? "APPLY" : "DRY-RUN"}\n`
  );

  const snap = await db.collection("therapists").get();
  if (snap.empty) {
    console.log("⚠️  No therapists found.");
    return;
  }

  const ok: TherapistDoc[] = [];
  const backfillable: { doc: TherapistDoc; lat: number; lng: number; from: string }[] = [];
  const missing: TherapistDoc[] = [];

  for (const d of snap.docs) {
    const data = { id: d.id, ...(d.data() as TherapistDoc) };
    if (isNum(data.lat) && isNum(data.lng)) {
      ok.push(data);
      continue;
    }
    // Try currentLocation → homeLocation
    if (
      data.currentLocation &&
      isNum(data.currentLocation.lat) &&
      isNum(data.currentLocation.lng)
    ) {
      backfillable.push({
        doc: data,
        lat: data.currentLocation.lat,
        lng: data.currentLocation.lng,
        from: "currentLocation",
      });
      continue;
    }
    if (
      data.homeLocation &&
      isNum(data.homeLocation.lat) &&
      isNum(data.homeLocation.lng)
    ) {
      backfillable.push({
        doc: data,
        lat: data.homeLocation.lat,
        lng: data.homeLocation.lng,
        from: "homeLocation",
      });
      continue;
    }
    missing.push(data);
  }

  console.log(`✅ ok                ${ok.length}`);
  console.log(`🟡 backfillable      ${backfillable.length}`);
  console.log(`🔴 missing           ${missing.length}`);
  console.log(`────────────────────────────────────`);

  if (backfillable.length > 0) {
    console.log("\n🟡 Backfillable (will copy nested → top-level):");
    for (const b of backfillable) {
      console.log(
        `   • ${b.doc.id} (${b.doc.name ?? "—"}) ${b.lat}, ${b.lng} — from .${b.from}`
      );
    }
  }

  if (missing.length > 0) {
    console.log("\n🔴 Missing (need manual entry via admin UI):");
    for (const m of missing) {
      console.log(`   • ${m.id} (${m.name ?? "—"}) area: ${m.area ?? "—"}`);
    }
  }

  if (apply && backfillable.length > 0) {
    console.log("\n✏️  Writing backfill values…");
    let count = 0;
    for (const b of backfillable) {
      await db
        .collection("therapists")
        .doc(b.doc.id)
        .update({ lat: b.lat, lng: b.lng });
      count += 1;
      console.log(`   ✓ ${b.doc.id} lat=${b.lat}, lng=${b.lng}`);
    }
    console.log(`\n✅ Backfilled ${count} therapist docs.`);
  } else if (!apply && backfillable.length > 0) {
    console.log("\n💡 Re-run with --apply to write these values.");
  }

  if (missing.length > 0) {
    console.log(
      `\n⚠️  ${missing.length} therapists have NO coords. ` +
        `Open the admin Edit Therapist page and pick a default location ` +
        `(or the customer-side "Allow location" hint will keep showing).`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Audit failed:", err);
    process.exit(1);
  });
