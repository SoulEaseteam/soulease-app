// src/pages/TherapistBookingsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box, Typography, Tabs, Tab, Card, CardContent, Button, Chip,
  CircularProgress, Stack, Divider
} from "@mui/material";
import {
  collection, onSnapshot, orderBy, query, where, updateDoc, doc,
  getDoc, getDocs, runTransaction, increment, Timestamp
} from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import BottomNav from "@/components/layouts/BottomNavGlass";
import type { Booking } from "@/types/booking";

/* -------------------- Tabs -------------------- */
const TABS = ["All", "New", "In Progress", "Completed", "Cancelled"];

/* -------------------- Helpers -------------------- */
const toDate = (v: any): Date | null => {
  if (!v) return null;
  if (typeof v?.toDate === "function") return v.toDate();
  if (v instanceof Date) return v;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
};

// รวมกติกาเดียวกับหน้า Home/Detail
type Normalized =
  | "NEW"
  | "IN_PROGRESS"
  | "UPCOMING"
  | "COMPLETED"
  | "CANCELLED";

function normalizeStatus(b: Booking): Normalized {
  const raw = (b.status || "").toLowerCase();

  // กลุ่มที่ถือเป็น "ยกเลิก"
  if (["cancelled", "canceled", "rejected"].includes(raw)) return "CANCELLED";
  // กลุ่มที่ถือเป็น "จบ"
  if (raw === "completed" || raw === "done") return "COMPLETED";

  const start = toDate((b as any).startAt ?? (b as any).start);
  const end = toDate((b as any).endAt ?? (b as any).end);
  const now = new Date();

  // ถ้ามีเวลาครบ และอยู่ระหว่างงาน → IN_PROGRESS
  if (start && end && now >= start && now < end) return "IN_PROGRESS";

  // ยังไม่เริ่ม (มี start ในอนาคต)
  if (start && now < start) return "UPCOMING";

  // คิวใหม่/ยืนยันแล้ว แต่ยังไม่เริ่ม/ไม่มีเวลา → NEW
  if (["pending", "confirmed", "paid", "accepted"].includes(raw)) return "NEW";

  // เผื่อค่าอื่น ๆ ที่ยังไม่เข้ากลุ่ม
  return "NEW";
}

/* -------------------- Page -------------------- */
const TherapistBookingsPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [therapistId, setTherapistId] = useState<string | null>(null);

  // หา therapistId (uid -> docId -> email)
  useEffect(() => {
    const fetchTherapist = async () => {
      const user = auth.currentUser;
      if (!user) return;

      let id: string | null = null;

      // 1) docId = uid
      const d1 = await getDoc(doc(db, "therapists", user.uid));
      if (d1.exists()) id = d1.id;

      // 2) ฟิลด์ uid
      if (!id) {
        const q1 = query(collection(db, "therapists"), where("uid", "==", user.uid));
        const s1 = await getDocs(q1);
        if (!s1.empty) id = s1.docs[0].id;
      }

      // 3) ฟิลด์ email
      if (!id && user.email) {
        const q2 = query(collection(db, "therapists"), where("email", "==", user.email));
        const s2 = await getDocs(q2);
        if (!s2.empty) id = s2.docs[0].id;
      }

      if (id) setTherapistId(id);
    };
    fetchTherapist();
  }, []);

  // โหลด bookings realtime
  useEffect(() => {
    if (!therapistId) return;

    // ใช้ createdAt ถ้ามี ไม่งั้น fallback ไปที่ startAt
    const base = query(
      collection(db, "bookings"),
      where("therapistId", "==", therapistId)
    );

    const q1 = query(base, orderBy("createdAt", "desc"));
    const unsub1 = onSnapshot(
      q1,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Booking));
        setBookings(data);
        setLoading(false);
      },
      // ถ้า index/ฟิลด์ createdAt ไม่มี ให้ fallback เป็น startAt
      () => {
        const q2 = query(base, orderBy("startAt", "desc"));
        const unsub2 = onSnapshot(q2, (snap2) => {
          const data = snap2.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Booking));
          setBookings(data);
          setLoading(false);
        });
        return () => unsub2();
      }
    );

    return () => unsub1();
  }, [therapistId]);

  // Filter ตามแท็บ (ใช้ normalized)
  const filtered = useMemo(() => {
    const withNorm = bookings.map((b) => ({ b, norm: normalizeStatus(b) }));

    switch (tab) {
      case 1: // New
        return withNorm.filter((x) => x.norm === "NEW").map((x) => x.b);
      case 2: // In Progress
        return withNorm.filter((x) => x.norm === "IN_PROGRESS").map((x) => x.b);
      case 3: // Completed
        return withNorm.filter((x) => x.norm === "COMPLETED").map((x) => x.b);
      case 4: // Cancelled
        return withNorm.filter((x) => x.norm === "CANCELLED").map((x) => x.b);
      default:
        return bookings;
    }
  }, [bookings, tab]);

  // ปิดงาน
  const markCompleted = async (booking: Booking) => {
    if (!therapistId || !booking?.id) return;

    await runTransaction(db, async (tx) => {
      const bookingRef = doc(db, "bookings", booking.id!);
      const tRef = doc(db, "therapists", therapistId);

      // อัปเดต booking
      tx.update(bookingRef, {
        status: "completed",
        completedAt: Timestamp.now(),
      });

      // อัปเดต therapist — *อย่าล้าง busyUntil ถ้า booking นี้ไม่ใช่งานที่กำลังวิ่งอยู่*
      const tSnap = await tx.get(tRef);
      if (tSnap.exists()) {
        const now = new Date();
        const start = toDate((booking as any).startAt ?? (booking as any).start);
        const end = toDate((booking as any).endAt ?? (booking as any).end);
        const wasCurrent = !!(start && end && now >= start && now < end);

        tx.update(tRef, {
          todayBookings: increment(1),
          totalBookings: increment(1),
          ...(wasCurrent
            ? { isBooked: false, busyUntil: null, nextAvailable: null }
            : {}), // ถ้าไม่ใช่งานปัจจุบัน ไม่แตะ field เหล่านี้
          updatedAt: Timestamp.now(),
        });
      }
    });
  };

  const chipFor = (b: Booking) => {
    const norm = normalizeStatus(b);
    const map: Record<Normalized, { label: string; bg: string }> = {
      NEW: { label: "New", bg: "#90CAF9" },
      UPCOMING: { label: "Upcoming", bg: "#29B6F6" },
      IN_PROGRESS: { label: "In Progress", bg: "#FFC107" },
      COMPLETED: { label: "Completed", bg: "#4CAF50" },
      CANCELLED: { label: "Cancelled", bg: "#E57373" },
    };
    const c = map[norm];
    return (
      <Chip
        label={c.label}
        sx={{ bgcolor: c.bg, color: "#fff", fontWeight: "bold" }}
      />
    );
  };

  const canComplete = (b: Booking) => normalizeStatus(b) === "IN_PROGRESS";

  // อ่านค่าที่โชว์ (รองรับทั้ง date/time string และ Timestamp)
  const displayDate = (b: Booking) => {
    const d = toDate((b as any).startAt) || (b as any).date;
    if (d instanceof Date) return d.toLocaleDateString();
    return (d as string) || "-";
  };
  const displayTime = (b: Booking) => {
    const s = toDate((b as any).startAt);
    if (s) {
      return s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return (b as any).time || "-";
  };

  return (
    <Box sx={{ bgcolor: "#f8f9fa", minHeight: "100vh", pb: 8 }}>
      <Box sx={{ maxWidth: 430, mx: "auto", px: 2, py: 2 }}>
        <Typography variant="h6" textAlign="center" fontWeight="bold" color="#3a3420" mb={2}>
          My Bookings
        </Typography>

        {/* Tabs */}
        <Box sx={{ background: "#fff", borderRadius: 4, boxShadow: 2, mb: 2 }}>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="scrollable"
            scrollButtons
            allowScrollButtonsMobile
            textColor="primary"
            indicatorColor="primary"
          >
            {TABS.map((label) => (
              <Tab key={label} label={label} sx={{ minWidth: 120 }} />
            ))}
          </Tabs>
        </Box>

        {/* Loading / Empty / List */}
        {loading ? (
          <Box textAlign="center" mt={6}>
            <CircularProgress />
            <Typography mt={2}>Loading your bookings...</Typography>
          </Box>
        ) : filtered.length === 0 ? (
          <Typography textAlign="center" color="text.secondary">
            😴 No bookings found
          </Typography>
        ) : (
          filtered.map((b) => (
            <Card key={b.id} sx={{ mb: 2, borderRadius: 4, boxShadow: 3 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography fontWeight="bold">{b.serviceName}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      📆 {displayDate(b)} 🕒 {displayTime(b)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      📍 {(b as any).address || "-"}
                    </Typography>
                    {(b as any).note && (
                      <Typography variant="body2" color="text.secondary">
                        📝 {(b as any).note}
                      </Typography>
                    )}
                  </Box>
                  {chipFor(b)}
                </Stack>

                <Divider sx={{ my: 1.5 }} />

                {/* ราคา */}
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontSize="0.9rem">Service Fee</Typography>
                  <Typography fontSize="0.9rem">
                    ฿{Number((b as any).servicePrice || 0).toLocaleString()}
                  </Typography>
                </Stack>
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontSize="0.9rem">Travel Fee</Typography>
                  <Typography fontSize="0.9rem">
                    ฿{Number((b as any).taxiFee || 0).toLocaleString()}
                  </Typography>
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography fontWeight="bold">Total</Typography>
                  <Typography fontWeight="bold" color="orange">
                    ฿{Number((b as any).total || (b as any).totalPrice || 0).toLocaleString()}
                  </Typography>
                </Stack>

                {canComplete(b) && (
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ mt: 2, bgcolor: "#38b48b", fontWeight: "bold", borderRadius: 3 }}
                    onClick={() => markCompleted(b)}
                  >
                    ✅ Mark as Completed
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </Box>
      <BottomNav />
    </Box>
  );
};

export default TherapistBookingsPage;