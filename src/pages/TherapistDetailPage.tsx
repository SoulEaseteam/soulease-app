// src/pages/TherapistDetailPage.tsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Avatar,
  Tabs,
  Tab,
  Button,
  Divider,
  ImageList,
  ImageListItem,
  Dialog,
  IconButton,
} from "@mui/material";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

import therapists from "../data/therapists";
import services from "../data/services";
import BottomNav from "../components/layouts/BottomNavGlass";
import { useDocumentMeta, langToLocale } from "@/utils/useDocumentMeta";
import { enhanceImage } from "@/utils/cloudinary";

import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import { Share as ShareIcon, Close as CloseIcon } from "@mui/icons-material";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import {
  FaUser,
  FaVenusMars,
  FaFlag,
  FaRulerVertical,
  FaWeight,
  FaPassport,
  FaHotjar,
  FaAirFreshener,
  FaChessQueen,
  FaMagic,
  FaSmoking,
  FaSyringe,
} from "react-icons/fa";

// Firestore
import { db } from "../lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

type SectionType = "services" | "features" | "profile";

function formatAMPM(timeStr: string) {
  if (!timeStr) return "";
  const [h, m] = timeStr.split(":").map(Number);
  const hour = h % 12 || 12;
  const ampm = h >= 12 ? "PM" : "AM";
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

const renderFeature = (
  icon: React.ReactNode,
  label: string,
  value?: string
) => {
  if (!value) return null;
  return (
    <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
      <Box sx={{ width: 28, mr: 1 }}>{icon}</Box>
      <Typography
        sx={{
          fontWeight: 600,
          width: 110,
          fontFamily: "Trebuchet MS, sans-serif",
        }}
      >
        {label}:
      </Typography>
      <Typography
        sx={{
          color: "#333",
          fontSize: 14,
          fontFamily: "Trebuchet MS, sans-serif",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};

const handleShare = async () => {
  const url = window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title: "Therapist Profile", url });
    } else {
      await navigator.clipboard.writeText(url);
      toast.info("Link copied to clipboard");
    }
  } catch (error) {
    console.error("Failed to share:", error);
  }
};

const TherapistDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n } = useTranslation();

  const queryParams = new URLSearchParams(location.search);
  const defaultSection =
    (queryParams.get("section") as SectionType) || "services";

  const therapist = therapists.find((t) => t.id === id);

  const [section, setSection] = useState<SectionType>(defaultSection);
  const [openImage, setOpenImage] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [reviewCount, setReviewCount] = useState(0);

  // 🌍 Multi-language bio (fallback chain: current lang → en → empty)
  const currentLang = (i18n.language || "en").split("-")[0].toLowerCase() as
    | "en"
    | "th"
    | "zh"
    | "ja"
    | "ko";
  const bio =
    therapist?.bios?.[currentLang] ?? therapist?.bios?.en ?? "";

  // 🪶 Per-page SEO meta + Person/AggregateRating schema (huge SEO win — each
  // therapist becomes its own indexed page with rich snippets in search results)
  const therapistImage = therapist
    ? enhanceImage(therapist.image, { variant: "hero" })
    : "https://sunred.vip/images/icon/sunred-logo.png";
  const therapistUrl = therapist
    ? `https://sunred.vip/therapist/${therapist.id}`
    : "https://sunred.vip/";
  const metaTitle = therapist
    ? `${therapist.name} • Bangkok Outcall Massage Therapist • SUNRED`
    : "Therapist • SUNRED Bangkok";
  const metaDesc = therapist
    ? bio ||
      `Book ${therapist.name} — verified outcall massage therapist in Bangkok. ${
        therapist.features?.language ?? "Multi-language"
      } service. Live availability and trusted reviews on SUNRED.`
    : "Verified massage therapist in Bangkok • SUNRED outcall booking";

  useDocumentMeta({
    title: metaTitle,
    description: metaDesc,
    image: therapistImage,
    url: therapistUrl,
    locale: langToLocale(i18n.language),
    type: "profile",
    jsonLd: therapist
      ? {
          "@context": "https://schema.org",
          "@type": "Person",
          "@id": `${therapistUrl}#therapist`,
          name: therapist.name,
          image: therapistImage,
          url: therapistUrl,
          jobTitle: "Licensed Massage Therapist",
          worksFor: { "@id": "https://sunred.vip/#business" },
          knowsLanguage: (therapist.features?.language ?? "")
            .split(/[,/]/)
            .map((s) => s.trim())
            .filter(Boolean),
          description: metaDesc,
          ...(therapist.rating && therapist.reviews && therapist.reviews > 0
            ? {
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: therapist.rating.toFixed(1),
                  reviewCount: String(therapist.reviews),
                  bestRating: "5",
                  worstRating: "1",
                },
              }
            : {}),
        }
      : undefined,
  });

  useEffect(() => {
    if (!id) return;
    const q = query(
      collection(db, "bookings"),
      where("therapistId", "==", id),
      where("reviewText", "!=", "")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      setReviewCount(snapshot.size);
    });

    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!therapist) return;
    try {
      const favs = localStorage.getItem("favoriteTherapists");
      if (favs) {
        const favArray = JSON.parse(favs) as string[];
        if (Array.isArray(favArray)) {
          setIsFavorite(favArray.includes(therapist.id));
        }
      }
    } catch (e) {
      console.warn("Cannot parse favoriteTherapists from localStorage", e);
      setIsFavorite(false);
    }
  }, [therapist]);

  useEffect(() => {
    if (location.hash === "#features") {
      setSection("features");
      setTimeout(() => {
        const el = document.getElementById("features");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 200);
    }
  }, [location.hash]);

  const toggleFavorite = () => {
    if (!therapist) return;
    try {
      const favs = localStorage.getItem("favoriteTherapists");
      let favArray: string[] = [];

      if (favs) {
        const parsed = JSON.parse(favs);
        if (Array.isArray(parsed)) favArray = parsed;
      }

      if (isFavorite) {
        favArray = favArray.filter((x) => x !== therapist.id);
      } else {
        favArray.push(therapist.id);
      }

      localStorage.setItem("favoriteTherapists", JSON.stringify(favArray));
      setIsFavorite((v) => !v);
    } catch (e) {
      console.warn("Cannot update favoriteTherapists", e);
    }
  };

  const avatarSrc = therapist?.image
    ? therapist.image.startsWith("http") || therapist.image.startsWith("/")
      ? therapist.image
      : `/images/${therapist.image}`
    : "/images/default-avatar.png";

  const galleryImages =
    therapist?.gallery && therapist.gallery.length > 0
      ? therapist.gallery.map((img: string) =>
          img.startsWith("http") || img.startsWith("/")
            ? img
            : `/images/yuri/${img}`
        )
      : Array.from({ length: 6 }).map(
          (_, i) => `/images/yuri/gallery${i + 1}.jpg`
        );

  if (!therapist) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6" color="error">
          Therapist not found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        background: "rgba(255, 255, 255, 0.6)",
        color: "#3a3420",
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          width: "100%",
          maxWidth: 430,
          pb: 10,
          fontFamily: "Trebuchet MS, sans-serif",
        }}
      >
        <Box
          sx={{
            width: "100%",
            height: 180,
            background: "linear-gradient(to bottom, #FE0944, #FEAE96)",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant="h6"
            textAlign="center"
            sx={{
              mt: 4,
              mb: 4,
              px: 2,
              color: "#ffffffff",
              fontWeight: 400,
              letterSpacing: 3,
              fontSize: 20,
            }}
          >
            FEATURED PROFILES
          </Typography>

          <Button
            onClick={handleShare}
            sx={{
              position: "absolute",
              top: 16,
              right: 16,
              minWidth: 0,
              width: 36,
              height: 36,
              borderRadius: "50%",
              backgroundColor: "#fff",
              color: "#333",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              "&:hover": { backgroundColor: "#eee" },
            }}
          >
            <ShareIcon />
          </Button>
        </Box>

        <Box
          sx={{ px: 2, mt: -6, position: "relative", display: "inline-block" }}
        >
          <Avatar
            src={avatarSrc}
            sx={{
              width: 120,
              height: 120,
              border: "4px solid rgba(255,255,255,0.4)",
            }}
            imgProps={{ style: { objectFit: "cover", objectPosition: "center top" } }}
          />
          <Button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite();
            }}
            sx={{
              position: "absolute",
              top: 85,
              right: 13,
              minWidth: 0,
              width: 38,
              height: 38,
              borderRadius: "50%",
              backgroundColor: isFavorite ? "#ff6b81" : "rgba(255,255,255,0.8)",
              color: isFavorite ? "#fff" : "#888",
              boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
              zIndex: 10,
              "&:hover": { backgroundColor: isFavorite ? "#ff4757" : "#eee" },
            }}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            {isFavorite ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </Button>
        </Box>

        <Box sx={{ px: 2, mt: 1 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: "bold",
              fontSize: 30,
              color: "#3a3420",
              letterSpacing: 1,
              mt: 1,
            }}
          >
            {therapist.name}
            <Box
              component="span"
              sx={{
                display: "inline-flex",
                alignItems: "center",
                fontSize: 16,
                fontWeight: 500,
                color: "#3a3420",
                ml: 1,
                cursor: "pointer",
                "&:hover": { textDecoration: "underline" },
              }}
              onClick={() => navigate(`/review/all/${therapist.id}`)}
            >
              <img
                src="/images/icon/star.png"
                alt="star"
                style={{ width: 20, height: 20, marginRight: 6 }}
              />
              {therapist.rating} | {reviewCount} reviews
            </Box>
          </Typography>

          <Box sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ color: "#3a3420" }}>
              Working Hours: {formatAMPM(therapist.startTime)} -{" "}
              {formatAMPM(therapist.endTime)}
            </Typography>

            <Typography
              variant="body2"
              sx={{ color: "#3a3420", display: "flex", alignItems: "center", mt: 0.5 }}
            >
              <FaHotjar color="#FE0944" style={{ marginRight: 4 }} />
              {therapist.employmentType || therapist.features.employmentType || "N/A"}
            </Typography>
          </Box>

          {/* 🌍 Multi-language AI bio (only renders if generator script has run) */}
          {bio && (
            <Box
              sx={{
                mt: 2,
                p: 1.6,
                borderRadius: 3,
                background: "rgba(255, 255, 255, 0.55)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.55)",
              }}
            >
              <Typography
                component="p"
                lang={currentLang}
                sx={{
                  fontSize: 13.5,
                  color: "#3a3420",
                  lineHeight: 1.6,
                  fontStyle: "italic",
                  letterSpacing: 0.1,
                }}
              >
                {bio}
              </Typography>
            </Box>
          )}
        </Box>

        <Box
          sx={{
            mt: 2,
            px: 2,
            py: 1,
            borderRadius: 1,
            background: "linear-gradient(to bottom, #FE0944, #FEAE96)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 4px 20px rgba(255, 147, 147, 0.08)",
          }}
        >
          <Tabs
            value={section}
            onChange={(_, value) => setSection(value)}
            textColor="inherit"
            indicatorColor="primary"
            variant="fullWidth"
            sx={{
              "& .MuiTab-root": {
                color: "#ffffff",
                fontWeight: "bold",
                fontStyle: "Trebuchet MS, sans-serif",
              },
              "& .Mui-selected": {
                color: "#ffffff",
                background: "rgba(255,255,255,0.1)",
                borderRadius: 4,
              },
              "& .MuiTabs-indicator": {
                backgroundColor: "#ffffff",
                height: 3,
                borderRadius: 3,
              },
            }}
          >
            <Tab label="Services" value="services" />
            <Tab label="Features" value="features" />
            <Tab label="Profile" value="profile" />
          </Tabs>
        </Box>

        {section === "services" && (
          <ServicesSection therapist={therapist} navigate={navigate} />
        )}

        {section === "features" && therapist.features && (
          <Box
            id="features"
            sx={{
              mt: 4,
              mx: 2,
              borderRadius: 2,
              background: "rgba(255, 255, 255, 0.5)",
              backdropFilter: "blur(14px)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              color: "#3a3420",
              maxHeight: "65vh",
              overflowY: "auto",
              p: 3,
            }}
          >
            <Typography color="#3a3420" fontWeight="bold" fontSize={16} mb={1}>
              General Information
            </Typography>
            {renderFeature(<FaUser color="#FEAE96" />, "Age", therapist.features.age)}
            {renderFeature(<FaRulerVertical color="#FEAE96" />, "Height", therapist.features.height)}
            {renderFeature(<FaWeight color="#FEAE96" />, "Weight", therapist.features.weight)}
            {renderFeature(<FaVenusMars color="#FEAE96" />, "Gender", therapist.features.gender)}
            {renderFeature(<FaFlag color="#FEAE96" />, "Ethnicity", therapist.features.ethnicity)}
            {renderFeature(<FaPassport color="#FEAE96" />, "Language", therapist.features.language)}

            <Divider sx={{ my: 2, bgcolor: "rgba(255,255,255,0.2)" }} />

            <Typography fontWeight="bold" fontSize={16} mb={1}>
              Features
            </Typography>
            {renderFeature(<FaHotjar color="#FEAE96" />, "Body Type", therapist.features.bodyType)}
            {renderFeature(<FaAirFreshener color="#FEAE96" />, "Bust Size", therapist.features.bustSize)}
            {renderFeature(<FaChessQueen color="#FEAE96" />, "Hair Color", therapist.features.hairColor)}
            {renderFeature(<FaMagic color="#FEAE96" />, "Skin Tone", therapist.features.skintone)}

            <Divider sx={{ my: 2, bgcolor: "rgba(255,255,255,0.2)" }} />

            <Typography fontWeight="bold" fontSize={16} mb={1}>
              Behavior & Health
            </Typography>
            {renderFeature(<FaSmoking color="#FEAE96" />, "Smoker", therapist.features.smoker)}
            {renderFeature(<FaSyringe color="#FEAE96" />, "Vaccinated", therapist.features.vaccinated)}
          </Box>
        )}

        {section === "profile" && (
          <GallerySection
            images={galleryImages}
            setOpenImage={setOpenImage}
            openImage={openImage}
          />
        )}

        <BottomNav />
      </Box>

      <Dialog
        open={Boolean(openImage)}
        onClose={() => setOpenImage(null)}
        maxWidth="md"
        PaperProps={{
          sx: {
            backgroundColor: "transparent",
            boxShadow: "none",
          },
        }}
        BackdropProps={{
          sx: {
            backgroundColor: "rgba(0,0,0,0.7)",
          },
        }}
      >
        <IconButton
          onClick={(e) => {
            e.stopPropagation();
            setOpenImage(null);
          }}
          sx={{
            position: "absolute",
            top: 10,
            right: 20,
            color: "#ffffffff",
            zIndex: 10,
            background: "rgba(153, 152, 152, 0.4)",
            "&:hover": { background: "rgba(0,0,0,0.6)" },
          }}
        >
          <CloseIcon />
        </IconButton>

        <Swiper
          initialSlide={galleryImages.findIndex((img) => img === openImage)}
          spaceBetween={20}
          slidesPerView={1}
          style={{ width: "100%", height: "100%" }}
        >
          {galleryImages.map((img, i) => (
            <SwiperSlide key={img}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                }}
              >
                <img
                  src={img}
                  alt={`Gallery ${i}`}
                  style={{
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    borderRadius: 8,
                  }}
                />
              </Box>
            </SwiperSlide>
          ))}
        </Swiper>
      </Dialog>
    </Box>
  );
};

const ServicesSection = ({
  therapist,
  navigate,
}: {
  therapist: typeof therapists[number];
  navigate: ReturnType<typeof useNavigate>;
}) => {
  const [canSelect, setCanSelect] = useState(true);
  const [buttonText, setButtonText] = useState("Select");

  const filteredServices = services.filter((svc) => {
    const therapistServices = therapist.services || [];
    const therapistServicesAvailable = therapist.servicesAvailable || [];

    if (
      therapistServices.length === 0 &&
      therapistServicesAvailable.length === 0
    ) {
      return true;
    }

    return (
      therapistServices.includes(svc.id) ||
      therapistServices.includes(svc.name) ||
      therapistServicesAvailable.includes(svc.id) ||
      therapistServicesAvailable.includes(svc.name)
    );
  });

  useEffect(() => {
    const now = new Date();
    const [startH, startM] = therapist.startTime.split(":").map(Number);
    const [endH, endM] = therapist.endTime.split(":").map(Number);

    const startWork = new Date();
    const endWork = new Date();
    startWork.setHours(startH, startM, 0, 0);
    endWork.setHours(endH, endM, 0, 0);

    let inWorkingTime: boolean;
    if (endWork <= startWork) {
      inWorkingTime = now >= startWork || now <= endWork;
    } else {
      inWorkingTime = now >= startWork && now <= endWork;
    }

    if (therapist.available === "resting") {
      setCanSelect(false);
      setButtonText("Resting");
    } else if (!inWorkingTime) {
      setCanSelect(false);
      setButtonText("Not Available");
    } else {
      setCanSelect(true);
      setButtonText("Select");
    }
  }, [therapist]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 4, px: 2 }}>
      {filteredServices.map((svc, index) => (
        <motion.div
          key={svc.id}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: "spring",
            stiffness: 80,
            damping: 15,
            delay: index * 0.05,
          }}
        >
        <Box
  sx={{
    fontStyle: "Trebuchet MS, sans-serif",
    textIndent: "1em",
    position: "relative",
    height: 220,
    borderRadius: 2,
    overflow: "hidden",
    backgroundImage: `url(${svc.image})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    cursor: canSelect ? "pointer" : "not-allowed",
    boxShadow: "0 10px 30px rgba(175, 59, 59, 0.08)",
  }}
  onClick={() =>
    canSelect &&
    navigate(`/services/${svc.id}?therapistId=${therapist.id}`)
  }
>
            <Box
              sx={{
                position: "absolute",
                top: 14,
                left: 14,
                px: 1.3,
                py: 0.5,
                fontSize: 12,
                fontWeight: "bold",
                color: "#fff",
                background: "linear-gradient(to bottom, #FE0944, #FEAE96)",
                borderRadius: 2,
                textTransform: "uppercase",
              }}
            >
              {svc.badge}
            </Box>

            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: index * 0.1, duration: 0.5 }}
              whileHover={{ scale: 1.015 }}
            >
              <Box
                sx={{
                  position: "absolute",
                  color: "rgb(255, 255, 255)",
                  bottom: 0,
                  width: "100%",
                  px: 2,
                  py: 2,
                  background: "rgba(255, 255, 255, 0.12)",
                  backdropFilter: "blur(1px)",
                  borderTopLeftRadius: 16,
                  borderTopRightRadius: 16,
                }}
              >
                <Typography
                  fontSize={18}
                  fontWeight="bold"
                  fontFamily="Playfair Display"
                >
                  {svc.name}
                </Typography>

                <Typography
                  fontSize={13}
                  sx={{
                    mt: 0.5,
                    color: "#ede5e5d4",
                    display: "flex",
                    overflow: "hidden",
                    WebkitBoxOrient: "vertical",
                    WebkitLineClamp: 2,
                    minHeight: 36,
                    pr: 10,
                  }}
                >
                  {svc.desc}
                </Typography>

                <Typography>
                  <Box
                    component="span"
                    sx={{ fontSize: 18, fontWeight: "bold", color: "#FF9900" }}
                  >
                    {svc.price}฿
                  </Box>
                  <Box
                    component="span"
                    sx={{ fontSize: 15, fontWeight: 400, color: "#FF9900", ml: 0.5 }}
                  >
                    • {svc.duration}⏱
                  </Box>
                </Typography>

                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (canSelect) {
                      void navigate(
                        `/booking/${therapist.id}?service=${encodeURIComponent(
                          svc.name
                        )}`
                      );
                    }
                  }}
                  disabled={!canSelect}
                  sx={{
                    position: "absolute",
                    right: 56,
                    top: "65%",
                    transform: "translateY(-50%)",
                    background: !canSelect ? "#ccc" : "#f36c60",
                    color: !canSelect ? "#888" : "#fff",
                    fontSize: 14,
                    px: 4,
                    py: 0.5,
                    borderRadius: 4,
                    fontWeight: "bold",
                    textTransform: "none",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  }}
                >
                  {buttonText}
                </Button>
              </Box>
            </motion.div>
          </Box>
        </motion.div>
      ))}

      <Typography
        textAlign="center"
        mt={1}
        fontSize={13}
        sx={{ color: "#aaa", fontStyle: "Trebuchet MS, sans-serif" }}
      >
        “Can’t find what you’re looking for? Chat with us for more options!”
      </Typography>
    </Box>
  );
};

const GallerySection = ({
  images,
  setOpenImage,
  openImage,
}: {
  images: string[];
  setOpenImage: React.Dispatch<React.SetStateAction<string | null>>;
  openImage: string | null;
}) => (
  <Box sx={{ p: 2 }}>
    <Typography fontWeight="bold" fontSize={24} mb={4}>
      Gallery
    </Typography>
    <ImageList cols={3} gap={8}>
      {images.map((img, index) => (
        <ImageListItem key={img} onClick={() => setOpenImage(img)}>
          <img src={img} alt={`Gallery ${index}`} style={{ borderRadius: 8 }} />
        </ImageListItem>
      ))}
    </ImageList>
    <Dialog open={Boolean(openImage)} onClose={() => setOpenImage(null)} maxWidth="md">
      <img src={openImage ?? undefined} alt="Preview" style={{ width: "100%" }} />
    </Dialog>
    <Typography
      textAlign="center"
      mt={3}
      fontSize={13}
      sx={{ color: "#aaa", fontStyle: "Trebuchet MS, sans-serif" }}
    >
      “More updated photos of our girls in our Telegram channel”
    </Typography>
  </Box>
);

export default TherapistDetailPage;