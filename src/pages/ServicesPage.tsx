import React from 'react';
import {Box,Typography,Avatar,Button,IconButton,Tabs,Tab,Accordion,AccordionSummary,AccordionDetails,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { FaLine, FaWeixin, FaTelegramPlane, FaWhatsapp } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import services from '../data/services';
import FollowButton from '../components/FollowButton';
import '@fontsource/playfair-display'; // npm install @fontsource/playfair-display

const getBadgeStyle = (badge: string) => {
  const baseStyle = {
    color: 'white',
    backdropFilter: 'blur(6px)',
    fontWeight: 'bold' as const,
    border: '1px solid rgba(255,255,255,0.15)',
    boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
  };

  switch (badge) {
    case 'VIXI SIGNATURE':
      return { ...baseStyle, background: 'rgba(132, 132, 132, 0.43)' };
    case 'VIXI RECOMMEND':
      return { ...baseStyle, background: 'rgba(132, 132, 132, 0.43)' };
    case 'VIXI BEST SELLER':
      return { ...baseStyle, background: 'rgba(132, 132, 132, 0.31)' };
    default:
      return { ...baseStyle, background: 'rgba(132, 132, 132, 0.43)' };
  }
};

const ServicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [section, setSection] = React.useState<'services' | 'about' | 'how'>('services');

  const handleSelectService = (name: string) => {
    navigate(`/service-detail/${encodeURIComponent(name)}`);
  };

  return (
  <Box sx={{ bgcolor: 'rgba(255, 255, 255, 0.6)', pb: 10, minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
    <Box sx={{ width: '100%', maxWidth: 430, pb: 20 }}>
      <Box
  sx={{
    width: '100%',
    height: 180,
    background: 'transparent', // ไม่มีพื้นหลัง
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }}
>
  <Box
    component="img"
    src="public/images/massage/SYNTIA BANGKOK.png" // 👈 เปลี่ยน path ให้ตรงกับตำแหน่งจริง
    alt="SYNTIA BANGKOK"
    sx={{
      maxWidth: '90%',
      height: 'auto',
      objectFit: 'contain',
    }}
  />
</Box>

        <Box sx={{ px: 2, mt: -6, display: 'flex', alignItems: 'flex-end' }}>
          <Avatar src="public/images/massage/Wonderland - 4.PNG" sx={{ width: 100, height: 100, border: '4px solid rgba(255,255,255,0.5)' }} />
          <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
            <IconButton component="a" href="https://line.me/ti/p/your-id" target="_blank">
              <FaLine size={20} color="#00c200" />
            </IconButton>
            <IconButton component="a" href="https://weixin.qq.com/" target="_blank">
              <FaWeixin size={20} color="#09bb07" />
            </IconButton>
            <IconButton component="a" href="https://t.me/yourusername" target="_blank">
              <FaTelegramPlane size={20} color="#0088cc" />
            </IconButton>
            <IconButton component="a" href="https://wa.me/66981234567" target="_blank">
              <FaWhatsapp size={20} color="#25D366" />
            </IconButton>
            <FollowButton />
          </Box>
        </Box>

        <Box sx={{ px: 2, mt: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            SoulEase  <CheckCircleIcon fontSize="small" sx={{ color: '#1DA1F2', ml: 1 }} />
          </Typography>
          <Typography variant="body2" sx={{ color: '#596a7c' }}>@soulease.vip</Typography>
          <Typography variant="body1" sx={{ mt: 1, color: '#2b3b53' }}>
  <span style={{ fontWeight: 'bold' }}>Premium Outcall Massage in Bangkok.</span><br />
  Verified therapists. Discreet. Reliable.<br />
  Every profile is screened before publishing.<br />
  Unmatched support, 24/7. Your relaxation begins here.
</Typography>
        </Box>
        
        <Box
              sx={{
                mt: 2,
                px: 2,
                py: 1,
                borderRadius: 4,
                background: 'linear-gradient(to right, #0f1113,#2e3a4f)', // เปลี่ยนสีแท็บ
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              }}
            >
              <Tabs
                value={section}
                onChange={(_, value) => setSection(value)}
                textColor="inherit"
                indicatorColor="primary"
                variant="fullWidth"
                sx={{
                  '& .MuiTab-root': {
                    color: '#cccccc', // สีตัวอักษรแท็บทั่วไป
                    fontWeight: 'bold',
                  },
                  '& .Mui-selected': {
                    color: '#ffffff', // สีตัวอักษรเมื่อเลือก
                    background: 'rgba(255,255,255,0.1)',
                    borderRadius: 2,
                  },
                  '& .MuiTabs-indicator': {
                    backgroundColor: '#ffffff', // สีเส้นใต้
                    height: 3,
                    borderRadius: 2,
                  },
                }}
              >
                <Tab label="SERVICES" value="services" />
                <Tab label="ABOUT US" value="about" />
                <Tab label="HOW TO BOOK" value="how" />
              </Tabs>
            </Box>

        {section === 'services' && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4, mt: 3, px: 2 }}>
            {services.map((svc, index) => (
              <motion.div 
                key={svc.name}
                initial={{ opacity: 0, y: 20, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ delay: index * 0.1, duration: 0.5, ease: 'easeOut' }}
                whileHover={{ scale: 1.015 }}
              >
                <Box
                  sx={{
                    position: 'relative',
                    height: 220,
                    borderRadius: 5,
                    overflow: 'hidden',
                    backgroundImage: `url(${svc.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    cursor: 'pointer',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                  }}
                  onClick={() => handleSelectService(svc.name)}
                >
                  <Box sx={{ position: 'absolute', top: 14, left: 14, px: 1.5, py: 0.5, fontSize: 12, fontWeight:'bold', borderRadius: 2, ...getBadgeStyle(svc.badge) }}>
                    {svc.badge}
                  </Box>
                  <Box sx={{ px: 2, py: 1.5, background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(10px)' }}>
                    <Typography fontSize={18} fontWeight="bold" fontFamily="Playfair Display" sx={{ color: '#2b3b53' }}>{svc.name}</Typography>
                    <Typography fontSize={13} sx={{ mt: 0.3, color: '#3f5066' }}>{svc.desc}</Typography>
                    <Typography>
                      <Box component="span" sx={{ fontSize: 16, fontWeight: 'bold', color: '#7c4d00' }}>฿{svc.price}</Box>
                      <Box component="span" sx={{ fontSize: 13, fontWeight: 400, color: '#7c4d00', ml: 0.5 }}>• ⏱ {svc.duration}</Box>
                    </Typography>
                  </Box>
                </Box>
              </motion.div>
            ))}
            <Typography textAlign="center" mt={4} fontSize={13} sx={{ color: '#aaa', fontStyle: 'italic' }}> “Can’t find what you’re looking for? Chat with us for more options!” </Typography>
          </Box>
        )}

        {section === 'about' && (
          <Box sx={{ px: 3, py: 5 }}>
          <Typography fontWeight="bold" textAlign="center" mb={3} sx={{ color: '#2b3b53', fontSize: 18 }}>
          • ABOUT US •
        </Typography>

        <Typography fontSize={14} lineHeight={1.9} mb={2} sx={{ textIndent: '1.5em', textAlign: 'left' }}>
          Welcome to SoulEase’s Massage Service Experience.  
          Step into a world where relaxation meets indulgence and every touch is designed to awaken your senses. 
          Discover a curated list of independent therapists, each specializing in diverse massage techniques tailored to your unique preferences.
        </Typography>

        <Typography fontSize={14} lineHeight={1.9} sx={{ textIndent: '1.5em', textAlign: 'left' }}>
          Whether you’re seeking deep relaxation or an elevated experience with a sensual finale, 
          SoulEase is here to create the perfect journey. Every therapist’s profile is verified 
          and thoughtfully crafted to help you find the ideal match.
        </Typography>
       </Box>
            )}
            {section === 'how' && (
              <Box sx={{ px: 2, py: 5 }}>
              <Typography fontWeight="bold" textAlign="center" mb={3} sx={{ color: '#2b3b53', fontSize: 18 }}>
              • Frequently Asked Questions •
            </Typography>

          
<Typography fontWeight="bold" fontSize={24} mt={5} mb={3} sx={{ color: '#1a2a3b' }}>
  BASICS
</Typography>

{[
  {
    q: 'How do I book a therapist?',
    a: `Simply choose your preferred therapist from the Home page, select your desired service, fill in the booking form, and press confirm. The details will be sent directly to our admin for confirmation.`,
  },
  {
    q: "What details are shown on a therapist's profile?",
    a: `Each profile includes verified photos, service specialties, availability, reviews, and personal features/preferences.`,
  },
  {
    q: 'How can I contact a therapist?',
    a: `All communication is handled through our admin to ensure privacy and safety. You will be connected once your booking is confirmed.`,
  },
  {
  q: 'Are the profile photos real?',
  a: `Ensuring the authenticity of each therapist’s profile on SoulEase is one of our top priorities. We have implemented clear measures to enhance transparency, including a dedicated photo verification process. Therapists are encouraged to update their verification regularly to maintain credibility.

While we strive to ensure honest and accurate representation, like any platform, we cannot guarantee absolute accuracy. For added assurance, we recommend checking client reviews, which often provide valuable insights into each therapist’s service quality.`,
},
{
  q: 'How fast can a therapist reach me?',
  a: `Depending on your location and therapist availability, we can usually arrange for someone to reach you within 30–60 minutes in central Bangkok areas.\n\nIn peak hours or for locations outside the city center, estimated arrival time may vary between 60–90 minutes.\n\nYou’ll be able to view the therapist’s location and estimated travel time before confirming your booking.`
},
].map((item, idx) => (
  <Accordion
    key={idx}
    disableGutters
    elevation={0}
    sx={{
      mb: 1.5,
      border: '1px solid #ccc',
      borderRadius: 2,
      '&::before': { display: 'none' },
    }}
  >
    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#1a2a3b' }} />}>
      <Typography fontWeight="bold" fontSize={16} sx={{ color: '#1a2a3b' }}>
        {item.q}
      </Typography>
    </AccordionSummary>
    <AccordionDetails>
      {item.a.split('\n\n').map((para, i) => (
        <Typography
          key={i}
          fontSize={14}
          lineHeight={1.8}
          color="text.secondary"
          paragraph
          sx={{ textIndent: '1.5em' }}
        >
          {para}
        </Typography>
      ))}
    </AccordionDetails>
  </Accordion>
))}

<Typography fontWeight="bold" fontSize={24} mt={5} mb={3} sx={{ color: '#1a2a3b' }}>
  PAYMENT
</Typography>
{[
  {
    q: 'How much does it cost to book a therapist?',
    a: 'At SoulEase, we understand the importance of pricing transparency.\n\nEach therapist on our platform is an independent professional who sets their own rates. For the most accurate and up-to-date pricing, we recommend visiting the individual therapist’s profile.\n\nThe cost is typically based on the duration of the booking, the chosen service, and the travel distance — empowering you to make informed decisions tailored to your unique needs.',
  },
  {
    q: 'What forms of payment do you accept?',
    a: (
      <>
        <strong>Online Booking:</strong>
        <ul style={{ marginTop: 4, marginBottom: 8 }}>
          <li>Cash, QR code scan  (PromptPay, PayNow, WeChat Pay)</li>
          <li>Bank Transfer (Account details will be provided after booking)</li>
        </ul>
        <strong>In-Person at Condo/Hotel:</strong>
        <ul style={{ marginTop: 4 }}>
          <li>Cash payment after the service</li>
          <li>QR code scanning directly from the therapist’s device</li>
          <li>Bank transfer with confirmation via payment slip</li>
        </ul>
      </>
    ),
  },
  {
    q: 'Is leaving a deposit normal?',
    a: `In some cases, a deposit may be required to secure your booking — especially for locations outside our standard service zones.\n\nYou will always be informed in advance if a deposit is necessary.\n\nFor example, if your location is more than 25km from central Sukhumvit, a deposit will be requested to ensure therapist availability and travel commitment.`
  },
  {
  q: 'What’s the cancellation or reschedule policy?',
  a: `We understand that plans can change. You may cancel or reschedule your appointment with at least 1 hour notice before the scheduled time.\n\nIf the therapist has not yet begun traveling, a full refund or reschedule will be provided.\n\nHowever, cancellations made with less than 1 hour notice or after the therapist is en route may not be eligible for a refund, as the therapist's time and travel have already been committed.`
},
].map((item, idx) => (
  <Accordion
    key={`payment-${idx}`}
    disableGutters
    elevation={0}
    sx={{
      mb: 1.5,
      border: '1px solid #ccc',
      borderRadius: 2,
      '&::before': { display: 'none' },
    }}
  >
    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#1a2a3b' }} />}>
      <Typography fontWeight="bold" fontSize={16} sx={{ color: '1a2a3b' }}>
        {item.q}
      </Typography>
    </AccordionSummary>
   <AccordionDetails>
  {typeof item.a === 'string' ? (
    item.a.split('\n\n').map((para, i) => (
      <Typography
        key={i}
        fontSize={14}
        lineHeight={1.8}
        color="text.secondary" // ✅ สีเทาอ่อนแบบเดียวกับพารากราฟด้านบน
        paragraph
        sx={{
          textIndent: '1.5em',
        }}
      >
        {para}
      </Typography>
    ))
  ) : (
    <Box sx={{ color: 'text.secondary', fontSize: 14 }}>
      {item.a}
    </Box>
  )}
</AccordionDetails>
  </Accordion>
))}


    <Box
      sx={{
        mt: 5,
        p: 3,
        borderRadius: 4,
        backgroundColor: '#ffffff',
        boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
      }}
    >
      <Typography fontWeight="bold" fontSize={16} mb={2} sx={{ color: '#2b3b53' }}>
        Contact Information
      </Typography>
      <Box display="flex" alignItems="center" gap={1.5} mb={1}>
        <FaWhatsapp size={20} style={{ color: '#25D366' }} />
        <Typography fontSize={14} sx={{ color: '#2c3e50' }}>
          WhatsApp: <b>+66 981522825</b>
        </Typography>
      </Box>
      <Box display="flex" alignItems="center" gap={1.5}>
        <FaTelegramPlane size={20} style={{ color: '#229ED9' }} />
        <Typography fontSize={14} sx={{ color: '#2c3e50' }}>
          Telegram:{' '}
          <Box
            component="a"
            href="https://t.me/missmevixibkk"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: '#1a73e8',
              fontWeight: 'bold',
              textDecoration: 'none',
              '&:hover': {
                color: '#0b4f9c',
                textDecoration: 'underline',
              },
            }}
          >
            @missmevixibkk
          </Box>
        </Typography>
      </Box>
    </Box>
 {/* 🔗 ลิงก์อื่นๆ แยกออกมา */}
 <Box mt={3}>
      <Typography fontWeight="bold" fontSize={14} mb={2} sx={{ color: '#2b3b53' }}>
        Additional Links
      </Typography>
      <Box display="flex" gap={2}>
        <Button
          component="a"
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          sx={{
            borderRadius: 4,
            borderColor: 'rgba(0, 0, 0, 0.06)',
            color: '#2b3b53',
            fontSize: 14,
            fontWeight: 'bold',
            textTransform: 'none',
            px: 3,
          }}
        >
          Telegram channel
        </Button>
        <Button
          component="a"
          href="https://yourblog.com"
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          sx={{
            borderRadius: 4,
            borderColor: 'rgba(0, 0, 0, 0.06)',
            color: '#2b3b53',
            fontSize: 14,
            fontWeight: 'bold',
            textTransform: 'none',
            px: 3,
            
          }}
        >
          Blog
        </Button>
      </Box>
      <Box
  sx={{
    mt: 3,
    mx: 2,
    p: 2,
    borderRadius: 3,
    textAlign: 'center',
  }}
>
  <Typography textAlign="center" mt={4} fontSize={14} sx={{ color: '#aaa', fontStyle: 'italic' }}> “Should you require any assistance, please do not hesitate to contact us.” ·</Typography>
         
</Box>
    </Box>
  </Box>
)}
      </Box>
    </Box>
  );
};

export default ServicesPage;