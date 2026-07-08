// src/pages/NotificationsPage.tsx
//
// 🎨 Round 16 (founder 2026-05-01): customer-facing in-app notifications.
//
// Reads the `notifications` collection live for the signed-in user, shows
// them in a phone-shell list. Tapping an item marks it read + navigates
// to its `link` (e.g. /booking/success/:id). Unread items are visually
// distinct (red dot + bolder title) so the user can spot what's new.
//
// Wired by BookingFlowPage's addDoc on booking confirm — see Round 16
// inserts at the bottom of handleSubmit.

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import NotificationsRoundedIcon from "@mui/icons-material/NotificationsRounded";
import EventAvailableRoundedIcon from "@mui/icons-material/EventAvailableRounded";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
import LocalOfferRoundedIcon from "@mui/icons-material/LocalOfferRounded";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  limit,
  type DocumentData,
  type Timestamp,
} from "firebase/firestore";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { db } from "@/lib/firebase";
import { useAuth } from "@/providers/AuthProvider";
// 🆕 Round 28r52 — Phase 3.1 responsive shell.
import { responsiveShell } from "@/theme/breakpoints";

dayjs.extend(relativeTime);

const SERIF = '"Federo", "Italiana", "Cinzel", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  content: string;
  link?: string;
  read: boolean;
  priority: "low" | "normal" | "high";
  createdAt?: Timestamp | null;
}

const ICON_BY_TYPE: Record<string, React.ReactNode> = {
  bookingConfirmed: <EventAvailableRoundedIcon />,
  newReview: <RateReviewRoundedIcon />,
  promo: <LocalOfferRoundedIcon />,
};

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc"),
      limit(50)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            userId: (data.userId as string) ?? "",
            type: (data.type as string) ?? "info",
            title: (data.title as string) ?? "—",
            content: (data.content as string) ?? "",
            link: data.link as string | undefined,
            read: !!data.read,
            priority:
              (data.priority as Notification["priority"]) ?? "normal",
            createdAt: data.createdAt as Timestamp | null,
          } satisfies Notification;
        });
        setItems(list);
        setLoading(false);
      },
      (err) => {
        console.warn("[notifications] subscription error:", err);
        setLoading(false);
      }
    );
    return unsub;
  }, [user?.uid]);

  const handleTap = async (n: Notification) => {
    if (!n.read) {
      try {
        await updateDoc(doc(db, "notifications", n.id), { read: true });
      } catch (e) {
        console.warn("[notifications] markRead failed:", e);
      }
    }
    if (n.link) void navigate(n.link);
  };

  return (
    <Box
      sx={{
        // Phone-shell wrapper
        // 🆕 Round 28r52 — responsiveShell widens on tablet/desktop.
        ...responsiveShell,
        minHeight: "100vh",
        background: "#F4F6F5",
        borderRadius: { xs: "28px", md: 0 },
        overflow: "hidden",
        boxShadow: {
          xs: "0 20px 60px rgba(15, 23, 42, 0.15)",
          md: "none",
        },
        position: "relative",
        paddingBottom: "calc(40px + env(safe-area-inset-bottom, 0px))",
        fontFamily: SANS,
      }}
    >
      {/* Sticky header */}
      <Box
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "#F4F6F5",
          borderBottom: "1px solid rgba(0, 0, 0, 0.04)",
          display: "flex",
          alignItems: "center",
          padding: "14px 16px",
        }}
      >
        <IconButton
          aria-label="back"
          onClick={() => void navigate(-1)}
          sx={{
            width: 38,
            height: 38,
            background: "rgba(255, 255, 255, 0.85)",
            border: "1px solid rgba(0, 0, 0, 0.06)",
            color: "#1A2B2E",
            boxShadow: "0 2px 8px rgba(15, 23, 42, 0.06)",
            "&:hover": { background: "#fff" },
          }}
        >
          <ArrowBackRoundedIcon fontSize="small" />
        </IconButton>
        <Typography
          component="h1"
          sx={{
            flex: 1,
            textAlign: "center",
            fontFamily: SERIF,
            fontSize: "18px",
            fontWeight: 600,
            color: "#1A2B2E",
            letterSpacing: "-0.01em",
            marginRight: "38px",
          }}
        >
          Notifications
        </Typography>
      </Box>

      <Box sx={{ padding: "16px" }}>
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              paddingTop: "80px",
            }}
          >
            <CircularProgress sx={{ color: "#B4000A" }} />
          </Box>
        ) : items.length === 0 ? (
          <EmptyState />
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {items.map((n) => (
              <NotificationRow
                key={n.id}
                notification={n}
                onTap={() => void handleTap(n)}
              />
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

// ─── Single notification row ────────────────────────────────────────────
const NotificationRow: React.FC<{
  notification: Notification;
  onTap: () => void;
}> = ({ notification: n, onTap }) => {
  const ago = n.createdAt?.toDate
    ? dayjs(n.createdAt.toDate()).fromNow()
    : "";
  return (
    <Box
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          onTap();
        }
      }}
      sx={{
        position: "relative",
        display: "flex",
        gap: "12px",
        padding: "14px 16px",
        borderRadius: "16px",
        background: n.read
          ? "rgba(255, 255, 255, 0.7)"
          : "rgba(255, 255, 255, 0.95)",
        border: n.read
          ? "1px solid rgba(0, 0, 0, 0.04)"
          : "1px solid rgba(15, 23, 42, 0.18)",
        boxShadow: n.read
          ? "0 2px 6px rgba(15, 23, 42, 0.04)"
          : "0 6px 18px rgba(15, 23, 42, 0.10)",
        cursor: "pointer",
        transition: "all 0.15s ease",
        "&:hover": {
          background: n.read
            ? "rgba(255, 255, 255, 0.85)"
            : "#fff",
          transform: "translateY(-1px)",
        },
        "&:focus-visible": {
          outline: "2px solid #B4000A",
          outlineOffset: "2px",
        },
      }}
    >
      <Box
        aria-hidden
        sx={{
          width: 40,
          height: 40,
          flexShrink: 0,
          borderRadius: "12px",
          background: n.read
            ? "rgba(15, 23, 42, 0.06)"
            : "#B4000A",
          color: n.read ? "rgba(15, 23, 42, 0.55)" : "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: n.read
            ? "none"
            : "0 4px 10px rgba(15, 23, 42, 0.25)",
          "& svg": { fontSize: 22 },
        }}
      >
        {ICON_BY_TYPE[n.type] ?? <NotificationsRoundedIcon />}
      </Box>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "baseline",
            gap: "8px",
            marginBottom: "2px",
          }}
        >
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "14.5px",
              fontWeight: n.read ? 500 : 700,
              color: "#1a1a1a",
              lineHeight: 1.25,
              flex: 1,
              minWidth: 0,
            }}
          >
            {n.title}
          </Typography>
          {ago && (
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "10.5px",
                color: "rgba(15, 23, 42, 0.5)",
                flexShrink: 0,
              }}
            >
              {ago}
            </Typography>
          )}
        </Box>
        <Typography
          sx={{
            fontFamily: SANS,
            fontSize: "12.5px",
            color: "rgba(15, 23, 42, 0.7)",
            lineHeight: 1.45,
          }}
        >
          {n.content}
        </Typography>
      </Box>
      {!n.read && (
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            top: 14,
            right: 14,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "#B4000A",
            boxShadow: "0 0 0 3px rgba(15, 23, 42, 0.18)",
          }}
        />
      )}
    </Box>
  );
};

// ─── Empty state ────────────────────────────────────────────────────────
const EmptyState: React.FC = () => (
  <Box
    sx={{
      textAlign: "center",
      padding: "80px 24px 40px",
    }}
  >
    <Box
      aria-hidden
      sx={{
        width: 64,
        height: 64,
        borderRadius: "50%",
        background: "rgba(180, 0, 10, 0.08)",
        color: "#B4000A",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 auto 16px",
        "& svg": { fontSize: 32 },
      }}
    >
      <NotificationsRoundedIcon />
    </Box>
    <Typography
      sx={{
        fontFamily: SERIF,
        fontSize: "18px",
        fontWeight: 600,
        color: "#1A2B2E",
        marginBottom: "6px",
      }}
    >
      You&rsquo;re all caught up
    </Typography>
    <Typography
      sx={{
        fontFamily: SANS,
        fontSize: "13px",
        color: "rgba(15, 23, 42, 0.6)",
        lineHeight: 1.5,
      }}
    >
      Booking confirmations, new reviews, and promotions will appear here.
    </Typography>
  </Box>
);

export default NotificationsPage;
