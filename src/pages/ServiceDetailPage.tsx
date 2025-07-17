// src/pages/ServiceDetailPage.tsx

import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import services from '../data/services';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Divider,
  Paper,
  Button,
} from '@mui/material';

// Normalize ชื่อ service ให้เปรียบเทียบได้แม่นยำ
const normalize = (str: string) =>
  decodeURIComponent(str).toLowerCase().replace(/\s+/g, '-');

const ServiceDetailPage: React.FC = () => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const therapistId = searchParams.get('therapistId');

  // รับจาก /services/:id หรือ /service-detail/:name
  const rawKey = params.name || params.id || '';
  const normalizedKey = normalize(rawKey);

  // หา service โดยเปรียบเทียบทั้ง id และ name (normalize แล้ว)
  const service = services.find(
    (s) =>
      normalize(s.id) === normalizedKey ||
      normalize(s.name) === normalizedKey
  );

  const [tab, setTab] = useState(0);

  if (!service) {
    return (
      <Box sx={{ p: 4 }}>
        <Typography color="error" fontWeight="bold">
          Service information not found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', background: '#fefefe', pb: 10 }}>
      <Box sx={{ maxWidth: 430, mx: 'auto', position: 'relative' }}>
        {/* 🧾 Title */}
        <Typography
          variant="h6"
          fontWeight="bold"
          textAlign="center"
          color="#2b3b53"
          sx={{
            pt: 6,
            pb: 3,
            background: 'rgba(255,255,255,0.85)',
            backdropFilter: 'blur(2px)',
            position: 'sticky',
            top: 0,
            zIndex: 1000,
          }}
        >
          {service.name}
        </Typography>

        {/* 📸 Image with badge */}
        <Box sx={{ position: 'relative', width: '100%', overflow: 'hidden', mb: 4 }}>
          <img
            src={service.image}
            alt={service.name}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          />
          {service.badge && (
            <Box
              sx={{
                position: 'absolute',
                top: 16,
                left: 16,
                background: 'rgba(0,0,0,0.4)',
                color: '#fff',
                px: 1.5,
                py: 1.5,
                fontSize: 12,
                borderRadius: 2,
              }}
            >
              {service.badge}
            </Box>
          )}
        </Box>

        {/* 📌 Service Info */}
        <Box sx={{ px: 3.5, mb: 1 }}>
          <Typography fontWeight="bold" fontSize={20} sx={{ color: '#2b3b53'}}>
            {service.name}
          </Typography>
          <Typography fontWeight="bold" fontSize={16} sx={{ color: '#696969', fontFamily: 'Trebuchet MS, sans-serif' }}>
            ฿{service.price} • ⏱ {service.duration} mins • 📌 {service.count} Served
          </Typography>
        </Box>

        {/* 📑 Tabs Content */}
        <Paper
          elevation={4}
          sx={{
            mx: 1,
            p: 2,
            mt: 3,
            borderRadius: 2,
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
                color: '#2b3b53',
              },
              '& .Mui-selected': {
                color: '#778899',
              },
            }}
          >
            <Tab label="Details" />
            <Tab label="Notices" />
          </Tabs>

          <Divider sx={{ mb: 3 }} />

          {tab === 0 && (
            <>
              <Typography fontWeight="bold" mb={1} sx={{ color: '#2b3b53' }}>
                ▼ Service Description
              </Typography>
              <Typography
                fontSize={14}
                lineHeight={2}
                color="text.secondary"
                sx={{
                  mb: '0.8',
                  textIndent: '2em',
                  fontFamily: 'Trebuchet MS, sans-serif',
                }}
              >
                {service.detail}
              </Typography>

              <Typography fontWeight="bold" mb={1} sx={{ color: '#2b3b53' }}>
                ▼ Benefits of this service
              </Typography>
              <Box>
                {service.benefit.map((line, i) => (
                  <Typography
                    key={i}
                    fontSize={14}
                    lineHeight={2}
                    color="text.secondary"
                    sx={{
                      mb: '0.8',
                      textIndent: '2em',
                      fontFamily: 'Trebuchet MS, sans-serif',
                    }}
                  >
                    • {line}
                  </Typography>
                ))}
              </Box>
            </>
          )}

          {tab === 1 && (
            <Box>
              <Typography
                fontSize={16}
                fontWeight="bold"
                textAlign="center"
                color="#2b3b53"
                mb={3}
              >
                ・Project Details・
              </Typography>

              <Typography fontWeight="bold" color="#2b3b53" fontSize={14} mb={1}>
                ▼ [Recommendations]
              </Typography>
              <Typography fontSize={14} lineHeight={2} mb={2} sx={{ textAlign: 'justify', textIndent: '1em', color: "text.secondary", fontFamily: 'Trebuchet MS, sans-serif' }}>
                1. Please send your order reference number to the service provider after booking.
              </Typography>
              <Typography fontSize={14} lineHeight={2} mb={2} sx={{ textAlign: 'justify', textIndent: '1em', color: "text.secondary", fontFamily: 'Trebuchet MS, sans-serif' }}>
                2. If you are located close to the therapist, you can pay in cash upon arrival.
              </Typography>
              <Typography fontSize={14} lineHeight={2} mb={2} sx={{ textAlign: 'justify', textIndent: '1em', color: "text.secondary", fontFamily: 'Trebuchet MS, sans-serif' }}>
                3. If you are far (e.g. 25km from Sukhumvit), a deposit of 500 THB may be required.
              </Typography>
              <Typography fontSize={14} lineHeight={2} mb={2} sx={{ textAlign: 'justify', textIndent: '1em', color: "text.secondary", fontFamily: 'Trebuchet MS, sans-serif' }}>
                4. Payment methods accepted: VISA, PromptPay, PayNow, Cash, WeChat.
              </Typography>
              <Typography fontSize={14} lineHeight={2} mb={2} sx={{ textAlign: 'justify', textIndent: '1em', color: "text.secondary", fontFamily: 'Trebuchet MS, sans-serif' }}>
                If you don’t have enough cash, message us to get account details and instructions.
              </Typography>

              <Typography fontWeight="bold" color="#2b3b53" fontSize={14} mb={1}>
                ▼ [Travel Fees]
              </Typography>
              <Typography fontSize={14} lineHeight={2} mb={2} sx={{ textAlign: 'justify', textIndent: '1em', color: "text.secondary", fontFamily: 'Trebuchet MS, sans-serif' }}>
                1. An additional travel fee may apply.
              </Typography>
              <Typography fontSize={14} lineHeight={2} mb={2} sx={{ textAlign: 'justify', textIndent: '1em', color: "text.secondary", fontFamily: 'Trebuchet MS, sans-serif' }}>
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