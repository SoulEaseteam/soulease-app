// tests/storage.rules.test.mjs
//
// 🆕 Round 28x.107 — Storage rules test suite.
//
// Why this exists: storage.rules went from "any signed-in account may write
// and delete" to a claim-gated rule in one step, and the failure mode of
// getting it wrong is invisible and expensive — the founder's own photo
// uploads start returning "storage/unauthorized" with nothing on screen
// explaining why, which is EXACTLY what happened in 28s280→28s281 when the
// cross-service firestore.exists() check was tried. That round was reverted
// by hand-testing in production. This suite means the next change to this
// file gets proven offline instead.
//
// The emulator can mint a token with any custom claims, which is the whole
// point: the real question is not "does the rule parse" but "does an admin
// token still pass and a customer token now fail".
//
// Run:
//   PATH="/opt/homebrew/opt/openjdk/bin:$PATH" \
//   npx firebase emulators:exec --only storage --project soulease-spa \
//     "node tests/storage.rules.test.mjs"

import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { ref, uploadBytes, getBytes, deleteObject } from "firebase/storage";

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
    failures.push(`${name}: ${err?.message ?? err}`);
    console.log(`  ✘ ${name}`);
  }
}

const testEnv = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  storage: {
    rules: readFileSync("storage.rules", "utf8"),
    host: "127.0.0.1",
    port: 9199,
  },
});

// A 1x1 PNG — real image bytes so contentType checks are honest.
const PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00,
  0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);
const IMG = { contentType: "image/png" };

const anon = () => testEnv.unauthenticatedContext().storage();
// The three identities that matter. `role`/`tid` are exactly the claims
// syncAdminClaim + backfillRoleClaims.mjs write.
const asAdmin = () =>
  testEnv.authenticatedContext("admin-uid", { role: "admin" }).storage();
const asYuri = () =>
  testEnv
    .authenticatedContext("yuri-uid", { role: "therapist", tid: "YuriSunRed" })
    .storage();
// A CUSTOMER: signed in, no staff claim. Before 28x.107 this identity could
// delete every photo on the site.
const asCustomer = () =>
  testEnv.authenticatedContext("customer-uid", { role: "customer" }).storage();

// Seed a file to test reads/deletes against, bypassing rules.
await testEnv.withSecurityRulesDisabled(async (ctx) => {
  const s = ctx.storage();
  await uploadBytes(ref(s, "therapists/YuriSunRed/gallery/seed.png"), PNG, IMG);
  await uploadBytes(ref(s, "therapists/NickySunRed/gallery/seed.png"), PNG, IMG);
  await uploadBytes(ref(s, "services/seed.png"), PNG, IMG);
  await uploadBytes(ref(s, "bundles/seed.png"), PNG, IMG);
  await uploadBytes(ref(s, "jobArrivals/bk-1/seed.png"), PNG, IMG);
});

console.log("\ntherapist photos · the defacement hole (28x.107)");
await check("admin CAN upload a practitioner photo", () =>
  assertSucceeds(
    uploadBytes(ref(asAdmin(), "therapists/YuriSunRed/profile/a.png"), PNG, IMG)
  )
);
await check("practitioner CAN upload into her OWN folder", () =>
  assertSucceeds(
    uploadBytes(
      ref(asYuri(), "therapists/YuriSunRed/galleryPending/b.png"),
      PNG,
      IMG
    )
  )
);
await check("practitioner CANNOT upload into ANOTHER's folder", () =>
  assertFails(
    uploadBytes(
      ref(asYuri(), "therapists/NickySunRed/galleryPending/c.png"),
      PNG,
      IMG
    )
  )
);
await check("customer CANNOT upload a practitioner photo", () =>
  assertFails(
    uploadBytes(
      ref(asCustomer(), "therapists/YuriSunRed/gallery/evil.png"),
      PNG,
      IMG
    )
  )
);
await check("customer CANNOT DELETE a practitioner photo (the whole point)", () =>
  assertFails(
    deleteObject(ref(asCustomer(), "therapists/YuriSunRed/gallery/seed.png"))
  )
);
await check("practitioner CANNOT delete ANOTHER's photo", () =>
  assertFails(
    deleteObject(ref(asYuri(), "therapists/NickySunRed/gallery/seed.png"))
  )
);
await check("admin CAN delete a practitioner photo", () =>
  assertSucceeds(
    deleteObject(ref(asAdmin(), "therapists/NickySunRed/gallery/seed.png"))
  )
);
await check("anyone CAN still read practitioner photos (public product)", () =>
  assertSucceeds(getBytes(ref(anon(), "therapists/YuriSunRed/gallery/seed.png")))
);
await check("admin CANNOT upload a non-image", () =>
  assertFails(
    uploadBytes(ref(asAdmin(), "therapists/YuriSunRed/gallery/x.exe"), PNG, {
      contentType: "application/octet-stream",
    })
  )
);

// 🆕 Round 28x.174 (founder: "โปรไฟล์พนักงาน มีแค่รูป ให้เพิ่มวิดีโอได้") —
// rules only inspect contentType + size, so dummy bytes with a real
// video/* content type exercise the same isSaneVideo() path a real clip
// would, without needing an actual playable file in the test fixture.
console.log("\ntherapist videos (28x.174)");
await check("practitioner CAN upload a video into her OWN folder", () =>
  assertSucceeds(
    uploadBytes(
      ref(asYuri(), "therapists/YuriSunRed/videoPending/clip.mp4"),
      PNG,
      { contentType: "video/mp4" }
    )
  )
);
await check("practitioner CANNOT upload a video into ANOTHER's folder", () =>
  assertFails(
    uploadBytes(
      ref(asYuri(), "therapists/NickySunRed/videoPending/clip.mp4"),
      PNG,
      { contentType: "video/mp4" }
    )
  )
);
await check("customer CANNOT upload a practitioner video", () =>
  assertFails(
    uploadBytes(
      ref(asCustomer(), "therapists/YuriSunRed/videoPending/evil.mp4"),
      PNG,
      { contentType: "video/mp4" }
    )
  )
);
await check("a video over the 60MB cap is REJECTED", () =>
  assertFails(
    uploadBytes(
      ref(asYuri(), "therapists/YuriSunRed/videoPending/huge.mp4"),
      new Uint8Array(61 * 1024 * 1024),
      { contentType: "video/mp4" }
    )
  )
);

console.log("\nservices + bundles · admin-only marketing images");
await check("admin CAN upload a service image", () =>
  assertSucceeds(uploadBytes(ref(asAdmin(), "services/new.png"), PNG, IMG))
);
await check("customer CANNOT overwrite a service image", () =>
  assertFails(uploadBytes(ref(asCustomer(), "services/seed.png"), PNG, IMG))
);
await check("practitioner CANNOT touch bundle images", () =>
  assertFails(uploadBytes(ref(asYuri(), "bundles/seed.png"), PNG, IMG))
);
await check("customer CANNOT delete a bundle image", () =>
  assertFails(deleteObject(ref(asCustomer(), "bundles/seed.png")))
);
await check("anyone CAN read service images", () =>
  assertSucceeds(getBytes(ref(anon(), "services/seed.png")))
);

console.log("\njobArrivals · photos of where a guest is waiting");
await check("practitioner CAN upload an arrival photo", () =>
  assertSucceeds(uploadBytes(ref(asYuri(), "jobArrivals/bk-2/a.png"), PNG, IMG))
);
await check("customer CANNOT READ another guest's arrival photo", () =>
  assertFails(getBytes(ref(asCustomer(), "jobArrivals/bk-1/seed.png")))
);
await check("logged-out visitor CANNOT read an arrival photo", () =>
  assertFails(getBytes(ref(anon(), "jobArrivals/bk-1/seed.png")))
);
await check("admin CAN read an arrival photo", () =>
  assertSucceeds(getBytes(ref(asAdmin(), "jobArrivals/bk-1/seed.png")))
);

console.log("\nunknown paths · default deny");
await check("admin CANNOT write outside the known prefixes", () =>
  assertFails(uploadBytes(ref(asAdmin(), "random/thing.png"), PNG, IMG))
);

await testEnv.cleanup();

console.log(`\n${passed} passed · ${failed} failed`);
if (failures.length) {
  console.log("\nFAILURES:");
  failures.forEach((f) => console.log(`  • ${f}`));
}
process.exit(failed > 0 ? 1 : 0);
