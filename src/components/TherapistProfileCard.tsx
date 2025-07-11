import React, { useEffect, useState } from 'react';
import { Box, Typography, Button, Stack, Dialog, IconButton } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Therapist } from '@/types/therapist';
import { getTherapistBadge } from '@/utils/therapistBadge';
import { db } from '@/firebase';
import { doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '@/providers/AuthProvider';

interface TherapistProfileCardProps {
  therapistId: string;
}

const TherapistProfileCard: React.FC<TherapistProfileCardProps> = ({ therapistId }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!therapistId) return;
    const tRef = doc(db, 'therapists', therapistId);
    const unsubscribe = onSnapshot(tRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        setTherapist({ id: docSnapshot.id, ...docSnapshot.data() } as Therapist);
      } else {
        setTherapist(null);
      }
    });
    return () => unsubscribe();
  }, [therapistId]);

  useEffect(() => {
    if (!user?.uid || !therapistId) return;
    const favRef = doc(db, `users/${user.uid}/favorites`, therapistId);
    const unsubscribe = onSnapshot(favRef, (docSnapshot) => {
      setIsFavorite(docSnapshot.exists());
    });
    return () => unsubscribe();
  }, [user?.uid, therapistId]);

  const toggleFavorite = async () => {
    if (!user?.uid || !therapist) return;
    const favRef = doc(db, `users/${user.uid}/favorites`, therapist.id);
    try {
      if (isFavorite) {
        await deleteDoc(favRef);
      } else {
        await setDoc(favRef, {
          therapistId: therapist.id,
          name: therapist.name,
          image: therapist.image,
          addedAt: new Date(),
        });
      }
    } catch (error) {
      console.error('Failed to update favorite:', error);
    }
  };

  if (!therapist) {
    return <Box sx={{ textAlign: 'center', py: 4 }}>ไม่พบข้อมูลพนักงาน</Box>;
  }

  const statusMap = {
    available: { label: 'Available', color: '#3CB371' },
    bookable: { label: 'Bookable', color: '#FFA726' },
    resting: { label: 'Resting', color: '#BDBDBD' },
    holiday: { label: 'Holiday', color: '#607D8B' },
  };

  const badge = getTherapistBadge(therapist);
  const isUnavailable = ['resting', 'holiday'].includes(therapist.available);
  const imageSrc = therapist.image.startsWith('/') ? therapist.image : `/images/${therapist.image}`;

  return (
    <motion.div style={{ position: 'relative', width: '100%' }}>
      {badge && (
        <Box sx={{
          position: 'absolute',
          top: badge.position.top,
          right: badge.position.right,
          width: badge.size,
          height: badge.size,
          zIndex: 10,
          animation:
            badge.animation === 'pulse'
              ? 'pulse 2s infinite'
              : badge.animation === 'float'
                ? 'float 3s ease-in-out infinite'
                : 'none',
        }}>
          <img src={badge.image} alt={badge.key}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </Box>
      )}

      {isUnavailable && (
        <Box sx={{
          position: 'absolute', top: 12, left: 12,
          bgcolor: 'rgba(0,0,0,0.5)', color: '#fff',
          px: 1.5, py: 0.5, borderRadius: 2, fontSize: 12, fontWeight: 600, zIndex: 15,
        }}>
          Holiday
        </Box>
      )}

      <Box sx={{
        borderRadius: 6, overflow: 'hidden',
        boxShadow: '0 10px 28px rgba(0,0,0,0.1)',
        position: 'relative', transition: '0.3s ease',
        '&:hover': { transform: 'translateY(-4px)' },
      }}>
        <Box
          component="img"
          src={imageSrc}
          alt={therapist.name}
          sx={{
            width: '100%',
            height: { xs: 300, sm: 320 },
            objectFit: 'cover',
            objectPosition: 'top center',
            cursor: 'pointer',
            filter: isUnavailable ? 'blur(2px)' : 'none',
            transition: 'filter 0.3s ease-in-out',
          }}
          onClick={() => setOpen(true)}
        />

        <Box sx={{
          position: 'absolute', bottom: 0, width: '100%',
          bgcolor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(2px)', color: '#222', p: 1.5,
        }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography sx={{ fontSize: 20, fontWeight: 600, fontFamily: 'Orson' }}>
              {therapist.name}
            </Typography>
            <Box sx={{
              width: 12, height: 12, borderRadius: '50%',
              bgcolor: statusMap[therapist.available].color,
            }} />
          </Stack>

          <Stack direction="row" alignItems="center" spacing={1} mt={0.5}>
            <Box component="img" src="/images/icon/star.png" sx={{ width: 16, height: 16 }} />
            <Typography sx={{ fontSize: 14 }}>{therapist.rating || '0.0'}</Typography>
            <Typography fontSize={13} color="#777">|</Typography>
            <Typography sx={{ fontSize: 14, color: '#444' }}>
              {therapist.reviews ?? 0} Served
            </Typography>
          </Stack>

          {therapist.available === 'bookable' && therapist.nextAvailable && (
            <Typography sx={{ fontSize: 13, mt: 0.5, color: '#bb8800' }}>
              Next: {therapist.nextAvailable}
            </Typography>
          )}

          <Stack direction="row" spacing={1} alignItems="center" mt={1.2}>
            <Button
              onClick={() => navigate(`/therapists/${therapist.id}`)}
              disabled={isUnavailable}
              sx={{
                px: 3, py: 0.5, fontSize: 13, fontWeight: 400, textTransform: 'none',
                borderRadius: 99, backgroundColor: isUnavailable ? '#ccc' : '#2b3b53',
                color: isUnavailable ? '#777' : '#fff',
                '&:hover': { backgroundColor: isUnavailable ? '#ccc' : '#3c4c66' },
              }}
            >
              {isUnavailable ? 'Unavailable' : 'Book Now'}
            </Button>

            <IconButton onClick={toggleFavorite} sx={{ p: 0.5 }}>
              {isFavorite ? (
                <FavoriteIcon sx={{ color: '#E63946', fontSize: 24 }} />
              ) : (
                <FavoriteBorderIcon sx={{ color: '#222', fontSize: 24 }} />
              )}
            </IconButton>
          </Stack>
        </Box>
      </Box>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="xs">
        <Box component="img" src={imageSrc} alt="Full" sx={{ width: '100%' }} />
      </Dialog>
    </motion.div>
  );
};

export default TherapistProfileCard;