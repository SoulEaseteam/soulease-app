// src/pages/SavedTherapistsPage.tsx

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Button,
  CircularProgress,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import BottomNav from '../components/BottomNav';


interface FavoriteTherapist {
  id: string;
  name: string;
  image: string;
  rating?: number;
  reviews?: number;
  specialty?: string;
}
 
const SavedTherapistsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [favorites, setFavorites] = useState<FavoriteTherapist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;
      try {
        const ref = collection(db, 'users', user.uid, 'favorites');
        const snapshot = await getDocs(ref);
        const favs = snapshot.docs.map(doc => doc.data() as FavoriteTherapist);
        setFavorites(favs);
      } catch (error) {
        console.error('Failed to fetch favorites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  if (!user) {
    return <Box p={2}>Log in to see your saved favorites.</Box>;
  }

  return (
    <Box sx={{ minHeight: '100vh', background: '#f9f9f9', pb: 10 }}>
      <Box sx={{ maxWidth: 430, mx: 'auto', px: 2 }}>

        <Typography variant="h5" fontWeight="bold" mt={2} mb={3}>
          Saved Therapists
        </Typography>

        {loading ? (
          <Box display="flex" justifyContent="center" mt={4}>
            <CircularProgress />
          </Box>
        ) : favorites.length === 0 ? (
          <Typography>You don’t have any saved items yet.</Typography>
        ) : (
          favorites.map((t) => (
            <Card
              key={t.id}
              sx={{
                display: 'flex',
                mb: 2,
                borderRadius: 3,
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
              }}
            >
              <CardMedia
                component="img"
                sx={{ width: 100, objectFit: 'cover' }}
                image={`/images/${t.image}`}
                alt={t.name}
              />
              <CardContent sx={{ flex: 1 }}>
                <Typography fontWeight="bold">{t.name}</Typography>
                {t.specialty && <Typography fontSize={13}>{t.specialty}</Typography>}
                {t.rating && (
                  <Typography
                    fontSize={13}
                    display="flex"
                    alignItems="center"
                    gap={0.5}
                    color="text.secondary"
                  >
                    <Box
                      component="img"
                      src="/images/star.png"
                      alt="star"
                      sx={{ width: 14, height: 14 }}
                    />
                    {t.rating} / {t.reviews} reviews
                  </Typography>
                )}
                <Button
                  onClick={() => navigate(`/therapist/${t.id}`)}
                  size="small"
                  variant="outlined"
                  sx={{ mt: 1 }}
                >
                  View profile
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </Box>

      <BottomNav />
    </Box>
  );
};

export default SavedTherapistsPage;
