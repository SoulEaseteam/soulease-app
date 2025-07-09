// src/pages/admin/ToggleHolidayPage.tsx
import React, { useState } from 'react';
import { Box, Typography, Switch, List, ListItem, ListItemText } from '@mui/material';
import therapistsData from '@/data/therapists';

const ToggleHolidayPage = () => {
  const [holidayMap, setHolidayMap] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('holidayOverrides');
    return saved ? JSON.parse(saved) : {};
  });

  const toggleHoliday = (id: string) => {
    const newMap = { ...holidayMap, [id]: !holidayMap[id] };
    setHolidayMap(newMap);
    localStorage.setItem('holidayOverrides', JSON.stringify(newMap));
  };

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>Toggle Holiday Status</Typography>
      <List>
        {therapistsData.map((t) => (
          <ListItem key={t.id} divider>
            <ListItemText primary={t.name} />
            <Switch
              checked={holidayMap[t.id] || false}
              onChange={() => toggleHoliday(t.id)}
              color="error"
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default ToggleHolidayPage;