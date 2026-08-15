// src/utils/adminPush.ts
//
// 🆕 Round 28x.193 (founder: "push notifications ฝั่งฉันก่อน") — admin-side
//   web push. Raw Push API + self-generated VAPID keys, NOT the FCM SDK:
//   no console-generated certificate needed, and the payloads stay on the
//   standard protocol every push service (Chrome/Android, iOS 16.4+
//   installed-PWA Safari) already speaks.
//
//   Key material + device subscriptions both live in `adminSettings/*`
//   docs, which the existing rules lock to isAdmin() — nothing here is
//   readable by guests.
//
//   iOS caveat for the UI to surface: Safari only exposes the Push API to
//   an INSTALLED (Add to Home Screen) PWA, and the permission prompt must
//   come from a user gesture — which the admin toggle click provides.

import { doc, getDoc, setDoc, deleteField, serverTimestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db, app } from "@/lib/firebase";

const KEYS_DOC = "adminSettings/webPush";
const SUBS_DOC = "adminSettings/webPushSubs";

export type AdminPushStatus =
  | "unsupported" // browser has no Push API (or iOS Safari not installed)
  | "blocked" // permission previously denied — only browser settings can undo
  | "off"
  | "on";

/** Deterministic per-device id so re-enabling never duplicates a row. */
function endpointId(endpoint: string): string {
  let h = 0;
  for (let i = 0; i < endpoint.length; i++) {
    h = (h * 31 + endpoint.charCodeAt(i)) | 0;
  }
  return `d${(h >>> 0).toString(36)}`;
}

function pushSupported(): boolean {
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

async function swRegistration(): Promise<ServiceWorkerRegistration> {
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg) return reg;
  return navigator.serviceWorker.ready;
}

export async function adminPushStatus(): Promise<AdminPushStatus> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "blocked";
  if (Notification.permission !== "granted") return "off";
  const reg = await swRegistration();
  const sub = await reg.pushManager.getSubscription();
  return sub ? "on" : "off";
}

/** Base64url → Uint8Array (applicationServerKey wants raw bytes). */
function urlB64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function enableAdminPush(): Promise<AdminPushStatus> {
  if (!pushSupported()) return "unsupported";

  const keysSnap = await getDoc(doc(db, KEYS_DOC));
  let publicKey = keysSnap.data()?.vapidPublicKey as string | undefined;
  if (!publicKey) {
    // 🆕 28x.193b — first enable anywhere: ask the backend to generate the
    //   pair inside the function runtime (see ensureWebPushKeys). Replaces
    //   the manual setWebPushKeys.mjs terminal step, which proved fragile.
    const ensure = httpsCallable<Record<string, never>, { publicKey: string }>(
      getFunctions(app, "asia-southeast1"),
      "ensureWebPushKeys",
    );
    publicKey = (await ensure({})).data.publicKey;
  }
  if (!publicKey) throw new Error("webpush-keys-missing");

  const permission = await Notification.requestPermission();
  if (permission === "denied") return "blocked";
  if (permission !== "granted") return "off";

  const reg = await swRegistration();
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlB64ToUint8Array(publicKey).buffer as ArrayBuffer,
    }));

  await setDoc(
    doc(db, SUBS_DOC),
    {
      subs: {
        [endpointId(sub.endpoint)]: {
          subscription: JSON.parse(JSON.stringify(sub)),
          ua: navigator.userAgent.slice(0, 160),
          createdAt: serverTimestamp(),
        },
      },
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  return "on";
}

export async function disableAdminPush(): Promise<AdminPushStatus> {
  if (!pushSupported()) return "unsupported";
  const reg = await swRegistration();
  const sub = await reg.pushManager.getSubscription();
  if (sub) {
    await setDoc(
      doc(db, SUBS_DOC),
      { subs: { [endpointId(sub.endpoint)]: deleteField() }, updatedAt: serverTimestamp() },
      { merge: true },
    );
    await sub.unsubscribe();
  }
  return "off";
}
