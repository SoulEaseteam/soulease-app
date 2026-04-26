// src/utils/deviceFingerprint.ts
export function getOrCreateDeviceId(): string {
  const KEY = "sr_device_id";
  if (typeof window === "undefined") return "server-device";

  let id = window.localStorage.getItem(KEY);
  if (!id) {
    if (window.crypto?.randomUUID) {
      id = window.crypto.randomUUID();
    } else {
      id = `dev_${Math.random().toString(36).slice(2)}_${Date.now()}`;
    }
    window.localStorage.setItem(KEY, id);
  }
  return id;
}

export async function getClientIp(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const data = await res.json();
    if (data?.ip && typeof data.ip === "string") return data.ip;
  } catch {
    // ignore
  }
  return null;
}