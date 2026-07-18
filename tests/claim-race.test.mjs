// tests/claim-race.test.mjs
//
// 🆕 Round 28x.71 — the one failure mode that matters for open jobs.
//
// If two practitioners press "🙋 รับงานนี้" in the same second and both win,
// two people travel to a stranger's hotel room at 2am for one booking. That is
// not a bug you discover politely — so the claim runs in a transaction, and
// this proves the transaction actually holds under a simultaneous stampede.
//
// Run (emulator must be up on 8080):
//   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 node tests/claim-race.test.mjs

import { initializeApp, deleteApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8080";

const app = initializeApp({ projectId: "soulease-spa" });
const db = getFirestore();

/** Mirrors handleOpenJobClaim's transaction exactly. */
async function claim(bookingId, therapistId, therapistName) {
  const ref = db.collection("bookings").doc(bookingId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return "gone";
    const b = snap.data();
    if (b.status === "cancelled" || b.status === "canceled") return "gone";
    if (b.therapistId) return "taken";
    tx.update(ref, {
      therapistId,
      therapistName,
      therapistResponse: "accepted",
      therapistRespondedAt: FieldValue.serverTimestamp(),
      claimedFrom: "channel",
    });
    return "won";
  });
}

let failures = 0;
const check = (name, ok, detail = "") => {
  console.log(`  ${ok ? "✔" : "✘"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

// ── 1. Twelve practitioners press at the exact same moment ───────────────
{
  const id = "race-1";
  await db.collection("bookings").doc(id).set({ status: "confirmed" });

  const racers = Array.from({ length: 12 }, (_, i) => [`t${i}`, `Therapist ${i}`]);
  const results = await Promise.all(
    racers.map(([tid, name]) => claim(id, tid, name).catch(() => "error"))
  );

  const wins = results.filter((r) => r === "won").length;
  const taken = results.filter((r) => r === "taken").length;
  const errors = results.filter((r) => r === "error").length;

  check("exactly one winner out of 12 simultaneous presses", wins === 1, `won=${wins} taken=${taken} error=${errors}`);

  const final = (await db.collection("bookings").doc(id).get()).data();
  check("booking ends up assigned to exactly one practitioner", typeof final.therapistId === "string" && final.therapistId.length > 0, `therapistId=${final.therapistId}`);
  check("winner is one of the racers", racers.some(([tid]) => tid === final.therapistId));
  check("marked accepted", final.therapistResponse === "accepted");
}

// ── 2. Pressing a job somebody already holds ─────────────────────────────
{
  const id = "race-2";
  await db.collection("bookings").doc(id).set({
    status: "confirmed",
    therapistId: "already-hers",
    therapistName: "Someone",
  });
  const r = await claim(id, "latecomer", "Latecomer");
  check("second presser is told it's taken", r === "taken", `got "${r}"`);

  const final = (await db.collection("bookings").doc(id).get()).data();
  check("original assignment is not overwritten", final.therapistId === "already-hers");
}

// ── 3. A cancelled job can't be claimed ──────────────────────────────────
{
  const id = "race-3";
  await db.collection("bookings").doc(id).set({ status: "cancelled" });
  const r = await claim(id, "t0", "T0");
  check("cancelled job refuses the claim", r === "gone", `got "${r}"`);

  const final = (await db.collection("bookings").doc(id).get()).data();
  check("no practitioner attached to a cancelled job", final.therapistId === undefined);
}

// ── 4. A deleted job can't be claimed ────────────────────────────────────
{
  const r = await claim("race-does-not-exist", "t0", "T0");
  check("missing job refuses the claim", r === "gone", `got "${r}"`);
}

console.log(`\n${failures === 0 ? "ทั้งหมดผ่าน" : `${failures} ข้อไม่ผ่าน`}`);
await deleteApp(app);
process.exit(failures > 0 ? 1 : 0);
