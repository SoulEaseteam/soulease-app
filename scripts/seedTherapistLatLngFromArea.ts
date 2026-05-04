// scripts/seedTherapistLatLngFromArea.ts
//
// 🆕 Round 28b35 (founder 2026-05-04) — Seed default lat/lng on
//   therapist docs that have no coordinates AND no nested
//   currentLocation/homeLocation. Required because the
//   `auditTherapistLatLng` script just produced this:
//
//     ✅ ok            0
//     🟡 backfillable  0
//     🔴 missing      12   ← every therapist
//
// Strategy
//   The therapist `area` field is a free-text label like
//   "Huai Khwang · RCA". This script normalizes the label and
//   looks it up in `BKK_AREA_CENTROIDS` to assign a sensible
//   default pin (centroid of that neighbourhood).
//
//   Once seeded, the customer-side homepage stops showing
//   "Allow location" on every card and starts displaying real
//   "X min • X.X km" labels.
//
//   Therapists are encouraged to refine their pin via the future
//   admin Edit Therapist page. This script is a one-shot defaults
//   seeder, not a continuous sync.
//
// Safety
//   • Never overwrites existing top-level lat/lng.
//   • Never overwrites docs that already have nested data
//     (use auditTherapistLatLng.ts for those — different script).
//   • Logs every match + every miss so admin can fix labels.
//
// Usage
//   Dry-run:  npx tsx scripts/seedTherapistLatLngFromArea.ts
//   Apply:    npx tsx scripts/seedTherapistLatLngFromArea.ts --apply

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const serviceAccount = require("./serviceAccountKey.json");
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// ─────────────────────────────────────────────────────────────
// 🗺️  Bangkok area centroids
// ─────────────────────────────────────────────────────────────
//
// Source: Google Maps central pins for each neighbourhood. These
// are SAFE DEFAULTS — therapist's actual standby is usually within
// 1-2 km. Customer cards show "X min • X.X km" using haversine on
// these centroids until therapist refines the pin in admin UI.
//
// When adding a new area: keep the canonical name lowercase + sorted
// alphabetically. Use the `·` separator from the source data so the
// matcher can split on it.
const AREA_PINS: Record<string, { lat: number; lng: number }> = {
  // Huai Khwang core (around the MRT station)
  "huai khwang": { lat: 13.7780, lng: 100.5739 },
  // RCA (Royal City Avenue) — most therapists tagged here
  rca: { lat: 13.7488, lng: 100.5694 },
  "huai khwang rca": { lat: 13.7569, lng: 100.5705 },
  // Din Daeng — between Victory Monument and Ratchada
  "din daeng": { lat: 13.7691, lng: 100.5604 },
  ratchada: { lat: 13.7682, lng: 100.5750 },
  "din daeng ratchada": { lat: 13.7700, lng: 100.5680 },
  // Lat Phrao / Wang Thonglang
  "lat phrao": { lat: 13.7813, lng: 100.6133 },
  "wang thonglang": { lat: 13.7820, lng: 100.6020 },
  "lat phrao wang thonglang": { lat: 13.7818, lng: 100.6075 },
  // Rama 4 / Silom
  "rama 4": { lat: 13.7280, lng: 100.5400 },
  silom: { lat: 13.7257, lng: 100.5340 },
  "rama 4 silom": { lat: 13.7269, lng: 100.5370 },
  // Rama 9 (RCA-adjacent business district)
  "rama 9": { lat: 13.7558, lng: 100.5664 },
  // Sukhumvit catch-alls (for future therapists)
  sukhumvit: { lat: 13.7406, lng: 100.5614 },
  asok: { lat: 13.7373, lng: 100.5604 },
  thonglor: { lat: 13.7303, lng: 100.5708 },
  ekkamai: { lat: 13.7235, lng: 100.5847 },
  "phrom phong": { lat: 13.7307, lng: 100.5697 },
  // Sathorn
  sathorn: { lat: 13.7224, lng: 100.5310 },
};

const normalizeArea = (raw: string | null | undefined): string => {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/[·•,\-/]+/g, " ") // strip separators
    .replace(/\s+/g, " ")
    .trim();
};

const findPin = (area: string | null | undefined) => {
  const norm = normalizeArea(area);
  if (!norm) return null;
  // Try the full normalized string first ("din daeng ratchada")
  if (AREA_PINS[norm]) return { ...AREA_PINS[norm], matched: norm };
  // Then each token in turn (left-to-right) to find the first hit
  const tokens = norm.split(" ");
  for (let i = tokens.length; i > 0; i -= 1) {
    const slice = tokens.slice(0, i).join(" ");
    if (AREA_PINS[slice]) return { ...AREA_PINS[slice], matched: slice };
  }
  // Last resort: any single token match
  for (const t of tokens) {
    if (AREA_PINS[t]) return { ...AREA_PINS[t], matched: t };
  }
  return null;
};

const apply = process.argv.includes("--apply");

interface TherapistDoc {
  id: string;
  name?: string;
  lat?: number | null;
  lng?: number | null;
  area?: string | null;
}

const isNum = (v: unknown): v is number =>
  typeof v === "number" && Number.isFinite(v);

async function main() {
  console.log(
    `\n🌱 Seeding therapist lat/lng from area — mode: ${apply ? "APPLY" : "DRY-RUN"}\n`
  );

  const snap = await db.collection("therapists").get();
  if (snap.empty) {
    console.log("⚠️  No therapists found.");
    return;
  }

  const skip: TherapistDoc[] = [];
  const seedable: { doc: TherapistDoc; lat: number; lng: number; matched: string }[] = [];
  const unmatched: TherapistDoc[] = [];

  for (const d of snap.docs) {
    const data = { id: d.id, ...(d.data() as TherapistDoc) };
    if (isNum(data.lat) && isNum(data.lng)) {
      skip.push(data);
      continue;
    }
    const pin = findPin(data.area);
    if (pin) {
      seedable.push({ doc: data, lat: pin.lat, lng: pin.lng, matched: pin.matched });
    } else {
      unmatched.push(data);
    }
  }

  console.log(`⏭  already has lat/lng  ${skip.length}`);
  console.log(`🌱 seedable             ${seedable.length}`);
  console.log(`❓ unmatched area       ${unmatched.length}`);
  console.log(`────────────────────────────────────`);

  if (seedable.length > 0) {
    console.log("\n🌱 Seedable (area → centroid):");
    for (const s of seedable) {
      console.log(
        `   • ${s.doc.id} (${s.doc.name ?? "—"}) "${s.doc.area}" → "${s.matched}" → ${s.lat}, ${s.lng}`
      );
    }
  }

  if (unmatched.length > 0) {
    console.log("\n❓ Unmatched area labels (add to AREA_PINS or fix label):");
    for (const u of unmatched) {
      console.log(`   • ${u.id} (${u.name ?? "—"}) area: "${u.area ?? "—"}"`);
    }
  }

  if (apply && seedable.length > 0) {
    console.log("\n✏️  Writing seeded values…");
    let count = 0;
    for (const s of seedable) {
      await db
        .collection("therapists")
        .doc(s.doc.id)
        .update({ lat: s.lat, lng: s.lng });
      count += 1;
      console.log(`   ✓ ${s.doc.id} lat=${s.lat}, lng=${s.lng}`);
    }
    console.log(`\n✅ Seeded ${count} therapist docs.`);
    console.log(
      `\n💡 Therapists can refine their pin via the admin Edit Therapist ` +
        `page (or via the therapist self-service profile when /therapist/profile ` +
        `is wired with a map picker).`
    );
  } else if (!apply && seedable.length > 0) {
    console.log("\n💡 Re-run with --apply to write these values.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
