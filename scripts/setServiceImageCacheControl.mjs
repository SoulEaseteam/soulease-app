// scripts/setServiceImageCacheControl.mjs
// ────────────────────────────────────────────────────────────────────────
// 🆕 Round 28x.187 (founder: "หน้า services แสดงผลช้าไป") — one-off metadata
// fix for the admin-uploaded service hero photos (services/<sku>/<ts>.jpg
// in Storage). Measured via Resource Timing on the live site: these loaded
// in 1.6–3.9s EACH because Firebase Storage's default object metadata
// carries no Cache-Control, so every visit re-downloads the full file
// instead of using the browser's own cache.
//
// This does NOT touch image bytes, dimensions, or content — metadata only.
// Filenames already embed an upload timestamp (services/SR-Aroma/
// 1783878488580.jpg), so a NEW upload gets a NEW URL automatically — a
// long max-age can never serve a stale photo after the admin replaces one.
// That's what makes `immutable` safe here specifically.
//
// Idempotent: setMetadata on an object that already has this header is a
// no-op rewrite, safe to re-run.
//
// Run:  node scripts/setServiceImageCacheControl.mjs           (dry run)
//       node scripts/setServiceImageCacheControl.mjs --apply   (writes)
// ────────────────────────────────────────────────────────────────────────

import { createRequire } from "node:module";
import { initializeApp, cert } from "firebase-admin/app";
import { getStorage } from "firebase-admin/storage";

const require = createRequire(import.meta.url);
const APPLY = process.argv.includes("--apply");

initializeApp({
  credential: cert(require("./serviceAccountKey.json")),
  storageBucket: "soulease-spa.firebasestorage.app",
});
const bucket = getStorage().bucket();

const CACHE_CONTROL = "public, max-age=31536000, immutable";

const [files] = await bucket.getFiles({ prefix: "services/" });
console.log(`Found ${files.length} file(s) under services/`);

let changed = 0;
let alreadyOk = 0;
for (const file of files) {
  const [meta] = await file.getMetadata();
  if (meta.cacheControl === CACHE_CONTROL) {
    alreadyOk++;
    continue;
  }
  console.log(
    `${APPLY ? "SET" : "WOULD SET"} ${file.name} — cacheControl: ${
      meta.cacheControl ?? "(none)"
    } → "${CACHE_CONTROL}"`
  );
  if (APPLY) {
    await file.setMetadata({ cacheControl: CACHE_CONTROL });
  }
  changed++;
}

console.log(
  `\n${changed} file(s) ${APPLY ? "updated" : "would be updated"}, ${alreadyOk} already correct.`
);
if (!APPLY) console.log("Dry run — re-run with --apply to write.");
