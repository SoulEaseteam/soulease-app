// src/lib/firebase.ts
// Hardcoded config — ปลอดภัยพอ เพราะ Firebase web config เป็น public-by-design
// (ไม่ใช่ secret — security จริงอยู่ที่ Firestore rules + App Check)

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

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

export const db = getFirestore(app);
export const auth = getAuth(app);
// NOTE: storage export removed (Round 28s105) — it had zero consumers,
// so dropping it trims firebase/storage out of the customer bundle and
// shrinks SSR surface. Re-add `getStorage(app)` lazily if uploads land.

export { app };
