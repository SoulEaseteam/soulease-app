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
  deleteDoc,
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
    // 🆕 28x.96 — seeded for the gallery-shrink-only tests below.
    gallery: ["https://img/a.jpg", "https://img/b.jpg"],
  });
  // 🆕 28x.96 — seeded pending gallery requests for the galleryRequests tests.
  await setDoc(doc(db, "galleryRequests", "req-pending-a"), {
    therapistUid: THERAPIST_UID,
    therapistDocId: THERAPIST_DOC_ID,
    imageUrl: "https://img/pending-a.jpg",
    status: "pending",
  });
  await setDoc(doc(db, "galleryRequests", "req-pending-b"), {
    therapistUid: THERAPIST_UID,
    therapistDocId: THERAPIST_DOC_ID,
    imageUrl: "https://img/pending-b.jpg",
    status: "pending",
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
  // 🆕 28x.87 — a pre-existing open report, for the read/update cases below.
  await setDoc(doc(db, "reports", "rep-open"), {
    bookingId: "bk-owned",
    userId: OWNER_UID,
    therapistUid: THERAPIST_UID,
    message: "seeded report",
    status: "open",
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

// 🆕 Round 28x.107 — payload shape + size gate on the open create door.
// The point of these four is to prove the gate bounds an ATTACKER without
// touching a real guest: the first case is the exact document the live
// booking flow writes.
console.log("\nbookings · payload sanity gate (28x.107)");
await check("guest CAN create a full, realistic booking", () =>
  assertSucceeds(
    setDoc(doc(anon(), "bookings", "bk-sane-1"), {
      status: "pending",
      contactName: "John Smith",
      phone: "+66812345678",
      therapistId: "XingXingSunRed",
      serviceId: "SR-HJ2200",
      serviceName: "Gentleman's Signature Therapy",
      duration: 70,
      date: "2026-07-25",
      time: "22:00",
      locationName: "Grande Centre Point Terminal 21",
      address: "2 Sukhumvit Rd, Khlong Toei Nuea, Watthana, Bangkok 10110",
      addressDetails: "Room 1804",
      location: { lat: 13.7376, lng: 100.5602 },
      note: "Please call from the lobby.",
      language: "en",
    })
  )
);
await check("guest CANNOT create a booking with no phone", () =>
  assertFails(
    setDoc(doc(anon(), "bookings", "bk-sane-2"), {
      status: "pending",
      contactName: "John Smith",
    })
  )
);
await check("guest CANNOT stuff a megabyte note", () =>
  assertFails(
    setDoc(doc(anon(), "bookings", "bk-sane-3"), {
      status: "pending",
      phone: "+66812345678",
      note: "x".repeat(5000),
    })
  )
);
await check("guest CANNOT stuff 100 junk keys", () => {
  const junk = { status: "pending", phone: "+66812345678" };
  for (let i = 0; i < 100; i++) junk[`k${i}`] = "v";
  return assertFails(setDoc(doc(anon(), "bookings", "bk-sane-4"), junk));
});
await check("admin CAN create a booking with no therapist assigned yet", () =>
  assertSucceeds(
    setDoc(doc(asUser(ADMIN_UID), "bookings", "bk-sane-5"), {
      status: "pending",
      phone: "+66812345678",
      contactName: "Walk-in enquiry",
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

console.log("\nreports · customer report-an-issue (28x.87)");
await check("signed-out visitor CANNOT create a report", () =>
  assertFails(
    setDoc(doc(anon(), "reports", "rep-anon"), {
      bookingId: "bk-owned",
      userId: OWNER_UID,
      therapistUid: THERAPIST_UID,
      message: "hello",
      status: "open",
    })
  )
);
await check("booking owner CAN report her own completed session", () =>
  assertSucceeds(
    setDoc(doc(asUser(OWNER_UID), "reports", "rep-new-1"), {
      bookingId: "bk-owned",
      userId: OWNER_UID,
      therapistUid: THERAPIST_UID,
      message: "arrived 40 minutes late",
      status: "open",
    })
  )
);
await check("a stranger CANNOT file a report claiming someone else's booking", () =>
  assertFails(
    setDoc(doc(asUser(GUEST_UID), "reports", "rep-new-2"), {
      bookingId: "bk-owned",
      userId: GUEST_UID,
      therapistUid: THERAPIST_UID,
      message: "not my booking",
      status: "open",
    })
  )
);
await check("owner CANNOT spoof a therapistUid different from the booking's real one", () =>
  assertFails(
    setDoc(doc(asUser(OWNER_UID), "reports", "rep-new-3"), {
      bookingId: "bk-owned",
      userId: OWNER_UID,
      therapistUid: "some-other-therapist-uid",
      message: "wrong target",
      status: "open",
    })
  )
);
await check("owner CANNOT create a report already marked acknowledged", () =>
  assertFails(
    setDoc(doc(asUser(OWNER_UID), "reports", "rep-new-4"), {
      bookingId: "bk-owned",
      userId: OWNER_UID,
      therapistUid: THERAPIST_UID,
      message: "sneaky",
      status: "acknowledged",
    })
  )
);

console.log("\nreports · therapist + admin access (28x.87)");
await check("the assigned therapist CAN read a report about her", () =>
  assertSucceeds(getDoc(doc(asUser(THERAPIST_UID), "reports", "rep-open")))
);
await check("a DIFFERENT therapist CANNOT read that report", () =>
  assertFails(getDoc(doc(asUser("other-therapist-uid"), "reports", "rep-open")))
);
await check("the reporting customer CANNOT read her own report back", () =>
  assertFails(getDoc(doc(asUser(OWNER_UID), "reports", "rep-open")))
);
await check("admin CAN read any report", () =>
  assertSucceeds(getDoc(doc(asUser(ADMIN_UID), "reports", "rep-open")))
);
await check("the assigned therapist CAN acknowledge her own report", () =>
  assertSucceeds(
    updateDoc(doc(asUser(THERAPIST_UID), "reports", "rep-open"), {
      status: "acknowledged",
      acknowledgedAt: Date.now(),
    })
  )
);
await check("a DIFFERENT therapist CANNOT acknowledge someone else's report", () =>
  assertFails(
    updateDoc(doc(asUser("other-therapist-uid"), "reports", "rep-open"), {
      status: "acknowledged",
    })
  )
);
await check("the assigned therapist CANNOT edit the report message", () =>
  assertFails(
    updateDoc(doc(asUser(THERAPIST_UID), "reports", "rep-open"), {
      message: "rewritten by the therapist",
    })
  )
);

console.log("\ntherapists · self-edit additions (28x.96)");
await check("therapist CAN self-edit languageSkills on her own doc", () =>
  assertSucceeds(
    updateDoc(doc(asUser(THERAPIST_UID), "therapists", THERAPIST_DOC_ID), {
      languageSkills: [{ code: "en", level: "Fluent" }],
    })
  )
);
await check("a stranger CANNOT edit the therapist's languageSkills", () =>
  assertFails(
    updateDoc(doc(asUser(GUEST_UID), "therapists", THERAPIST_DOC_ID), {
      languageSkills: [{ code: "en", level: "Native" }],
    })
  )
);
await check("therapist CAN remove a photo from her own gallery (shrink)", () =>
  assertSucceeds(
    updateDoc(doc(asUser(THERAPIST_UID), "therapists", THERAPIST_DOC_ID), {
      gallery: ["https://img/a.jpg"],
    })
  )
);
await check("therapist CANNOT add a new photo directly to gallery", () =>
  assertFails(
    updateDoc(doc(asUser(THERAPIST_UID), "therapists", THERAPIST_DOC_ID), {
      gallery: ["https://img/a.jpg", "https://img/NEW-UNAPPROVED.jpg"],
    })
  )
);

console.log("\npayoutAccounts · self-edit (28x.96)");
await check("therapist CAN create her own payout account", () =>
  assertSucceeds(
    setDoc(doc(asUser(THERAPIST_UID), "payoutAccounts", THERAPIST_DOC_ID), {
      bankName: "SCB",
      bankAccount: "111-2-33333-4",
      bankAccountName: "XingXing",
    })
  )
);
await check("therapist CAN read her own payout account", () =>
  assertSucceeds(getDoc(doc(asUser(THERAPIST_UID), "payoutAccounts", THERAPIST_DOC_ID)))
);
await check("a stranger CANNOT read someone else's payout account", () =>
  assertFails(getDoc(doc(asUser(GUEST_UID), "payoutAccounts", THERAPIST_DOC_ID)))
);
await check("a stranger CANNOT write someone else's payout account", () =>
  assertFails(
    setDoc(doc(asUser(GUEST_UID), "payoutAccounts", THERAPIST_DOC_ID), {
      bankName: "Hacked",
      bankAccount: "000-0-00000-0",
      bankAccountName: "Attacker",
    })
  )
);
await check("therapist CANNOT inject an extra field into her payout account", () =>
  assertFails(
    setDoc(doc(asUser(THERAPIST_UID), "payoutAccounts", "some-other-doc-id"), {
      bankName: "SCB",
      bankAccount: "111-2-33333-4",
      bankAccountName: "XingXing",
      role: "admin",
    })
  )
);
await check("admin CAN read any payout account", () =>
  assertSucceeds(getDoc(doc(asUser(ADMIN_UID), "payoutAccounts", THERAPIST_DOC_ID)))
);

console.log("\ngalleryRequests · self-service upload queue (28x.96)");
await check("therapist CAN file her own pending gallery request", () =>
  assertSucceeds(
    setDoc(doc(asUser(THERAPIST_UID), "galleryRequests", "req-new-1"), {
      therapistUid: THERAPIST_UID,
      therapistDocId: THERAPIST_DOC_ID,
      imageUrl: "https://img/new1.jpg",
      status: "pending",
    })
  )
);
await check("therapist CANNOT file a request claiming someone else's uid", () =>
  assertFails(
    setDoc(doc(asUser(THERAPIST_UID), "galleryRequests", "req-new-2"), {
      therapistUid: "other-therapist-uid",
      therapistDocId: THERAPIST_DOC_ID,
      imageUrl: "https://img/new2.jpg",
      status: "pending",
    })
  )
);
await check("therapist CANNOT pre-mark her own request approved", () =>
  assertFails(
    setDoc(doc(asUser(THERAPIST_UID), "galleryRequests", "req-new-3"), {
      therapistUid: THERAPIST_UID,
      therapistDocId: THERAPIST_DOC_ID,
      imageUrl: "https://img/new3.jpg",
      status: "approved",
    })
  )
);
await check("therapist CAN read her own pending request", () =>
  assertSucceeds(getDoc(doc(asUser(THERAPIST_UID), "galleryRequests", "req-pending-a")))
);
await check("a different therapist CANNOT read that request", () =>
  assertFails(getDoc(doc(asUser("other-therapist-uid"), "galleryRequests", "req-pending-a")))
);
await check("therapist CANNOT approve her own request", () =>
  assertFails(
    updateDoc(doc(asUser(THERAPIST_UID), "galleryRequests", "req-pending-a"), {
      status: "approved",
    })
  )
);
await check("admin CAN approve a pending request", () =>
  assertSucceeds(
    updateDoc(doc(asUser(ADMIN_UID), "galleryRequests", "req-pending-a"), {
      status: "approved",
    })
  )
);
await check("therapist CAN withdraw her own still-pending request", () =>
  assertSucceeds(deleteDoc(doc(asUser(THERAPIST_UID), "galleryRequests", "req-pending-b")))
);

console.log("\nbotCopy · Telegram bot message content (28x.97)");
await check("admin CAN write botCopy", () =>
  assertSucceeds(
    setDoc(doc(asUser(ADMIN_UID), "botCopy", "greeter"), {
      welcome: { th: "ทดสอบ" },
    })
  )
);
await check("admin CAN read botCopy", () =>
  assertSucceeds(getDoc(doc(asUser(ADMIN_UID), "botCopy", "greeter")))
);
await check("a non-admin therapist CANNOT write botCopy", () =>
  assertFails(
    setDoc(doc(asUser(THERAPIST_UID), "botCopy", "greeter"), {
      welcome: { th: "hacked" },
    })
  )
);
await check("a non-admin therapist CANNOT read botCopy", () =>
  assertFails(getDoc(doc(asUser(THERAPIST_UID), "botCopy", "greeter")))
);
await check("logged-out visitor CANNOT read botCopy", () =>
  assertFails(getDoc(doc(anon(), "botCopy", "greeter")))
);

console.log("\nanalytics_events · funnel tracking allow-list (28x.99)");
await check("guest CAN create a home_view event", () =>
  assertSucceeds(
    setDoc(doc(anon(), "analytics_events", "ev-1"), { event: "home_view" })
  )
);
await check("guest CAN create a therapist_view event (was missing from the allow-list)", () =>
  assertSucceeds(
    setDoc(doc(anon(), "analytics_events", "ev-2"), { event: "therapist_view" })
  )
);
await check("guest CAN create a bundle_view event (was missing from the allow-list)", () =>
  assertSucceeds(
    setDoc(doc(anon(), "analytics_events", "ev-3"), { event: "bundle_view" })
  )
);
await check("guest CAN create a bundle_reserve_click event (was missing from the allow-list)", () =>
  assertSucceeds(
    setDoc(doc(anon(), "analytics_events", "ev-4"), { event: "bundle_reserve_click" })
  )
);
await check("guest CAN create a referral_tier_applied event (was missing from the allow-list)", () =>
  assertSucceeds(
    setDoc(doc(anon(), "analytics_events", "ev-5"), { event: "referral_tier_applied" })
  )
);
await check("guest CANNOT create an event with a bogus name", () =>
  assertFails(
    setDoc(doc(anon(), "analytics_events", "ev-6"), { event: "totally_made_up" })
  )
);
await check("a stranger CANNOT read analytics_events", () =>
  assertFails(getDoc(doc(asUser(GUEST_UID), "analytics_events", "ev-1")))
);
await check("admin CAN read analytics_events", () =>
  assertSucceeds(getDoc(doc(asUser(ADMIN_UID), "analytics_events", "ev-1")))
);

console.log("\ntherapists/{id}/photoViews · per-photo view counters (28x.113)");
await check("guest CAN create a photo's first view doc (views=1)", () =>
  assertSucceeds(
    setDoc(doc(anon(), "therapists", THERAPIST_DOC_ID, "photoViews", "photo-a"), {
      src: "https://img/a.jpg",
      views: 1,
      updatedAt: Date.now(),
    })
  )
);
await check("guest CANNOT create a photo view doc starting above 1", () =>
  assertFails(
    setDoc(doc(anon(), "therapists", THERAPIST_DOC_ID, "photoViews", "photo-b"), {
      src: "https://img/b.jpg",
      views: 5,
      updatedAt: Date.now(),
    })
  )
);
await check("guest CANNOT create a photo view doc with an extra field", () =>
  assertFails(
    setDoc(doc(anon(), "therapists", THERAPIST_DOC_ID, "photoViews", "photo-c"), {
      src: "https://img/c.jpg",
      views: 1,
      updatedAt: Date.now(),
      hacked: true,
    })
  )
);
await check("guest CAN bump an existing photo's views by exactly +1", () =>
  assertSucceeds(
    updateDoc(doc(anon(), "therapists", THERAPIST_DOC_ID, "photoViews", "photo-a"), {
      views: 2,
      updatedAt: Date.now(),
    })
  )
);
await check("guest CANNOT jump a photo's views by more than +1", () =>
  assertFails(
    updateDoc(doc(anon(), "therapists", THERAPIST_DOC_ID, "photoViews", "photo-a"), {
      views: 99,
      updatedAt: Date.now(),
    })
  )
);
await check("guest CANNOT touch another field while bumping views", () =>
  assertFails(
    updateDoc(doc(anon(), "therapists", THERAPIST_DOC_ID, "photoViews", "photo-a"), {
      views: 3,
      src: "https://img/swapped.jpg",
    })
  )
);
await check("anyone CAN read photoViews (public, same visibility as the photos)", () =>
  assertSucceeds(getDoc(doc(anon(), "therapists", THERAPIST_DOC_ID, "photoViews", "photo-a")))
);
await check("a non-admin therapist CANNOT delete a photoViews doc", () =>
  assertFails(deleteDoc(doc(asUser(THERAPIST_UID), "therapists", THERAPIST_DOC_ID, "photoViews", "photo-a")))
);
await check("admin CAN delete a photoViews doc", () =>
  assertSucceeds(deleteDoc(doc(asUser(ADMIN_UID), "therapists", THERAPIST_DOC_ID, "photoViews", "photo-a")))
);

await testEnv.cleanup();

console.log(`\n${passed} passed · ${failed} failed`);
if (failures.length) {
  console.log("\nFAILURES:");
  failures.forEach((f) => console.log(`  • ${f}`));
}
process.exit(failed > 0 ? 1 : 0);
