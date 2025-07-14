import React, { useState } from 'react';
import { Box, Typography } from '@mui/material';
import therapists from '../data/therapists';
import TherapistProfileCard from '../components/TherapistProfileCard';
import SearchBar from '../components/SearchBar';
import NavBar from '../components/NavBar';
import '@fontsource/chonburi';
import '@fontsource/raleway'; // ✅ ตัวหนังสืออ่านง่าย

const HomePage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTherapists = searchTerm.trim()
    ? therapists
        .filter((therapist) =>
          therapist.name.toLowerCase().includes(searchTerm.trim().toLowerCase())
        )
        .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
    : therapists.sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity));

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
    gridTemplateColumns: {
      xs: 'repeat(2, 1fr)', // ✅ 2 คอลัมน์เสมอบนมือถือ
    },
    gap: 0,
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
