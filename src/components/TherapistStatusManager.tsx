import React, { useState } from 'react';
import { Box, Button, Typography, Stack } from '@mui/material';

type TherapistStatus = 'available' | 'resting';

interface TherapistStatusManagerProps {
  currentStatus: TherapistStatus;
  onStatusChange: (newStatus: TherapistStatus) => void;
}

const TherapistStatusManager: React.FC<TherapistStatusManagerProps> = ({ currentStatus, onStatusChange }) => {
  const [status, setStatus] = useState<TherapistStatus>(currentStatus);

  const handleChangeStatus = (newStatus: TherapistStatus) => {
    setStatus(newStatus);
    onStatusChange(newStatus);
  };

  return (
    <Box sx={{ p: 2, maxWidth: 400, border: '1px solid #ccc', borderRadius: 2 }}>
      <Typography variant="h6" mb={2}>Manage Therapist Status</Typography>
      <Stack direction="row" spacing={2}>
        <Button
          variant={status === 'available' ? 'contained' : 'outlined'}
          color="success"
          onClick={() => handleChangeStatus('available')}
        >
          Available
        </Button>
        <Button
          variant={status === 'resting' ? 'contained' : 'outlined'}
          color="warning"
          onClick={() => handleChangeStatus('resting')}
        >
          Resting
        </Button>
      </Stack>
      <Typography mt={2}>Current status: <strong>{status}</strong></Typography>
    </Box>
  );
};

export default TherapistStatusManager;