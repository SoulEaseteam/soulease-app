// functions/src/_init.ts
//
// Firebase Admin SDK bootstrap — `initializeApp()` is called here and
// nowhere else. Every domain module starts with `import "./_init";` so
// admin-SDK init is guaranteed by the dependency graph rather than by
// statement order inside index.ts.
//
// ⚠️ Keep `getFirestore()` / `getAuth()` calls INSIDE handler bodies
//   (never at module top level) so no module body can run before this one.

import { initializeApp } from "firebase-admin/app";

initializeApp();
