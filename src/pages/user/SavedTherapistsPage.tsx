// src/pages/SavedTherapistsPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Button,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/AuthProvider";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import BottomNav from "@/components/layouts/BottomNavGlass";
import type { Therapist } from "@/types/therapist";
// 🆕 Round 28r52 — Phase 3.1 responsive shell.
import { responsiveShell } from "@/theme/breakpoints";

interface FavoriteTherapist {
  id: string;
  name: string;
  image?: string | null;
  rating?: number;
  reviews?: number;
  specialty?: string;
}

const fallbackImage = "/images/therapists/default.png";

const SavedTherapistsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteTherapist[]>([]);
  const [loading, setLoading] = useState(true);

  // ========================================================
  // Fetch Favorites (Optimized)
  // ========================================================
  useEffect(() => {
    if (!user) return;

    const fetchFavorites = async () => {
      setLoading(true);

      try {
        const favRef = collection(db, "users", user.uid, "favorites");
        const snapshot = await getDocs(favRef);

        const favList: FavoriteTherapist[] = [];

        for (const fav of snapshot.docs) {
          const therapistId = fav.id;

          const tSnap = await getDoc(doc(db, "therapists", therapistId));

          if (!tSnap.exists()) continue;
          const tData = tSnap.data() as Therapist;

          favList.push({
            id: therapistId,
            name: tData.name ?? "Unknown",
            image: tData.image ?? undefined,
            rating: tData.rating ?? undefined,
            reviews: typeof tData.reviews === "number" ? tData.reviews : undefined,
            specialty: tData.specialty ?? undefined,
          });
        }

        setFavorites(favList);
      } catch (err) {
        console.error("Failed to load favorites:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchFavorites();
  }, [user]);

  // ========================================================
  // Not Logged In
  // ========================================================
  if (!user) {
    return (
      <Box p={2} textAlign="center">
        <Typography>Please log in to view your saved therapists.</Typography>
      </Box>
    );
  }

  // ========================================================
  // PAGE UI
  // ========================================================
  return (
    <Box sx={{ minHeight: "100vh", background: "#fefcf9", pb: 10 }}>
      {/* 🆕 Round 28r52 — responsiveShell replaces the 430 cap. */}
      <Box sx={{ ...responsiveShell, px: 2 }}>
        <Typography
          variant="h5"
          fontWeight="bold"
          mt={2}
          mb={3}
          sx={{ color: "#C62828" }}
        >
          💖 Saved Therapists
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" mt={4}>
            <CircularProgress color="error" />
          </Box>
        ) : favorites.length === 0 ? (
          <Typography>You haven’t saved any therapists yet.</Typography>
        ) : (
          favorites.map((t) => {
            const img =
              typeof t.image === "string" && t.image.startsWith("http")
                ? t.image
                : t.image
                ? `/images/${t.image}`
                : fallbackImage;

            return (
              <Card
                key={t.id}
                sx={{
                  display: "flex",
                  mb: 2,
                  borderRadius: 4,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  overflow: "hidden",
                }}
              >
                <CardMedia
                  component="img"
                  sx={{ width: 100, height: 130, objectFit: "cover" }}
                  image={img}
                  alt={t.name}
                  loading="lazy"
                />
                <CardContent sx={{ flex: 1 }}>
                  <Typography fontWeight="bold">{t.name}</Typography>

                  {t.specialty && (
                    <Typography fontSize={13} color="text.secondary">
                      {t.specialty}
                    </Typography>
                  )}

                  {t.rating && (
                    <Typography
                      fontSize={13}
                      display="flex"
                      alignItems="center"
                      gap={0.5}
                      color="text.secondary"
                    >
                      ⭐ {t.rating} ({t.reviews ?? 0} reviews)
                    </Typography>
                  )}

                  <Button
                    onClick={() => navigate(`/therapists/${t.id}`)}
                    size="small"
                    variant="outlined"
                    sx={{ mt: 1 }}
                  >
                    View Profile
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </Box>

      <BottomNav />
    </Box>
  );
};

export default SavedTherapistsPage;