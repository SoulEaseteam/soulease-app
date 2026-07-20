// src/pages/therapist/TherapistProfilePage.tsx
//
// 🆕 Round 26 (founder 2026-05-02): refactor for real Firestore live data.
//    Founder asked: "จัดการหน้า src/pages/therapist ให้ดึงข้อมูลจิง มาใช้".
//
// 🆕 Round 28x.87 (founder reference screenshots, "อยากได้ 3 แท็บแบบภาพอ้างอิง")
//   — Working Status (the toggle grid, Holiday switch, location rows) moved
//   to the new TherapistHomePage; this page is now identity + Settings only,
//   same split the reference app uses (grid icon = dashboard, person icon =
//   profile). Doc resolution now comes from the shared useTherapistSelf hook
//   instead of a local copy, so Home and Profile can never disagree about
//   which therapist doc they're reading.
//   Also dropped todayBookings/completedJobs/cancelledJobs — dead state left
//   over from 28x.78 moving those counters to /therapist/jobs; they were
//   computed on every bookings snapshot here but never rendered.
//
// 🆕 Round 28x.96 (founder: "ย้ายหน้าทำงาน ไปไว้ที่โปรไฟล์") — reverses the
//   28x.87 move: Working Status + Working Hours come back here, freeing
//   Home to be a pure quick-menu dashboard (matches the founder's original
//   reference screenshots more closely than the 28x.87 version did).

import React, { useEffect, useMemo, useState } from "react";
import { Box, Typography, CircularProgress, Chip, Button, Switch, TextField, Snackbar, Alert } from "@mui/material";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import RoomRoundedIcon from "@mui/icons-material/RoomRounded";
import NavigationRoundedIcon from "@mui/icons-material/NavigationRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import EventBusyRoundedIcon from "@mui/icons-material/EventBusyRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import { ClockCounterClockwise } from "phosphor-react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/lib/firebase";
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import dayjs from "dayjs";

import type { Avail, StatusOverride } from "@/types/therapist";
// 🆕 Round 28r52 — Phase 3.1 responsive shell.
import { responsiveShell } from "@/theme/breakpoints";
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";
import { enhanceImage } from "@/utils/cloudinary";
import { useTherapistSelf } from "@/hooks/useTherapistSelf";
import { SUNRED_TZ } from "@/utils/time";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// 🆕 28x.88 — startTime/endTime editable ONLY Wed/Sun (scheduling-
//   predictability rule, enforced in UI not firestore.rules). Moved here
//   verbatim from TherapistHomePage (28x.96).
const HOURS_EDITABLE_DAYS = [0, 3];
const DAY_NAMES_TH = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];

/** Narrow shape of a booking record we read from Firestore. */
interface BookingDoc {
  reviewText?: string;
  status?: string;
}

/** Status pill colors — brand-consistent, no salmon. */
const STATUS_PILL: Record<Avail, { bg: string; color: string; label: string }> = {
  available: { bg: "#16a34a", color: "#fff", label: "Available" },
  bookable: { bg: "#831843", color: "#F4F6F5", label: "In session" },
  resting: { bg: "rgba(0,0,0,0.38)", color: "#FFFFFF", label: "Resting" },
  holiday: { bg: "rgba(0,0,0,0.38)", color: "#FFFFFF", label: "On holiday" },
};

const TherapistProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { therapist, therapistDocId, loading } = useTherapistSelf();

  // Live review count — completed bookings with a non-empty reviewText.
  const [reviewCount, setReviewCount] = useState(0);
  useEffect(() => {
    const myUid = auth.currentUser?.uid;
    if (!myUid) return;
    const q = query(collection(db, "bookings"), where("therapistUid", "==", myUid));
    const unsub = onSnapshot(q, (snap) => {
      let reviewed = 0;
      snap.forEach((d) => {
        const b = d.data() as BookingDoc;
        const status = (b.status ?? "").toLowerCase();
        if (
          ["completed", "done"].includes(status) &&
          typeof b.reviewText === "string" &&
          b.reviewText.trim().length > 0
        ) {
          reviewed += 1;
        }
      });
      setReviewCount(reviewed);
    });
    return () => unsub();
  }, [therapistDocId]); // re-subscribes after auth resolves the profile

  // Computed status via canonical engine — one source of truth.
  const computedStatus: Avail = useMemo(() => {
    if (!therapist) return "resting";
    const { status } = calculateTherapistStatus(therapist);
    /* eslint-disable @typescript-eslint/no-unnecessary-condition */
    return status === "available" || status === "bookable" || status === "resting"
      ? status
      : "resting";
    /* eslint-enable @typescript-eslint/no-unnecessary-condition */
  }, [therapist]);

  const handleLogout = async () => {
    await signOut(auth);
    void navigate("/login");
  };

  // ── Working Status + Working Hours (moved here from Home, 28x.96) ─────
  const [savingField, setSavingField] = useState<null | "statusOverride" | "isHoliday">(null);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  const updateOverride = async (next: StatusOverride) => {
    if (!therapistDocId) return;
    try {
      setSavingField("statusOverride");
      await updateDoc(doc(db, "therapists", therapistDocId), {
        statusOverride: next,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid ?? null,
      });
      const labelMap: Record<string, string> = {
        Auto: "Auto (engine decides)",
        available: "Available",
        bookable: "In session",
        resting: "Resting",
      };
      setToast({ msg: `Status set to ${labelMap[next ?? "Auto"] ?? "Auto"}`, severity: "success" });
    } catch (err) {
      console.error("[TherapistProfile] updateOverride failed:", err);
      setToast({ msg: "Couldn't update status. Please try again.", severity: "error" });
    } finally {
      setSavingField(null);
    }
  };

  const updateHoliday = async (next: boolean) => {
    if (!therapistDocId) return;
    try {
      setSavingField("isHoliday");
      await updateDoc(doc(db, "therapists", therapistDocId), {
        isHoliday: next,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid ?? null,
      });
      setToast({ msg: next ? "Holiday mode ON — you're off today." : "Holiday mode OFF", severity: "success" });
    } catch (err) {
      console.error("[TherapistProfile] updateHoliday failed:", err);
      setToast({ msg: "Couldn't update holiday mode. Please try again.", severity: "error" });
    } finally {
      setSavingField(null);
    }
  };

  const todayBKK = useMemo(() => dayjs().tz(SUNRED_TZ), []);
  const canEditHoursToday = HOURS_EDITABLE_DAYS.includes(todayBKK.day());
  const nextHoursWindowLabel = useMemo(() => {
    if (canEditHoursToday) return null;
    for (let i = 1; i <= 7; i++) {
      const d = todayBKK.add(i, "day");
      if (HOURS_EDITABLE_DAYS.includes(d.day())) return `${DAY_NAMES_TH[d.day()]}ที่ ${d.format("D MMM")}`;
    }
    return null;
  }, [todayBKK, canEditHoursToday]);

  const [hoursStart, setHoursStart] = useState("");
  const [hoursEnd, setHoursEnd] = useState("");
  const [hoursBusy, setHoursBusy] = useState(false);
  // Deliberately NOT depending on the whole `therapist` object below:
  // onSnapshot hands back a new reference on every field change (e.g. a
  // status toggle), which would wipe an in-progress, unsaved hours edit.
  useEffect(() => {
    if (!therapist) return;
    setHoursStart(therapist.startTime ?? "");
    setHoursEnd(therapist.endTime ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [therapist?.startTime, therapist?.endTime]);
  const hoursDirty = therapist && (hoursStart !== (therapist.startTime ?? "") || hoursEnd !== (therapist.endTime ?? ""));

  const updateHours = async () => {
    if (!therapistDocId || !hoursStart || !hoursEnd) return;
    setHoursBusy(true);
    try {
      await updateDoc(doc(db, "therapists", therapistDocId), {
        startTime: hoursStart,
        endTime: hoursEnd,
        updatedAt: serverTimestamp(),
        updatedBy: auth.currentUser?.uid ?? null,
      });
      setToast({ msg: `Working hours updated to ${hoursStart}–${hoursEnd}`, severity: "success" });
    } catch (err) {
      console.error("[TherapistProfile] updateHours failed:", err);
      setToast({ msg: "Couldn't update working hours. Please try again.", severity: "error" });
    } finally {
      setHoursBusy(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress sx={{ color: "#D97C95" }} />
      </Box>
    );
  }

  if (!therapist) {
    return (
      <Box sx={{ ...responsiveShell, padding: "40px 24px", textAlign: "center" }}>
        <Typography sx={{ fontFamily: SERIF, fontSize: "18px", fontWeight: 600, color: "var(--sr-ink)", marginBottom: 1 }}>
          Therapist profile not found
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: "13px", color: "var(--sr-muted)", marginBottom: 3 }}>
          Please contact admin if this is unexpected.
        </Typography>
        <Button onClick={handleLogout} variant="outlined">
          Sign out
        </Button>
      </Box>
    );
  }

  const rawImage = therapist.image || "placeholder.jpg";
  const resolvedImage =
    rawImage.startsWith("http") || rawImage.startsWith("/")
      ? rawImage
      : `/images/${rawImage}`;

  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const ratingNum = (Number(therapist.rating) || 0).toFixed(1);
  const pill = STATUS_PILL[computedStatus];

  return (
    <Box
      sx={{
        ...responsiveShell,
        minHeight: "100vh",
        background: "var(--sr-bg)",
        paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))",
        fontFamily: SANS,
      }}
    >
      {/* Header — brand red→coral gradient (replaces legacy salmon) */}
      <Box
        sx={{
          position: "relative",
          padding: "24px 20px 28px",
          background: "linear-gradient(160deg, #A34A67 0%, #7A3049 55%, #5A2733 100%)",
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          color: "#fff",
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.22)",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Box
            component="img"
            src={enhanceImage(resolvedImage, { variant: "card" })}
            alt={therapist.name}
            width={96}
            height={96}
            loading="lazy"
            decoding="async"
            sx={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              objectFit: "cover",
              border: "3px solid rgba(255,255,255,0.85)",
              boxShadow: "0 6px 16px rgba(15, 23, 42, 0.14)",
              flexShrink: 0,
            }}
          />

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography
              sx={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: "20px",
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              {therapist.name}
            </Typography>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "11px",
                opacity: 0.85,
                marginTop: "2px",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {(therapist as { email?: string }).email ?? ""}
            </Typography>

            <Box
              sx={{
                marginTop: "6px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                flexWrap: "wrap",
              }}
            >
              <Chip
                size="small"
                label={pill.label}
                sx={{
                  height: 22,
                  background: pill.bg,
                  color: pill.color,
                  fontWeight: 700,
                  fontSize: "10px",
                  letterSpacing: "0.04em",
                }}
              />
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "10.5px",
                  opacity: 0.85,
                  fontWeight: 600,
                }}
              >
                ★ {ratingNum} · {reviewCount} review
                {reviewCount === 1 ? "" : "s"}
              </Typography>
            </Box>

            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "10.5px",
                opacity: 0.78,
                marginTop: "4px",
              }}
            >
              Hours · {therapist.startTime ?? "—"} – {therapist.endTime ?? "—"}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Working Status — moved back here from Home (28x.96). Firestore
          rules whitelist statusOverride + isHoliday on therapist docs, so
          writes here succeed for the doc owner and are rejected for anyone
          else. */}
      <Box sx={{ paddingX: 2, marginTop: 2 }}>
        <Box
          sx={{
            background: "var(--sr-panel)",
            border: "1px solid rgba(184,92,60,0.18)",
            borderRadius: 3,
            padding: "14px 16px 16px",
            boxShadow: "0 6px 18px rgba(15, 23, 42,0.06)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 1 }}>
            <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: "15px", color: "var(--sr-ink)" }}>
              Working Status
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: "10.5px", color: "var(--sr-muted)" }}>
              Live · customers see this
            </Typography>
          </Box>

          <Typography sx={{ fontFamily: SANS, fontSize: "11.5px", color: "var(--sr-body)", lineHeight: 1.45, marginBottom: 1.25 }}>
            Pick how SunRed should show you. <b>Auto</b> lets the engine decide based on bookings + working hours.
          </Typography>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>
            <StatusChoice
              label="Auto"
              hint="Engine decides"
              Icon={AutorenewRoundedIcon}
              accent="#C96F89"
              active={!therapist.statusOverride || therapist.statusOverride === "Auto"}
              disabled={savingField === "statusOverride"}
              onClick={() => void updateOverride("Auto")}
            />
            <StatusChoice
              label="Available"
              hint="Open for bookings"
              Icon={CheckCircleRoundedIcon}
              accent="#16a34a"
              active={therapist.statusOverride === "available"}
              disabled={savingField === "statusOverride"}
              onClick={() => void updateOverride("available")}
            />
            <StatusChoice
              label="In session"
              hint="Currently with a client"
              Icon={EventBusyRoundedIcon}
              accent="#831843"
              active={therapist.statusOverride === "bookable"}
              disabled={savingField === "statusOverride"}
              onClick={() => void updateOverride("bookable")}
            />
            <StatusChoice
              label="Resting"
              hint="Hide from results"
              Icon={HotelRoundedIcon}
              accent="var(--sr-muted)"
              active={therapist.statusOverride === "resting"}
              disabled={savingField === "statusOverride"}
              onClick={() => void updateOverride("resting")}
            />
          </Box>

          {/* Holiday switch */}
          <Box
            sx={{
              marginTop: 1.5,
              padding: "10px 12px",
              borderRadius: 2,
              background: therapist.isHoliday ? "rgba(45, 45, 43, 0.08)" : "var(--sr-panel-2)",
              border: therapist.isHoliday ? "1px solid rgba(15, 23, 42, 0.22)" : "1px solid rgba(184,92,60,0.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: "12.5px", color: "var(--sr-ink)" }}>
                Holiday mode
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: "10.5px", color: "var(--sr-body)", lineHeight: 1.4 }}>
                Force-rest the whole day, override Auto + working hours.
              </Typography>
            </Box>
            <Switch
              checked={Boolean(therapist.isHoliday)}
              disabled={savingField === "isHoliday"}
              onChange={(_, checked) => void updateHoliday(checked)}
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": { color: "#C96F89" },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "#C96F89" },
              }}
            />
          </Box>

          {/* Read-only location glance */}
          <Box
            sx={{
              marginTop: 1.25,
              padding: "10px 12px",
              borderRadius: 2,
              background: "var(--sr-panel-2)",
              border: "1px solid rgba(184,92,60,0.12)",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <NavigationRoundedIcon sx={{ color: therapist.currentLocation ? "#16a34a" : "var(--sr-dim)", fontSize: 18 }} />
            <Typography sx={{ fontFamily: SANS, fontSize: "11.5px", color: "var(--sr-body)", flex: 1 }}>
              ตำแหน่งปัจจุบัน:{" "}
              <b style={{ color: "var(--sr-ink)" }}>
                {therapist.currentLocation
                  ? `${therapist.currentLocation.lat.toFixed(4)}, ${therapist.currentLocation.lng.toFixed(4)}`
                  : "ยังไม่ได้ตั้ง"}
              </b>
            </Typography>
          </Box>

          {/* Standby location entry */}
          <Box
            role="button"
            tabIndex={0}
            onClick={() => navigate("/location")}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") void navigate("/location"); }}
            sx={{
              marginTop: 1,
              padding: "10px 12px",
              borderRadius: 2,
              background: "var(--sr-panel-2)",
              border: "1px solid rgba(184,92,60,0.12)",
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              cursor: "pointer",
              "&:active": { background: "var(--sr-panel)" },
            }}
          >
            <RoomRoundedIcon sx={{ color: "#C96F89", fontSize: 22 }} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: "12.5px", color: "var(--sr-ink)" }}>
                ตำแหน่งที่ยืน · Standby location
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: "10.5px", color: "var(--sr-body)", lineHeight: 1.4 }}>
                ตั้งจุดบนแผนที่ หรือใช้ GPS ปัจจุบัน
              </Typography>
            </Box>
            <ChevronRightRoundedIcon sx={{ color: "var(--sr-dim)" }} />
          </Box>
        </Box>
      </Box>

      {/* Working Hours — moved back here from Home (28x.96), self-editable
          ONLY on Wednesday + Sunday. */}
      <Box sx={{ paddingX: 2, marginTop: 1.5 }}>
        <Box
          sx={{
            background: "var(--sr-panel)",
            border: "1px solid rgba(184,92,60,0.18)",
            borderRadius: 3,
            padding: "14px 16px 16px",
            boxShadow: "0 6px 18px rgba(15, 23, 42,0.06)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: canEditHoursToday ? 1.25 : 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
              <ClockCounterClockwise size={16} color="#C96F89" />
              <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: "15px", color: "var(--sr-ink)" }}>
                เวลาทำงาน · Working Hours
              </Typography>
            </Box>
            {!canEditHoursToday && <LockRoundedIcon sx={{ fontSize: 16, color: "var(--sr-dim)" }} />}
          </Box>

          {canEditHoursToday ? (
            <>
              <Typography sx={{ fontFamily: SANS, fontSize: "11.5px", color: "var(--sr-body)", lineHeight: 1.45, marginBottom: 1.25 }}>
                วันนี้เป็น{DAY_NAMES_TH[todayBKK.day()]} — แก้ไขเวลาทำงานได้
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mb: 1.25 }}>
                <TextField
                  label="เริ่มงาน"
                  type="time"
                  size="small"
                  fullWidth
                  value={hoursStart}
                  onChange={(e) => setHoursStart(e.target.value)}
                  disabled={hoursBusy}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{ sx: { color: "var(--sr-ink)" } }}
                />
                <TextField
                  label="เลิกงาน"
                  type="time"
                  size="small"
                  fullWidth
                  value={hoursEnd}
                  onChange={(e) => setHoursEnd(e.target.value)}
                  disabled={hoursBusy}
                  InputLabelProps={{ shrink: true }}
                  InputProps={{ sx: { color: "var(--sr-ink)" } }}
                />
              </Box>
              <Button
                onClick={() => void updateHours()}
                disabled={!hoursDirty || hoursBusy || !hoursStart || !hoursEnd}
                fullWidth
                variant="contained"
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 2,
                  background: "linear-gradient(135deg, #C96F89, #7A3049)",
                  boxShadow: "none",
                  "&:hover": { boxShadow: "none" },
                }}
              >
                {hoursBusy ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "บันทึกเวลาทำงาน"}
              </Button>
            </>
          ) : (
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
              <Typography sx={{ fontFamily: SANS, fontSize: "12.5px", color: "var(--sr-body)" }}>
                {therapist.startTime ?? "--:--"} – {therapist.endTime ?? "--:--"}
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: "11px", color: "var(--sr-muted)", textAlign: "right" }}>
                แก้ไขได้เฉพาะวันพุธและวันอาทิตย์
                {nextHoursWindowLabel && <><br />ครั้งถัดไป: {nextHoursWindowLabel}</>}
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Settings — identity + Working Status/Hours above cover everything
          else this page owns. */}
      <Box sx={{ paddingX: 2, marginTop: 2.5 }}>
        <Box
          role="button"
          tabIndex={0}
          onClick={() => navigate("/therapist/settings")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") void navigate("/therapist/settings"); }}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            padding: "14px 16px",
            borderRadius: 3,
            background: "var(--sr-panel)",
            border: "1px solid rgba(184,92,60,0.18)",
            boxShadow: "0 6px 18px rgba(15, 23, 42,0.06)",
            cursor: "pointer",
            "&:active": { background: "var(--sr-panel-2)" },
          }}
        >
          <SettingsRoundedIcon sx={{ color: "#C96F89" }} />
          <Typography sx={{ flex: 1, fontFamily: SANS, fontWeight: 700, fontSize: "14px", color: "var(--sr-ink)" }}>
            ตั้งค่า · Settings
          </Typography>
          <ChevronRightRoundedIcon sx={{ color: "var(--sr-dim)" }} />
        </Box>
      </Box>

      <Snackbar open={Boolean(toast)} autoHideDuration={2400} onClose={() => setToast(null)} anchorOrigin={{ vertical: "bottom", horizontal: "center" }}>
        {toast ? (
          <Alert onClose={() => setToast(null)} severity={toast.severity} variant="filled" sx={{ fontFamily: SANS, fontSize: "12.5px", fontWeight: 600, borderRadius: 2 }}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
};

/** Same StatusChoice tile as before (moved back from TherapistHomePage, 28x.96). */
interface StatusChoiceProps {
  label: string;
  hint: string;
  Icon: typeof RoomRoundedIcon;
  accent: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const StatusChoice: React.FC<StatusChoiceProps> = ({ label, hint, Icon, accent, active, disabled, onClick }) => (
  <Button
    onClick={onClick}
    disabled={disabled}
    sx={{
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      gap: "8px",
      padding: "10px 12px",
      borderRadius: "12px",
      textTransform: "none",
      textAlign: "left",
      background: active ? `linear-gradient(135deg, ${accent}, #7A3049)` : "var(--sr-panel)",
      border: active ? `1px solid ${accent}` : "1px solid rgba(184,92,60,0.18)",
      boxShadow: active ? `0 6px 14px ${accent}33` : "0 2px 6px rgba(15, 23, 42,0.04)",
      color: active ? "#fff" : "var(--sr-ink)",
      transition: "transform 0.15s ease, box-shadow 0.15s ease",
      "&:hover": !disabled
        ? {
            transform: "translateY(-1px)",
            background: active ? `linear-gradient(135deg, ${accent} 0%, ${accent} 100%)` : "var(--sr-panel-2)",
          }
        : undefined,
      "&.Mui-disabled": { opacity: 0.55, color: active ? "#fff" : "var(--sr-ink)" },
    }}
  >
    <Box
      sx={{
        width: 30, height: 30, borderRadius: "50%",
        background: active ? "rgba(255,255,255,0.18)" : `${accent}1A`,
        color: active ? "#fff" : accent,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon sx={{ fontSize: 17 }} />
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontFamily: SANS, fontSize: "12px", fontWeight: 700, lineHeight: 1.15, color: "inherit" }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: "9.5px", fontWeight: 500, opacity: active ? 0.85 : 0.6, color: "inherit", lineHeight: 1.25 }}>
        {hint}
      </Typography>
    </Box>
  </Button>
);

export default TherapistProfilePage;
