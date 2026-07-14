// src/hooks/useServiceConfigVersion.ts
//
// 🆕 Round 28w.32 (founder "ใช้ที่เดียวกันกัน services") — re-renders the
//   caller whenever the live admin service config (image/name/price/order
//   overrides) is (re)applied by MaintenanceGate. Returns a version number
//   that increments per apply.
//
// Why: the override map loads async from Firestore AFTER first paint. A
//   surface that memoises the catalog on mount (ServicesPage `useMemo`) or
//   computes it once (ServiceDetailPage) would otherwise freeze the
//   pre-override STOCK images and never show the admin's uploaded photos —
//   while the booking flow (which re-renders for other reasons) does. Put
//   this version in the relevant `useMemo` deps, or just call it, so the
//   catalog read picks up the admin images the moment they land.

import { useSyncExternalStore } from "react";
import {
  subscribeServiceConfig,
  getServiceConfigVersion,
} from "@/utils/servicePricing";

export function useServiceConfigVersion(): number {
  return useSyncExternalStore(
    subscribeServiceConfig,
    getServiceConfigVersion,
    // Server/prerender snapshot — config is client-only, version 0 is fine.
    getServiceConfigVersion
  );
}
