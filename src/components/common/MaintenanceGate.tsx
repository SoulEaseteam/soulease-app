// src/components/common/MaintenanceGate.tsx
//
// 🆕 Round 28s296 (founder: "admin/advanced-settings ปรับแก้ และ
//   ตกแต่งสวยงาม แนะนำ ที่ใช้ได้จริง") — the "Enable Maintenance Mode"
//   switch on AdminAdvancedSettingsPage.tsx wrote to Firestore but
//   nothing anywhere ever read it back — flipping it did nothing. This
//   is the actual enforcement: a live listener on the public
//   `adminSettings/publicRules` doc that swaps the whole customer-facing
//   app for a "back soon" screen the moment the flag flips, without
//   requiring a redeploy or even a page refresh for guests already on
//   the site. Admin/therapist accounts always pass through — the point
//   is pausing new guest traffic (e.g. a pricing fix in progress), not
//   locking the founder out of her own back office.

import React, { useEffect, useState } from "react";
import { doc, collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { applyLiveFareConfig } from "@/utils/taxiFare";
import { applyLivePromosEnabled } from "@/config/featureFlags";
import { applyLivePromoConfig, type CustomPromoCode } from "@/utils/discount";
import { applyLiveServiceConfig } from "@/utils/servicePricing";
import { applyLiveAddonConfig } from "@/data/bookingExtras";

const MaintenanceGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, loading: authLoading } = useAuth();
  const [maintenanceOn, setMaintenanceOn] = useState(false);

  useEffect(() => {
    // 🆕 Round 28s296/28s298 — this component already subscribes to the
    //   ONLY public app-config doc, so the live pricing override
    //   (deposit, admin-quote distance, round-trip multiplier — see
    //   taxiFare.ts) and the promos master switch (featureFlags.ts)
    //   piggyback on the same listener instead of opening new ones.
    const unsub = onSnapshot(
      doc(db, "adminSettings", "publicRules"),
      (snap) => {
        const data = snap.data();
        setMaintenanceOn(data?.maintenanceMode === true);
        applyLiveFareConfig({
          adminQuoteKm: data?.maxDistance,
          roundTripMultiplier: data?.roundTripMultiplier,
          freeRadiusKm: data?.freeRadiusKm,
          depositThb: data?.depositAmount,
        });
        applyLivePromosEnabled(data?.promosEnabled === true);
        // 🆕 Round 28s300/28s301 — live service overrides + admin-created
        //   custom services, both nested fields on this same public doc
        //   (no new listener / rules entry). Empty/absent = hardcoded
        //   catalog, unchanged.
        applyLiveServiceConfig({
          overrides: data?.serviceOverrides,
          customServices: data?.customServices,
          order: data?.serviceOrder,
        });
        applyLiveAddonConfig({
          overrides: data?.addonOverrides,
          customAddons: data?.customAddons,
        });
      },
      () => setMaintenanceOn(false), // fail open — never let a read error lock everyone out
    );
    return () => unsub();
  }, []);

  // 🆕 Round 28s298 (founder: "เพิ่ม เมนู โปรโมชั่น") — separate listener
  //   on the `promoCodes` collection (not a single doc — each code is
  //   its own doc, matching blockedPhones' shape) feeding
  //   discount.ts's live override cache: which hardcoded codes admin
  //   turned off, plus any brand-new codes she created from the UI.
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "promoCodes"),
      (snap) => {
        const disabledCodes: string[] = [];
        const custom: Record<string, CustomPromoCode> = {};
        snap.forEach((d) => {
          const data = d.data();
          if (data.kind === "custom") {
            if (data.enabled !== false) {
              custom[d.id] = {
                type: data.type === "percent" ? "percent" : "fixed",
                amount: typeof data.amount === "number" ? data.amount : 0,
                capThb: typeof data.capThb === "number" ? data.capThb : undefined,
                label: typeof data.label === "string" ? data.label : d.id,
                expiresAt: data.expiresAt?.toMillis?.() ?? null,
                // 🆕 Round 28s299 — scheduling + spend/usage guards.
                startsAt: data.startsAt?.toMillis?.() ?? null,
                minSpendThb: typeof data.minSpendThb === "number" ? data.minSpendThb : null,
                maxRedemptions: typeof data.maxRedemptions === "number" ? data.maxRedemptions : null,
                perPhoneLimit: typeof data.perPhoneLimit === "number" ? data.perPhoneLimit : null,
              };
            }
          } else if (data.enabled === false) {
            disabledCodes.push(d.id);
          }
        });
        applyLivePromoConfig({ disabledCodes, customCodes: custom });
      },
      () => applyLivePromoConfig({ disabledCodes: [], customCodes: {} }), // fail open
    );
    return () => unsub();
  }, []);

  // Staff always pass through. Wait for auth to resolve before gating so
  // a signed-in admin's own tab doesn't flash the maintenance screen on load.
  if (maintenanceOn && !authLoading && role !== "admin" && role !== "therapist") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          padding: 24,
          textAlign: "center",
          background: "#1A2B2E",
          color: "#fff",
          fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ fontSize: 40 }}>🌙</div>
        <div style={{ fontFamily: '"Federo","Italiana","Cinzel",Georgia,serif', fontSize: 22, fontWeight: 700 }}>
          SunRed
        </div>
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", maxWidth: 380 }}>
          ระบบจองปิดปรับปรุงชั่วคราว กลับมาให้บริการเร็ว ๆ นี้
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)" }}>
          Booking temporarily paused — back shortly.
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default MaintenanceGate;
