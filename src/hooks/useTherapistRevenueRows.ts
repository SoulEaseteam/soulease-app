// src/hooks/useTherapistRevenueRows.ts
//
// 🆕 Round 28x.98 (founder: "แถบ Dashboard เพิ่ม Lifetime Revenue · Period
//   Summary กรองวันที่และสถานะงานได้ · Monthly Revenue เรียงมาแล้ว 6 เดือน
//   หรือกรองรายวันเดือนปี · By Service") — raw booking rows for a single
//   therapist's OWN revenue dashboard. Aggregation (lifetime total, period
//   filter, monthly/day/year buckets, by-service) happens in the dashboard
//   component so the same raw rows serve every widget without a second
//   Firestore read per filter change.
//
// 🆕 Round 28x.100 — queries by `therapistUid`, NOT the therapist doc's slug
//   id. firestore.rules' isAssignedTherapist() only ever compares
//   `resource.data.therapistUid == request.auth.uid`; a LIST query filtered
//   on any other field can't be proven safe by the rules engine and gets
//   denied outright, regardless of who's asking. This hook originally
//   queried by slug (mirroring useTherapistBookingStats) and silently
//   returned zero rows for every real, signed-in therapist — see
//   useTherapistOwnBookingStats.ts's header comment for the full story.
//
// "Revenue" here is HER commission — therapistPayoutFor() / noShowCompFor(),
// the exact same shared util AdminEarningsPage and AdminDashboardPage use for
// the shop's payroll math — so a number she sees here can never drift from
// what View sees on the admin side.

import { Timestamp } from "firebase/firestore";
import { useOwnBookingsSnapshot } from "@/hooks/useOwnBookingsSnapshot";

export interface TherapistRevenueRow {
  id: string;
  status: string;
  createdAt: number; // ms epoch, 0 if unknown
  serviceId: string | null;
  serviceName: string | null;
  servicePrice: number | null;
  discountAmount: number | null;
  duration: number | null;
  therapistShare: number | null;
  taxiFee: number | null;
}

type FirestoreDateLike = Timestamp | Date | string | number | null | undefined;

interface RevenueBookingDoc {
  status?: string;
  createdAt?: FirestoreDateLike;
  startAt?: FirestoreDateLike;
  serviceId?: string;
  serviceName?: string;
  servicePrice?: number;
  discountAmount?: number;
  duration?: number;
  therapistShare?: number;
  taxiFee?: number;
}

function toMs(v: FirestoreDateLike): number {
  if (!v) return 0;
  if (v instanceof Timestamp) return v.toMillis();
  if (v instanceof Date) return v.getTime();
  if (typeof v === "number") return v;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isFinite(t) ? t : 0;
  }
  return 0;
}

// 🆕 Round 28x.123 (staff-app performance audit) — shares one Firestore
//   listener with useTherapistOwnBookingStats via useOwnBookingsSnapshot;
//   both mount together on /therapist/performance and used to stream the
//   same ~250 docs twice. See that module's header.
interface RevenueRowsState {
  rows: TherapistRevenueRow[];
  loading: boolean;
}

const EMPTY_ROWS: RevenueRowsState = { rows: [], loading: false };

export function useTherapistRevenueRows(uid: string | null | undefined): RevenueRowsState {
  return useOwnBookingsSnapshot<RevenueRowsState>(
    uid,
    (snap) => ({
      rows: snap.docs.map((d) => {
        const b = d.data() as RevenueBookingDoc;
        return {
          id: d.id,
          status: (b.status ?? "").toLowerCase(),
          createdAt: toMs(b.createdAt ?? b.startAt),
          serviceId: b.serviceId ?? null,
          serviceName: b.serviceName ?? null,
          servicePrice: b.servicePrice ?? null,
          discountAmount: b.discountAmount ?? null,
          duration: b.duration ?? null,
          therapistShare: b.therapistShare ?? null,
          taxiFee: b.taxiFee ?? null,
        };
      }),
      loading: false,
    }),
    uid ? { rows: [], loading: true } : EMPTY_ROWS,
    (err) => {
      // eslint-disable-next-line no-console
      console.warn("[useTherapistRevenueRows] snapshot error:", err);
      return EMPTY_ROWS;
    },
  );
}
