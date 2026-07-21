// src/hooks/useTherapistRevenueRows.ts
//
// 🆕 Round 28x.98 (founder: "แถบ Dashboard เพิ่ม Lifetime Revenue · Period
//   Summary กรองวันที่และสถานะงานได้ · Monthly Revenue เรียงมาแล้ว 6 เดือน
//   หรือกรองรายวันเดือนปี · By Service") — raw booking rows for a single
//   therapist's OWN revenue dashboard, mirroring the query
//   useTherapistBookingStats already uses (`where therapistId == id`, no
//   orderBy — pairing it with orderBy would need a composite index and a
//   missing index fails the whole listener). Aggregation (lifetime total,
//   period filter, monthly/day/year buckets, by-service) happens in the
//   dashboard component so the same raw rows serve every widget without a
//   second Firestore read per filter change.
//
// "Revenue" here is HER commission — therapistPayoutFor() / noShowCompFor(),
// the exact same shared util AdminEarningsPage and AdminDashboardPage use for
// the shop's payroll math — so a number she sees here can never drift from
// what View sees on the admin side.

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

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

export function useTherapistRevenueRows(therapistId: string | null | undefined) {
  const [rows, setRows] = useState<TherapistRevenueRow[]>([]);
  const [loading, setLoading] = useState(!!therapistId);

  useEffect(() => {
    if (!therapistId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const q = query(collection(db, "bookings"), where("therapistId", "==", therapistId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const out: TherapistRevenueRow[] = snap.docs.map((d) => {
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
        });
        setRows(out);
        setLoading(false);
      },
      (err) => {
        if ((err as { code?: string })?.code !== "permission-denied") {
          // eslint-disable-next-line no-console
          console.warn("[useTherapistRevenueRows] snapshot error:", err);
        }
        setRows([]);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [therapistId]);

  return { rows, loading };
}
