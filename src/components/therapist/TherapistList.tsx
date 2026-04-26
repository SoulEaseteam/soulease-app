// src/pages/dev/TherapistList.tsx
import React, { useEffect, useState } from "react";
import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import type { Therapist as TherapistType } from "@/types/therapist";
import { badgeConfig } from "@/utils/badgeConfig";

// ---------- Types ----------
type Status = "available" | "bookable" | "resting";

type Therapist = TherapistType & {
  isBooked?: boolean;
  busyUntil?: any;
  startTime?: string;
  endTime?: string;
  statusOverride?: Status | "Auto" | null;
};

// ---------- Helpers ----------
const toDate = (v: any): Date | null => {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

const workingWindow = (now: Date, startHHMM?: string, endHHMM?: string) => {
  if (!startHHMM || !endHHMM) return { start: null, end: null };
  const [sh, sm] = startHHMM.split(":").map(Number);
  const [eh, em] = endHHMM.split(":").map(Number);

  const start = new Date(now);
  const end = new Date(now);
  start.setHours(sh, sm, 0, 0);
  end.setHours(eh, em, 0, 0);

  if (end <= start) end.setDate(end.getDate() + 1); // cross day
  return { start, end };
};

const computeStatus = (t: Therapist, summary?: { active: boolean; busyUntil?: Date | null }): Status => {
  const now = new Date();

  // 1) override มาก่อน
  const ov = (t.statusOverride ?? "Auto") as Status | "Auto";
  if (ov !== "Auto") return ov;

  // 2) ถ้ามีงานกำลังทำอยู่
  const busy = toDate(t.busyUntil);
  const inJob = summary?.active || (!!busy && busy > now);

  // 3) อยู่ใน shift ไหม
  const { start, end } = workingWindow(now, t.startTime, t.endTime);
  const inShift = !!(start && end && now >= start && now <= end);

  if (!inShift) return "resting";
  return inJob ? "bookable" : "available";
};

// Prevent Firestore in-limit
const chunk = <T,>(arr: T[], size = 10) =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size + i, i * size + size));

// ---------- Badge helper ----------
const getBadgeFromConfig = (t: any) => {
  const match = badgeConfig
    .filter((b) => b.condition(t))
    .sort((a, b) => a.priority - b.priority)[0];

  return match || null;
};

// ---------- Component ----------
const TherapistList: React.FC = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const run = async () => {
      setLoading(true);

      // 1) Load therapists
      const tSnap = await getDocs(collection(db, "therapists"));
      const therapists: Therapist[] = tSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as any),
        image:
          d.data().image && (d.data().image.startsWith("http") || d.data().image.startsWith("/"))
            ? d.data().image
            : d.data().image
            ? `/images/${d.data().image}`
            : "/images/default-avatar.png",
      }));

      // 2) Build summary
      const summary = therapists.reduce((acc, t) => {
        acc[t.id] = { active: false, busyUntil: null, today: 0, reviews: 0 };
        return acc;
      }, {} as any);

      const ids = therapists.map((t) => t.id);
      const today = new Date();
      const startOfDay = Timestamp.fromDate(new Date(today.setHours(0, 0, 0, 0)));
      const endOfDay = Timestamp.fromDate(new Date(today.setHours(23, 59, 59, 999)));

      for (const group of chunk(ids)) {
        const snapBk = await getDocs(query(collection(db, "bookings"), where("therapistId", "in", group)));
        const now = new Date();

        snapBk.forEach((doc) => {
          const b = doc.data() as any;
          const tid = b.therapistId;
          if (!summary[tid]) return;

          const s = toDate(b.startAt);
          const e = toDate(b.endAt);
          const status = String(b.status || "").toLowerCase();

          // active
          if (s && e && now >= s && now < e) {
            summary[tid].active = true;
            summary[tid].busyUntil = e;
          }

          // today
          if (
            s &&
            b.startAt >= startOfDay &&
            b.startAt <= endOfDay &&
            ["confirmed", "paid", "completed", "done"].includes(status)
          ) {
            summary[tid].today += 1;
          }

          // reviews
          if (["completed", "done"].includes(status) && b.reviewText?.trim()) {
            summary[tid].reviews++;
          }
        });
      }

      // 3) Merge & compute status + badge
      const merged = therapists.map((t) => {
        const s = summary[t.id];
        const st = computeStatus(t, { active: s.active, busyUntil: s.busyUntil });

        const badge = getBadgeFromConfig({
          todayBookings: s.today,
          totalBookings: t.totalBookings ?? 0,
        });

        return {
          ...t,
          _status: st,
          _today: s.today,
          _reviews: s.reviews,
          _badge: badge, // << ADD BADGE HERE
        };
      });

      setRows(merged);
      setLoading(false);
    };

    run();
  }, []);

  if (loading) return <div>Loading therapists...</div>;

  return (
    <div>
      <h2>Therapists</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {rows.map((t) => (
          <li
            key={t.id}
            style={{
              cursor: "pointer",
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 16,
              position: "relative",
            }}
            onClick={() => navigate(`/therapists/${t.id}`)}
          >
            {/* Avatar */}
            <div style={{ position: "relative" }}>
              <img
                src={t.image}
                width={70}
                height={70}
                style={{ borderRadius: "50%", objectFit: "cover" }}
                alt=""
              />

              {/* Badge */}
              {t._badge && (
                <img
                  src={t._badge.image}
                  style={{
                    position: "absolute",
                    top: -10,
                    right: -10,
                    width: t._badge.size,
                  }}
                />
              )}
            </div>

            <div>
              <strong>{t.name}</strong>
              <div>
                Status:{" "}
                {t._status === "bookable"
                  ? "IN SESSION"
                  : t._status === "available"
                  ? "AVAILABLE"
                  : "RESTING"}
              </div>
              <div>⭐ {Number(t.rating ?? 0).toFixed(1)} ({t._reviews})</div>
              <div>Today: {t._today}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TherapistList;