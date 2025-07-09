// src/pages/admin/TherapistAdminPage.tsx
import React, { useState, useEffect } from 'react';
import { Box, Typography, Switch, Paper, Stack } from '@mui/material';
import therapistsData from '@/data/therapists';

const LOCAL_KEY = 'holidayOverrides';

const TherapistAdminPage: React.FC = () => {
  const [overrides, setOverrides] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(LOCAL_KEY);
      return stored ? JSON.parse(stored) : {};
    }
    return {};
  });

  const handleToggle = (id: string) => {
    const updated = { ...overrides, [id]: !overrides[id] };
    setOverrides(updated);
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        จัดการวันหยุดพนักงาน (Admin)
      </Typography>

      <Stack spacing={2}>
        {therapistsData.map((t) => (
          <Paper
            key={t.id}
            sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <Typography sx={{ fontSize: 16 }}>{t.name}</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography fontSize={14}>Holiday</Typography>
              <Switch
                checked={!!overrides[t.id]}
                onChange={() => handleToggle(t.id)}
              />
            </Stack>
          </Paper>
        ))}
      </Stack>
    </Box>
  );
};

export default TherapistAdminPage;