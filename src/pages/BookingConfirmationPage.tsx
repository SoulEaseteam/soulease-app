// src/pages/BookingConfirmationPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Stack,
  Divider,
  Button,
  IconButton,
  Collapse,
  Tooltip,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import RoomIcon from "@mui/icons-material/Room";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import EventIcon from "@mui/icons-material/Event";
import { useLocation, useNavigate } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import dayjs from "dayjs";

/* ================= CONTACT ADMIN ================= */
const chatButtons = [
  { title: "LINE", href: "https://lin.ee/uqvdwWt", src: "/images/profli/line.png" },
  { title: "WeChat", href: "/wechat-scan", src: "/images/profli/wechat_2626283.png" },
  { title: "Telegram", href: "https://t.me/SunRedvip_bkk", src: "/images/profli/telegram.png" },
  { title: "WhatsApp", href: "https://wa.me/66634350987", src: "/images/profli/whatsapp.png" },
  { title: "X", href: "https://x.com/SunRedvip_bkk", src: "/images/profli/twitter.png" },
];

const BookingConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ รองรับ 2 ทาง: state + querystring (กัน refresh/state หาย)
  const queryParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const bookingId =
    (location.state as any)?.bookingId ||
    queryParams.get("bookingId") ||
    "";

  const [booking, setBooking] = useState<any>(null);
  const [therapistImage, setTherapistImage] = useState<string | null>(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  /* ================= FETCH BOOKING + THERAPIST IMAGE ================= */
  useEffect(() => {
    const load = async () => {
      try {
        if (!bookingId) return;

        const snap = await getDoc(doc(db, "bookings", bookingId));
        if (!snap.exists()) return;

        const data = snap.data();
        setBooking(data);

        // 1) ถ้ามี therapistImage ใน booking ก็ใช้เลย
        if (data?.therapistImage && String(data.therapistImage).trim() !== "") {
          setTherapistImage(String(data.therapistImage));
          return;
        }

        const tid = data?.therapistId;
        if (!tid) return;

        // 2) ลองดึง therapists/{tid} (กรณี tid = docId)
        const tSnap = await getDoc(doc(db, "therapists", tid));
        if (tSnap.exists()) {
          const img = tSnap.data()?.image;
          if (img && String(img).trim() !== "") {
            setTherapistImage(String(img));
            return;
          }
        }

        // 3) fallback: tid อาจเป็น custom id → where("id"=="tid")
        const qT = query(collection(db, "therapists"), where("id", "==", tid));
        const tRes = await getDocs(qT);
        if (!tRes.empty) {
          const img = tRes.docs[0].data()?.image;
          if (img && String(img).trim() !== "") setTherapistImage(String(img));
        }
      } catch (err) {
        console.error("BookingConfirmation load error:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [bookingId]);

  const displayAddress = useMemo(() => {
    const raw =
      booking?.locationName ||
      booking?.address ||
      booking?.formattedAddress ||
      "-";
    return String(raw).replace(/,?\s*Thailand$/i, "").trim();
  }, [booking]);

  const safeDateText = useMemo(() => {
    const d = booking?.date;
    if (!d) return "-";
    if (typeof d === "string") return dayjs(d).isValid() ? dayjs(d).format("DD MMM YYYY") : d;
    if (d?.toDate) return dayjs(d.toDate()).format("DD MMM YYYY");
    return dayjs(d).isValid() ? dayjs(d).format("DD MMM YYYY") : "-";
  }, [booking]);

  const copyBookingId = async () => {
    if (!bookingId) return;
    try {
      await navigator.clipboard.writeText(String(bookingId));
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      const el = document.createElement("textarea");
      el.value = String(bookingId);
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  const therapistImgSrc =
    therapistImage && therapistImage.trim() !== ""
      ? therapistImage
      : "/images/default-therapist.png";

  if (loading) {
    return (
      <Box sx={{ mt: 10, textAlign: "center" }}>
        <Typography>Loading confirmation…</Typography>
      </Box>
    );
  }

  if (!booking || !bookingId) {
    return (
      <Box sx={{ mt: 10, textAlign: "center", px: 2 }}>
        <Typography fontWeight={800} fontSize={18}>
          No booking found
        </Typography>
        <Typography sx={{ mt: 0.8, color: "rgba(0,0,0,0.55)" }}>
          Please go back to home and try again.
        </Typography>
        <Button
          sx={{ mt: 2, borderRadius: 3, fontWeight: 800 }}
          variant="outlined"
          onClick={() => navigate("/")}
        >
          Go to Home
        </Button>
      </Box>
    );
  }

  const {
    therapistName,
    serviceName,
    duration,
    servicePrice = 0,
    taxiFee = 0,
    totalPrice = 0,
    time,
    phone,
    note,
  } = booking;

  return (
    <Box sx={{ maxWidth: 430, mx: "auto", px: 2, pb: 12 }}>
      {/* ================= CHECK ICON (SPRING) ================= */}
      <Box
        sx={{
          mt: 4,
          mb: 1,
          mx: "auto",
          width: 100,
          height: 100,
          borderRadius: "50%",
          bgcolor: "#4CAF50",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          animation:
            "springIn 0.72s cubic-bezier(0.34,1.56,0.64,1), pulse 1.6s ease 0.9s infinite",
          boxShadow: "0 14px 34px rgba(76,175,80,0.45)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Box
          component="img"
          src="/images/icon/Complete.gif"
          alt="Confirmed"
          sx={{
            width: 56,
            height: 56,
            objectFit: "contain",
            transform: "translateY(1px)",
          }}
        />
      </Box>

      <Typography sx={{ textAlign: "center", fontSize: 22, fontWeight: 800, mt: 2 }}>
        Booking Confirmed
      </Typography>

      <Typography
        sx={{
          textAlign: "center",
          fontSize: 14,
          color: "rgba(0,0,0,0.55)",
          mt: 0.6,
        }}
      >
        Please contact admin with your order number.
      </Typography>

      {/* ================= SUMMARY CARD ================= */}
      <Paper
        sx={{
          mt: 3,
          p: 2.5,
          borderRadius: 5,
          background: "rgba(255,255,255,0.62)",
          backdropFilter: "blur(18px)",
          boxShadow: "0 18px 48px rgba(0,0,0,0.12)",
          border: "1px solid rgba(255,255,255,0.55)",
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <Box
            component="img"
            src={therapistImgSrc}
            alt="Therapist"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/images/default-therapist.png";
            }}
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              objectFit: "cover",
              backgroundColor: "#f3f3f3",
              display: "block",
              boxShadow: "0 10px 26px rgba(0,0,0,0.16)",
              border: "1px solid rgba(255,255,255,0.9)",
            }}
          />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontWeight={800} noWrap>
              {therapistName || "-"}
            </Typography>
            <Typography fontSize={13} color="text.secondary" noWrap>
              {serviceName || "-"}
            </Typography>
          </Box>
        </Stack>

        {/* ================= ORDER NUMBER ================= */}
        <Stack spacing={1.2} sx={{ mt: 2.5 }}>
          <Typography sx={{ fontSize: 13, color: "rgba(0,0,0,0.55)" }}>
            Order Number
          </Typography>

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 800,
                wordBreak: "break-word",
                pr: 1,
                lineHeight: 1.25,
              }}
            >
              {bookingId}
            </Typography>

            <Tooltip title={copied ? "Copied ✓" : "Copy"}>
              <IconButton
                onClick={copyBookingId}
                disableRipple
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: 3,
                  bgcolor: "rgba(255,255,255,0.75)",
                  border: "1px solid rgba(0,0,0,0.10)",
                }}
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>

          {copied && (
            <Typography sx={{ fontSize: 12, color: "#16a34a" }}>
              Copied ✓
            </Typography>
          )}
        </Stack>

        <Divider sx={{ my: 2 }} />

        <InfoRow icon={<EventIcon fontSize="small" />}>{safeDateText}</InfoRow>
        <InfoRow icon={<AccessTimeIcon fontSize="small" />}>
          {time || "-"} {duration ? `• ${duration} min` : ""}
        </InfoRow>
        <InfoRow icon={<RoomIcon fontSize="small" />}>{displayAddress}</InfoRow>

        <Divider sx={{ my: 2 }} />

        <Button
          fullWidth
          onClick={() => setOpenDetail((v) => !v)}
          endIcon={openDetail ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          sx={{
            fontWeight: 800,
            textTransform: "none",
            borderRadius: 3,
            color: "#111827",
          }}
        >
          {openDetail ? "Hide details" : "See all details"}
        </Button>

        <Collapse in={openDetail}>
          <Divider sx={{ my: 2 }} />
          <DetailRow label="Service Price">฿{Number(servicePrice || 0).toLocaleString()}</DetailRow>
          <DetailRow label="Taxi Fee">฿{Number(taxiFee || 0).toLocaleString()}</DetailRow>
          <DetailRow label="Total" bold>฿{Number(totalPrice || 0).toLocaleString()}</DetailRow>
          <Divider sx={{ my: 1 }} />
          <DetailRow label="Phone">{phone || "-"}</DetailRow>
          <DetailRow label="Note">{note || "-"}</DetailRow>
        </Collapse>
      </Paper>

      {/* ================= CONTACT ADMIN ================= */}
      <Typography sx={{ textAlign: "center", fontWeight: 800, mt: 5, mb: 3 }}>
        Contact Admin
      </Typography>

      <Stack direction="row" justifyContent="space-between">
        {chatButtons.map((btn) => {
          const isExternal = btn.href.startsWith("http");
          return (
            <Box
              key={btn.title}
              component={isExternal ? "a" : "button"}
              href={isExternal ? btn.href : undefined}
              onClick={!isExternal ? () => navigate(btn.href) : undefined}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              sx={{
                textAlign: "center",
                flex: 1,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                textDecoration: "none",
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  mx: "auto",
                  borderRadius: "50%",
                  bgcolor: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 10px 26px rgba(0,0,0,0.2)",
                  transition: "0.18s ease",
                  "&:active": { transform: "scale(0.98)" },
                }}
              >
                <Box component="img" src={btn.src} alt={btn.title} sx={{ width: 26, height: 26 }} />
              </Box>
              <Typography fontSize={11} fontWeight={700} mt={1}>
                {btn.title}
              </Typography>
            </Box>
          );
        })}
      </Stack>

      {/* ================= CTA ================= */}
      <Button
        fullWidth
        variant="outlined"
        sx={{
          mt: 4,
          borderRadius: 4,
          fontWeight: 800,
          borderColor: "rgba(0,0,0,0.22)",
          background: "rgba(255,255,255,0.55)",
          backdropFilter: "blur(10px)",
        }}
        onClick={() => navigate("/")}
      >
        Go to Home
      </Button>

      {/* ================= ANIMATION ================= */}
      <style>{`
        @keyframes springIn {
          0% { transform: scale(0.4); opacity: 0; }
          60% { transform: scale(1.18); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(76,175,80,0.35); }
          70% { box-shadow: 0 0 0 16px rgba(76,175,80,0); }
          100% { box-shadow: 0 0 0 0 rgba(76,175,80,0); }
        }
      `}</style>
    </Box>
  );
};

/* ================= HELPERS ================= */
const InfoRow = ({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) => (
  <Stack direction="row" spacing={1} alignItems="center">
    {icon}
    <Typography fontSize={14}>{children}</Typography>
  </Stack>
);

const DetailRow = ({
  label,
  children,
  bold,
}: {
  label: string;
  children: React.ReactNode;
  bold?: boolean;
}) => (
  <Stack direction="row" justifyContent="space-between" py={0.4}>
    <Typography fontSize={13} color="text.secondary">
      {label}
    </Typography>
    <Typography fontSize={13} fontWeight={bold ? 800 : 600}>
      {children}
    </Typography>
  </Stack>
);

export default BookingConfirmationPage;