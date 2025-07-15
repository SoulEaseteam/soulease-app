// src/pages/TherapistDetailPage.tsx
import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Avatar, Tabs, Tab, Button, Divider, ImageList, ImageListItem, Dialog,
} from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import BottomNav from '../components/BottomNav';
import { Share as ShareIcon } from '@mui/icons-material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { FaUser, FaVenusMars, FaFlag, FaRulerVertical, FaWeight, FaPassport, FaHotjar, FaAirFreshener, FaLeaf, FaChessQueen, FaMagic, FaSmoking, FaSyringe } from 'react-icons/fa';
import { doc, onSnapshot, collection, query, where, onSnapshot as onSnapshotCol } from 'firebase/firestore';
import { db } from '../firebase';

const renderFeature = (icon: React.ReactNode, label: string, value?: string) => {
  if (!value) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
      <Box sx={{ width: 28, mr: 1 }}>{icon}</Box>
      <Typography sx={{ fontWeight: 600, width: 110, fontFamily: 'Orson, sans-serif' }}>{label}:</Typography>
      <Typography sx={{ color: '#333', fontSize: 14, fontFamily: 'Orson, sans-serif' }}>{value}</Typography>
    </Box>
  );
};

const TherapistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [therapist, setTherapist] = useState<any | null>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [section, setSection] = useState<'services' | 'features' | 'profile'>('services');
  const [isFavorite, setIsFavorite] = useState(false);
  const [openImage, setOpenImage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const unsubTherapist = onSnapshot(doc(db, 'therapists', id), (docSnap) => {
      setTherapist(docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null);
    });
    const q = query(collection(db, 'reviews'), where('therapistId', '==', id));
    const unsubReviews = onSnapshotCol(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(data);
    });
    return () => {
      unsubTherapist();
      unsubReviews();
    };
  }, [id]);

  useEffect(() => {
    if (!therapist) return;
    const favs = localStorage.getItem('favoriteTherapists');
    if (favs) {
      const favArray = JSON.parse(favs) as string[];
      setIsFavorite(favArray.includes(therapist.id));
    }
  }, [therapist]);

  const toggleFavorite = () => {
    if (!therapist) return;
    const favs = localStorage.getItem('favoriteTherapists');
    let favArray: string[] = favs ? JSON.parse(favs) : [];
    if (isFavorite) favArray = favArray.filter((i) => i !== therapist.id);
    else favArray.push(therapist.id);
    localStorage.setItem('favoriteTherapists', JSON.stringify(favArray));
    setIsFavorite(!isFavorite);
  };

  const avgRating = reviews.length ? (
    reviews.reduce((acc, cur) => acc + (cur.rating || 0), 0) / reviews.length
  ).toFixed(1) : 'N/A';

  if (therapist === null) {
    return <Box p={2}><Typography variant="h6" color="error">Therapist not found.</Typography></Box>;
  }

  const avatarSrc = therapist?.image?.startsWith('http') ? therapist.image : `/images/${therapist.image || 'default-avatar.png'}`;

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: 'Therapist Profile', url });
      else {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard');
      }
    } catch (e) {
      console.error('Share failed:', e);
    }
  };

  return (
    <Box sx={{ background: '#fdfdfd', minHeight: '100vh', fontFamily: 'Orson, sans-serif' }}>
      <Box sx={{ maxWidth: 430, mx: 'auto', pb: 10 }}>
        <Box sx={{ position: 'relative', textAlign: 'center', py: 2, background: '#2b3b53', color: '#fff' }}>
          <Typography variant="h5">{therapist.name}</Typography>
          <Button onClick={handleShare} sx={{ position: 'absolute', top: 12, right: 12 }}><ShareIcon /></Button>
        </Box>
        <Box sx={{ textAlign: 'center', mt: -6 }}>
          <Avatar src={avatarSrc} sx={{ width: 120, height: 120, mx: 'auto', border: '4px solid white' }} />
          <Button onClick={toggleFavorite}>{isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}</Button>
          <Typography>{avgRating} / review {reviews.length}+</Typography>
        </Box>

        <Tabs value={section} onChange={(_, v) => setSection(v)} centered>
          <Tab value="services" label="Services" />
          <Tab value="features" label="Features" />
          <Tab value="profile" label="Gallery" />
        </Tabs>

        {section === 'features' && (
          <Box sx={{ p: 2 }}>
            {renderFeature(<FaUser />, 'Age', therapist.features?.age)}
            {renderFeature(<FaRulerVertical />, 'Height', therapist.features?.height)}
            {renderFeature(<FaWeight />, 'Weight', therapist.features?.weight)}
            {renderFeature(<FaVenusMars />, 'Gender', therapist.features?.gender)}
            {renderFeature(<FaFlag />, 'Ethnicity', therapist.features?.ethnicity)}
            {renderFeature(<FaPassport />, 'Language', therapist.features?.language)}
            <Divider sx={{ my: 2 }} />
            {renderFeature(<FaHotjar />, 'Body Type', therapist.features?.bodyType)}
            {renderFeature(<FaAirFreshener />, 'Bust Size', therapist.features?.bustSize)}
            {renderFeature(<FaLeaf />, 'Bust', therapist.features?.bust)}
            {renderFeature(<FaChessQueen />, 'Hair Color', therapist.features?.hairColor)}
            {renderFeature(<FaMagic />, 'Style', therapist.features?.style)}
            <Divider sx={{ my: 2 }} />
            {renderFeature(<FaSmoking />, 'Smoker', therapist.features?.smoker)}
            {renderFeature(<FaSyringe />, 'Vaccinated', therapist.features?.vaccinated)}
          </Box>
        )}

        {section === 'profile' && (
          <GallerySection images={galleryImages} setOpenImage={setOpenImage} openImage={openImage} />
        )}

        <BottomNav />
      </Box>

      {/* Gallery Image Dialog */}
      <Dialog open={Boolean(openImage)} onClose={() => setOpenImage(null)} maxWidth="md">
        <img src={openImage ?? undefined} alt="Preview" style={{ width: '100%' }} />
      </Dialog>
    </Box>
  );
};

const ServicesSection = ({
  therapist,
  navigate,
}: {
  therapist: typeof therapists[number];
  navigate: ReturnType<typeof useNavigate>;
}) => (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, mt: 4, px: 2 }}>
    {services.map((svc, index) => (
      <motion.div
        key={svc.name}
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: index * 0.1, duration: 0.5, ease: 'easeOut' }}
        whileHover={{ scale: 1.02 }}
      >
        <Box
          sx={{
            position: 'relative',
            height: 240,
            borderRadius: 5,
            overflow: 'hidden',
            backgroundImage: `url(${svc.image})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.1)',
            cursor: 'pointer',
            transition: 'transform 0.3s ease',
          }}
          onClick={() =>
            navigate(`/service-detail/${encodeURIComponent(svc.name)}?therapistId=${therapist.id}`)
          }
        >
          <Box
            sx={{
              position: 'absolute',
              top: 14,
              left: 14,
              px: 1.3,
              py: 0.5,
              fontSize: 12,
              fontWeight: 'bold',
              color: '#fff',
              background: 'rgba(132, 132, 132, 0.43)',
              backdropFilter: 'blur(6px)',
              borderRadius: 2,
              textTransform: 'uppercase',
            }}
          >
            {svc.badge}
          </Box>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.15 }}>
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                width: '100%',
                px: 2,
                py: 2,
                background: 'rgba(255,255,255,0.55)',
                backdropFilter: 'blur(10px)',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
              }}
            >
              <Typography fontSize={16} fontWeight="bold" fontFamily="Playfair Display">
                {svc.name}
              </Typography>
              <Typography
                fontSize={13}
                sx={{
                  mt: 0.5,
                  color: '#3f5066',
                  whiteSpace: 'normal',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  minHeight: 36,
                  pr: 17,
                }}
              >
                {svc.desc}
              </Typography>
              <Typography>
                <Box component="span" sx={{ fontSize: 18, fontWeight: 'bold', color: '#7c4d00' }}>
                  ฿{svc.price}
                </Box>
                <Box component="span" sx={{ fontSize: 13, fontWeight: 400, color: '#7c4d00', ml: 0.5 }}>
                  • ⏱ {svc.duration}
                </Box>
              </Typography>
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  if (therapist.available !== 'resting') {
                    navigate(`/booking/${therapist.id}?service=${encodeURIComponent(svc.name)}`);
                  }
                }}
                disabled={therapist.available === 'resting'}
                sx={{
                  position: 'absolute',
                  right: 56,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: therapist.available === 'resting' ? '#ccc' : '#2b3b53',
                  color: therapist.available === 'resting' ? '#888' : '#fff',
                  fontSize: 12,
                  px: 3,
                  py: 0.5,
                  borderRadius: 3,
                  fontWeight: 'bold',
                  textTransform: 'none',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                  backdropFilter: 'blur(6px)',
                  cursor: therapist.available === 'resting' ? 'not-allowed' : 'pointer',
                  '&:hover': {
                    background: therapist.available === 'resting' ? '#ccc' : '#a4b0ba',
                    transform: 'translateY(-50%) scale(1.05)',
                  },
                }}
              >
                {therapist.available === 'resting' ? 'Unavailable' : 'Select'}
              </Button>
            </Box>
          </motion.div>
        </Box>
      </motion.div>
    ))}
  </Box>
);

const GallerySection = ({
  images,
  setOpenImage,
  openImage,
}: {
  images: string[];
  setOpenImage: React.Dispatch<React.SetStateAction<string | null>>;
  openImage: string | null;
}) => (
  <Box sx={{ p: 2 }}>
    <Typography fontWeight="bold" fontSize={16} mb={2}>
      Gallery
    </Typography>
    <ImageList cols={3} gap={8}>
      {images.map((img, index) => (
        <ImageListItem key={index} onClick={() => setOpenImage(img)}>
          <img src={img} alt={`Gallery ${index}`} style={{ borderRadius: 8 }} />
        </ImageListItem>
      ))}
    </ImageList>
    <Dialog open={Boolean(openImage)} onClose={() => setOpenImage(null)} maxWidth="md">
      <img src={openImage ?? undefined} alt="Preview" style={{ width: '100%' }} />
    </Dialog>
  </Box>
);

export default TherapistDetailPage;