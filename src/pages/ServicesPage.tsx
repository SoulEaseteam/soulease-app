import React from 'react';
import {
  Box,
  Typography,
  Avatar,
  Button,
  IconButton,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import { FaTelegramPlane, FaWhatsapp } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import services from '../data/services';
// 🆕 Round 19 (founder 2026-05-01): use real prices/durations from
//    services.ts via servicePricing helpers — old hardcoded svc.price
//    string was untyped + brittle.
import { startingPrice, formatTHB } from '../utils/servicePricing';
// 🆕 Round 20: HowItWorks moved out of HomePage (founder: 'ลูกค้าไม่
//    อ่านเกิน 8 บรรทัด'). Lives here at the top of the HOW TO BOOK tab
//    as a quick 3-step visual before the detailed FAQ. Curious users
//    opt-in by tapping the tab — never blocks the booking funnel.
import HowItWorks from '@/components/home/HowItWorks';


const ServicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [section, setSection] = React.useState<'services' | 'about' | 'how'>('services');

  const handleSelectService = (id: string) => {
    void navigate(`/services/${encodeURIComponent(id)}`);
  };

  // 🆕 Round 19: 'Book now' on each service tile → direct to /therapists
  //    pre-filtered by service. Saves a click vs going to /services/:id detail.
  const handleBookService = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    void navigate(`/therapists?service=${encodeURIComponent(id)}`);
  };

  return (
    <Box
      sx={{
        // 🆕 Round 19: phone-shell wrapper (founder 2026-05-01: 'หน้าเว็บ
        //    ขนาดเดียวกันทั้งเว็บ') — match BookingFlowPage / HomePage rhythm.
        maxWidth: 430,
        margin: '0 auto',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #FFF8F0 0%, #FCEBDC 100%)',
        borderRadius: '28px',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(126, 30, 46, 0.15)',
        position: 'relative',
        pb: 10,
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 430, pb: 20 }}>
        <Box sx={{ width: '100%', height: 50, display: 'flex', alignItems: 'center', 
          justifyContent: 'center' }}>
          
        </Box>

      <Box sx={{ px: 2, mt: 2, display: 'flex', alignItems: 'flex-end' }}>
  <Avatar
    src="/images/icon/sunred-logo.png"
    sx={{
      width: 150,
      height: 150,
      border: '4px solid rgba(255,255,255,0.5)' }}
  />
  <Box sx={{ ml: 'auto', display: 'flex', gap: -1 }}>
    <IconButton component="a" href="https://lin.ee/uqvdwWt" target="_blank">
      <Box
        component="img"
        src="/images/profli/line.png"
        alt="Line"
        sx={{ width: 30, height: 30 }}
      />
    </IconButton>

    <IconButton component="a" href="/wechat-scan" target="_blank">
      <Box
        component="img"
        src="/images/profli/wechat_2626283.png"
        alt="WeChat"
        sx={{ width: 31, height: 31 }}
      />
    </IconButton>

    <IconButton component="a" href="https://t.me/SunRedvip_bkk" target="_blank">
      <Box
        component="img"
        src="/images/profli/telegram.png"
        alt="Telegram"
        sx={{ width: 30, height: 30 }}
      />
    </IconButton>

    <IconButton component="a" href="https://wa.me/66634350987" target="_blank">
      <Box
        component="img"
        src="/images/profli/whatsapp.png"
        alt="WhatsApp"
        sx={{ width: 30, height: 30 }}
      />
    </IconButton>

     <IconButton component="a" href="https://x.com/SunredBangkok" target="_blank">
      <Box
        component="img"
        src="/images/profli/twitter.png"
        alt="X (Twitter)"
        sx={{ width: 30, height: 30 }}
      />
    </IconButton>


  </Box>
</Box>

        <Box sx={{ px: 2, mt: 4 }}>
          <Typography variant="h6" fontWeight="bold" sx={{  }}>SunRed.vip <CheckCircleIcon fontSize="small" sx={{ color: '#1DA1F2', ml: 0 }} /></Typography>
          <Typography variant="body2" sx={{ color: '#567C8D', mt: 0.5 }}>@sunred.vip</Typography>
         <Typography variant="h6" fontWeight="bold"fontSize={16} sx={{ mt: 1, color: '#3a3420' }}>
           Pretty Outcall Massage in Bangkok.</Typography>
            <Typography fontSize={14} variant="body1" sx={{ textIndent: '1.5em', mt: 0.5, color: '#3a3420' }}>
            Verified therapists. Discreet. Reliable.<br />
            Every profile is screened before publishing.<br />
            Unmatched support, 24/7. Your relaxation begins here.
          </Typography>
        </Box>

        {/* 🆕 Round 19: brand-red tabs (was purple/pink). Match
            ServiceDurationSheet & detail page accent palette. */}
        <Box
          sx={{
            mt: 2,
            mx: 2,
            px: 1,
            py: 0.5,
            borderRadius: 999,
            background:
              'linear-gradient(135deg, rgba(254, 9, 68, 0.85) 0%, rgba(254, 122, 82, 0.85) 100%)',
            boxShadow: '0 8px 22px rgba(254, 9, 68, 0.18)',
          }}
        >
          <Tabs
            value={section}
            onChange={(_, value) => setSection(value)}
            textColor="inherit"
            indicatorColor="primary"
            variant="fullWidth"
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                color: 'rgba(255, 255, 255, 0.75)',
                fontWeight: 600,
                fontSize: 12,
                letterSpacing: '0.05em',
                minHeight: 40,
              },
              '& .Mui-selected': {
                color: '#fff',
                background: 'rgba(255, 255, 255, 0.18)',
                borderRadius: 999,
                fontWeight: 700,
              },
              '& .MuiTabs-indicator': {
                background: '#fff',
                height: 2,
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
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 3, px: 2 }}>
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
                    height: 240,
                    borderRadius: 3,
                    overflow: 'hidden',
                    backgroundImage: `url(${svc.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    cursor: 'pointer',
                    boxShadow: '0 10px 30px rgba(175, 59, 59, 0.12)',
                    // Dark overlay for legible text on any photo
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.7) 100%)',
                      pointerEvents: 'none',
                    },
                  }}
                  onClick={() => handleSelectService(svc.id)}
                >
                  {/* Badge — brand red (was purple gradient) */}
                  <Box
                    sx={{
                      position: 'absolute',
                      top: 14,
                      left: 14,
                      px: 1.3,
                      py: 0.5,
                      fontSize: 11,
                      fontWeight: 'bold',
                      color: '#fff',
                      background:
                        'linear-gradient(135deg, #FE0944 0%, #FE7A52 100%)',
                      borderRadius: 1.5,
                      textTransform: 'uppercase',
                      letterSpacing: '0.06em',
                      boxShadow: '0 4px 10px rgba(254, 9, 68, 0.35)',
                      zIndex: 1,
                    }}
                  >
                    {svc.badge}
                  </Box>

                  {/* Body — uses servicePricing.startingPrice() to show real
                      starting price (e.g. 60-min) + duration tier list */}
                  <Box sx={{ position: 'relative', px: 2, py: 2, zIndex: 1 }}>
                    <Typography
                      fontSize={20}
                      fontWeight={700}
                      fontFamily="Fraunces, Georgia, serif"
                      sx={{ color: '#fff', letterSpacing: '-0.01em' }}
                    >
                      {svc.name}
                    </Typography>
                    <Typography
                      fontSize={12.5}
                      sx={{
                        color: 'rgba(255, 255, 255, 0.85)',
                        mt: 0.25,
                        mb: 1.25,
                        lineHeight: 1.4,
                      }}
                    >
                      {svc.desc}
                    </Typography>

                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        flexWrap: 'wrap',
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          fontFamily: 'Fraunces, Georgia, serif',
                          fontSize: 19,
                          fontWeight: 700,
                          color: '#fff',
                          letterSpacing: '-0.02em',
                        }}
                      >
                        From {formatTHB(startingPrice(svc))}
                      </Box>
                      <Box
                        component="span"
                        sx={{
                          fontSize: 11,
                          color: 'rgba(255, 255, 255, 0.7)',
                        }}
                      >
                        · {svc.duration} min
                      </Box>
                      {svc.count > 0 && (
                        <Box
                          component="span"
                          sx={{
                            ml: 'auto',
                            fontSize: 10.5,
                            fontWeight: 600,
                            color: 'rgba(255, 255, 255, 0.85)',
                            background: 'rgba(0, 0, 0, 0.3)',
                            px: 0.8,
                            py: 0.25,
                            borderRadius: 1,
                            backdropFilter: 'blur(6px)',
                          }}
                        >
                          ⭐ {svc.count.toLocaleString()} used
                        </Box>
                      )}
                    </Box>

                    {/* 🆕 Round 19: 'Book now' fast-path — direct to
                        /therapists?service=… without pause on detail page */}
                    <Button
                      variant="contained"
                      onClick={(e) => handleBookService(svc.id, e)}
                      endIcon={<ArrowForwardRoundedIcon />}
                      sx={{
                        mt: 1.25,
                        height: 38,
                        borderRadius: 999,
                        background:
                          'linear-gradient(135deg, #FE0944, #FE7A52)',
                        color: '#fff',
                        fontFamily: 'Inter, system-ui, sans-serif',
                        fontSize: 13,
                        fontWeight: 700,
                        textTransform: 'none',
                        boxShadow: '0 6px 18px rgba(254, 9, 68, 0.35)',
                        px: 2.5,
                        '&:hover': {
                          background:
                            'linear-gradient(135deg, #E50840, #E56A47)',
                        },
                      }}
                    >
                      Book now
                    </Button>
                  </Box>
                </Box>
              </motion.div>
            ))}
            <Typography textAlign="center" mt={4} fontSize={13} sx={{ color: '#aaa' }}> 
              “Can’t find what you’re looking for? Chat with us for more options!” </Typography>
          </Box>
        )}

        {section === 'about' && (
          <Box sx={{ px: 4, py: 6 }}>
          <Typography fontWeight="bold" textAlign="center" mb={4} sx={{ color: '#3a3420', fontSize: 20 }}>
          • ABOUT US •
        </Typography>

        <Typography fontSize={14} lineHeight={2} mb={4} sx={{ textAlign: 'justify', textIndent: '1em', color: '#3a3420' }}>
          Welcome to SunRed’s Massage Service Experience.  
          Step into a world where relaxation meets indulgence and every touch is designed to awaken your senses. 
          Discover a curated list of independent therapists, each specializing in diverse massage techniques tailored to your unique preferences.
        </Typography>

<Typography fontSize={14} lineHeight={2} mb={2} sx={{ textAlign: 'justify', textIndent: '1em', color: '#3a3420' }}>
          Whether you’re seeking deep relaxation or an elevated experience with a sensual finale, 
          SunRed is here to create the perfect journey. Every therapist’s profile is verified 
          and thoughtfully crafted to help you find the ideal match.
        </Typography>
       </Box>
            )}
            {section === 'how' && (
              <Box sx={{ py: 4 }}>
              {/* 🆕 Round 20: 3-step visual relocated from HomePage to here.
                  Quick scan above the detailed FAQ — keeps HomePage lean
                  while preserving the explainer for curious users. */}
              <HowItWorks />

              <Box sx={{ px: 4, pt: 2 }}>
              <Typography fontWeight="bold" textAlign="center" mb={4} sx={{ color: '#3a3420', fontSize: 20 }}>
              • Frequently Asked Questions •
            </Typography>

          
<Typography fontWeight="bold" fontSize={20} mt={5} mb={3} sx={{ color: '#3a3420'  }}>
  BASICS
</Typography>

{[
  {
    q: 'How do I book a therapist?',
    a: `Simply choose your preferred therapist from the Home page, select your desired service, fill in the booking form, and press confirm. The details will be sent directly to our admin for confirmation.` },
  {
    q: "What details are shown on a therapist's profile?",
    a: `Each profile includes verified photos, service specialties, availability, reviews, and personal features/preferences.` },
  {
    q: 'How can I contact a therapist?',
    a: `All communication is handled through our admin to ensure privacy and safety. You will be connected once your booking is confirmed.` },
  {
  q: 'Are the profile photos real?',
  a: `Ensuring the authenticity of each therapist’s profile on SunRed is one of our top priorities. We have implemented clear measures to enhance transparency, including a dedicated photo verification process. Therapists are encouraged to update their verification regularly to maintain credibility.

While we strive to ensure honest and accurate representation, like any platform, we cannot guarantee absolute accuracy. For added assurance, we recommend checking client reviews, which often provide valuable insights into each therapist’s service quality.` },
{
  q: 'How fast can a therapist reach me?',
  a: `Depending on your location and therapist availability, we can usually arrange for someone to reach you within 30–60 minutes in central Bangkok areas.\n\nIn peak hours or for locations outside the city center, estimated arrival time may vary between 60–90 minutes.\n\nYou’ll be able to view the therapist’s location and estimated travel time before confirming your booking.`
},
].map((item) => (
  <Accordion
    key={item.q}
    disableGutters
    elevation={0}
    sx={{
      mb: 1.5,
      
      border: '#567C8D',
      background: 'linear-gradient(135deg, rgba(255, 214, 232, 0.85) 0%, rgba(229, 208, 255, 0.85) 100%)',
      borderRadius: 3,
      '&::before': { display: 'none' } }}
  >
<AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#7E1F4D' }} />}>
  <Typography fontWeight="bold" fontSize={14} sx={{ color: '#7E1F4D' }}>
    {item.q}
  </Typography>
</AccordionSummary>

    <AccordionDetails>
      {item.a.split('\n\n').map((para, i) => (
        <Typography
          key={`${item.q}-p-${i}`}
        fontSize={14}
        lineHeight={1.8}
        color="#7E1F4D"
        paragraph
        sx={{
          textIndent: '1.5em' }}
        >
          {para}
        </Typography>
      ))}
    </AccordionDetails>
  </Accordion>
))}

<Typography fontWeight="bold" fontSize={20} mt={5} mb={3} sx={{ color: '#3a3420'  }}>
  PAYMENT
</Typography>
{[
  {
    q: 'How much does it cost to book a therapist?',
    a: 'At SunRed, we understand the importance of pricing transparency.\n\nEach therapist on our platform is an independent professional who sets their own rates. For the most accurate and up-to-date pricing, we recommend visiting the individual therapist’s profile.\n\nThe cost is typically based on the duration of the booking, the chosen service, and the travel distance — empowering you to make informed decisions tailored to your unique needs.' },
  {
    q: 'What forms of payment do you accept?',
    a: (
      <>
       <strong style={{ color: "#ffff", fontWeight: "bold"  }}>Online Booking:</strong>
      <ul style={{ marginTop: 4, marginBottom: 8, color: "#ffff" }}>
        <li> QRcode Scan (PromptPay, PayNow, WeChat Pay)</li>
        <li>Bank Transfer (Account details will be provided after booking)</li>
      </ul>

       <strong style={{ color: "#ffff", fontWeight: "bold"  }}>In-Person at Condo/Hotel:</strong>
      <ul style={{ marginTop: 4, marginBottom: 8, color: "#ffff" }}>
        <li>Cash payment after the service</li>
        <li>QR code scanning directly from the therapist’s device</li>
        <li>Bank transfer with confirmation via payment slip</li>
      </ul>
      </>
    ) },
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
      mb: 2,
      
      background: 'linear-gradient(135deg, rgba(255, 214, 232, 0.85) 0%, rgba(229, 208, 255, 0.85) 100%)',
      
      border: '1px solid #ccc',
      borderRadius: 3,
            '&::before': { display: 'none' } }}
  >
<AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#7E1F4D' }} />}>
  <Typography fontWeight="bold" fontSize={14} sx={{ color: '#7E1F4D' }}>
    {item.q}
  </Typography>
</AccordionSummary>

   <AccordionDetails>
  {typeof item.a === 'string' ? (
    item.a.split('\n\n').map((para, i) => (
      <Typography
        key={`${item.q}-fa-${i}`}
        fontSize={14}
        lineHeight={1.7}
        color="#7E1F4D" // ✅ สีเทาอ่อนแบบเดียวกับพารากราฟด้านบน
        paragraph
        sx={{
         textIndent: '1.5em' }}
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
        borderRadius: 5,
        boxShadow: '0 6px 18px rgba(59, 57, 57, 0.6)' }}
    >
      <Typography fontWeight="bold" fontSize={16} mb={2} sx={{ color: '#3a3420'  }}>
        Contact Information
      </Typography>
      <Box display="flex" alignItems="center" gap={1.5} mb={1}>
        <FaWhatsapp size={20} style={{ color: '#25D366' }} />
        <Typography fontSize={16} sx={{ color: '#3a3420' }}>
                WhatsApp: <b>+66 63 435 0987</b>
        </Typography>
      </Box>
      <Box display="flex" alignItems="center" gap={1.5}>
        <FaTelegramPlane size={20} style={{ color: '#229ED9' }} />
        <Typography fontSize={16} sx={{ color: '#3a3420' }}>
          Telegram:{' '}
          <Box
            component="a"
            href="https://t.me/SunRed_BKK"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              color: '#1a73e8',
                            fontWeight: 'bold',
              textDecoration: 'none',
              '&:hover': {
                color: '#F8EFE5',
                textDecoration: 'underline' } }}
          >
            @SunRedvip_bkk
          </Box>
        </Typography>
      </Box>
    </Box>
 {/* 🔗 ลิงก์อื่นๆ แยกออกมา */}
 <Box mt={3}>
      <Typography fontWeight="bold" fontSize={16} mb={2} sx={{ color: '#3a3420' }}>
        Additional Links
      </Typography>
      <Box display="flex" gap={2}>
        <Button
          component="a"
          href="https://t.me/SunRedvip_bkk"
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          sx={{
                        borderRadius: 4,
            borderColor: '#3a3420',
            color: '#3a3420',
            fontSize: 14,
            fontWeight: 'bold',
            textTransform: 'none',
            px: 3 }}
        >
          SunRed Support 
        </Button>
        <Button
          component="a"
          href="https://t.me/SunRed_BKK"
          target="_blank"
          rel="noopener noreferrer"
          variant="outlined"
          sx={{
                        borderRadius: 4,
            borderColor: '#3a3420',
            color: '#3a3420',
            fontSize: 14,
            fontWeight: 'bold',
            textTransform: 'none',
            px: 3 }}
        >
          Telegram channel
        </Button>
      </Box>
      <Box
  sx={{
    mt: 3,
    mx: 2,
    p: 2,
    borderRadius: 3,
    
    textAlign: 'center' }}
>
  <Typography textAlign="center" mt={2} fontSize={14} sx={{ color: '#3a3420aa' }}> 
    Should you require any assistance, please do not hesitate to contact us. </Typography>

</Box>
    </Box>
  </Box>
  </Box>
)}
      </Box>
    </Box>
  );
};

export default ServicesPage;