import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebase";
import { useNavigate } from "react-router-dom";
import { Therapist } from "@/types/therapist";

type Status = "available" | "bookable" | "resting";

const computeStatus = (t: any): Status => {
  if (t.statusOverride) return t.statusOverride;

  const now = new Date();
  const [startHour = 0, startMin = 0] = t.startTime?.split(":").map(Number) || [];
  const [endHour = 0, endMin = 0] = t.endTime?.split(":").map(Number) || [];

  const start = new Date(now);
  const end = new Date(now);
  start.setHours(startHour, startMin, 0);
  end.setHours(endHour, endMin, 0);
  if (end <= start) end.setDate(end.getDate() + 1);

  const inWorkingHours = now >= start && now <= end;
  return inWorkingHours ? (t.isBooked ? "bookable" : "available") : "resting";
};

const TherapistList: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchTherapists = async () => {
      const snapshot = await getDocs(collection(db, "therapists"));

      const therapistsData: Therapist[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();

        return {
          id: docSnap.id,
          name: data.name || "",
          image: data.image || "/images/default-avatar.png",
          rating: data.rating ?? 0,
          reviews: data.reviews ?? 0,
          startTime: data.startTime || "00:00",
          endTime: data.endTime || "23:59",
          totalBookings: data.totalBookings ?? 0,
          todayBookings: data.todayBookings ?? 0,
          specialty: data.specialty || "",
          gallery: Array.isArray(data.gallery) ? data.gallery : [],
          features: data.features || {},
          statusOverride: data.statusOverride || null,
          isBooked: data.isBooked || false,
          available: computeStatus(data),
        };
      });

      setTherapists(therapistsData);
      setLoading(false);
    };

    fetchTherapists();
  }, []);

  if (loading) return <div>Loading therapists...</div>;
  if (therapists.length === 0) return <div>No therapists found.</div>;

  return (
    <div>
      <h2>Therapists</h2>
      <ul style={{ listStyle: "none", padding: 0 }}>
        {therapists.map((t) => (
          <li
            key={t.id}
            style={{
              cursor: "pointer",
              marginBottom: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
            onClick={() => navigate(`/therapist/${t.id}`)} // ✅ ใช้ path ที่ถูกต้อง
          >
            <img
              src={t.image}
              alt={t.name}
              width={70}
              height={70}
              style={{ borderRadius: "50%", objectFit: "cover" }}
            />
            <div>
              <strong>{t.name}</strong>
              <div>Status: {t.available}</div>
              <div>⭐ {t.rating.toFixed(1)} ({t.reviews})</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TherapistList;