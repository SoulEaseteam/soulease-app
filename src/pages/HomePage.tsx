import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import therapistsRaw from '../data/therapists';
import TherapistProfileCard from '../components/TherapistProfileCard';
import SearchBar from '../components/SearchBar';
import NavBar from '../components/NavBar';
import '@fontsource/chonburi';
import '@fontsource/raleway';
import { Therapist } from '../types/therapist';

// 🔧 เติม badge กลับเข้า Therapist เพื่อให้เป็น Therapist สมบูรณ์
const therapists: Therapist[] = therapistsRaw.map((t) => ({
  ...t,
  badge: undefined, // หรือเพิ่ม logic กำหนด badge จริงได้ตามต้องการ
}));

const HomePage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTherapists: Therapist[] = searchTerm.trim()
    ? therapists
        .filter((therapist: Therapist) =>
          therapist.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
        )
        .sort(
          (a: Therapist, b: Therapist) =>
            (a.distance ?? Infinity) - (b.distance ?? Infinity)
        )
    : therapists.sort(
        (a: Therapist, b: Therapist) =>
          (a.distance ?? Infinity) - (b.distance ?? Infinity)
      );

  return (
    <Box
      sx={{
        background: 'linear-gradient(to bottom, #f7f8f9, #e8ecf1)',
        minHeight: '100vh',
        pb: 10,
        fontFamily: 'Raleway, sans-serif',
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
            gap: 0,
            justifyItems: 'center',
          }}
        >
          {filteredTherapists.map((therapist: Therapist) => (
            <TherapistProfileCard key={therapist.id} therapist={therapist} />
          ))}
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;