// src/pages/HomePage.tsx
import React, { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import TherapistProfileCard from "../components/TherapistProfileCard";
import SearchBar from "../components/SearchBar";
import NavBar from "../components/NavBar";
import "@fontsource/chonburi";
import "@fontsource/raleway";
import { Therapist } from "../types/therapist";
import { getBadgeForTherapist } from "../utils/getTherapistBadge";
import { db } from "@/firebase";
import { collection, onSnapshot } from "firebase/firestore";

const HomePage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        console.warn("Could not get location:", err);
      }
    );
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "therapists"), (snap) => {
      const data = snap.docs.map((d) => {
        const t = d.data() as Therapist;

        // ✅ ฟังก์ชันคำนวณสถานะให้รองรับช่วงข้ามวัน
        const getComputedStatus = () => {
          if (t.statusOverride) return t.statusOverride;

          const now = new Date();
          const [sh, sm] = (t.startTime || "00:00").split(":").map(Number);
          const [eh, em] = (t.endTime || "00:00").split(":").map(Number);

          const start = new Date();
          start.setHours(sh, sm, 0, 0);

          const end = new Date();
          end.setHours(eh, em, 0, 0);

          let inWorkingHours = false;

          if (end <= start) {
            // ✅ เวลาสิ้นสุดข้ามวัน เช่น 17:00 - 05:00
            inWorkingHours = now >= start || now <= end;
          } else {
            inWorkingHours = now >= start && now <= end;
          }

          return inWorkingHours ? (t.isBooked ? "bookable" : "available") : "resting";
        };

        return {
          id: d.id,
          ...t,
          available: getComputedStatus(),
          badge: getBadgeForTherapist({
            todayBookings: t.todayBookings ?? 0,
            totalBookings: t.totalBookings ?? 0,
          }),
        };
      });
      setTherapists(data);
    });

    return () => unsub();
  }, []);

  const sortedTherapists = [...therapists].sort((a, b) => {
    const priority: Record<string, number> = { available: 0, bookable: 1, resting: 2 };
    const aP = priority[a.available] ?? 3;
    const bP = priority[b.available] ?? 3;

    if (aP !== bP) return aP - bP;

    return (a.distance ?? Infinity) - (b.distance ?? Infinity);
  });

  const filteredTherapists = searchTerm.trim()
    ? sortedTherapists.filter((t) =>
        t.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
      )
    : sortedTherapists;

  return (
    <Box
      sx={{
        background: "linear-gradient(to bottom, #f7f8f9, #e8ecf1)",
        minHeight: "100vh",
        pb: 10,
        fontFamily: "Raleway, sans-serif",
      }}
    >
      <NavBar />
      <Box sx={{ maxWidth: 420, mx: "auto", px: 2 }}>
        <Typography
          variant="h4"
          textAlign="center"
          sx={{
            mt: 4,
            fontFamily: "Chonburi",
            fontWeight: "bold",
            fontSize: 28,
            color: "#37474f",
            letterSpacing: 2,
          }}
        >
          ESCORTS
        </Typography>

        <SearchBar onSearch={setSearchTerm} />

        <Typography
          variant="h6"
          textAlign="center"
          sx={{
            mt: 3,
            mb: 4,
            color: "#90a4ae",
            fontWeight: 300,
            letterSpacing: 3,
            fontSize: 16,
          }}
        >
          BROWSE ALL PROFILES
        </Typography>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "repeat(2, 1fr)" },
            gap: 2,
            px: 1,
            justifyItems: "center",
          }}
        >
          {filteredTherapists.map((t) => (
            <TherapistProfileCard key={t.id} therapist={t} />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;