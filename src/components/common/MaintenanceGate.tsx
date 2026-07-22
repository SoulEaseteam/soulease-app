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

import React, { useEffect, useRef, useState } from "react";
import { doc, collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { applyLiveFareConfig } from "@/utils/taxiFare";
import { applyLivePromosEnabled } from "@/config/featureFlags";
// 🆕 28w.96 — the Anniversary campaign is admin-editable now; push it in from
//   publicRules the same way promos/pricing are.
import { applyLiveAnniversaryConfig, type AnniversaryConfig } from "@/config/anniversary";
import { applyLivePromoConfig, applyLiveBuiltinOverrides, type CustomPromoCode, type BuiltinPromoOverride } from "@/utils/discount";
import { applyLiveServiceConfig } from "@/utils/servicePricing";
import { applyLiveBundles, type Bundle } from "@/utils/bundles";
import i18n from "@/app/i18n";

const MaintenanceGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { role, loading: authLoading } = useAuth();
  const [maintenanceOn, setMaintenanceOn] = useState(false);

  // 🆕 Round 28r50 (feature #2 "Scheduled Pricing / Draft Mode") — hold the
  //   most-recent publicRules snapshot so a 60s interval can re-apply the
  //   same data through the setters. The setters filter every scheduled
  //   override by Date.now(), so a queued edit auto-activates within ~60s
  //   of its target time without any page refresh or new Firestore read.
  //   `null` before the first snapshot lands.
  const lastPublicSnapRef = useRef<Record<string, unknown> | null>(null);
  // The custom-code cache lives in the separate `promoCodes` listener
  // below; a scheduled custom code needs the same cadence too.
  const lastCustomCodesRef = useRef<Record<string, CustomPromoCode> | null>(null);
  const lastDisabledCodesRef = useRef<string[] | null>(null);

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
        lastPublicSnapRef.current = (data as Record<string, unknown>) ?? {};
        setMaintenanceOn(data?.maintenanceMode === true);
        // 🆕 Round 28s309 — travel fare gained Grab booking fee + time-of-day
        //   surge (rush/peak), both admin-tunable, on top of the actual
        //   round-trip meter; admin-quote distance dropped to 15 km.
        applyLiveFareConfig({
          adminQuoteKm: data?.maxDistance,
          roundTripMultiplier: data?.roundTripMultiplier,
          grabBookingFee: data?.grabBookingFee,
          rushSurgePct: data?.rushSurgePct,
          peakSurgePct: data?.peakSurgePct,
          // 🆕 28x.99u — was `travelBands` (dead flat-band shape, see
          //   taxiFare.ts applyLiveFareConfig comment); reconnected to the
          //   checkpoint model calcTaxiFare actually uses.
          motoFareCheckpoints: data?.motoFareCheckpoints as [number, number][] | undefined,
        });
        applyLivePromosEnabled(data?.promosEnabled === true);
        applyLiveAnniversaryConfig(
          (data?.anniversary ?? null) as Partial<AnniversaryConfig> | null,
        );
        // 🆕 Round 28s300/28s301 — live service overrides + admin-created
        //   custom services, both nested fields on this same public doc
        //   (no new listener / rules entry). Empty/absent = hardcoded
        //   catalog, unchanged.
        // 🆕 Round 28r50 — `scheduledFor` on a service override is stored
        //   as a Firestore Timestamp; normalize to epoch ms here so the
        //   setter's `Date.now()` comparison works. Every other field is
        //   already a scalar so `{...v}` spread + one field swap is safe.
        const rawSvcOv = (data?.serviceOverrides ?? {}) as Record<
          string,
          Record<string, unknown> & { scheduledFor?: { toMillis?: () => number } | null }
        >;
        const normSvcOv: Record<string, Record<string, unknown>> = {};
        for (const [k, v] of Object.entries(rawSvcOv)) {
          if (!v || typeof v !== "object") continue;
          normSvcOv[k] = { ...v, scheduledFor: v.scheduledFor?.toMillis?.() ?? null };
        }
        // 🆕 Round 28r50 — also normalize scheduledFor on customServices
        //   (Firestore stores Timestamps; the setter compares against
        //   Date.now() as ms).
        const rawCustSvc = (data?.customServices ?? []) as Array<
          Record<string, unknown> & { scheduledFor?: { toMillis?: () => number } | null }
        >;
        const normCustSvc = rawCustSvc.map((cs) => ({
          ...cs,
          scheduledFor: cs?.scheduledFor?.toMillis?.() ?? null,
        }));
        applyLiveServiceConfig({
          overrides: normSvcOv as never,
          customServices: normCustSvc as never,
          order: data?.serviceOrder,
        });
        // 🆕 Round 28r49 (founder 2026-07-08 — "Add-ons · บริการเสริม เอาออก
        //   จากทุกที่ที่มี") — the addon live-config wiring (28s302) has been
        //   fully removed alongside the customer picker and admin editor.
        //   `addonOverrides` / `customAddons` fields on this doc are now
        //   ignored (harmless leftovers if present).
        //
        // 🆕 Round 28r49 (founder 2026-07-08 — "Built-in Codes · โค้ดมาตรฐาน
        //   แก้ไขและลบได้") — per-code editable overrides for the 7 built-in
        //   discount codes ride the SAME public doc + this SAME listener,
        //   so no rules change and no second listener. Empty/absent map =
        //   hardcoded defaults, byte-identical to pre-28r49 behaviour.
        //   Each override entry can carry amount/percent/cap/minSpend/
        //   startsAt/expiryDate/label — or `deleted: true` to hide the
        //   code entirely (quiet-invalid, same as disable).
        const rawBuiltins = (data?.builtinCodeOverrides ?? {}) as Record<
          string,
          {
            deleted?: boolean;
            amount?: number;
            percent?: number;
            cap?: number;
            minSpend?: number;
            label?: string;
            startsAt?: { toMillis?: () => number } | null;
            expiryDate?: { toMillis?: () => number } | null;
            // 🆕 Round 28r50 — schedules the OVERRIDE's activation.
            scheduledFor?: { toMillis?: () => number } | null;
            // 🆕 Round 28r59 (Phase 4 feature #6 "Referral tier system")
            //   — only surfaced on the "REFERRAL" pseudo-key override.
            tiers?: Array<{ minRedeems?: number; amount?: number; label?: string }> | null;
          }
        >;
        const builtinOverrides: Record<string, BuiltinPromoOverride> = {};
        for (const [k, v] of Object.entries(rawBuiltins)) {
          if (!v || typeof v !== "object") continue;
          const cleanTiers = Array.isArray(v.tiers)
            ? v.tiers
                .filter((t) => t && typeof t.minRedeems === "number" && typeof t.amount === "number")
                .map((t) => ({
                  minRedeems: t.minRedeems as number,
                  amount: t.amount as number,
                  ...(typeof t.label === "string" && t.label ? { label: t.label } : {}),
                }))
            : undefined;
          builtinOverrides[k] = {
            deleted: v.deleted === true,
            amount: typeof v.amount === "number" ? v.amount : undefined,
            percent: typeof v.percent === "number" ? v.percent : undefined,
            cap: typeof v.cap === "number" ? v.cap : undefined,
            minSpend: typeof v.minSpend === "number" ? v.minSpend : undefined,
            label: typeof v.label === "string" ? v.label : undefined,
            startsAt: v.startsAt?.toMillis?.() ?? null,
            expiryDate: v.expiryDate?.toMillis?.() ?? null,
            scheduledFor: v.scheduledFor?.toMillis?.() ?? null,
            tiers: cleanTiers,
          };
        }
        applyLiveBuiltinOverrides(builtinOverrides);
        // 🆕 Round 28r50 (feature #1 "Bundle Packages") — bundles ride the
        //   SAME public doc + this SAME listener (no new listener, no rules
        //   change: publicRules already admin-write, public-read). Empty/
        //   absent map = no bundles surfaced anywhere, byte-identical to
        //   pre-r50. Customer wiring is Phase 2; this makes the data
        //   readable so the admin UI + future customer surfaces work off
        //   one source. Firestore stores expiresAt as a Timestamp, so
        //   coerce to epoch ms here.
        const rawBundles = (data?.bundles ?? {}) as Record<
          string,
          {
            name?: string;
            sessionCount?: number;
            discountPct?: number;
            serviceId?: string | null;
            enabled?: boolean;
            expiresAt?: { toMillis?: () => number } | null;
            label?: string;
            createdAt?: { toMillis?: () => number } | null;
            // 🆕 Round 28r60 — presentation fields carried straight through.
            imageUrl?: string;
            categoryTag?: string;
            subtitle?: string;
          }
        >;
        const bundleMap: Record<string, Bundle> = {};
        for (const [id, v] of Object.entries(rawBundles)) {
          if (!v || typeof v !== "object") continue;
          if (typeof v.sessionCount !== "number" || v.sessionCount < 1) continue;
          if (typeof v.discountPct !== "number" || v.discountPct < 0) continue;
          bundleMap[id] = {
            id,
            name: typeof v.name === "string" ? v.name : id,
            sessionCount: v.sessionCount,
            discountPct: v.discountPct,
            serviceId: v.serviceId ?? null,
            enabled: v.enabled !== false,
            expiresAt: v.expiresAt?.toMillis?.() ?? null,
            label: typeof v.label === "string" ? v.label : undefined,
            createdAt: v.createdAt?.toMillis?.() ?? undefined,
            // 🆕 Round 28r60 — presentation fields.
            imageUrl: typeof v.imageUrl === "string" && v.imageUrl.trim() ? v.imageUrl : undefined,
            categoryTag: typeof v.categoryTag === "string" && v.categoryTag.trim() ? v.categoryTag : undefined,
            subtitle: typeof v.subtitle === "string" && v.subtitle.trim() ? v.subtitle : undefined,
          };
        }
        applyLiveBundles(bundleMap);
      },
      () => {
        // Fail open — never let a read error lock everyone out. Also clear
        // any stale per-code overrides so a subsequent booking sees the
        // hardcoded defaults, not the last-known map from a previous tick.
        setMaintenanceOn(false);
        applyLiveBuiltinOverrides(null);
        applyLiveBundles(null);
        // Campaign falls back to the hardcoded defaults rather than vanishing.
        applyLiveAnniversaryConfig(null);
      },
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
                // 🆕 Round 28r50 — schedule this custom code's activation.
                //   Setter drops the entry entirely when `scheduledFor > now`,
                //   so the code behaves as if it doesn't exist yet.
                scheduledFor: data.scheduledFor?.toMillis?.() ?? null,
              };
            }
          } else if (data.enabled === false) {
            disabledCodes.push(d.id);
          }
        });
        // 🆕 Round 28r50 — stash the raw last-seen data so the reapply
        //   interval below can re-run this through the setters (which
        //   filter by Date.now()) without a fresh Firestore read.
        lastDisabledCodesRef.current = disabledCodes;
        lastCustomCodesRef.current = custom;
        applyLivePromoConfig({ disabledCodes, customCodes: custom });
      },
      () => {
        lastDisabledCodesRef.current = [];
        lastCustomCodesRef.current = {};
        applyLivePromoConfig({ disabledCodes: [], customCodes: {} }); // fail open
      },
    );
    return () => unsub();
  }, []);

  // 🆕 Round 28r50 (feature #2 "Scheduled Pricing / Draft Mode") — re-run
  //   the last-seen snapshot through the setters every 60s. All three
  //   scheduled paths (service overrides, custom promos, built-in promo
  //   overrides) filter by Date.now() at apply time, so a queued edit
  //   activates within ~60s of its target minute without any refresh or
  //   new Firestore read. Guest opens the page at 10:59, code invalid;
  //   still on the page at 11:00–11:01, code becomes valid.
  useEffect(() => {
    const reapply = () => {
      const data = lastPublicSnapRef.current;
      if (!data) return;
      // Service overrides + custom services + order — re-run
      // applyLiveServiceConfig; its filter drops any override whose
      // scheduledFor > now. Same Timestamp→ms normalization as the
      // primary snapshot handler.
      const rawSvcOv = (data.serviceOverrides ?? {}) as Record<
        string,
        Record<string, unknown> & { scheduledFor?: { toMillis?: () => number } | null }
      >;
      const normSvcOv: Record<string, Record<string, unknown>> = {};
      for (const [k, v] of Object.entries(rawSvcOv)) {
        if (!v || typeof v !== "object") continue;
        normSvcOv[k] = { ...v, scheduledFor: v.scheduledFor?.toMillis?.() ?? null };
      }
      // Same Timestamp→ms normalization for customServices.
      const rawCustSvc = (data.customServices ?? []) as Array<
        Record<string, unknown> & { scheduledFor?: { toMillis?: () => number } | null }
      >;
      const normCustSvc = rawCustSvc.map((cs) => ({
        ...cs,
        scheduledFor: cs?.scheduledFor?.toMillis?.() ?? null,
      }));
      applyLiveServiceConfig({
        overrides: normSvcOv as never,
        customServices: normCustSvc as never,
        order: data.serviceOrder as never,
      });
      // Built-in promo overrides — re-run applyLiveBuiltinOverrides; its
      // filter drops any override whose scheduledFor > now.
      const rawBuiltins = (data.builtinCodeOverrides ?? {}) as Record<
        string,
        {
          deleted?: boolean;
          amount?: number;
          percent?: number;
          cap?: number;
          minSpend?: number;
          label?: string;
          startsAt?: { toMillis?: () => number } | null;
          expiryDate?: { toMillis?: () => number } | null;
          scheduledFor?: { toMillis?: () => number } | null;
          // 🆕 Round 28r59 (Phase 4 feature #6 "Referral tier system")
          tiers?: Array<{ minRedeems?: number; amount?: number; label?: string }> | null;
        }
      >;
      const builtinOverrides: Record<string, BuiltinPromoOverride> = {};
      for (const [k, v] of Object.entries(rawBuiltins)) {
        if (!v || typeof v !== "object") continue;
        const cleanTiers = Array.isArray(v.tiers)
          ? v.tiers
              .filter((t) => t && typeof t.minRedeems === "number" && typeof t.amount === "number")
              .map((t) => ({
                minRedeems: t.minRedeems as number,
                amount: t.amount as number,
                ...(typeof t.label === "string" && t.label ? { label: t.label } : {}),
              }))
          : undefined;
        builtinOverrides[k] = {
          deleted: v.deleted === true,
          amount: typeof v.amount === "number" ? v.amount : undefined,
          percent: typeof v.percent === "number" ? v.percent : undefined,
          cap: typeof v.cap === "number" ? v.cap : undefined,
          minSpend: typeof v.minSpend === "number" ? v.minSpend : undefined,
          label: typeof v.label === "string" ? v.label : undefined,
          startsAt: v.startsAt?.toMillis?.() ?? null,
          expiryDate: v.expiryDate?.toMillis?.() ?? null,
          scheduledFor: v.scheduledFor?.toMillis?.() ?? null,
          tiers: cleanTiers,
        };
      }
      applyLiveBuiltinOverrides(builtinOverrides);
      // Custom promo codes — re-run with the last-seen collection cache.
      if (lastCustomCodesRef.current && lastDisabledCodesRef.current) {
        applyLivePromoConfig({
          disabledCodes: lastDisabledCodesRef.current,
          customCodes: lastCustomCodesRef.current,
        });
      }
    };
    const id = setInterval(reapply, 60_000);
    return () => clearInterval(id);
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
        <div style={{ fontFamily: '"Playfair Display","Fraunces",Georgia,serif', fontSize: 22, fontWeight: 700 }}>
          SunRed
        </div>
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.85)", maxWidth: 380 }}>
          {i18n.t("maintenance.body", "Reservations are paused for brief maintenance. We'll be back very shortly.")}
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
