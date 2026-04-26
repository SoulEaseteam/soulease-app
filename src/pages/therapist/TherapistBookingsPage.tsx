// src/pages/TherapistBookingsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Stack,
  Divider,
} from "@mui/material";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  doc,
  getDoc,
  getDocs,
  Timestamp,
  runTransaction,
  increment,
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

type Normalized = "NEW" | "IN_PROGRESS" | "UPCOMING" | "COMPLETED" | "CANCELLED";

function normalizeStatus(b: Booking): Normalized {
  const raw = (b.status || "").toLowerCase();

  if (["cancelled", "canceled", "rejected"].includes(raw)) return "CANCELLED";
  if (raw === "completed" || raw === "done") return "COMPLETED";

  const start = toDate((b as any).startAt ?? (b as any).start);
  const end = toDate((b as any).endAt ?? (b as any).end);
  const now = new Date();

  if (start && end && now >= start && now < end) return "IN_PROGRESS";
  if (start && now < start) return "UPCOMING";
  if (["pending", "confirmed", "paid", "accepted"].includes(raw)) return "NEW";

  return "NEW";
}

const labelOf = (n: Normalized) =>
  ({
    NEW: "New",
    UPCOMING: "Upcoming",
    IN_PROGRESS: "In Progress",
    COMPLETED: "Completed",
    CANCELLED: "Cancelled",
  }[n]);

const chipColorOf = (n: Normalized) =>
  ({
    NEW: "#90CAF9",
    UPCOMING: "#29B6F6",
    IN_PROGRESS: "#FFC107",
    COMPLETED: "#4CAF50",
    CANCELLED: "#E57373",
  }[n]);

/* -------------------- Page -------------------- */
const TherapistBookingsPage: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [therapistId, setTherapistId] = useState<string | null>(null);
  const [therapistUid, setTherapistUid] = useState<string | null>(null);
  const [therapistEmail, setTherapistEmail] = useState<string | null>(null);

  /* ---------- หา therapist doc: รองรับ docId / uid / email ---------- */
  useEffect(() => {
    (async () => {
      const user = auth.currentUser;
      if (!user) return;

      let id: string | null = null;
      let uid: string | null = null;
      let email: string | null = null;

      // 1) docId == uid
      const snap1 = await getDoc(doc(db, "therapists", user.uid));
      if (snap1.exists()) {
        id = snap1.id;
        uid = (snap1.data() as any)?.uid ?? user.uid;
        email = (snap1.data() as any)?.email ?? user.email ?? null;
      }

      // 2) fallback by uid field
      if (!id) {
        const q1 = query(
          collection(db, "therapists"),
          where("uid", "==", user.uid)
        );
        const s1 = await getDocs(q1);
        if (!s1.empty) {
          id = s1.docs[0].id;
          uid = (s1.docs[0].data() as any)?.uid ?? user.uid;
          email = (s1.docs[0].data() as any)?.email ?? user.email ?? null;
      }
      }

      // 3) fallback by email field
      if (!id && user.email) {
        const q2 = query(
          collection(db, "therapists"),
          where("email", "==", user.email)
        );
        const s2 = await getDocs(q2);
        if (!s2.empty) {
          id = s2.docs[0].id;
          uid = (s2.docs[0].data() as any)?.uid ?? user.uid;
          email = (s2.docs[0].data() as any)?.email ?? user.email ?? null;
        }
      }

      if (id) {
        setTherapistId(id);
        setTherapistUid(uid);
        setTherapistEmail(email);
      }
    })();
  }, []);

  /* ---------- โหลด bookings แบบยืดหยุ่น (id / uid / email) ---------- */
  useEffect(() => {
    if (!therapistId && !therapistUid && !therapistEmail) return;

    // จะทำ 2–3 listeners แล้ว merge
    const unsubs: Array<() => void> = [];
    const pool = new Map<string, Booking>();

    const bump = () => {
      const list = Array.from(pool.values());
      // sort: ใช้ createdAt ถ้ามี, ไม่งั้น startAt
      list.sort((a, b) => {
        const ta =
          toDate((a as any).createdAt) ??
          toDate((a as any).startAt) ??
          new Date(0);
        const tb =
          toDate((b as any).createdAt) ??
          toDate((b as any).startAt) ??
          new Date(0);
        return (tb?.getTime() ?? 0) - (ta?.getTime() ?? 0);
      });
      setBookings(list);
      setLoading(false);
    };

    // where therapistId == docId
    if (therapistId) {
      const qId = query(
        collection(db, "bookings"),
        where("therapistId", "==", therapistId)
      );
      unsubs.push(
        onSnapshot(qId, (snap) => {
          snap.docs.forEach((d) => pool.set(d.id, { id: d.id, ...(d.data() as any) } as Booking));
          bump();
        })
      );
    }

    // where therapistId == uid (เผื่อเคยบันทึกผิด)
    if (therapistUid && therapistUid !== therapistId) {
      const qUid = query(
        collection(db, "bookings"),
        where("therapistId", "==", therapistUid)
      );
      unsubs.push(
        onSnapshot(qUid, (snap) => {
          snap.docs.forEach((d) => pool.set(d.id, { id: d.id, ...(d.data() as any) } as Booking));
          bump();
        })
      );
    }

    // where therapistEmail == email (บางงานอาจเก็บอีเมลไว้)
    if (therapistEmail) {
      const qEmail = query(
        collection(db, "bookings"),
        where("therapistEmail", "==", therapistEmail)
      );
      unsubs.push(
        onSnapshot(qEmail, (snap) => {
          snap.docs.forEach((d) => pool.set(d.id, { id: d.id, ...(d.data() as any) } as Booking));
          bump();
        })
      );
    }

    return () => unsubs.forEach((u) => u && u());
  }, [therapistId, therapistUid, therapistEmail]);

  /* ---------- Filter ตามแท็บด้วยสถานะ normalized ---------- */
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

  /* ---------- ปิดงาน + อัปเดต therapist ---------- */
  const markCompleted = async (booking: Booking) => {
    if (!therapistId || !booking?.id) return;

    await runTransaction(db, async (tx) => {
      const bookingRef = doc(db, "bookings", booking.id!);
      const tRef = doc(db, "therapists", therapistId);

      tx.update(bookingRef, { status: "completed", completedAt: Timestamp.now() });

      const now = new Date();
      const start = toDate((booking as any).startAt ?? (booking as any).start);
      const end = toDate((booking as any).endAt ?? (booking as any).end);
      const wasCurrent = !!(start && end && now >= start && now < end);

      tx.update(tRef, {
        todayBookings: increment(1),
        totalBookings: increment(1),
        ...(wasCurrent ? { isBooked: false, busyUntil: null, nextAvailable: null } : {}),
        updatedAt: Timestamp.now(),
      });
    });
  };

  /* ---------- UI helpers ---------- */
  const chipFor = (b: Booking) => {
    const n = normalizeStatus(b);
    return (
      <Chip
        label={labelOf(n)}
        sx={{ bgcolor: chipColorOf(n), color: "#fff", fontWeight: "bold" }}
      />
    );
  };

  const canComplete = (b: Booking) => normalizeStatus(b) === "IN_PROGRESS";

  const displayDate = (b: Booking) => {
    const d = toDate((b as any).startAt) || toDate((b as any).createdAt);
    if (d) return d.toLocaleDateString();
    return (b as any).date || "-";
  };
  const displayTime = (b: Booking) => {
    const s = toDate((b as any).startAt);
    if (s) return s.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return (b as any).time || "-";
  };

  /* -------------------- Render -------------------- */
  return (
    <Box sx={{ bgcolor: "#f8f9fa", minHeight: "100vh", pb: 8 }}>
      <Box sx={{ maxWidth: 430, mx: "auto", px: 2, py: 2 }}>
        <Typography variant="h6" textAlign="center" fontWeight="bold" color="#3a3420" mb={2}>
          My Bookings
        </Typography>

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

        {loading ? (
          <Box textAlign="center" mt={6}>
            <CircularProgress />
            <Typography mt={2}>Loading your bookings...</Typography>
          </Box>
        ) : filtered.length === 0 ? (
          <Typography textAlign="center" color="text.secondary">
            No bookings found
          </Typography>
        ) : (
          filtered.map((b) => (
            <Card key={b.id} sx={{ mb: 2, borderRadius: 4, boxShadow: 3 }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography fontWeight="bold">{(b as any).serviceName || "-"}</Typography>
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