import { useEffect, useState } from 'react';
import { subscribeToTherapists } from '@/data/therapists';
import TherapistProfileCard from '@/components/TherapistProfileCard';
import {
  Box,
  CircularProgress,
  Typography,
  Fade,
  Container,
} from '@mui/material';
import { Therapist } from '@/types/therapist';
import { updateTherapistAvailability } from '@/utils/updateTherapistStatus';

const HomePage = () => {
  const [therapists, setTherapists] = useState<Therapist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToTherapists({
      callback: async (data: Therapist[]) => {
        const updated = await Promise.all(data.map(updateTherapistAvailability));
        setTherapists(updated);
        setLoading(false);
      },
    });
    return () => unsubscribe();
  }, []);

  const availableTherapists = therapists.filter((t) => t.available === 'available');

  return (
    <Box sx={{ p: 2, minHeight: '100vh', background: '#f8f9fb' }}>
      {loading ? (
        <Box textAlign="center" mt={10}>
          <CircularProgress color="primary" />
          <Typography mt={2} color="text.secondary">
            Loading therapists...
          </Typography>
        </Box>
      ) : availableTherapists.length === 0 ? (
        <Typography textAlign="center" mt={8} color="text.secondary">
          There are currently no staff available. Please try again later.
        </Typography>
      ) : (
        <Container maxWidth="sm">
          <Typography variant="h6" fontWeight="bold" mb={2} textAlign="center">
            Staff ready to serve ({availableTherapists.length} person)
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            {availableTherapists.map((t, idx) => (
              <Fade in key={t.id} style={{ transitionDelay: `${idx * 80}ms` }}>
                <div>
                  <TherapistProfileCard therapistId={t.id} />
                </div>
              </Fade>
            ))}
          </Box>
        </Container>
      )}
    </Box>
  );
};

export default HomePage;