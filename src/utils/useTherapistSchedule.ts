// src/utils/useTherapistSchedule.ts
import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase";

import {
  nowThai,
  toDateLike,
  workingWindowThai,
  calcNextAvailable,
} from "@/utils/therapistTimeUtils";

import {
  computeStatus,
  type TherapistStatus,
  type TherapistStatusOverride,
} from "@/utils/therapistStatus";

export type BookingLike = {
  startAt: any;
  endAt: any;
  status?: string;
};

type UseTherapistScheduleArgs = {
  therapistId: string;
  startTime?: string; // HH:mm
  endTime?: string; // HH:mm
  statusOverride?: TherapistStatusOverride;
  isHoliday?: boolean;
};

export function useTherapistSchedule({
  therapistId,
  startTime,
  endTime,
  statusOverride,
  isHoliday = false,
}: UseTherapistScheduleArgs) {
  const [bookings, setBookings] = useState<BookingLike[]>([]);
  const [todayBookings, setTodayBookings] = useState(0);

  useEffect(() => {
    if (!therapistId) return;

    const qBk = query(
      collection(db, "bookings"),
      where("therapistId", "==", therapistId)
    );

    const unsub = onSnapshot(qBk, (snap) => {
      const arr: BookingLike[] = [];
      const now = nowThai();

      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, "0");
      const d = String(now.getDate()).padStart(2, "0");
      const ymd = `${y}-${m}-${d}`;

      let today = 0;

      snap.forEach((docSnap) => {
        const data = docSnap.data() || {};

        const startAt = toDateLike(
          data.startAt ?? data.start ?? data.startTime
        );
        const endAt = toDateLike(
          data.endAt ?? data.end ?? data.endTime
        );

        const status = String(data.status || "confirmed").toLowerCase();

        arr.push({
          startAt,
          endAt,
          status,
        });

        if (
          startAt instanceof Date &&
          !Number.isNaN(startAt.getTime()) &&
          startAt.toISOString().slice(0, 10) === ymd &&
          ["confirmed", "paid", "completed", "done"].includes(status)
        ) {
          today++;
        }
      });

      setBookings(arr);
      setTodayBookings(today);
    });

    return () => unsub();
  }, [therapistId]);

  const computed = useMemo(() => {
    const now = nowThai();

    const activeBooking = bookings.find((b) => {
      const s = toDateLike(b.startAt);
      const e = toDateLike(b.endAt);

      if (!s || !e) return false;

      const status = String(b.status || "").toLowerCase();
      const activeStatuses = ["confirmed", "paid", "completed", "done"];

      return activeStatuses.includes(status) && now >= s && now < e;
    });

    const status: TherapistStatus = computeStatus({
      startTime,
      endTime,
      isBooked: !!activeBooking,
      isHoliday,
      statusOverride,
    });

    // nextAvailable
    // 1) ถ้ามี active booking → ใช้ endAt ของ booking นั้น
    if (activeBooking) {
      const end = toDateLike(activeBooking.endAt);
      const next =
        end &&
        end.toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });

      return {
        status,
        nextAvailable: next || "-",
      };
    }

    // 2) ถ้านอกเวลางานหรือ holiday → บอกเวลาเริ่มรอบถัดไป
    const { start: wStart, end: wEnd } = workingWindowThai(
      now,
      startTime,
      endTime
    );

    if (
      status === "holiday" ||
      !wStart ||
      !wEnd ||
      now < wStart ||
      now >= wEnd
    ) {
      const next =
        startTime && endTime
          ? calcNextAvailable({
              serviceDurationMinutes: 0,
              startTime,
              endTime,
            })
          : "-";

      return {
        status,
        nextAvailable: next || "-",
      };
    }

    // 3) ถ้าอยู่ในเวลางานและไม่มี active booking
    // หา future booking ที่ใกล้ที่สุด
    let nearest: Date | null = null;

    for (const b of bookings) {
      const s = toDateLike(b.startAt);
      const bookingStatus = String(b.status || "").toLowerCase();

      if (
        s &&
        s > now &&
        ["confirmed", "paid", "completed", "done"].includes(bookingStatus)
      ) {
        if (!nearest || s < nearest) nearest = s;
      }
    }

    if (!nearest) {
      return {
        status,
        nextAvailable: "Now",
      };
    }

    return {
      status,
      nextAvailable: nearest.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    };
  }, [bookings, startTime, endTime, statusOverride, isHoliday]);

  return {
    status: computed.status,
    nextAvailable: computed.nextAvailable,
    todayBookings,
  };
}