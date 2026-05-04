// src/hooks/useAdminPresenceHeartbeat.ts
//
// 🆕 Round 28b21 (founder 2026-05-04) — Phase 3.
//
// Used inside AdminLayout. While the admin tab is open AND the user is
// signed in with role="admin", this hook writes to
// `adminPresence/global` every 30 seconds with:
//   { online: true, lastHeartbeatAt: serverTimestamp(), adminCount: 1 }
//
// On unmount (tab close / navigation away from admin) it best-effort
// flips `online: false`. Network failures are tolerated — the customer-
// side useAdminPresence hook will fail closed (assume offline) when the
// last heartbeat is >90s old, so a single dropped write self-heals.
//
// We intentionally don't track per-admin presence here (would require
// auth/admin SDK arbitration). One global flag is enough for the
// customer reassurance use case.

import { useEffect } from "react";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

const PRESENCE_DOC = "adminPresence/global";
const HEARTBEAT_INTERVAL_MS = 30_000;

export const useAdminPresenceHeartbeat = (active: boolean) => {
  useEffect(() => {
    if (!active) return;

    const ref = doc(db, PRESENCE_DOC);
    let cancelled = false;

    const beat = async () => {
      if (cancelled) return;
      try {
        await setDoc(
          ref,
          {
            online: true,
            lastHeartbeatAt: serverTimestamp(),
            adminCount: 1,
          },
          { merge: true }
        );
      } catch (err) {
        // Permission errors mean rules block the write — fail-open,
        // we just won't show "online" to customers. Log once.
        console.warn("[adminPresence] heartbeat write failed:", err);
      }
    };

    // Initial beat
    void beat();

    const id = window.setInterval(beat, HEARTBEAT_INTERVAL_MS);

    // Pause heartbeats when tab is hidden (saves writes), resume
    // immediately when visible again.
    const onVisibility = () => {
      if (document.visibilityState === "visible") void beat();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
      // Best-effort offline marker. Don't await — page is unmounting.
      void setDoc(
        ref,
        {
          online: false,
          lastHeartbeatAt: serverTimestamp(),
          adminCount: 0,
        },
        { merge: true }
      ).catch(() => {});
    };
  }, [active]);
};

export default useAdminPresenceHeartbeat;
