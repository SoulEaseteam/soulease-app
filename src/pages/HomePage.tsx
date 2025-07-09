import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, CircularProgress } from '@mui/material';
import TherapistProfileCard from '../components/TherapistProfileCard';
import SearchBar from '../components/SearchBar';
import NavBar from '../components/NavBar';
import { subscribeToTherapists } from '../services/subscribeToTherapists'; // ✔️
import { Therapist } from '../types/therapist'; // ✔️

const HomePage: React.FC = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToTherapists((data: Therapist[]) => {
      setTherapists(data);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const filteredTherapists = useMemo(() => {
    if (!searchTerm.trim()) return therapists;
    return therapists.filter((t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, therapists]);

  return (
    <Box>
      <NavBar />
      <Typography variant="h5" textAlign="center" mt={3}>
        Find Your Perfect Therapist
      </Typography>
      <SearchBar onSearch={setSearchTerm} />
      <Box mt={3} px={2}>
        {loading ? (
          <Box display="flex" flexDirection="column" alignItems="center" mt={6}>
            <CircularProgress />
            <Typography mt={2} color="text.secondary">
              Loading therapists...
            </Typography>
          </Box>
        ) : filteredTherapists.length === 0 ? (
          <Typography textAlign="center" mt={4} color="text.secondary">
            No therapists found.
          </Typography>
        ) : (
          filteredTherapists.map((t) =>
            t.name && t.image ? (
              <TherapistProfileCard key={t.id} therapist={t} />
            ) : null
          )
        )}
      </Box>
    </Box>
  );
};

export default HomePage;