// src/pages/ServicesPage.tsx
//
// 🆕 Round 28b10 (founder 2026-05-03) — full Clean v3 refresh:
//   • Phone shell + tabs use cool-neutral palette (#FAFBFC → #F1F3F5)
//   • White cards with slate borders, soft slate shadows
//   • All emoji replaced with MUI icons (founder no-emoji rule)
//   • ABOUT US rewritten — concise pillars + service area + contacts
//   • HOW TO BOOK reorganised — keeps HowItWorks visual, FAQ in
//     cool-palette accordions, "Contact" + "Additional Links" tightened
//   • Service tiles: brand red accents kept; tile shadow → cool slate

import React from "react";
import {
  Box,
  Typography,
  Button,
  IconButton,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import VerifiedRoundedIcon from "@mui/icons-material/VerifiedRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import LocalHotelRoundedIcon from "@mui/icons-material/LocalHotelRounded";
import SupportAgentRoundedIcon from "@mui/icons-material/SupportAgentRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import LanguageRoundedIcon from "@mui/icons-material/LanguageRounded";
import { FaTelegramPlane, FaWhatsapp } from "react-icons/fa";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import services from "../data/services";
import { startingPrice, formatTHB } from "../utils/servicePricing";
import HowItWorks from "@/components/home/HowItWorks";
// 🆕 Round 28b11 — live booking counts so the "Used by N customers"
//   badge on each service tile reflects actual orders, not the
//   hardcoded `svc.count` value in the data file.
import { useServiceUsageStats } from "@/hooks/useServiceUsageStats";

const SERIF = '"Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// ─── About pillars — factual only, no fake metrics ────────────────────
const ABOUT_PILLARS: Array<{
  Icon: typeof VerifiedRoundedIcon;
  title: string;
  body: string;
  tone: { bg: string; fg: string };
}> = [
  {
    Icon: VerifiedRoundedIcon,
    title: "Verified therapists",
    body:
      "Every profile is screened by our team before publishing  photos, ID, and license checks.",
    tone: { bg: "rgba(22, 163, 74, 0.10)", fg: "#16a34a" },
  },
  {
    Icon: VisibilityOffRoundedIcon,
    title: "Discreet & private",
    body:
      "Plain-card payments, encrypted booking flow, no signage on arrival. Your stay stays yours.",
    tone: { bg: "rgba(15, 23, 42, 0.08)", fg: "#475569" },
  },
  {
    Icon: LocalHotelRoundedIcon,
    title: "Hotel & condo outcall",
    body:
      "Therapist comes to you anywhere in central Bangkok  Sukhumvit, Silom, Asok, Thonglor, Sathorn.",
    tone: { bg: "rgba(254, 9, 68, 0.08)", fg: "#FE0944" },
  },
  {
    Icon: SupportAgentRoundedIcon,
    title: "24/7 admin support",
    body:
      "Real humans on WhatsApp, LINE, and Telegram around the clock pre, during, and after the session.",
    tone: { bg: "rgba(14, 165, 233, 0.10)", fg: "#0284C7" },
  },
];

// ─── FAQ rebuilt — cool palette ───────────────────────────────────────
type FaqItem = { q: string; a: React.ReactNode };

const FAQ_BASICS: FaqItem[] = [
  {
    q: "How do I book a therapist?",
    a: "Pick a therapist from the home page, choose your service, fill in the booking form, and tap confirm. The order is sent to our admin who confirms within minutes via WhatsApp or Telegram.",
  },
  {
    q: "What's on a therapist's profile?",
    a: "Verified photos, service specialties, today's availability, real reviews from completed bookings, and structured personal info (height, body type, languages, working hours).",
  },
  {
    q: "How can I contact a therapist directly?",
    a: "All contact runs through our admin that's how we keep both sides safe. Once your booking is confirmed, you'll be connected for arrival coordination.",
  },
  {
    q: "Are the profile photos real?",
    a: "Yes. We run a verification check on every photo before publishing and re-verify periodically. Reviews from past customers add a second layer of confidence read them on each profile.",
  },
  {
    q: "How fast can a therapist reach me?",
    a: "In central Bangkok, typical arrival is 30–60 minutes. Outside the centre or in peak hours, expect 60–90 minutes. The booking screen shows a live arrival window before you confirm.",
  },
];

const FAQ_PAYMENT: FaqItem[] = [
  {
    q: "How much does a session cost?",
    a: "Each therapist sets their own rates — see their profile for the exact starting price. The total includes service fee + a transparent travel fee (GrabCar-aligned, ฿45 base + tiered per-km, return at half price).",
  },
  {
    q: "What payment methods are supported?",
    a: (
      <Box>
        <Typography
          sx={{ fontWeight: 700, fontSize: 13, color: "#3c1e14", mb: 0.5 }}
        >
          Online (recommended):
        </Typography>
        <Box component="ul" sx={{ pl: 2.5, my: 0, color: "rgba(60,30,20,0.78)" }}>
          <li>PromptPay QR (default)</li>
          <li>Bank transfer (account details after confirm)</li>
        </Box>
        <Typography
          sx={{
            fontWeight: 700,
            fontSize: 13,
            color: "#3c1e14",
            mt: 1.5,
            mb: 0.5,
          }}
        >
          On arrival:
        </Typography>
        <Box component="ul" sx={{ pl: 2.5, my: 0, color: "rgba(60,30,20,0.78)" }}>
          <li>Cash (THB)</li>
          <li>Therapist&apos;s PromptPay QR</li>
          <li>Bank transfer with slip confirmation</li>
        </Box>
      </Box>
    ),
  },
  {
    q: "Why is a deposit sometimes needed?",
    a: "For long-distance bookings (over ~25 km from central Sukhumvit) we ask for a small deposit so the therapist's travel commitment is covered. You'll be informed in advance — never a surprise.",
  },
  {
    q: "Cancellation & reschedule policy",
    a: "Free cancellation or reschedule up to 30 minutes before booking time. After that — or once the therapist is en route — a 50% service-fee charge applies to cover their committed time and travel.",
  },
];

const ServicesPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab =
    searchParams.get("tab") === "how"
      ? "how"
      : searchParams.get("tab") === "about"
        ? "about"
        : "services";
  const [section, setSection] = React.useState<"services" | "about" | "how">(
    initialTab
  );

  // 🆕 Round 28b12 — public chip uses `servedCount` (sessions
  //   actually delivered), not `bookedCount`. Pending/future bookings
  //   are excluded so the chip is trustworthy social proof.
  const { servedById: servedCounts } = useServiceUsageStats();

  const handleSelectService = (id: string) => {
    void navigate(`/services/${encodeURIComponent(id)}`);
  };
  const handleBookService = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    void navigate(`/therapists?service=${encodeURIComponent(id)}`);
  };

  return (
    <Box
      sx={{
        // Round 28b10 — Clean v3 cool-neutral phone shell
        maxWidth: 430,
        margin: "0 auto",
        minHeight: "100vh",
        background: "linear-gradient(180deg, #FAFBFC 0%, #F1F3F5 100%)",
        borderRadius: "28px",
        overflow: "hidden",
        boxShadow: "0 20px 60px rgba(15, 23, 42, 0.08)",
        position: "relative",
        pb: 10,
        fontFamily: SANS,
      }}
    >
      <Box sx={{ width: "100%", pb: 12 }}>
        {/* ─── Header — logo + verified + tagline ─── */}
        <Box sx={{ height: 50 }} />

        <Box sx={{ px: 2, mt: 1, display: "flex", alignItems: "flex-end" }}>
          <Box
            component="img"
            src="/images/icon/sunred-logo.png"
            alt="SunRed"
            sx={{
              width: 130,
              height: 130,
              borderRadius: "50%",
              border: "3px solid #FFFFFF",
              boxShadow:
                "0 1px 2px rgba(15, 23, 42, 0.04), 0 8px 24px rgba(15, 23, 42, 0.10)",
              objectFit: "cover",
              background: "#fff",
            }}
          />
          <Box sx={{ ml: "auto", display: "flex", gap: 0.25 }}>
            <IconButton component="a" href="https://lin.ee/uqvdwWt" target="_blank">
              <Box
                component="img"
                src="/images/profli/line.png"
                alt="Line"
                sx={{ width: 28, height: 28 }}
              />
            </IconButton>
            <IconButton component="a" href="/wechat-scan" target="_blank">
              <Box
                component="img"
                src="/images/profli/wechat_2626283.png"
                alt="WeChat"
                sx={{ width: 28, height: 28 }}
              />
            </IconButton>
            <IconButton component="a" href="https://t.me/SunRedvip_bkk" target="_blank">
              <Box
                component="img"
                src="/images/profli/telegram.png"
                alt="Telegram"
                sx={{ width: 28, height: 28 }}
              />
            </IconButton>
            <IconButton component="a" href="https://wa.me/66634350987" target="_blank">
              <Box
                component="img"
                src="/images/profli/whatsapp.png"
                alt="WhatsApp"
                sx={{ width: 28, height: 28 }}
              />
            </IconButton>
            <IconButton component="a" href="https://x.com/SunredBangkok" target="_blank">
              <Box
                component="img"
                src="/images/profli/twitter.png"
                alt="X (Twitter)"
                sx={{ width: 28, height: 28 }}
              />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ px: 2, mt: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontSize: 22,
                fontWeight: 600,
                color: "#3c1e14",
                letterSpacing: "-0.01em",
              }}
            >
              SunRed.vip
            </Typography>
            <VerifiedRoundedIcon
              sx={{
                fontSize: 20,
                color: "#1d9bf0",
                filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.10))",
              }}
            />
          </Box>
          <Typography
            sx={{
              fontSize: 13,
              color: "rgba(60,30,20,0.55)",
              mt: 0.25,
            }}
          >
            @sunred.vip
          </Typography>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: 16,
              fontWeight: 600,
              color: "#3c1e14",
              mt: 1.5,
              letterSpacing: "-0.01em",
            }}
          >
            Pretty Outcall Massage in Bangkok
          </Typography>
          <Typography
            sx={{
              fontSize: 13.5,
              lineHeight: 1.6,
              color: "rgba(60,30,20,0.72)",
              mt: 0.5,
            }}
          >
            Verified therapists. Discreet. Reliable. Every profile screened
            before publishing. Unmatched 24/7 support.
          </Typography>
        </Box>

        {/* ─── Tabs — cool palette ─── */}
        <Box
          sx={{
            mt: 2.5,
            mx: 2,
            p: 0.5,
            borderRadius: 999,
            background: "#FFFFFF",
            border: "1px solid rgba(15, 23, 42, 0.06)",
            boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
          }}
        >
          <Tabs
            value={section}
            onChange={(_, value) => setSection(value)}
            textColor="inherit"
            variant="fullWidth"
            sx={{
              minHeight: 38,
              "& .MuiTab-root": {
                color: "rgba(60, 30, 20, 0.55)",
                fontWeight: 600,
                fontSize: 11.5,
                letterSpacing: "0.06em",
                minHeight: 38,
                textTransform: "uppercase",
                fontFamily: SANS,
              },
              "& .Mui-selected": {
                color: "#fff",
                background: "linear-gradient(135deg, #FE0944, #FE7A52)",
                borderRadius: 999,
                fontWeight: 700,
                boxShadow: "0 4px 12px rgba(254, 9, 68, 0.25)",
              },
              "& .MuiTabs-indicator": { display: "none" },
            }}
          >
            <Tab label="Services" value="services" />
            <Tab label="About us" value="about" />
            <Tab label="How to book" value="how" />
          </Tabs>
        </Box>

        {/* ─── Services tab ─── */}
        {section === "services" && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              mt: 3,
              px: 2,
            }}
          >
            {services.map((svc, index) => (
              <motion.div
                key={svc.name}
                initial={{ opacity: 0, y: 16, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  delay: index * 0.06,
                  duration: 0.4,
                  ease: "easeOut",
                }}
                whileHover={{ scale: 1.01 }}
              >
                <Box
                  onClick={() => handleSelectService(svc.id)}
                  sx={{
                    position: "relative",
                    height: 240,
                    borderRadius: "18px",
                    overflow: "hidden",
                    backgroundImage: `url(${svc.image})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    cursor: "pointer",
                    border: "1px solid rgba(15, 23, 42, 0.06)",
                    boxShadow:
                      "0 1px 2px rgba(15, 23, 42, 0.04), 0 10px 28px rgba(15, 23, 42, 0.10)",
                    "&::before": {
                      content: '""',
                      position: "absolute",
                      inset: 0,
                      background:
                        "linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.72) 100%)",
                      pointerEvents: "none",
                    },
                  }}
                >
                  <Box
                    sx={{
                      position: "absolute",
                      top: 12,
                      left: 12,
                      px: 1.2,
                      py: 0.4,
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: "#fff",
                      background:
                        "linear-gradient(135deg, #FE0944 0%, #FE7A52 100%)",
                      borderRadius: 1.2,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      boxShadow: "0 4px 10px rgba(254, 9, 68, 0.35)",
                      zIndex: 1,
                    }}
                  >
                    {svc.badge}
                  </Box>

                  <Box sx={{ position: "relative", px: 2, py: 2, zIndex: 1 }}>
                    <Typography
                      sx={{
                        fontFamily: SERIF,
                        fontSize: 20,
                        fontWeight: 700,
                        color: "#fff",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {svc.name}
                    </Typography>
                    <Typography
                      sx={{
                        fontSize: 12,
                        color: "rgba(255,255,255,0.85)",
                        mt: 0.25,
                        mb: 1.25,
                        lineHeight: 1.4,
                      }}
                    >
                      {svc.desc}
                    </Typography>

                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <Box
                        component="span"
                        sx={{
                          fontFamily: SERIF,
                          fontSize: 18,
                          fontWeight: 700,
                          color: "#fff",
                          letterSpacing: "-0.02em",
                        }}
                      >
                        From {formatTHB(startingPrice(svc))}
                      </Box>
                      <Box
                        component="span"
                        sx={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.7)",
                        }}
                      >
                        · {svc.duration} min
                      </Box>
                      {/* 🆕 Round 28b12 — chip shows `servedCount` only:
                          sessions ACTUALLY DELIVERED (status completed
                          or done). Future / draft / cancelled bookings
                          never inflate the figure → real social proof. */}
                      {(() => {
                        const servedCount = servedCounts.get(svc.id) ?? 0;
                        if (servedCount <= 0) return null;
                        return (
                          <Box
                            component="span"
                            sx={{
                              ml: "auto",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 0.5,
                              fontSize: 10.5,
                              fontWeight: 600,
                              color: "rgba(255,255,255,0.9)",
                              background: "rgba(0,0,0,0.35)",
                              px: 0.8,
                              py: 0.3,
                              borderRadius: 1,
                              backdropFilter: "blur(6px)",
                            }}
                          >
                            <StarRoundedIcon
                              sx={{ fontSize: 12, color: "#FBBF24" }}
                            />
                            Used by {servedCount.toLocaleString()}{" "}
                            {servedCount === 1 ? "customer" : "customers"}
                          </Box>
                        );
                      })()}
                    </Box>

                    <Button
                      variant="contained"
                      onClick={(e) => handleBookService(svc.id, e)}
                      endIcon={<ArrowForwardRoundedIcon />}
                      sx={{
                        mt: 1.25,
                        height: 38,
                        borderRadius: 999,
                        background:
                          "linear-gradient(135deg, #FE0944, #FE7A52)",
                        color: "#fff",
                        fontFamily: SANS,
                        fontSize: 13,
                        fontWeight: 700,
                        textTransform: "none",
                        boxShadow: "0 6px 18px rgba(254, 9, 68, 0.35)",
                        px: 2.5,
                        "&:hover": {
                          background:
                            "linear-gradient(135deg, #E50840, #E56A47)",
                        },
                      }}
                    >
                      Book now
                    </Button>
                  </Box>
                </Box>
              </motion.div>
            ))}
            <Typography
              sx={{
                textAlign: "center",
                mt: 3,
                fontSize: 12.5,
                color: "rgba(60,30,20,0.55)",
              }}
            >
              Can&apos;t find what you&apos;re looking for? Chat with us for more options.
            </Typography>
          </Box>
        )}

        {/* ─── About Us tab ─── */}
        {section === "about" && (
          <Box sx={{ px: 2, mt: 3, display: "flex", flexDirection: "column", gap: 2 }}>
            {/* Hero card — single sentence promise */}
            <Box
              sx={{
                p: 2.5,
                borderRadius: "18px",
                background: "#FFFFFF",
                border: "1px solid rgba(15, 23, 42, 0.06)",
                boxShadow:
                  "0 1px 2px rgba(15, 23, 42, 0.04), 0 4px 14px rgba(15, 23, 42, 0.05)",
              }}
            >
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: 18,
                  fontWeight: 600,
                  color: "#3c1e14",
                  letterSpacing: "-0.01em",
                  mb: 1,
                }}
              >
                Bangkok&apos;s most discreet outcall massage,{" "}
                <Box
                  component="em"
                  sx={{ color: "#FE0944", fontStyle: "italic" }}
                >
                  delivered to you.
                </Box>
              </Typography>
              <Typography
                sx={{
                  fontSize: 13.5,
                  lineHeight: 1.65,
                  color: "rgba(60,30,20,0.78)",
                }}
              >
                SunRed connects you with vetted independent therapists across
                central Bangkok. Every profile is verified, every booking is
                handled by a real human, and every detail from arrival to
                payment stays between you and us.
              </Typography>
            </Box>

            {/* 4-pillar grid */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 1.25,
              }}
            >
              {ABOUT_PILLARS.map(({ Icon, title, body, tone }) => (
                <Box
                  key={title}
                  sx={{
                    p: 1.5,
                    borderRadius: "14px",
                    background: "#FFFFFF",
                    border: "1px solid rgba(15, 23, 42, 0.06)",
                    boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.75,
                  }}
                >
                  <Box
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: "10px",
                      background: tone.bg,
                      color: tone.fg,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      "& svg": { fontSize: 18 },
                    }}
                  >
                    <Icon />
                  </Box>
                  <Typography
                    sx={{
                      fontFamily: SERIF,
                      fontSize: 13.5,
                      fontWeight: 600,
                      color: "#3c1e14",
                      lineHeight: 1.2,
                    }}
                  >
                    {title}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 11.5,
                      lineHeight: 1.45,
                      color: "rgba(60,30,20,0.7)",
                    }}
                  >
                    {body}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* Service area card */}
            <Box
              sx={{
                p: 2,
                borderRadius: "16px",
                background: "#FFFFFF",
                border: "1px solid rgba(15, 23, 42, 0.06)",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <LocationOnRoundedIcon sx={{ color: "#FE0944", fontSize: 18 }} />
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: "#3c1e14",
                  }}
                >
                  Service area
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  color: "rgba(60,30,20,0.72)",
                }}
              >
                Sukhumvit · Silom · Asok · Thonglor · Sathorn · Phrom Phong ·
                Ari · Chidlom · Ploenchit. Outside the central zone? Message
                admin we&apos;ll quote travel.
              </Typography>
            </Box>

            {/* Languages card */}
            <Box
              sx={{
                p: 2,
                borderRadius: "16px",
                background: "#FFFFFF",
                border: "1px solid rgba(15, 23, 42, 0.06)",
                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <LanguageRoundedIcon sx={{ color: "#0284C7", fontSize: 18 }} />
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: "#3c1e14",
                  }}
                >
                  Languages supported
                </Typography>
              </Box>
              <Typography
                sx={{
                  fontSize: 12.5,
                  lineHeight: 1.55,
                  color: "rgba(60,30,20,0.72)",
                }}
              >
                English · ไทย · 中文 · 日本語 · 한국어 — admin replies in your
                language; many therapists speak two or more.
              </Typography>
            </Box>
          </Box>
        )}

        {/* ─── How to book tab ─── */}
        {section === "how" && (
          <Box sx={{ mt: 3 }}>
            {/* 3-step visual */}
            <HowItWorks />

            <Box sx={{ px: 2, mt: 2 }}>
              <Typography
                sx={{
                  fontFamily: SERIF,
                  fontSize: 17,
                  fontWeight: 600,
                  color: "#3c1e14",
                  mb: 1,
                  letterSpacing: "-0.01em",
                }}
              >
                Frequently asked
              </Typography>

              {/* Basics */}
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "rgba(60,30,20,0.55)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  mt: 1,
                  mb: 1,
                }}
              >
                Basics
              </Typography>
              {FAQ_BASICS.map((item) => (
                <FaqRow key={item.q} item={item} />
              ))}

              {/* Payment */}
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: 11,
                  fontWeight: 700,
                  color: "rgba(60,30,20,0.55)",
                  letterSpacing: "0.12em",
                  textTransform: "uppercase",
                  mt: 3,
                  mb: 1,
                }}
              >
                Payment & policy
              </Typography>
              {FAQ_PAYMENT.map((item) => (
                <FaqRow key={item.q} item={item} />
              ))}

              {/* Contact */}
              <Box
                sx={{
                  mt: 3,
                  p: 2,
                  borderRadius: "16px",
                  background: "#FFFFFF",
                  border: "1px solid rgba(15, 23, 42, 0.06)",
                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: SERIF,
                    fontSize: 14.5,
                    fontWeight: 600,
                    color: "#3c1e14",
                    mb: 1.25,
                  }}
                >
                  Contact us
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    mb: 1,
                  }}
                >
                  <FaWhatsapp size={18} style={{ color: "#25D366" }} />
                  <Typography
                    sx={{ fontSize: 13, color: "rgba(60,30,20,0.85)" }}
                  >
                    WhatsApp:{" "}
                    <Box
                      component="a"
                      href="https://wa.me/66634350987"
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        color: "#FE0944",
                        fontWeight: 700,
                        textDecoration: "none",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      +66 63 435 0987
                    </Box>
                  </Typography>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <FaTelegramPlane size={18} style={{ color: "#229ED9" }} />
                  <Typography
                    sx={{ fontSize: 13, color: "rgba(60,30,20,0.85)" }}
                  >
                    Telegram:{" "}
                    <Box
                      component="a"
                      href="https://t.me/SunRedvip_bkk"
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        color: "#FE0944",
                        fontWeight: 700,
                        textDecoration: "none",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      @SunRedvip_bkk
                    </Box>
                  </Typography>
                </Box>
              </Box>

              {/* Additional links */}
              <Box sx={{ mt: 2, display: "flex", gap: 1.25 }}>
                <Button
                  component="a"
                  href="https://t.me/SunRedvip_bkk"
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                  sx={{
                    flex: 1,
                    borderRadius: 999,
                    borderColor: "rgba(15, 23, 42, 0.12)",
                    color: "#3c1e14",
                    fontSize: 13,
                    fontWeight: 600,
                    textTransform: "none",
                    py: 1,
                    "&:hover": {
                      borderColor: "rgba(15, 23, 42, 0.24)",
                      background: "rgba(15, 23, 42, 0.04)",
                    },
                  }}
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
                    flex: 1,
                    borderRadius: 999,
                    borderColor: "rgba(15, 23, 42, 0.12)",
                    color: "#3c1e14",
                    fontSize: 13,
                    fontWeight: 600,
                    textTransform: "none",
                    py: 1,
                    "&:hover": {
                      borderColor: "rgba(15, 23, 42, 0.24)",
                      background: "rgba(15, 23, 42, 0.04)",
                    },
                  }}
                >
                  Telegram channel
                </Button>
              </Box>
              <Typography
                sx={{
                  textAlign: "center",
                  mt: 2.5,
                  fontSize: 12,
                  color: "rgba(60,30,20,0.55)",
                  lineHeight: 1.5,
                }}
              >
                Need help with anything else? Reach out anytime — admin is on
                24/7.
              </Typography>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ─── Reusable FAQ row — Clean v3 cool palette ──────────────────────────
const FaqRow: React.FC<{ item: FaqItem }> = ({ item }) => (
  <Accordion
    disableGutters
    elevation={0}
    sx={{
      mb: 1,
      borderRadius: "12px !important",
      background: "#FFFFFF",
      border: "1px solid rgba(15, 23, 42, 0.06)",
      boxShadow: "0 1px 2px rgba(15, 23, 42, 0.03)",
      overflow: "hidden",
      "&::before": { display: "none" },
    }}
  >
    <AccordionSummary
      expandIcon={
        <ExpandMoreRoundedIcon sx={{ color: "rgba(60,30,20,0.55)" }} />
      }
      sx={{
        minHeight: 48,
        "& .MuiAccordionSummary-content": { my: 1 },
      }}
    >
      <Typography
        sx={{
          fontFamily: SANS,
          fontWeight: 600,
          fontSize: 13.5,
          color: "#3c1e14",
          letterSpacing: "-0.005em",
        }}
      >
        {item.q}
      </Typography>
    </AccordionSummary>
    <AccordionDetails sx={{ pt: 0 }}>
      {typeof item.a === "string" ? (
        item.a
          .split("\n\n")
          .map((para, i) => (
            <Typography
              key={i}
              sx={{
                fontFamily: SANS,
                fontSize: 13,
                lineHeight: 1.65,
                color: "rgba(60,30,20,0.78)",
                mb: 1,
                "&:last-child": { mb: 0 },
              }}
            >
              {para}
            </Typography>
          ))
      ) : (
        <Box sx={{ fontFamily: SANS, fontSize: 13, color: "rgba(60,30,20,0.78)" }}>
          {item.a}
        </Box>
      )}
    </AccordionDetails>
  </Accordion>
);

export default ServicesPage;
