// ✅ Updated to auto-scroll to #features if hash present
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Avatar, Tabs, Tab, Button, Divider, ImageList, ImageListItem, Dialog,
} from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import therapists from '../data/therapists';
import services from '../data/services';
import BottomNav from '../components/BottomNav';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { Share as ShareIcon } from '@mui/icons-material';



import {
  FaUser, FaVenusMars, FaFlag, FaRulerVertical, FaWeight, FaPassport,
  FaHotjar, FaAirFreshener, FaLeaf, FaChessQueen, FaMagic, FaSpa,
  FaPenFancy, FaSmoking, FaSyringe, FaHeartbeat,
} from 'react-icons/fa';
import { useSearchParams } from 'react-router-dom';

type SectionType = 'services' | 'features' | 'profile';

const renderFeature = (icon: React.ReactNode, label: string, value?: string) => {
  if (!value) return null;
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
      <Box sx={{ width: 28, mr: 1 }}>{icon}</Box>
      <Typography sx={{ fontWeight: 600, width: 110, fontFamily: 'Trebuchet MS, sans-serif' }}>{label}:</Typography>
      <Typography sx={{ color: '#333', fontSize: 14, fontFamily: 'Trebuchet MS, sans-serif' }}>{value}</Typography>
    </Box>
  );
};

const handleShare = async () => {
  const url = window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Therapist Profile', url });
    } else {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard');
    }
  } catch (error) {
    console.error('Failed to share:', error);
  }
};

const TherapistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
useEffect(() => {
  console.log('URL param id:', id);
}, [id]);
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const defaultSection = (queryParams.get('section') as SectionType) || 'services';

  const therapist = therapists.find((t) => t.id === id);

  const [section, setSection] = useState<SectionType>(defaultSection);
  const [openImage, setOpenImage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

useEffect(() => {
  if (!therapist) return;
  const favs = localStorage.getItem('favoriteTherapists');
  if (favs) {
    const favArray = JSON.parse(favs) as string[];
    setIsFavorite(favArray.includes(therapist.id));
  }
}, [therapist]);

// ✅ เพิ่มตรงนี้
useEffect(() => {
  if (therapist) {
    console.log('Loaded therapist:', therapist);
  }
}, [therapist]);

useEffect(() => {
    if (location.hash === '#features') {
      setSection('features');
      setTimeout(() => {
        const element = document.getElementById('features');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 200);
    }
  }, [location.hash]);

  const toggleFavorite = () => {
    if (!therapist) return;
    const favs = localStorage.getItem('favoriteTherapists');
    let favArray: string[] = favs ? JSON.parse(favs) : [];
    if (isFavorite) {
      favArray = favArray.filter((id) => id !== therapist.id);
    } else {
      favArray.push(therapist.id);
    }
    localStorage.setItem('favoriteTherapists', JSON.stringify(favArray));
    setIsFavorite(!isFavorite);
  };

  const avatarSrc = therapist?.image
    ? (therapist.image.startsWith('http') || therapist.image.startsWith('/')
      ? therapist.image
      : `/images/${therapist.image}`)
    : '/images/default-avatar.png';

  const galleryImages = therapist?.gallery && therapist.gallery.length > 0
  ? therapist.gallery.map((img: string) => {
      if (img.startsWith('http') || img.startsWith('/')) return img;
      return `/images/yuri/${img}`;
    })
  : Array.from({ length: 6 }).map((_, index) => `/images/yuri/gallery${index + 1}.jpg`);
  if (!therapist) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h6" color="error">
        Therapist not found.
      </Typography>
    </Box>
  );
}

  const isUnavailable = therapist.available === 'resting';

  return (
    <Box
      sx={{
        background: 'rgba(255, 255, 255, 0.6)',
        color: '#2b3b53',
        minHeight: '100vh',
        display: 'flex',
        justifyContent: 'center',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 430, pb: 10, fontFamily: 'Trebuchet MS, sans-serif' }}>
   

{/* Header */}
<Box
  sx={{
    width: '100%',
    height: 180,
    background: 'linear-gradient(to right, #2e3a4f, #0f1113)',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}
>
  <Typography variant="h4" sx={{ letterSpacing: 6, fontWeight: 700, color: '#7b8b99', textShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
    FEATURED PROFILES
  </Typography>
 

  {/* ShareButton ขวาบน */}
  <Button
    onClick={handleShare}
    sx={{
      position: 'absolute',
      top: 16,
      right: 16,
      minWidth: 0,
      width: 36,
      height: 36,
      borderRadius: '50%',
      backgroundColor: '#fff',
      color: '#333',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
      '&:hover': { backgroundColor: '#eee' },
    }}
  >
    <ShareIcon />
  </Button>
</Box>

        {/* Avatar & Favorite */}
        <Box sx={{ px: 2, mt: -6, position: 'relative', display: 'inline-block' }}>
          <Avatar
            src={avatarSrc}
            sx={{
              width: 120,
              height: 120,
              border: '4px solid rgba(255,255,255,0.4)',
            }}
            imgProps={{ style: { objectFit: 'cover', objectPosition: 'center top' } }}
          />
          <Button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite();
            }}
            sx={{
              position: 'absolute',
              top: 85,
              right: 13,
              minWidth: 0,
              width: 38,
              height: 38,
              borderRadius: '50%',
              backgroundColor: isFavorite ? '#ff6b81' : 'rgba(255,255,255,0.8)',
              color: isFavorite ? '#fff' : '#888',
              boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              zIndex: 10,
              '&:hover': { backgroundColor: isFavorite ? '#ff4757' : '#eee' },
            }}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </Button>
        </Box>

        {/* Name, Rating, Working Hours */}
        <Box sx={{ px: 2, mt: 1 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', fontSize: 30, color: '#2b3b53', letterSpacing: 1, mt: 1 }}>
            {therapist.name}
            <Box
              component="span"
              sx={{ display: 'inline-flex', alignItems: 'center', fontSize: 16, fontWeight: 500, color: '#596a7c', ml: 1, 
                cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
              onClick={() => navigate(`/review/all/${therapist.id}`)}
            >
              <img src="/images/icon/star.png" alt="star" style={{ width: 20, height: 20, marginRight: 6 }} />
              {therapist.rating} / review {therapist.reviews}+
            </Box>
          </Typography>
          <Typography variant="body2" sx={{ color: '#596a7c' }}>
            Working Hours: {therapist.startTime} - {therapist.endTime}
          </Typography>
        </Box>

        {/* Tabs */}
        <Box
          sx={{ mt: 2, px: 2, py: 1, borderRadius: 4,
             background: 'linear-gradient(to right, #2e3a4f, #0f1113)', backdropFilter: 'blur(12px)', 
             boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}
        >
          <Tabs
            value={section}
            onChange={(_, value) => setSection(value as SectionType)}
            textColor="inherit"
            indicatorColor="primary"
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': { color: '#cccccc', fontWeight: 'bold' },
              '& .Mui-selected': { color: '#ffffff', background: 'rgba(255,255,255,0.1)', borderRadius: 4 },
              '& .MuiTabs-indicator': { backgroundColor: '#ffffff', height: 3, borderRadius: 3 },
            }}
          >
            <Tab label="Services" value="services" />
            <Tab label="Features" value="features" />
            <Tab label="Profile" value="profile" />
          </Tabs>
        </Box>

        {/* Section content */}
        {section === 'services' && <ServicesSection therapist={therapist} navigate={navigate} />}
        {section === 'features' && therapist.features && (
          <Box
            sx={{ mt: 4, mx: 2, borderRadius: 6, background: 'rgba(255, 255, 255, 0.5)', backdropFilter: 'blur(14px)', 
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)', color: '#1c1c1c', maxHeight: '65vh', overflowY: 'auto', p: 3 }}
          >
            <Typography fontWeight="bold" fontSize={16} mb={1}>General Information</Typography>
            {renderFeature(<FaUser color="#2b3b53" />, 'Age', therapist.features.age)}
            {renderFeature(<FaRulerVertical color="#2b3b53" />, 'Height', therapist.features.height)}
            {renderFeature(<FaWeight color="#2b3b53" />, 'Weight', therapist.features.weight)}
            {renderFeature(<FaVenusMars color="#2b3b53" />, 'Gender', therapist.features.gender)}
            {renderFeature(<FaFlag color="#2b3b53" />, 'Ethnicity', therapist.features.ethnicity)}
            {renderFeature(<FaPassport color="#2b3b53" />, 'Language', therapist.features.language)}

            <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />

            <Typography fontWeight="bold" fontSize={16} mb={1}>Features</Typography>

            {renderFeature(<FaHotjar color="#2b3b53" />, 'Body Type', therapist.features.bodyType)}
            {renderFeature(<FaAirFreshener color="#2b3b53" />, 'Bust Size', therapist.features.bustSize)}
            {renderFeature(<FaChessQueen color="#2b3b53" />, 'Hair Color', therapist.features.hairColor)}
            {renderFeature(<FaMagic color="#2b3b53" />, 'Skin Tone', therapist.features.skintone)}

            <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />

            <Typography fontWeight="bold" fontSize={16} mb={1}>Behavior & Health</Typography>

            {renderFeature(<FaSmoking color="#2b3b53" />, 'Smoker', therapist.features.smoker)}
            {renderFeature(<FaSyringe color="#2b3b53" />, 'Vaccinated', therapist.features.vaccinated)}
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
            height: 220,
            borderRadius: 4,
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
                color: '#fff',
                bottom: 0,
                width: '100%',
                px: 2,
                py: 2,
                background: 'rgba(255, 255, 255, 0.12)',
                backdropFilter: 'blur(2px)',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
              }}
            >
              <Typography fontSize={18} fontWeight="bold" fontFamily="Playfair Display">
                {svc.name}
              </Typography>
              <Typography
                fontSize={13}
                sx={{
                  mt: 0.5,
                  color: '#fff',
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
                <Box component="span" sx={{ fontSize: 18, fontWeight: 'bold', color: '#FF9900' }}>
                  ฿{svc.price}
                </Box>
                <Box component="span" sx={{ fontSize: 15, fontWeight: 400, color: '#fff', ml: 0.5 }}>
                  •  {svc.duration}⏱
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
                  top: '65%',
                  transform: 'translateY(-50%)',
                  background: therapist.available === 'resting' ? '#ccc' : '#2b3b53',
                  color: therapist.available === 'resting' ? '#888' : '#fff',
                  fontSize: 14,
                  px: 4,
                  py: 0.5,
                  borderRadius: 4,
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