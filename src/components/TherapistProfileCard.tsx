// TherapistProfileCard.tsx
import React, { useState } from 'react';
import {
  Box, Typography, Button, Stack, Paper, Dialog, IconButton
} from '@mui/material';
import RoomIcon from '@mui/icons-material/Room';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useNavigate } from 'react-router-dom';
import { ChatCircleDots } from 'phosphor-react';
import { motion } from 'framer-motion';

interface Therapist {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  distance?: number;
  specialty: string;
  experience: string;
  available: 'available' | 'bookable' | 'resting';
  hot?: boolean;
  new?: boolean;
  topRated?: boolean;
  serviceCount?: string;
  nextAvailableTime?: string;
  badge?: 'VIP' | 'Hot' | 'New';
}

const TherapistProfileCard: React.FC<{ therapist: Therapist }> = ({ therapist }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [isFavorite, setIsFavorite] = useState(() => {
    const stored = localStorage.getItem('favoriteTherapists');
    return stored ? JSON.parse(stored).includes(therapist.id) : false;
  });

  const toggleFavorite = () => {
    const current = localStorage.getItem('favoriteTherapists');
    const currentFavs: string[] = current ? JSON.parse(current) : [];
    const updated = isFavorite
      ? currentFavs.filter(id => id !== therapist.id)
      : [...currentFavs, therapist.id];
    localStorage.setItem('favoriteTherapists', JSON.stringify(updated));
    setIsFavorite(!isFavorite);
  };

  const statusMap = {
    available: { label: 'Available', color: '#36A681' },
    bookable: { label: 'Bookable', color: '#DB661C' },
    resting: { label: 'Resting', color: '#9E9E9E' },
  };

  const resolvedImage = therapist.image.startsWith('/')
    ? therapist.image
    : therapist.image.startsWith('http')
    ? therapist.image
    : `/images/${therapist.image.replace(/^\/??images\//, '')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ width: '100%' }}
    >
      <Box sx={{ px: 0, pb: 1 }}>
        <Paper
          sx={{
            width: '100%',
            maxWidth: 260,
            borderRadius: 4,
            backgroundColor: 'rgba(246, 242, 242, 0.65)',
            backdropFilter: 'blur(4px)',
            p: 0,
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
            textAlign: 'center',
            position: 'relative',
            mt: 0,
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <Box
              component="img"
              src={resolvedImage}
              alt={therapist.name}
              sx={{
                width: '90%',
                height: 250,
                objectFit: 'contain',
                objectPosition: 'center center',
                borderRadius: 3,
                cursor: 'pointer',
                background: '#f5f5f5',
                mt: 1,
              }}
              onClick={() => setOpen(true)}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/images/placeholder.jpg';
              }}
            />
         {therapist.badge && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -45,
                    right: -25,
                    width: 90,
                    height: 90,
                    zIndex: 2,
                  }}
                  component="img"
                  src={
                    therapist.badge === 'VIP'
                      ? '/badges/Star.gif'
                      : therapist.badge === 'Hot'
                      ? '/badges/hot.gif'
                      : '/badges/New.gif'
                  }
                  alt={`${therapist.badge} badge`}
                />
              )}
          </Box>

          <Typography fontWeight="bold" fontSize={18} mt={1.5}>
            {therapist.name}
            <Box
              component="span"
              ml={1}
              sx={{
                display: 'inline-block',
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: statusMap[therapist.available].color,
                verticalAlign: 'middle',
              }}
            />
          </Typography>

          <Typography fontSize={13} color="#666">
            <img
              src="/images/icon/star.png"
              alt="star"
              style={{ width: 15, height: 15, marginRight: 4 }}
            />
            {therapist.rating?.toFixed(1) || '0.0'} | {therapist.serviceCount || 'N/A'} served
          </Typography>

          <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" mt={1}>
            <ChatCircleDots
              style={{ fontSize: 15, color: '#596a7c', cursor: 'pointer' }}
              onClick={() => navigate(`/review/all/${therapist.id}`)}
            />
            <Typography fontSize={12}>{therapist.reviews || 0}</Typography>
            <Button
              size="small"
              variant="outlined"
              sx={{
                fontSize: 9,
                borderRadius: 99,
                px: 1,
                textTransform: 'none',
                color: '#555',
                borderColor: '#bbb',
              }}
              onClick={() => navigate(`/therapists/${therapist.id}?section=features#features`)}
            >
              See more
            </Button>
          </Stack>

          <Stack direction="row" alignItems="center" justifyContent="center" spacing={6} mt={1}>
            <Button
              variant="contained"
              size="small"
              disabled={therapist.available === 'resting'}
              onClick={() => navigate(`/therapists/${therapist.id}?section=services`)}
              sx={{
                fontSize: 12,
                px: 0,
                py: 0.5,
                top: -6,
                right: -38,
                textTransform: 'none',
                borderRadius: 99,
                backgroundColor:
                  therapist.available === 'resting' ? '#ccc' :
                  therapist.available === 'bookable' ? '#DB661C' :
                  '#2b3b53',
                color: therapist.available === 'resting' ? '#888' : '#fff',
                '&:hover': {
                  backgroundColor:
                    therapist.available === 'resting' ? '#ccc' :
                    therapist.available === 'bookable' ? '#e87033' :
                    '#3c4e67',
                },
                flexGrow: 1,
              }}
            >
              {therapist.available === 'resting'
                ? 'Resting'
                : therapist.available === 'bookable'
                ? 'Bookable'
                : 'BOOK NOW'}
            </Button>

            <Box sx={{ display: 'flex', alignItems: 'flex-start', mt: -1 }}>
              <IconButton onClick={toggleFavorite}>
                {isFavorite ? (
                  <FavoriteIcon sx={{ color: '#e74c3c', fontSize: 28 }} />
                ) : (
                  <FavoriteBorderIcon sx={{ color: '#555', fontSize: 28 }} />
                )}
              </IconButton>
            </Box>
          </Stack>

          {typeof therapist.distance === 'number' && !isNaN(therapist.distance) && (
            <Typography
              fontSize={12}
              color="#666"
              display="flex"
              alignItems="center"
              justifyContent="center"
              mt={1}
            >
              <RoomIcon sx={{ fontSize: 14, mr: 0.5 }} />
              {(therapist.distance / 1000).toFixed(1)} km
            </Typography>
          )}
        </Paper>

        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          maxWidth="xs"
          PaperProps={{
            sx: {
              backgroundColor: 'transparent',
              boxShadow: 'none',
              borderRadius: 0,
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
            },
          }}
        >
          <Box sx={{ position: 'relative', p: 2 }}>
            <IconButton
              onClick={() => setOpen(false)}
              sx={{
                position: 'absolute',
                top: 4,
                right: 4,
                background: 'rgba(0,0,0,0.5)',
                color: '#fff',
                zIndex: 2,
                '&:hover': { background: 'rgba(0,0,0,0.7)' },
              }}
            >
              <CloseIcon />
            </IconButton>

            <Box
              component="img"
              src={resolvedImage}
              alt="Preview"
              sx={{
                width: '100%',
                maxWidth: 400,
                maxHeight: '75vh',
                height: 'auto',
                objectFit: 'cover',
                borderRadius: 4,
                boxShadow: 3,
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = '/images/placeholder.jpg';
              }}
            />
          </Box>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default TherapistProfileCard;
