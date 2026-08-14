// src/components/admin/AdminPushToggle.tsx
//
// 🆕 Round 28x.193 — the switch that puts "new booking" alerts on View's
//   phone. Lives in the admin AppBar; guests never see it. One tap =
//   permission prompt (the user gesture iOS requires) → push subscription
//   stored in adminSettings/webPushSubs → notifyAdminPushOnBooking fans
//   out to every enabled device.
//
//   States: on (filled bell, accent) · off (crossed bell) · blocked
//   (permission denied — only the browser's own site settings can undo,
//   so the tooltip says exactly that) · unsupported (hidden entirely —
//   e.g. iOS Safari in the TAB, before Add-to-Home-Screen).

import React, { useEffect, useState } from "react";
import { IconButton, Tooltip, CircularProgress } from "@mui/material";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import NotificationsOffRoundedIcon from "@mui/icons-material/NotificationsOffRounded";
import NotificationsPausedRoundedIcon from "@mui/icons-material/NotificationsPausedRounded";
import {
  adminPushStatus,
  enableAdminPush,
  disableAdminPush,
  type AdminPushStatus,
} from "@/utils/adminPush";
import { adminColor } from "@/theme/adminTheme";

const AdminPushToggle: React.FC = () => {
  const [status, setStatus] = useState<AdminPushStatus | "loading">("loading");

  useEffect(() => {
    let alive = true;
    void adminPushStatus().then((s) => {
      if (alive) setStatus(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (status === "unsupported") return null;

  const busy = status === "loading";

  const toggle = async () => {
    if (busy) return;
    setStatus("loading");
    try {
      setStatus(
        status === "on" ? await disableAdminPush() : await enableAdminPush(),
      );
    } catch (err) {
      console.error("[AdminPushToggle]", err);
      // webpush-keys-missing lands here too — treat as off so the tooltip
      // stays honest instead of pretending it's on.
      setStatus(await adminPushStatus());
      window.alert(
        (err as Error)?.message === "webpush-keys-missing"
          ? "Push keys not set up yet — run scripts/setWebPushKeys.mjs first."
          : "Could not enable notifications on this device.",
      );
    }
  };

  const tip =
    status === "on"
      ? "Booking alerts ON on this device — tap to turn off"
      : status === "blocked"
        ? "Notifications blocked — allow them in browser site settings first"
        : "Get new-booking alerts on this device";

  return (
    <Tooltip title={tip}>
      <span>
        <IconButton
          size="small"
          onClick={() => void toggle()}
          disabled={busy || status === "blocked"}
          sx={{ color: status === "on" ? adminColor.accent : adminColor.text }}
        >
          {busy ? (
            <CircularProgress size={16} sx={{ color: adminColor.text }} />
          ) : status === "on" ? (
            <NotificationsActiveRoundedIcon fontSize="small" />
          ) : status === "blocked" ? (
            <NotificationsPausedRoundedIcon fontSize="small" />
          ) : (
            <NotificationsOffRoundedIcon fontSize="small" />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
};

export default AdminPushToggle;
