import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Avatar, Tabs, Tab, Button, Divider, ImageList, ImageListItem, Dialog
} from '@mui/material';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import services from '../data/services';
import BackButton from '../components/BackButton';
import BottomNav from '../components/BottomNav';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { Share as ShareIcon, Face, Spa } from '@mui/icons-material';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebase';
import { Therapist } from '@/types/therapist';
import { useAuth } from '@/providers/AuthProvider';
import {
  FaUser, FaVenusMars, FaFlag, FaRulerVertical, FaTshirt, FaWeight, FaEye, FaShoePrints, FaCut,
  FaSmoking, FaSyringe, FaHeartbeat, FaMagic, FaSprayCan, FaAtom, FaFireAlt, FaLeaf, FaHeart, FaSpa, FaChessQueen,
  FaHands, FaPaintBrush, FaGem, FaPassport, FaAirFreshener, FaHotjar, FaRuler, FaPenFancy
} from 'react-icons/fa';

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
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const defaultSection = (queryParams.get('section') as 'services' | 'features' | 'profile') || 'services';

  // 🟢 โหลด therapist จาก Firestore ตาม id (Realtime)
  const [therapist, setTherapist] = useState<Therapist | null>(null);
  const [section, setSection] = useState<'services' | 'features' | 'profile'>(defaultSection);
  const [openImage, setOpenImage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  const { user } = useAuth();

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, 'therapists', id), (snap) => {
      if (snap.exists()) {
        setTherapist({ id: snap.id, ...snap.data() } as Therapist);
      } else {
        setTherapist(null);
      }
    });
    return () => unsub();
  }, [id]);

  // 🔴 ตัวอย่าง Favorite (ต้องใช้ฟีเจอร์จริงกรณีเชื่อม Firebase Users)
  // useEffect(() => {
  //   if (!user?.uid || !id) return;
  //   const favRef = doc(db, `users/${user.uid}/favorites`, id);
  //   const unsubscribe = onSnapshot(favRef, (docSnapshot) => {
  //     setIsFavorite(docSnapshot.exists());
  //   });
  //   return () => unsubscribe();
  // }, [user?.uid, id]);

  // ปุ่ม Favorite (demo toggle local state)
  const toggleFavorite = () => setIsFavorite((f) => !f);

  if (!therapist) return <Box p={2}>No therapist found</Box>;

  const features = therapist.features;
  const galleryImages =
    therapist.gallery && therapist.gallery.length > 0
      ? therapist.gallery
      : Array.from({ length: 6 }).map((_, index) => `/images/gallery/${id}_${index + 1}.jpg`);

  return (
    <Box sx={{
      background: 'rgba(255, 255, 255, 0.6)',
      color: '#2b3b53',
      minHeight: '100vh',
      display: 'flex',
      justifyContent: 'center'
    }}>
      <Box sx={{ width: '100%', maxWidth: 430, pb: 10, fontFamily: 'Orson, sans-serif' }}>
        <BackButton />

        {/* Header */}
        <Box sx={{
          width: '100%', height: 180,
          background: 'linear-gradient(to right, #2e3a4f, #0f1113)',
          position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Typography variant="h4" sx={{
            letterSpacing: 6, fontWeight: 700, color: '#7b8b99',
            textShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            FEATURED PROFILES
          </Typography>
          <Button onClick={handleShare} sx={{
            position: 'absolute', top: 16, right: 16, minWidth: 0, width: 36, height: 36,
            borderRadius: '50%', backgroundColor: '#fff', color: '#333',
            boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
            '&:hover': { backgroundColor: '#eee' }
          }}>
            <ShareIcon />
          </Button>
        </Box>

        {/* Avatar & Favorite */}
        <Box sx={{ px: 2, mt: -6, position: 'relative', display: 'inline-block' }}>
          <Avatar
            src={`/images/${therapist.image}`}
            sx={{
              width: 120, height: 120,
              border: '4px solid rgba(255,255,255,0.4)'
            }}
            imgProps={{ style: { objectFit: 'cover', objectPosition: 'center top' } }}
          />
          <Button
            onClick={toggleFavorite}
            sx={{
              position: 'absolute', top: 85, right: 13, minWidth: 0, width: 38, height: 38,
              borderRadius: '50%', backgroundColor: isFavorite ? '#ff6b81' : 'rgba(255,255,255,0.8)',
              color: isFavorite ? '#fff' : '#888', boxShadow: '0 2px 6px rgba(0,0,0,0.2)', zIndex: 10,
              '&:hover': { backgroundColor: isFavorite ? '#ff4757' : '#eee' }
            }}>
            {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </Button>
        </Box>

        {/* Therapist Info */}
        <Box sx={{ px: 2, mt: 1 }}>
          <Typography variant="h5" sx={{
            fontWeight: 'bold', fontSize: 30, color: '#2b3b53', letterSpacing: 1, mt: 1
          }}>
            {therapist.name}
            <Box component="span" sx={{
              display: 'inline-flex', alignItems: 'center', fontSize: 16,
              fontWeight: 500, color: '#596a7c', ml: 1, cursor: 'pointer',
              '&:hover': { textDecoration: 'underline' }
            }} onClick={() => navigate(`/review/all/${therapist.id}`)}>
              <img src="/images/icon/star.png" alt="star" style={{ width: 20, height: 20, marginRight: 6 }} />
              {therapist.rating} / review {therapist.reviews}+
            </Box>
          </Typography>
          <Typography variant="body2" sx={{ color: '#596a7c' }}>
            WorkingHours {therapist.startTime} - {therapist.endTime}
          </Typography>
        </Box>

        {/* Tabs */}
        <Box sx={{
          mt: 2, px: 2, py: 1, borderRadius: 4,
          background: 'linear-gradient(to right, #2e3a4f, #0f1113)',
          backdropFilter: 'blur(12px)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <Tabs
            value={section}
            onChange={(_, value) => setSection(value)}
            textColor="inherit"
            indicatorColor="primary"
            variant="fullWidth"
            sx={{
              '& .MuiTab-root': { color: '#cccccc', fontWeight: 'bold' },
              '& .Mui-selected': { color: '#ffffff', background: 'rgba(255,255,255,0.1)', borderRadius: 2 },
              '& .MuiTabs-indicator': { backgroundColor: '#ffffff', height: 3, borderRadius: 2 },
            }}>
            <Tab label="Services" value="services" />
            <Tab label="Features" value="features" />
            <Tab label="Profile" value="profile" />
          </Tabs>
        </Box>

        {/* Sections */}
        {section === 'services' && <ServicesSection therapist={therapist} navigate={navigate} />}
        {section === 'features' && features && (
          <Box sx={{
            mt: 4, mx: 2, borderRadius: 4, background: 'rgba(255, 255, 255, 0.5)',
            backdropFilter: 'blur(14px)', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            color: '#1c1c1c', maxHeight: '65vh', overflowY: 'auto', p: 3
          }}>
            <Typography fontWeight="bold" fontSize={16} mb={1}>General Information</Typography>
            {renderFeature(<Face style={{ color: '#2b3b53' }} />, 'Age', features.age)}
            {renderFeature(<FaRuler style={{ color: '#2b3b53' }} />, 'Height', features.height)}
            {renderFeature(<FaWeight style={{ color: '#2b3b53' }} />, 'Weight', features.weight)}
            {renderFeature(<FaVenusMars style={{ color: '#2b3b53' }} />, 'Gender', features.gender)}
            {renderFeature(<FaFlag style={{ color: '#2b3b53' }} />, 'Ethnicity', features.ethnicity)}
            {renderFeature(<FaPassport style={{ color: '#2b3b53' }} />, 'Language', features.language)}
            <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />
            <Typography fontWeight="bold" fontSize={16} mb={1}>Features</Typography>
            {renderFeature(<FaHotjar color="#2b3b53" />, 'Body Type', features.bodyType)}
            {renderFeature(<FaAirFreshener color="#2b3b53" />, 'Bust Size', features.bustSize)}
            {renderFeature(<FaLeaf color="#2b3b53" />, 'Bust', features.bust)}
            {renderFeature(<FaChessQueen color="#2b3b53" />, 'Hair Color', features.hairColor)}
            {renderFeature(<FaMagic color="#2b3b53" />, 'Skin Tone', features.skintone)}
            {renderFeature(<FaSpa color="#2b3b53" />, 'Skill', features.skill)}
            <Divider sx={{ my: 2, bgcolor: 'rgba(255,255,255,0.2)' }} />
            <Typography fontWeight="bold" fontSize={16} mb={1}>Behavior & Health</Typography>
            {renderFeature(<FaPenFancy color="#2b3b53" />, 'Tattoos', features.tattoos)}
            {renderFeature(<FaSmoking color="#2b3b53" />, 'Smoker', features.smoker)}
            {renderFeature(<FaSyringe color="#2b3b53" />, 'Vaccinated', features.vaccinated)}
            {renderFeature(<FaHeartbeat color="#2b3b53" />, 'Personality', features.personality)}
          </Box>
        )}
        {section === 'profile' && (
          <GallerySection images={galleryImages} setOpenImage={setOpenImage} openImage={openImage} />
        )}

        <BottomNav />
      </Box>
    </Box>
  );
};

const ServicesSection = ({ therapist, navigate }: any) => (
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
              <Typography fontSize={16} fontWeight="bold" fontFamily="Playfair Display">{svc.name}</Typography>
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
                <Box component="span" sx={{ fontSize: 18, fontWeight: 'bold', color: '#7c4d00' }}>฿{svc.price}</Box>
                <Box component="span" sx={{ fontSize: 13, fontWeight: 400, color: '#7c4d00', ml: 0.5 }}>• ⏱ {svc.duration}</Box>
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

const GallerySection = ({ images, setOpenImage, openImage }: any) => (
  <Box sx={{ p: 2 }}>
    <Typography fontWeight="bold" fontSize={16} mb={2}>Gallery</Typography>
    <ImageList cols={3} gap={8}>
      {images.map((img: string, index: number) => (
        <ImageListItem key={index} onClick={() => setOpenImage(img)}>
          <img src={img} alt={`Gallery ${index}`} style={{ borderRadius: 8 }} />
        </ImageListItem>
      ))}
    </ImageList>
    <Dialog open={Boolean(openImage)} onClose={() => setOpenImage(null)} maxWidth="md">
      <img src={openImage!} alt="Preview" style={{ width: '100%' }} />
    </Dialog>
  </Box>
);

export default TherapistDetailPage;