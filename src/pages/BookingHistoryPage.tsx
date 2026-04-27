// src/pages/BookingHistoryPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Stack,
  Tabs,
  Tab,
  Snackbar,
  Avatar,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
} from "@mui/material";
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
  query,
  where,
  addDoc,
  getDoc,
  getDocs,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { useNavigate } from "react-router-dom";
import CustomAlert from "@/components/common/CustomAlert";

const normalize = (s = "") =>
  s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/_/g, "-");

interface Booking {
  id: string;
  therapistId: string;
  therapistName?: string;
  serviceName: string;
  date: string;
  time: string;
  note: string;
  totalPrice?: number;
  total?: number;
  taxiFee?: number;
  status: "upcoming" | "completed" | "cancelled";
  reviewed?: boolean;
  reviewText?: string;
  rating?: number;
  userId?: string;
  createdAt?: Timestamp;
}

interface TherapistInfo {
  name?: string;
  image?: string;
}

const BookingHistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [therapists, setTherapists] = useState<Record<string, TherapistInfo>>({});
  const [tab, setTab] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [errorSnack, setErrorSnack] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const navigate = useNavigate();

  const getTherapistImage = (path?: string) => {
    if (!path) return "/images/default-therapist.png";
    if (path.startsWith("http")) return path;
    if (path.startsWith("/")) return path;
    return `/images/${path}`;
  };

  // ============================
  //   FETCH BOOKINGS REALTIME
  // ============================
  useEffect(() => {
    if (!user?.uid) {
      setBookings([]);
      setLoading(false);
      return;
    }

    try {
      const qRef = query(
        collection(db, "bookings"),
        where("userId", "==", user.uid),
        orderBy("createdAt", "desc")
      );

      const handleBookingsSnap = async (
        snapshot: import("firebase/firestore").QuerySnapshot
      ) => {
        const data: Booking[] = snapshot.docs.map((d) => ({
          ...(d.data() as Booking),
          id: d.id,
        }));

        setBookings(data);

        const therapistIds = Array.from(
          new Set(data.map((b) => b.therapistId).filter(Boolean))
        );
        const map: Record<string, TherapistInfo> = { ...therapists };

        // --- Load therapist info (fallback aware)
        await Promise.all(
          therapistIds.map(async (id) => {
            if (map[id]) return;
            try {
              // 1) Try docId
              const ref = doc(db, "therapists", id);
              const snap1 = await getDoc(ref);
              if (snap1.exists()) {
                const t = snap1.data() as TherapistInfo;
                map[id] = { name: t.name, image: t.image };
                return;
              }

              // 2) Try where("id" == customId)
              const q2 = query(collection(db, "therapists"), where("id", "==", id));
              const snap2 = await getDocs(q2);
              if (!snap2.empty) {
                const t = snap2.docs[0].data() as TherapistInfo;
                map[id] = { name: t.name, image: t.image };
              } else {
                map[id] = {};
              }
            } catch {
              map[id] = {};
            }
          })
        );

        setTherapists(map);
        setLoading(false);
      };

      const unsub = onSnapshot(
        qRef,
        (snapshot) => {
          void handleBookingsSnap(snapshot);
        },
        (err) => {
          console.error("Booking snapshot error:", err);
          setErrorSnack("Failed to load bookings. Please try again.");
          setLoading(false);
        }
      );

      return () => unsub();
    } catch (err) {
      console.error("Error loading bookings:", err);
      setErrorSnack("Could not load booking history.");
      setLoading(false);
    }
  }, [user?.uid]);

  // ============================
  //   REBOOK → SELECT LOCATION
  // ============================
  const handleRebook = (booking: Booking) => {
    const normalizedService = normalize(booking.serviceName);

    void navigate("/select-location", {
      state: {
        therapistId: booking.therapistId,
        service: normalizedService,
        selectedLat: null,
        selectedLng: null,
        selectedAddress: "",
      },
    });
  };

  // ============================
  //       TABS COUNTING
  // ============================
  const counts = useMemo(() => {
    const c = { upcoming: 0, completed: 0, cancelled: 0 };
    bookings.forEach((b) => {
      if (b.status in c) (c as any)[b.status]++;
    });
    return c;
  }, [bookings]);

  const filtered = useMemo(() => {
    return bookings.filter((b) => {
      if (tab === 0) return b.status === "upcoming";
      if (tab === 1) return b.status === "completed";
      if (tab === 2) return b.status === "cancelled";
      return true;
    });
  }, [bookings, tab]);

  const getDisplayTotal = (b: Booking) => {
    const v =
      typeof b.totalPrice === "number"
        ? b.totalPrice
        : typeof b.total === "number"
        ? b.total
        : null;
    return v !== null ? v.toLocaleString() : "N/A";
  };

  // ============================
  //           UI
  // ============================
  if (!user) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 3,
        }}
      >
        <Typography color="text.secondary">
          Please sign in to view your booking history.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", py: 5, background: "#f8f9fa" }}>
      <Box sx={{ maxWidth: 430, mx: "auto", px: 2 }}>
        <Typography
          variant="h6"
          fontWeight="bold"
          textAlign="center"
          mb={4}
          color="#3a3420"
        >
          Booking History
        </Typography>

        <Box sx={{ background: "#fff", borderRadius: 3, p: 2, boxShadow: 3 }}>
          {/* TABS */}
          <Tabs
            value={tab}
            onChange={(_, v: number) => setTab(v)}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
          >
            <Tab label={`Upcoming (${counts.upcoming})`} />
            <Tab label={`Completed (${counts.completed})`} />
            <Tab label={`Cancelled (${counts.cancelled})`} />
          </Tabs>

          {/* LOADING */}
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
              <CircularProgress />
            </Box>
          ) : filtered.length === 0 ? (
            <Typography align="center" color="text.secondary" sx={{ mt: 4 }}>
              No reservations found.
            </Typography>
          ) : (
            filtered.map((b) => (
              <Card key={b.id} sx={{ mt: 2, borderRadius: 4, boxShadow: 2 }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2}>
                    <Avatar
                      src={getTherapistImage(therapists[b.therapistId].image)}
                      sx={{
                        width: 56,
                        height: 56,
                        border: "2px solid #FEAE96",
                        bgcolor: "#FFF5F2",
                      }}
                    />

                    <Box>
                      <Typography fontWeight="bold">
                        {therapists[b.therapistId].name ||
                          b.therapistName ||
                          "Therapist"}
                      </Typography>
                      <Typography fontSize="0.85rem">{b.serviceName}</Typography>
                    </Box>
                  </Stack>

                  <Typography mt={1} fontSize="0.9rem" color="#3a3420">
                    🗓️ {b.date} 🕒 {b.time}
                  </Typography>
                  <Typography fontSize="0.9rem" color="text.secondary">
                    📌 Status: {b.status}
                  </Typography>

                  <Stack direction="row" justifyContent="space-between" mt={2}>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => setSelectedBooking(b)}
                      sx={{ borderColor: "#FEAE96", color: "#FEAE96", borderRadius: 2 }}
                    >
                      Details
                    </Button>

                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => handleRebook(b)}
                      sx={{
                        backgroundColor: "#FEAE96",
                        fontWeight: "bold",
                        borderRadius: 4,
                      }}
                    >
                      Rebook Now
                    </Button>
                  </Stack>
                </CardContent>
              </Card>
            ))
          )}
        </Box>
      </Box>

      {/* ======== MODAL DETAILS ======== */}
      <Dialog
        open={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: "bold", color: "#3a3420" }}>
          Booking Detail
        </DialogTitle>

        <Divider />

        <DialogContent>
          {selectedBooking && (
            <Box>
              <Typography>
                <b>Therapist:</b>{" "}
                {therapists[selectedBooking.therapistId].name ||
                  selectedBooking.therapistName}
              </Typography>
              <Typography>
                <b>Service:</b> {selectedBooking.serviceName}
              </Typography>
              <Typography>
                <b>Date:</b> {selectedBooking.date}
              </Typography>
              <Typography>
                <b>Time:</b> {selectedBooking.time}
              </Typography>
              <Typography>
                <b>Taxi fee:</b> ฿
                {selectedBooking.taxiFee?.toLocaleString() || 0}
              </Typography>
              <Typography>
                <b>Total:</b> ฿{getDisplayTotal(selectedBooking)}
              </Typography>
              <Typography>
                <b>Note:</b> {selectedBooking.note || "-"}
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setSelectedBooking(null)}>Close</Button>

          {selectedBooking && (
            <Button
              variant="contained"
              sx={{ backgroundColor: "#FEAE96", fontWeight: "bold", borderRadius: 4 }}
              onClick={() => {
                handleRebook(selectedBooking);
                setSelectedBooking(null);
              }}
            >
              Rebook Now
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* SUCCESS SNACKBAR */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
      >
        <CustomAlert
          open={snackbarOpen}
          onClose={() => setSnackbarOpen(false)}
          severity="success"
          message="Review submitted successfully! Waiting for approval."
        />
      </Snackbar>

      {/* ERROR SNACKBAR */}
      <Snackbar
        open={!!errorSnack}
        autoHideDuration={3000}
        onClose={() => setErrorSnack(null)}
        message={errorSnack || ""}
      />
    </Box>
  );
};

export default BookingHistoryPage;