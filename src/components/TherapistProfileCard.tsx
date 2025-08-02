import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Paper,
  Dialog,
  IconButton,
} from "@mui/material";
import RoomIcon from "@mui/icons-material/Room";
import CloseIcon from "@mui/icons-material/Close";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface Therapist {
  id: string;
  name: string;
  image: string;
  rating: number;
  reviews: number;
  distance?: number;
  specialty: string;
  experience: string;
  available: "available" | "bookable" | "resting";
  statusOverride?: "available" | "bookable" | "resting";
  totalBookings?: number;
  badge?: "VIP" | "Hot" | "New";
}

const TherapistProfileCard: React.FC<{ therapist: Therapist }> = ({
  therapist,
}) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  // ✅ คำนวณสถานะ (ใช้ statusOverride ถ้ามี)
  const status =
    therapist.statusOverride && ["available", "bookable", "resting"].includes(therapist.statusOverride)
      ? therapist.statusOverride
      : therapist.available;

  const resolvedImage = therapist.image.startsWith("/")
    ? therapist.image
    : therapist.image.startsWith("http")
    ? therapist.image
    : `/images/${therapist.image.replace(/^\/??images\//, "")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{ width: "100%" }}
    >
      <Box sx={{ px: 0, pb: 0 }}>
        <Paper
          sx={{
            width: "85%",
            maxWidth: 260,
            borderRadius: 6,
            backgroundColor: "rgba(246, 242, 242, 0.65)",
            backdropFilter: "blur(4px)",
            p: 1.7,
            boxShadow: "0 6px 16px rgba(0, 0, 0, 0.08)",
            textAlign: "center",
            position: "relative",
          }}
        >
          {/* ✅ รูปโปรไฟล์ */}
          <Box sx={{ position: "relative" }}>
            <Box
              component="img"
              src={resolvedImage}
              alt={therapist.name}
              sx={{
                width: "100%",
                height: 260,
                objectFit: "contain",
                objectPosition: "center center",
                borderRadius: 4,
                cursor: "pointer",
                background: "#f5f5f5",
                mt: -1,
              }}
              onClick={() => setOpen(true)}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "/images/placeholder.jpg";
              }}
            />

            {therapist.badge && (
             <Box
                sx={{
                  position: "absolute",
                  top:-21,           // ปรับให้อยู่ในกรอบ
                  right: -19,         // ขยับให้เข้าในกรอบ
                  width: 70,        // ลดขนาดให้พอดีกับการ์ด
                  height: "auto",   // ให้ปรับสูงตามอัตราส่วนภาพ
                  zIndex: 2,
                }}
                component="img"
                src={
                  therapist.badge === "VIP"
                    ? "/badges/star.gif"
                    : therapist.badge === "Hot"
                    ? "/badges/hot.gif"
                    : "/badges/new (4).gif"
                }
                alt={`${therapist.badge} badge`}
              />
            )}
          </Box>

          {/* ✅ ชื่อ + ปุ่ม PHOTO */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="center"
            spacing={1}
            mt={-1}
          >
            <Typography fontWeight="bold" color="#555" fontSize={20}>
              {therapist.name}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              sx={{
                fontSize: 9,
                borderRadius: 99,
                px: 1,
                textTransform: "none",
                color: "#555",
                borderColor: "#bbb",
                height: 19,
              }}
              onClick={() =>
                navigate(`/therapists/${therapist.id}?section=profile#profile`)
              }
            >
              PHOTO
            </Button>
          </Stack>

          {/* ✅ Rating */}
          <Typography fontSize={14} color="#666">
            <img
              src="public/images/icon/star.png"
              alt="star"
              
              style={{ width: 16, height: 16, marginRight: 6, }}
               
            />
            {therapist.rating?.toFixed(1) || "0.0"} |{" "}
            {therapist.totalBookings ?? "N/A"} served
          </Typography>

          {/* ✅ รีวิว + ปุ่ม Book Now */}
          <Stack
            direction="row"
            spacing={1}
            justifyContent="center"
            alignItems="center"
            mt={1}
          >
            <img
              src="/images/icon/chat-dots (2).png"
              alt="review"
              style={{ width: 20, height: 20, cursor: "pointer" }}
              onClick={() => navigate(`/review/all/${therapist.id}`)}
            />
            <Typography color="#555" fontSize={14}>
              {therapist.reviews || 0}
            </Typography>

            <Button
              variant="contained"
              size="small"
              disabled={status === "resting"}
              sx={{
                fontSize: 13,
                borderRadius: 99,
                textTransform: "none",
                px: 3,
                minWidth: 100,
                backgroundColor:
                  status === "resting"
                    ? "#9b9484"
                    : status === "bookable"
                    ? "#ef6c00"
                    : "#f36c60",
                color: "#fff",
                "&.Mui-disabled": {
                  backgroundColor: "#b0bec5",
                  color: "#fff",
                  opacity: 1,
                },
              }}
              onClick={() =>
                navigate(`/therapists/${therapist.id}?section=services`)
              }
            >
              {status === "bookable" || status === "available"
                ? "Book Now"
                : "Resting"}
            </Button>
          </Stack>

          {/* ✅ ระยะทาง */}
          {typeof therapist.distance === "number" &&
            !isNaN(therapist.distance) && (
              <Typography
                fontSize={12}
                color="#666"
                display="flex"
                alignItems="center"
                justifyContent="center"
                mt={1}
              >
                <RoomIcon sx={{ fontSize: 14, mr: 0.5 }} />
                {(therapist.distance / 1000).toFixed(1)} km
              </Typography>
            )}
        </Paper>

        {/* ✅ Dialog Preview */}
        <Dialog
          open={open}
          onClose={() => setOpen(false)}
          maxWidth="xs"
          PaperProps={{
            sx: {
              backgroundColor: "transparent",
              boxShadow: "none",
              borderRadius: 0,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            },
          }}
        >
          <Box sx={{ position: "relative", p: 2 }}>
            <IconButton
              onClick={() => setOpen(false)}
              sx={{
                position: "absolute",
                top: 4,
                right: 4,
                background: "rgba(0,0,0,0.5)",
                color: "#fff",
                zIndex: 2,
                "&:hover": { background: "rgba(0,0,0,0.7)" },
              }}
            >
              <CloseIcon />
            </IconButton>

            <Box
              component="img"
              src={resolvedImage}
              alt="Preview"
              sx={{
                width: "100%",
                maxWidth: 400,
                maxHeight: "75vh",
                height: "auto",
                objectFit: "cover",
                borderRadius: 4,
                boxShadow: 3,
              }}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src =
                  "/images/placeholder.jpg";
              }}
            />
          </Box>
        </Dialog>
      </Box>
    </motion.div>
  );
};

export default TherapistProfileCard;