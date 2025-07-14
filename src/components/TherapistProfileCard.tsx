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

  // ✅ รองรับทั้ง /yuri/yuri.jpeg, yuri.jpeg, images/yuri.jpeg, และ URL
  const resolvedImage = therapist.image.startsWith('/')
    ? therapist.image
    : therapist.image.startsWith('http')
    ? therapist.image
    : `/images/${therapist.image.replace(/^\/?images\//, '')}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ width: '100%' }}
    >
      <Box sx={{ px: 1, pb: 2 }}>
        <Paper
          sx={{
            width: '100%',
            maxWidth: 260,
            borderRadius: 2,
            backgroundColor: 'rgba(255,255,255,0.65)',
            backdropFilter: 'blur(8px)',
            p: 2,
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.08)',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <Box
              component="img"
              src={resolvedImage}
              alt={therapist.name}
              sx={{
                width: '100%',
                height: 220,
                objectFit: 'contain',
                objectPosition: 'center center',
                borderRadius: 1,
                cursor: 'pointer',
                background: '#f5f5f5',
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
                  top: 8,
                  right: 8,
                  px: 1,
                  py: 0.4,
                  fontSize: 11,
                  fontWeight: 600,
                  borderRadius: '12px',
                  color: '#fff',
                  textShadow: '0 1px 2px rgba(0,0,0,0.4)',
                  background:
                    therapist.badge === 'VIP'
                      ? '#6C3483'
                      : therapist.badge === 'Hot'
                      ? '#E74C3C'
                      : '#2ECC71',
                }}
              >
                {therapist.badge === 'VIP' && '💎 VIP'}
                {therapist.badge === 'Hot' && '🔥 HOT'}
                {therapist.badge === 'New' && '✨ NEW'}
              </Box>
            )}
          </Box>

          <Typography fontWeight="bold" fontSize={17} mt={1.4}>
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
              style={{ width: 20, height: 20, marginRight: 6 }}
            />
            {therapist.rating?.toFixed(1) || '0.0'} | {therapist.serviceCount || 'N/A'} served
          </Typography>

          <Stack direction="row" spacing={1} justifyContent="center" alignItems="center" mt={1}>
            <ChatCircleDots
              style={{ fontSize: 16, color: '#596a7c', cursor: 'pointer' }}
              onClick={() => navigate(`/review/all/${therapist.id}`)}
            />
            <Typography fontSize={12}>{therapist.reviews || 0}</Typography>
            <Button
              size="small"
              variant="outlined"
              sx={{
                fontSize: 7,
                borderRadius: 99,
                px: 1.6,
                textTransform: 'none',
                color: '#555',
                borderColor: '#bbb',
              }}
              onClick={() => navigate(`/therapist/${therapist.id}?section=features#features`)}
            >
              See more
            </Button>
          </Stack>

          <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} mt={1.5}>
            <Button
              variant="contained"
              size="small"
              disabled={therapist.available === 'resting'}
              onClick={() => navigate(`/therapists/${therapist.id}`)}
              sx={{
                fontSize: 12,
                px: 2,
                py: 1,
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

            <IconButton onClick={toggleFavorite} aria-label="Favorite Therapist">
              {isFavorite ? (
                <FavoriteIcon sx={{ color: '#e74c3c', fontSize: 22 }} />
              ) : (
                <FavoriteBorderIcon sx={{ color: '#555', fontSize: 22 }} />
              )}
            </IconButton>
          </Stack>

          {therapist.distance !== undefined && (
            <Typography
              fontSize={12}
              color="#666"
              display="flex"
              alignItems="center"
              justifyContent="center"
              mt={0.8}
            >
              <RoomIcon sx={{ fontSize: 16, mr: 0.5 }} />
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
            },
          }}
        >
          <Box sx={{ position: 'relative' }}>
            <IconButton
              onClick={() => setOpen(false)}
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                color: '#fff',
                zIndex: 1,
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
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: 2,
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