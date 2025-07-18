import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import therapistsRaw from '../data/therapists';
import TherapistProfileCard from '../components/TherapistProfileCard';
import SearchBar from '../components/SearchBar';
import NavBar from '../components/NavBar';
import '@fontsource/chonburi';
import '@fontsource/raleway';
import { Therapist } from '../types/therapist';
import { getBadgeForTherapist } from '../utils/getTherapistBadge'; // หรือใช้ '@/utils/...' ถ้ามี alias

// 🔧 แปลง therapistsRaw ให้เป็น Therapist[] ที่ปลอดภัย
const therapists: Therapist[] = therapistsRaw.map((t, index) => ({
  id: t.id ?? `therapist-${index}`,
  name: t.name ?? 'Unknown',
  image: t.image ?? '/placeholder.png',
  rating: t.rating ?? 0,
  reviews: t.reviews ?? 0,
  todayBookings: t.todayBookings ?? 0,
  totalBookings: t.totalBookings ?? 0,
  nextAvailable: t.nextAvailable ?? 'N/A',
  startTime: t.startTime ?? '00:00',
  endTime: t.endTime ?? '23:59',
  gallery: t.gallery ?? [],
  features: {
    age: t.features?.age ?? 'N/A',
    height: t.features?.height ?? 'N/A',
    weight: t.features?.weight ?? 'N/A',
    bodyType: t.features?.bodyType ?? 'N/A',
    language: t.features?.language ?? 'N/A',
    gender: t.features?.gender,
    ethnicity: t.features?.ethnicity,
    bustSize: t.features?.bustSize,
    bust: t.features?.bust,
    hairColor: t.features?.hairColor,
    skintone: t.features?.skintone,
    smoker: t.features?.smoker,
    vaccinated: t.features?.vaccinated,
  },
  available: t.available ?? 'resting',
  distance: t.distance,
  hot: t.hot ?? false,
  new: t.new ?? false,
  topRated: t.topRated ?? false,
  serviceCount: t.serviceCount ?? '0',
  currentLocation: t.currentLocation ?? { lat: 0, lng: 0 },
  badge: getBadgeForTherapist({
  todayBookings: t.todayBookings ?? 0,
  totalBookings: t.totalBookings ?? 0,
}),
}));

const HomePage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  // ✅ ทำการ copy array ก่อน sort เพื่อไม่เปลี่ยนต้นฉบับ
  const sortedTherapists = [...therapists].sort(
    (a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity)
  );

  const filteredTherapists: Therapist[] = searchTerm.trim()
    ? sortedTherapists.filter((therapist) =>
        therapist.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
      )
    : sortedTherapists;

  return (
    <Box
      sx={{
        background: 'linear-gradient(to bottom, #f7f8f9, #e8ecf1)',
        minHeight: '100vh',
        pb: 10,
        fontFamily: 'Raleway, sans-serif', // ✅ ถ้าใช้ theme ก็สามารถลบได้
      }}
    >
      <NavBar />
      <Box sx={{ maxWidth: 420, mx: 'auto', px: 0 }}>
        <Typography
          variant="h4"
          textAlign="center"
          sx={{
            mt: 4,
            fontFamily: 'Chonburi',
            fontWeight: 'bold',
            fontSize: 28,
            color: '#3f5066',
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
            mt: 2,
            mb: 2,
            color: '#7b8b99',
            fontWeight: 300,
            letterSpacing: 3,
            fontSize: 16,
          }}
        >
          BROWSE ALL PROFILES
        </Typography>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)' },
            gap: 2,
            px: 1,
            justifyItems: 'center',
          }}
        >
          {filteredTherapists.map((therapist) => (
            <TherapistProfileCard key={therapist.id} therapist={therapist} />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;