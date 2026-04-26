// src/utils/blocking.ts
import { db } from "@/lib/firebase";
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { getOrCreateDeviceId, getClientIp } from "@/utils/deviceFingerprint";

export type BlockReason =
  | "spam"
  | "abuse"
  | "fake_booking"
  | "suspicious"
  | "manual"
  | string;

export interface BlockContext {
  page?: string;
  userId?: string;
  note?: string;
  [key: string]: any;
}

export async function getDeviceAndIp(): Promise<{ deviceId: string; ip: string | null }> {
  const deviceId = getOrCreateDeviceId();
  const ip = await getClientIp();
  return { deviceId, ip };
}

export async function isDeviceBlocked(deviceId: string): Promise<boolean> {
  if (!deviceId) return false;
  try {
    const snap = await getDoc(doc(db, "blockedDevices", deviceId));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function isIpBlocked(ip: string | null): Promise<boolean> {
  if (!ip) return false;
  try {
    const safeKey = ip.replace(/\./g, "_");
    const snap = await getDoc(doc(db, "blockedIps", safeKey));
    return snap.exists();
  } catch {
    return false;
  }
}

export async function blockDeviceAndIp(params: {
  deviceId: string;
  ip: string | null;
  reason: BlockReason;
  context?: BlockContext;
}): Promise<void> {
  const { deviceId, ip, reason, context } = params;
  const now = Timestamp.now();

  const payload = {
    reason,
    context: context ?? {},
    createdAt: now,
  };

  await setDoc(doc(db, "blockedDevices", deviceId), payload, { merge: true });

  if (ip) {
    const safeKey = ip.replace(/\./g, "_");
    await setDoc(doc(db, "blockedIps", safeKey), { ip, ...payload }, { merge: true });
  }
}
