// src/pages/ProfilePage.tsx
//
// 🆕 Round 28c16 (founder 2026-05-06) — full redesign.
//   Dark hero + avatar ring + booking count + staggered sections.
//   Feels like Airbnb / Grab premium tier.

import React, { useEffect, useState } from "react";
import { Box, Avatar, Typography, CircularProgress } from "@mui/material";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  ClockCounterClockwise,
  Heart,
  Bell,
  Translate,
  ChatsCircle,
  SignOut,
  CaretRight,
  CheckCircle,
  Gauge,
  IdentificationCard,
} from "phosphor-react";
import { collection, query, where, getCountFromServer, doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";

import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
import { fonts } from "@/theme";
// 🆕 Round 28r71 — shared concierge endpoints (r71 rebrand phase 2).
import { CONCIERGE } from "@/config/concierge";

const SERIF = '"Playfair Display", "Fraunces", Georgia, serif';
const SANS  = '"Inter", system-ui, sans-serif';

// ── helpers ─────────────────────────────────────────────────────────
function memberSince(creationTime?: string) {
  if (!creationTime) return null;
  const d = new Date(creationTime);
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function initials(name?: string | null, email?: string | null) {
  if (name) return name.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  if (email) return email[0].toUpperCase();
  return "G";
}

// ── fade-up animation ────────────────────────────────────────────────
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, ease: "easeOut" as const, delay },
});

// ── row component ─────────────────────────────────────────────────────
interface RowProps {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onClick?: () => void;
  danger?: boolean;
}
const Row: React.FC<RowProps> = ({ icon, label, sub, onClick, danger }) => (
  <Box
    onClick={onClick}
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1.5,
      px: 2,
      py: 1.5,
      cursor: onClick ? "pointer" : "default",
      userSelect: "none",
      WebkitTapHighlightColor: "transparent",
      "&:active": onClick ? { background: "rgba(0,0,0,0.03)" } : {},
    }}
  >
    <Box
      sx={{
        width: 36,
        height: 36,
        borderRadius: "12px",
        background: danger ? "rgba(45,45,43,0.08)" : "rgba(15, 23, 42,0.06)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: danger ? "#2D2D2B" : "rgba(15, 23, 42,0.75)",
      }}
    >
      {icon}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        sx={{
          fontFamily: SANS,
          fontSize: 14,
          fontWeight: 600,
          color: danger ? "#2D2D2B" : "#2D2D2B",
          lineHeight: 1.2,
        }}
      >
        {label}
      </Typography>
      {sub && (
        <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: "rgba(15, 23, 42,0.5)", mt: 0.2 }}>
          {sub}
        </Typography>
      )}
    </Box>
    {onClick && (
      <CaretRight size={16} color={danger ? "#2D2D2B" : "rgba(15, 23, 42,0.35)"} />
    )}
  </Box>
);

// ── section card ─────────────────────────────────────────────────────
const Section: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Box
    sx={{
      mx: 2,
      borderRadius: "18px",
      background: "#fff",
      border: "1px solid rgba(15,23,42,0.06)",
      boxShadow: "0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.05)",
      overflow: "hidden",
      "& > *:not(:last-child)": {
        borderBottom: "1px solid rgba(15,23,42,0.05)",
      },
    }}
  >
    {children}
  </Box>
);

// ── main page ─────────────────────────────────────────────────────────
const ProfilePage: React.FC = () => {
  const { user, role } = useAuth();
  const navigate  = useNavigate();
  const [bookingCount, setBookingCount] = useState<number | null>(null);
  // Round 28s369 — therapist name from Firestore (Firebase Auth displayName is null for therapist accounts)
  const [therapistName, setTherapistName] = useState<string | null>(null);

  // pull total booking count for this user
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "bookings"),
      where("userId", "==", user.uid),
      where("status", "in", ["confirmed", "completed"])
    );
    getCountFromServer(q)
      .then((snap) => setBookingCount(snap.data().count))
      .catch(() => setBookingCount(null));
  }, [user]);

  // Round 28s369 — fetch therapist name from Firestore when Auth displayName is null
  useEffect(() => {
    if (!user || role !== "therapist" || user.displayName) return;
    getDoc(doc(db, "therapists", user.uid))
      .then((snap) => {
        if (snap.exists()) {
          const data = snap.data() as { name?: string; displayName?: string };
          setTherapistName(data.name || data.displayName || null);
        }
      })
      .catch(() => { /* silent fallback */ });
  }, [user, role]);

  const handleLogout = async () => {
    await signOut(auth);
    void navigate("/login");
  };

  // ── Guest state ───────────────────────────────────────────────────
  if (!user) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          background: "#1A2B2E",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 3,
          px: 3,
          pb: 10,
        }}
      >
        <motion.div {...fadeUp(0)} style={{ textAlign: "center" }}>
          <Box
            component="img"
            src="/images/icon/sunred-logo.png"
            alt="SunRed"
            width={72}
            height={72}
            loading="lazy"
            decoding="async"
            sx={{ width: 72, height: 72, borderRadius: "50%", mb: 2, opacity: 0.9 }}
          />
          <Typography sx={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
            Welcome to SunRed
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 14, color: "rgba(255,255,255,0.55)", mt: 1 }}>
            Sign in to view your bookings and profile
          </Typography>
        </motion.div>
        <motion.div {...fadeUp(0.1)} style={{ width: "100%", maxWidth: 320 }}>
          <Box
            onClick={() => navigate("/login")}
            sx={{
              background: "#8F8474",
              color: "#fff",
              borderRadius: 999,
              py: 1.6,
              textAlign: "center",
              fontFamily: SANS,
              fontSize: 15,
              fontWeight: 700,
              cursor: "pointer",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.35)",
              letterSpacing: "0.01em",
            }}
          >
            Sign in
          </Box>
        </motion.div>
      </Box>
    );
  }

  const since = memberSince(user.metadata.creationTime);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#F4F6F5",
        pb: 12,
        fontFamily: SANS,
      }}
    >
      {/* ── Hero ── */}
      <Box
        sx={{
          background: "#1A2B2E",
          pt: 7,
          pb: 5,
          px: 3,
          position: "relative",
          overflow: "hidden",
          "&::after": {
            content: '""',
            position: "absolute",
            bottom: -40,
            left: "50%",
            transform: "translateX(-50%)",
            width: 280,
            height: 80,
            borderRadius: "50%",
            background: "rgba(15, 23, 42, 0.12)",
            filter: "blur(30px)",
            pointerEvents: "none",
          },
        }}
      >
        <motion.div {...fadeUp(0)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          {/* Avatar with gradient ring */}
          <Box sx={{ position: "relative" }}>
            <Box
              sx={{
                width: 90,
                height: 90,
                borderRadius: "50%",
                background: "#8F8474",
                p: "2.5px",
                boxShadow: "0 0 0 3px rgba(15, 23, 42, 0.18), 0 8px 32px rgba(0,0,0,0.35)",
              }}
            >
              <Avatar
                src={user.photoURL || undefined}
                sx={{
                  width: "100%",
                  height: "100%",
                  // 🎨 Round 28r79 — Nordic sweep · was burgundy gradient.
                  background: "linear-gradient(135deg, #4B4B48, #2D2D2B)",
                  fontSize: 30,
                  fontWeight: 700,
                  fontFamily: SERIF,
                  color: "#fff",
                }}
              >
                {!user.photoURL && initials(therapistName || user.displayName, user.email)}
              </Avatar>
            </Box>
          </Box>

          {/* Name + verified */}
          <Box sx={{ textAlign: "center" }}>
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75 }}>
              <Typography sx={{ fontFamily: SERIF, fontSize: 22, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
                {/* Round 28s369 — therapistName fallback for null Firebase Auth displayName */}
                {therapistName || user.displayName || "Guest"}
              </Typography>
              <CheckCircle size={18} color="#2D2D2B" weight="fill" />
            </Box>
            <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "rgba(255,255,255,0.50)", mt: 0.4 }}>
              {user.email}
            </Typography>
            {since && (
              <Typography sx={{ fontFamily: SANS, fontSize: 11.5, color: "rgba(255,255,255,0.35)", mt: 0.6, letterSpacing: "0.04em" }}>
                MEMBER SINCE {since.toUpperCase()}
              </Typography>
            )}
          </Box>
        </motion.div>

        {/* Stat strip */}
        <motion.div {...fadeUp(0.1)}>
          <Box
            sx={{
              display: "flex",
              gap: 1,
              mt: 3.5,
              p: 1.75,
              borderRadius: "18px",
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.08)",
              backdropFilter: "blur(10px)",
            }}
          >
            {[
              {
                value: bookingCount === null
                  ? <CircularProgress size={14} sx={{ color: "rgba(255,255,255,0.5)" }} />
                  : <>{bookingCount}</>,
                label: "Bookings",
              },
              { value: "VIP", label: "Status" },
              { value: "24/7", label: "Support" },
            ].map((s, i) => (
              <Box
                key={i}
                sx={{
                  flex: 1,
                  textAlign: "center",
                  borderRight: i < 2 ? "1px solid rgba(255,255,255,0.08)" : "none",
                }}
              >
                <Typography sx={{ fontFamily: SERIF, fontSize: 20, fontWeight: 700, color: "#fff", lineHeight: 1 }}>
                  {s.value}
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: "rgba(255,255,255,0.40)", mt: 0.4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {s.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </motion.div>
      </Box>

      {/* ── Sections ── */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 3 }}>

        {/* Admin Panel shortcut — only visible to admins */}
        {role === "admin" && (
          <motion.div {...fadeUp(0.12)}>
            <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "rgba(15, 23, 42,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", px: 3, mb: 1 }}>
              Admin
            </Typography>
            <Section>
              <Row
                icon={<Gauge size={18} weight="duotone" />}
                label="Admin Dashboard"
                sub="Bookings · Therapists · Reports"
                onClick={() => navigate("/admin/dashboard")}
              />
            </Section>
          </motion.div>
        )}

        {/* Round 28s369 — Therapist panel shortcut — only visible to therapists */}
        {role === "therapist" && (
          <motion.div {...fadeUp(0.12)}>
            <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "rgba(15, 23, 42,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", px: 3, mb: 1 }}>
              Practitioner
            </Typography>
            <Section>
              <Row
                icon={<IdentificationCard size={18} weight="duotone" />}
                label="My Practitioner Profile"
                sub="Availability · services · earnings"
                onClick={() => navigate("/therapist/profile")}
              />
            </Section>
          </motion.div>
        )}

        {/* Bookings */}
        <motion.div {...fadeUp(0.15)}>
          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "rgba(15, 23, 42,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", px: 3, mb: 1 }}>
            Reservations
          </Typography>
          <Section>
            <Row
              icon={<ClockCounterClockwise size={18} />}
              label="Booking History"
              sub="View all past & upcoming sessions"
              onClick={() => navigate("/booking/history")}
            />
            <Row
              icon={<Heart size={18} />}
              label="Saved Therapists"
              sub="Your favourite practitioners"
              onClick={() => navigate("/user/saved")}
            />
          </Section>
        </motion.div>

        {/* Account */}
        <motion.div {...fadeUp(0.2)}>
          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "rgba(15, 23, 42,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", px: 3, mb: 1 }}>
            Account
          </Typography>
          <Section>
            <Row
              icon={<Bell size={18} />}
              label="Notifications"
              sub="Booking alerts & updates"
              onClick={() => navigate("/notifications")}
            />
            <Row
              icon={<Translate size={18} />}
              label="Language"
              sub="EN · TH · ZH · JA · KO"
              onClick={() => {}}
            />
          </Section>
        </motion.div>

        {/* Support */}
        <motion.div {...fadeUp(0.25)}>
          <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "rgba(15, 23, 42,0.45)", letterSpacing: "0.1em", textTransform: "uppercase", px: 3, mb: 1 }}>
            Support
          </Typography>
          <Section>
            <Row
              icon={<ChatsCircle size={18} />}
              label="Contact Concierge"
              sub="Available 24 hours a day"
              onClick={() => window.open(CONCIERGE.whatsappUrl, "_blank")}
            />
          </Section>
        </motion.div>

        {/* Sign out */}
        <motion.div {...fadeUp(0.3)}>
          <Section>
            <Row
              icon={<SignOut size={18} />}
              label="Sign out"
              onClick={handleLogout}
              danger
            />
          </Section>
        </motion.div>

        <motion.div {...fadeUp(0.35)}>
          <Typography sx={{ textAlign: "center", fontFamily: SANS, fontSize: 11, color: "rgba(15, 23, 42,0.3)", mt: 1 }}>
            SunRed · Bangkok · sunred.vip
          </Typography>
        </motion.div>
      </Box>
    </Box>
  );
};

export default ProfilePage;
