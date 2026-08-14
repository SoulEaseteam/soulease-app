// src/hooks/useAnniversaryConfigVersion.ts
//
// 🆕 2026-08-14 — re-renders the caller whenever the live anniversary
//   campaign config is (re)applied by MaintenanceGate. Mirror of
//   useServiceConfigVersion (28w.32), same reason: the config lands async
//   from Firestore AFTER first paint and can change mid-session — ending
//   the campaign must pull its surfaces (home/pricing banner, promotions
//   entry) off screens that are already open, without a reload. Call it
//   before reading anniversaryIsLive()/anniversaryConfig() in a component.

import { useSyncExternalStore } from "react";
import {
  subscribeAnniversaryConfig,
  getAnniversaryConfigVersion,
} from "@/config/anniversary";

export function useAnniversaryConfigVersion(): number {
  return useSyncExternalStore(
    subscribeAnniversaryConfig,
    getAnniversaryConfigVersion,
    // Server/prerender snapshot — config is client-only, version 0 is fine.
    getAnniversaryConfigVersion,
  );
}
