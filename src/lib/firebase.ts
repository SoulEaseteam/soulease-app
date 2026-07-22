// src/lib/firebase.ts
// Hardcoded config — ปลอดภัยพอ เพราะ Firebase web config เป็น public-by-design
// (ไม่ใช่ secret — security จริงอยู่ที่ Firestore rules + App Check)

import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore, type Firestore } from "firebase/firestore";
import {
  getAuth,
  initializeAuth,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  type Auth,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCPJkRTNE1XuP_xkDq18bs3ygsSfk5kgRM",
  authDomain: "soulease-spa.firebaseapp.com",
  projectId: "soulease-spa",
  storageBucket: "soulease-spa.firebasestorage.app",
  messagingSenderId: "394341744641",
  appId: "1:394341744641:web:9a868196770d7b80308000",
  measurementId: "G-XEMLVVPN4W",
};

// Idempotent init — reuse the existing app on HMR / repeat-import / SSR
// prerender so we never double-initialize Firebase.
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 🆕 Round 28s325 — auto-detect long-polling.
//   The founder hit "FIRESTORE INTERNAL ASSERTION FAILED: Unexpected state
//   (ID: b815)" — a known firebase-js-sdk bug in the WebChannel streaming
//   transport: a flaky network / proxy / ad-blocker (or a long Vite-HMR dev
//   session) corrupts the listener target-state machine and every subsequent
//   Firestore op throws, crashing the whole app via the error boundary.
//   Auto-detecting long-polling sidesteps that WebChannel state machine.
//   `initializeFirestore` can only run once per app, so on HMR / repeat import
//   we fall back to the already-configured instance.
function makeDb(): Firestore {
  try {
    return initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
  } catch {
    return getFirestore(app); // already initialized (HMR / repeat import)
  }
}

export const db = makeDb();

// 🆕 Round 28x.126 (founder: "ทำไมหน้าล็อกอินพนักงานถึงเด้งให้เข้ารหัสทุกครั้ง
//   เมื่อไม่ได้ใช้งาน แต่ยังไม่ได้กดออกระบบ") — nothing in this app signs her
//   out (every signOut() call site is a button she presses), so a session that
//   disappears on its own is the browser dropping Firebase's stored token.
//
//   `getAuth()` picks persistence implicitly: IndexedDB, else localStorage,
//   else IN-MEMORY — and that last fallback is silent. In-memory means the
//   session dies the moment the tab closes. It's a real case here, not a
//   theoretical one: she opens links from inside the LINE / Telegram in-app
//   browsers, where IndexedDB is frequently restricted, and the SDK would
//   quietly land on in-memory and log her out every single time.
//
//   `initializeAuth` with an explicit chain fixes exactly that: try IndexedDB,
//   fall back to localStorage (which survives a tab close), and only then
//   in-memory — kept last purely so a hostile browser degrades instead of
//   throwing at startup. Same idempotent guard as makeDb(): initializeAuth can
//   only run once per app, so HMR / repeat-import falls back to the instance
//   that already exists.
//
//   What this does NOT fix, and can't from JS: iOS Safari caps script-writable
//   storage at 7 days without a visit, then wipes it. A practitioner who opens
//   the app less than weekly WILL be asked to sign in again on iPhone. The
//   real remedy there is installing it to the home screen (Round 28x.119) —
//   Apple exempts installed web apps from that 7-day eviction.
//
//   ⚠️ CORRECTION (Round 28x.128) — everything above is sound hardening and
//   stays, but it was NOT the cause of the founder's "ต้องล็อกอินทุกครั้ง"
//   report, and it did not fix it. The session was never being lost: `/staff`
//   IS the login page, and the staff manifest's `start_url` points at it, so
//   every launch of the installed app opened the password form while a
//   perfectly valid session sat in storage. LoginPage simply never checked.
//   Fixed there, not here. If someone reports this symptom again, check the
//   ROUTE before touching persistence again.
function makeAuth(): Auth {
  try {
    return initializeAuth(app, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
    });
  } catch {
    return getAuth(app); // already initialized (HMR / repeat import)
  }
}

export const auth = makeAuth();
// NOTE: storage export removed (Round 28s105) — it had zero consumers,
// so dropping it trims firebase/storage out of the customer bundle and
// shrinks SSR surface. Re-add `getStorage(app)` lazily if uploads land.

export { app };
