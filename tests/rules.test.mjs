// tests/rules.test.mjs
//
// 🆕 Round 28x.66 — Firestore rules test suite.
//
// Why this exists: every rules change so far (28x.60 reserved identity, 28x.65
// closing the public booking read) had to be verified by firing requests at
// PRODUCTION, because there was no emulator on this machine. That works for
// "is it denied", but it can't safely prove the ALLOW paths — checking that a
// real guest can still book means creating a real booking, which alerts the
// admin group and can DM a practitioner at 2am. Twice now a probe left a real
// document behind that had to be cleaned up.
//
// The founder's proposed alternative was to hand over a practitioner's password
// so her account could be driven directly. That's a real person's account, and
// it isn't needed: the emulator lets us simulate ANY identity — guest, owner,
// therapist, admin — against the real rules file, with fake data, offline.
//
// Run:
//   PATH="/opt/homebrew/opt/openjdk/bin:$PATH" \
//   npx firebase emulators:exec --only firestore --project soulease-spa \
//     "node tests/rules.test.mjs"

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";

const PROJECT_ID = "soulease-spa";

let passed = 0;
let failed = 0;
const failures = [];

async function check(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✔ ${name}`);
  } catch (err) {
    failed++;
    failures.push(`${name}\n      ${String(err).split("\n")[0]}`);
    console.log(`  ✘ ${name}`);
  }
}

const testEnv = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: {
    rules: readFileSync("firestore.rules", "utf8"),
    host: "127.0.0.1",
    port: 8080,
  },
});

// ── Identities ────────────────────────────────────────────────────────────
const GUEST_UID = "guest-uid-1";
const OWNER_UID = "owner-uid-1";
const ADMIN_UID = "admin-uid-1";
const THERAPIST_UID = "therapist-uid-1";
// The crux of the bug this suite was written to prove: bookings store the
// therapist's DOC id, which is not her auth uid.
const THERAPIST_DOC_ID = "XingXingSunRed";

const anon = () => testEnv.unauthenticatedContext().firestore();
const asUser = (uid) => testEnv.authenticatedContext(uid).firestore();

// Wipe first — the emulator keeps data between runs, which would turn the
// "guest CAN create" case into an update on the second run and fail it for the
// wrong reason.
await testEnv.clearFirestore();

// Seed with rules disabled.
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  await setDoc(doc(db, "admins", ADMIN_UID), { grantedAt: Date.now() });
  await setDoc(doc(db, "therapists", THERAPIST_DOC_ID), {
    name: "XingXing",
    uid: THERAPIST_UID,
    telegramChatId: "5620102444",
  });
  await setDoc(doc(db, "bookings", "bk-owned"), {
    userId: OWNER_UID,
    therapistId: THERAPIST_DOC_ID,
    therapistUid: THERAPIST_UID,
    status: "confirmed",
    phone: "+66811111111",
    address: "Secret Hotel, room 1204",
    accessToken: "tok-abc",
  });
  await setDoc(doc(db, "bookings", "bk-guest"), {
    userId: null,
    therapistId: THERAPIST_DOC_ID,
    status: "confirmed",
    phone: "+66822222222",
    address: "Another hotel",
    accessToken: "tok-def",
  });
});

console.log("\nbookings · single-doc read (28x.65)");
await check("logged-out stranger CANNOT read a booking", () =>
  assertFails(getDoc(doc(anon(), "bookings", "bk-owned")))
);
await check("random signed-in user CANNOT read someone else's booking", () =>
  assertFails(getDoc(doc(asUser(GUEST_UID), "bookings", "bk-owned")))
);
await check("owner CAN read their own booking", () =>
  assertSucceeds(getDoc(doc(asUser(OWNER_UID), "bookings", "bk-owned")))
);
await check("admin CAN read any booking", () =>
  assertSucceeds(getDoc(doc(asUser(ADMIN_UID), "bookings", "bk-owned")))
);
await check("logged-out stranger CANNOT read a guest booking either", () =>
  assertFails(getDoc(doc(anon(), "bookings", "bk-guest")))
);

console.log("\nbookings · create + reserved identity (28x.60)");
await check("guest CAN create a normal booking", () =>
  assertSucceeds(
    setDoc(doc(anon(), "bookings", "bk-new-1"), {
      status: "pending",
      contactName: "John Smith",
      phone: "+66812345678",
    })
  )
);
await check("guest CANNOT book as SUNRED", () =>
  assertFails(
    setDoc(doc(anon(), "bookings", "bk-new-2"), {
      status: "pending",
      contactName: "SUNRED",
      phone: "+66812345678",
    })
  )
);
await check("guest CANNOT book with the shop phone", () =>
  assertFails(
    setDoc(doc(anon(), "bookings", "bk-new-3"), {
      status: "pending",
      contactName: "John Smith",
      phone: "+66634350987",
    })
  )
);
await check("guest CANNOT create with a bogus status", () =>
  assertFails(
    setDoc(doc(anon(), "bookings", "bk-new-4"), {
      status: "completed",
      contactName: "John Smith",
    })
  )
);

console.log("\nbookings · therapist access (the 28x.66 bug)");
await check("therapist CAN list her own jobs", () =>
  assertSucceeds(
    getDocs(
      query(
        collection(asUser(THERAPIST_UID), "bookings"),
        where("therapistUid", "==", THERAPIST_UID)
      )
    )
  )
);
await check("therapist CAN read a booking assigned to her", () =>
  assertSucceeds(getDoc(doc(asUser(THERAPIST_UID), "bookings", "bk-owned")))
);
await check("a DIFFERENT therapist CANNOT read that booking", () =>
  assertFails(getDoc(doc(asUser("other-therapist-uid"), "bookings", "bk-owned")))
);

console.log("\nusers · self-service (28x.60)");
await check("user CANNOT rename themselves to SUNRED", async () => {
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "users", GUEST_UID), {
      role: "user",
      displayName: "Bob",
    });
  });
  await assertFails(
    updateDoc(doc(asUser(GUEST_UID), "users", GUEST_UID), {
      displayName: "SunRed",
    })
  );
});
await check("user CAN set a normal display name", () =>
  assertSucceeds(
    updateDoc(doc(asUser(GUEST_UID), "users", GUEST_UID), {
      displayName: "Bob Smith",
    })
  )
);
await check("user CANNOT promote themselves to admin", () =>
  assertFails(
    updateDoc(doc(asUser(GUEST_UID), "users", GUEST_UID), { role: "admin" })
  )
);

console.log("\nadmins · the authority collection");
await check("nobody can write an admins doc from a client", () =>
  assertFails(
    setDoc(doc(asUser(GUEST_UID), "admins", GUEST_UID), { self: true })
  )
);

await testEnv.cleanup();

console.log(`\n${passed} passed · ${failed} failed`);
if (failures.length) {
  console.log("\nFAILURES:");
  failures.forEach((f) => console.log(`  • ${f}`));
}
process.exit(failed > 0 ? 1 : 0);
