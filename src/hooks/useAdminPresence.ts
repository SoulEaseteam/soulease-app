// src/hooks/useAdminPresence.ts
//
// 🆕 Round 28b21 (founder 2026-05-04) — Phase 3 of the conversion plan.
//
// Reads the `adminPresence/global` Firestore doc and tells the caller
// whether at least one admin is currently online (has heartbeat'd
// within the last 90 seconds).
//
// Heartbeat contract (written by AdminLayout when an admin is signed
// in and the tab is visible):
//   adminPresence/global = {
//     online: boolean,            // true while at least one admin alive
//     lastHeartbeatAt: Timestamp, // refreshed every 30s
//     adminCount: number,         // optional, # admins online
//   }
//
// We tolerate clock skew up to 90s before flipping back to offline.
// This is a fail-CLOSED check — if the doc is missing or stale, we
// claim admin is offline (better to under-promise availability).

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const STALE_MS = 90_000; // 90s — tolerates one missed 30s heartbeat

export interface AdminPresence {
  online: boolean;
  lastSeenAt: Date | null;
  adminCount: number;
}

export const useAdminPresence = (): AdminPresence => {
  const [presence, setPresence] = useState<AdminPresence>({
    online: false,
    lastSeenAt: null,
    adminCount: 0,
  });

  useEffect(() => {
    const ref = doc(db, "adminPresence", "global");
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) {
          setPresence({ online: false, lastSeenAt: null, adminCount: 0 });
          return;
        }
        const data = snap.data();
        const ts = data.lastHeartbeatAt?.toDate?.() as Date | undefined;
        const now = Date.now();
        const fresh = ts ? now - ts.getTime() < STALE_MS : false;
        setPresence({
          online: fresh && Boolean(data.online),
          lastSeenAt: ts ?? null,
          adminCount: typeof data.adminCount === "number" ? data.adminCount : 0,
        });
      },
      (err) => {
        // Permission errors are common before login — don't spam console
        if (err.code !== "permission-denied") {
          console.warn("[useAdminPresence] snapshot error:", err);
        }
        setPresence({ online: false, lastSeenAt: null, adminCount: 0 });
      }
    );

    // Re-evaluate freshness every 15s so the badge auto-flips when
    // a heartbeat goes stale, without needing a Firestore write.
    const interval = window.setInterval(() => {
      setPresence((prev) => {
        if (!prev.lastSeenAt) return prev;
        const fresh = Date.now() - prev.lastSeenAt.getTime() < STALE_MS;
        if (fresh === prev.online) return prev;
        return { ...prev, online: fresh && prev.adminCount > 0 };
      });
    }, 15_000);

    return () => {
      unsub();
      window.clearInterval(interval);
    };
  }, []);

  return presence;
};

export default useAdminPresence;
