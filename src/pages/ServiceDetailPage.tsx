// src/pages/ServiceDetailPage.tsx

import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import services from '../data/services';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Divider,
  Paper,
} from '@mui/material';
import CustomAppBar from '../components/CustomAppBar';
import BackButton from '../components/BackButton';

const ServiceDetailPage: React.FC = () => {
  const { name } = useParams();
  const decodedName = decodeURIComponent(name || '');
  const service = services.find((s) => s.name === decodedName);
  const [tab, setTab] = useState(0);

  if (!service) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error">Service information not found.</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(to bottom, #faf4ef, #fffdfb)',
        pb: 10,
      }}
    >
      <Box sx={{ maxWidth: 430, mx: 'auto', position: 'relative' }}>
        
        {/* 🔙 Back Button */}
        <Box sx={{ position: 'fixed', top: 16, left: 16, zIndex: 1500 }}>
          <BackButton />
        </Box>

        {/* 🧾 Title */}
        <Typography
          variant="h6"
          fontWeight="bold"
          textAlign="center"
          sx={{
            pt: 2,
            pb: 1,
            background: 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(10px)',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
          }}
        >
          {service.name}
        </Typography>

        {/* 📸 Image with badge */}
        <Box sx={{ position: 'relative', width: '100%', overflow: 'hidden', mb: 2 }}>
          <img
            src={service.image}
            alt={service.name}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
          <Box
            sx={{
              position: 'absolute',
              top: 16,
              left: 16,
              background: 'rgba(0,0,0,0.4)',
              color: '#fff',
              px: 1.5,
              py: 0.5,
              fontSize: 12,
              borderRadius: 2,
            }}
          >
            {service.badge}
          </Box>
        </Box>

        {/* 📌 Service Info */}
        <Box sx={{ px: 3, mb: 1 }}>
          <Typography fontWeight="bold" fontSize={18}>
            {service.name}
          </Typography>
          <Typography fontSize={14} color="#9e713c">
            ฿{service.price} • {service.duration} • 📌 {service.count} Served
          </Typography>
        </Box>

        {/* 📑 Tabs Content */}
        <Paper
          elevation={4}
          sx={{
            mx: 3,
            p: 2,
            mt: 2,
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.65)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 20px rgba(0,0,0,0.06)',
          }}
        >
          <Tabs
            value={tab}
            onChange={(e, newValue) => setTab(newValue)}
            textColor="secondary"
            indicatorColor="secondary"
            variant="fullWidth"
            sx={{
              mb: 2,
              '& .MuiTab-root': {
                fontWeight: 'bold',
                fontSize: 14,
                color: '#a7774e',
              },
              '& .Mui-selected': {
                color: '#6b3e1d',
              },
            }}
          >
            <Tab label="Details" />
            <Tab label="Notices" />
          </Tabs>

          <Divider sx={{ mb: 2 }} />

          {tab === 0 && (
            <>
              <Typography fontWeight="bold" mb={1}>
                ▼ Service Description
              </Typography>
              <Typography fontSize={14} lineHeight={1.8} mb={2}>
                {service.detail}
              </Typography>

              <Typography fontWeight="bold" mb={1}>
                ▼ Benefits of this service
              </Typography>
              <Box>
                {service.benefit.split('\n').map((line, i) => (
                  <Typography key={i} fontSize={14} lineHeight={1.8} mb={0.8}>
                    {line}
                  </Typography>
                ))}
              </Box>
            </>
          )}

          {tab === 1 && (
            <Box>
              <Typography
                fontSize={14}
                fontWeight="bold"
                textAlign="center"
                mb={2}
              >
                ・Project Details・
              </Typography>

              <Typography fontWeight="bold" fontSize={14} mb={1}>
                ▼ [Recommendations]
              </Typography>
              <Typography fontSize={14} mb={1}>
                1. Please send your order reference number to the service provider after booking.
              </Typography>
              <Typography fontSize={14} mb={1}>
                2. If you are located close to the therapist, you can pay in cash upon arrival.
              </Typography>
              <Typography fontSize={14} mb={1}>
                3. If you are far (e.g. 25km from Sukhumvit), a deposit of 500 THB may be required.
              </Typography>
              <Typography fontSize={14} mb={1}>
                4. Payment methods accepted: VISA, PromptPay, PayNow, Cash, WeChat.
              </Typography>
              <Typography fontSize={14} mb={2}>
                If you don’t have enough cash, message us to get account details and instructions.
              </Typography>

              <Typography fontWeight="bold" fontSize={14} mb={1}>
                ▼ [Travel Fees]
              </Typography>
              <Typography fontSize={14} mb={1}>
                1. An additional travel fee may apply.
              </Typography>
              <Typography fontSize={14}>
                2. Therapists are located in various parts of the city. Choose one nearby for faster service.
              </Typography>
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default ServiceDetailPage;