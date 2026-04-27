// src/lib/firebase.ts
//
// อ่านค่า Firebase config จาก env (VITE_FIREBASE_*) เพื่อให้สลับ project ได้ง่าย
// — ค่าพวกนี้ไม่ใช่ "secret" จริงๆ (Firebase web config เป็น public-by-design)
//   แต่การจัดการผ่าน env ทำให้ rotate / สลับ staging↔prod ง่ายกว่า
//
// ถ้า env ไม่ครบ (เช่น dev เครื่องใหม่ที่ยังไม่มี .env) จะ throw ทันที
// แทนที่จะปล่อยให้ Firebase พังเงียบๆ ตอน runtime

import { initializeApp, type FirebaseOptions } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const required = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
] as const;

const env = import.meta.env;
const missing = required.filter((k) => !env[k]);
if (missing.length > 0) {
  // log อย่างเดียวระหว่าง dev ก็พอ — production build ที่ env ไม่ครบควรล้มแต่แรก
  // เพื่อให้ใครเห็น error ก่อนเปิดเว็บจริง
  throw new Error(
    `[firebase] Missing required env vars: ${missing.join(", ")}\n` +
      `ตรวจสอบ .env (local) หรือ Vercel Project Env (production)`
  );
}

const firebaseConfig: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export { app };
