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
import { Box, Typography, CircularProgress, Button, Switch, TextField, Snackbar, Alert } from "@mui/material";
// 🆕 Round 28x.102 (founder: "เอาอีโมจิออก ใหหมด เปลี่ยนเป็นไอคอน น่ารักๆ") —
//   swapped the flat single-tone MUI Material icons for Phosphor duotone
//   ones (soft two-tone fill, rounder silhouettes) — same icon family
//   TherapistJobsPage/TherapistHomePage already use, so Profile stops being
//   the one page still on the old Material set.
import {
  ClockCounterClockwise,
  ArrowsClockwise,
  CheckCircle,
  Timer,
  Bed,
  MapPin,
  NavigationArrow,
  Gear,
  CaretRight,
  Lock,
  CalendarX,
  Sun,
  Moon,
  CircleHalf,
  type Icon as PhosphorIcon,
} from "phosphor-react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/lib/firebase";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import dayjs from "dayjs";

import type { StatusOverride } from "@/types/therapist";
// 🆕 Round 28r52 — Phase 3.1 responsive shell.
import { responsiveShell } from "@/theme/breakpoints";
import { useTherapistSelf } from "@/hooks/useTherapistSelf";
import { useTherapistIdentityStats } from "@/hooks/useTherapistIdentityStats";
import TherapistIdentityCard from "@/components/therapist/TherapistIdentityCard";
import { SUNRED_TZ } from "@/utils/time";
import { getThemeChoice, setThemeChoice, type ThemeChoice } from "@/components/common/DayNightSync";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

// 🆕 28x.88 — startTime/endTime editable ONLY Wed/Sun (scheduling-
//   predictability rule, enforced in UI not firestore.rules). Moved here
//   verbatim from TherapistHomePage (28x.96).
const HOURS_EDITABLE_DAYS = [0, 3];
const DAY_NAMES_TH = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];

const TherapistProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { therapist, therapistDocId, loading } = useTherapistSelf();
  const { reviewCount, computedStatus } = useTherapistIdentityStats(therapist);

  const handleLogout = async () => {
    await signOut(auth);
    void navigate("/login");
  };

  // 🆕 Round 28x.106 (founder: "หน้าโปรไฟล์เพิ่มโหมดมืดสว่าง เผื่อพนักงานอยาก
  //   เปลี่ยนเอง") — DayNightSync already supported a manual override via
  //   ?theme=/localStorage, nothing in the app ever exposed it as a real
  //   control. This is that control.
  const [themeChoice, setThemeChoiceState] = useState<ThemeChoice>(() => getThemeChoice());
  const applyTheme = (choice: ThemeChoice) => {
    setThemeChoice(choice);
    setThemeChoiceState(choice);
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
      {/* 🆕 28x.96 — extracted to TherapistIdentityCard so Home can render
          the exact same photo/name/status/rating/hours card (founder:
          "เอาไปใส่หน้าทำงาน ให้มีเหมือนหน้าโปรไฟล์"). */}
      <TherapistIdentityCard therapist={therapist} computedStatus={computedStatus} reviewCount={reviewCount} />

      {/* Working Status — moved back here from Home (28x.96). Firestore
          rules whitelist statusOverride + isHoliday on therapist docs, so
          writes here succeed for the doc owner and are rejected for anyone
          else. */}
      <Box sx={{ paddingX: 2, marginTop: 2 }}>
        <Box
          sx={{
            background: "linear-gradient(160deg, rgba(224,112,143,0.12) 0%, var(--sr-panel) 42%, var(--sr-panel) 100%)",
            border: "1px solid rgba(194,24,91,0.20)",
            borderRadius: 3,
            padding: "14px 16px 16px",
            boxShadow: "0 8px 22px rgba(194,24,91,0.10)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 1 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.9 }}>
              <Box sx={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #E0708F, #C2185B)", boxShadow: "0 3px 8px rgba(194,24,91,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ArrowsClockwise size={15} weight="duotone" color="#fff" />
              </Box>
              <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: "15px", color: "var(--sr-ink)" }}>
                Working Status
              </Typography>
            </Box>
            <Typography sx={{ fontFamily: SANS, fontSize: "10.5px", fontWeight: 700, color: "#22C55E" }}>
              ● Live · customers see this
            </Typography>
          </Box>

          <Typography sx={{ fontFamily: SANS, fontSize: "11.5px", color: "var(--sr-body)", lineHeight: 1.45, marginBottom: 1.25 }}>
            Pick how SunRed should show you. <b>Auto</b> lets the engine decide based on bookings + working hours.
          </Typography>

          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>
            <StatusChoice
              label="Auto"
              hint="Engine decides"
              Icon={ArrowsClockwise}
              accent="#E0708F"
              accentTo="#B23A63"
              active={!therapist.statusOverride || therapist.statusOverride === "Auto"}
              disabled={savingField === "statusOverride"}
              onClick={() => void updateOverride("Auto")}
            />
            <StatusChoice
              label="Available"
              hint="Open for bookings"
              Icon={CheckCircle}
              accent="#22C55E"
              accentTo="#15803D"
              active={therapist.statusOverride === "available"}
              disabled={savingField === "statusOverride"}
              onClick={() => void updateOverride("available")}
            />
            <StatusChoice
              label="In session"
              hint="Currently with a client"
              Icon={Timer}
              accent="#EC4899"
              accentTo="#9D174D"
              active={therapist.statusOverride === "bookable"}
              disabled={savingField === "statusOverride"}
              onClick={() => void updateOverride("bookable")}
            />
            <StatusChoice
              label="Resting"
              hint="Hide from results"
              Icon={Bed}
              accent="#8B7CA6"
              accentTo="#4A3B63"
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
              background: therapist.isHoliday ? "linear-gradient(135deg, #F5A623, #B45309)" : "rgba(245,166,35,0.08)",
              border: therapist.isHoliday ? "1px solid #B45309" : "1px solid rgba(245,166,35,0.28)",
              boxShadow: therapist.isHoliday ? "0 6px 16px rgba(180,83,9,0.35)" : "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
              <Box sx={{ width: 26, height: 26, borderRadius: "50%", background: therapist.isHoliday ? "rgba(255,255,255,0.22)" : "rgba(245,166,35,0.20)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <CalendarX size={15} weight="duotone" color={therapist.isHoliday ? "#fff" : "#B45309"} />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: "12.5px", color: therapist.isHoliday ? "#fff" : "var(--sr-ink)" }}>
                  Holiday mode
                </Typography>
                <Typography sx={{ fontFamily: SANS, fontSize: "10.5px", color: therapist.isHoliday ? "rgba(255,255,255,0.85)" : "var(--sr-body)", lineHeight: 1.4 }}>
                  Force-rest the whole day, override Auto + working hours.
                </Typography>
              </Box>
            </Box>
            <Switch
              checked={Boolean(therapist.isHoliday)}
              disabled={savingField === "isHoliday"}
              onChange={(_, checked) => void updateHoliday(checked)}
              sx={{
                "& .MuiSwitch-switchBase.Mui-checked": { color: "#fff" },
                "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": { backgroundColor: "rgba(255,255,255,0.6) !important" },
                "& .MuiSwitch-track": { backgroundColor: "rgba(180,83,9,0.35)" },
              }}
            />
          </Box>

          {/* Read-only location glance */}
          <Box
            sx={{
              marginTop: 1.25,
              padding: "10px 12px",
              borderRadius: 2,
              background: therapist.currentLocation ? "rgba(34,197,94,0.08)" : "var(--sr-panel-2)",
              border: therapist.currentLocation ? "1px solid rgba(34,197,94,0.28)" : "1px solid rgba(184,92,60,0.12)",
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Box sx={{ width: 26, height: 26, borderRadius: "50%", background: therapist.currentLocation ? "rgba(34,197,94,0.18)" : "var(--sr-panel)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <NavigationArrow size={15} weight="duotone" color={therapist.currentLocation ? "#16A34A" : "var(--sr-dim)"} />
            </Box>
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
              background: "rgba(194,24,91,0.06)",
              border: "1px solid rgba(194,24,91,0.20)",
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              cursor: "pointer",
              "&:active": { background: "rgba(194,24,91,0.12)" },
            }}
          >
            <Box sx={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #E0708F, #C2185B)", boxShadow: "0 3px 8px rgba(194,24,91,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <MapPin size={19} weight="duotone" color="#fff" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: "12.5px", color: "var(--sr-ink)" }}>
                ตำแหน่งที่ยืน · Standby location
              </Typography>
              <Typography sx={{ fontFamily: SANS, fontSize: "10.5px", color: "var(--sr-body)", lineHeight: 1.4 }}>
                ตั้งจุดบนแผนที่ หรือใช้ GPS ปัจจุบัน
              </Typography>
            </Box>
            <CaretRight size={16} color="var(--sr-dim)" />
          </Box>
        </Box>
      </Box>

      {/* Working Hours — moved back here from Home (28x.96), self-editable
          ONLY on Wednesday + Sunday. */}
      <Box sx={{ paddingX: 2, marginTop: 1.5 }}>
        <Box
          sx={{
            background: "linear-gradient(160deg, rgba(224,112,143,0.12) 0%, var(--sr-panel) 42%, var(--sr-panel) 100%)",
            border: "1px solid rgba(194,24,91,0.20)",
            borderRadius: 3,
            padding: "14px 16px 16px",
            boxShadow: "0 8px 22px rgba(194,24,91,0.10)",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: canEditHoursToday ? 1.25 : 0.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.9 }}>
              <Box sx={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #E0708F, #C2185B)", boxShadow: "0 3px 8px rgba(194,24,91,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ClockCounterClockwise size={14} weight="duotone" color="#fff" />
              </Box>
              <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: "15px", color: "var(--sr-ink)" }}>
                เวลาทำงาน · Working Hours
              </Typography>
            </Box>
            {!canEditHoursToday && <Lock size={16} weight="duotone" color="var(--sr-dim)" />}
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
                  background: "linear-gradient(135deg, #E0708F, #B23A63)",
                  boxShadow: "0 6px 16px rgba(194,24,91,0.30)",
                  "&:hover": { boxShadow: "0 6px 16px rgba(194,24,91,0.30)" },
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

      {/* 🆕 Round 28x.106 — manual light/dark override. Auto follows the
          Bangkok clock (06:00–17:59 = day) same as everywhere else; Light/
          Dark pin it regardless of time. */}
      <Box sx={{ paddingX: 2, marginTop: 2 }}>
        <Box
          sx={{
            background: "linear-gradient(160deg, rgba(224,112,143,0.10) 0%, var(--sr-panel) 55%, var(--sr-panel) 100%)",
            border: "1px solid rgba(194,24,91,0.20)",
            borderRadius: 3,
            padding: "14px 16px 16px",
            boxShadow: "0 8px 20px rgba(194,24,91,0.10)",
          }}
        >
          <Typography sx={{ fontFamily: SERIF, fontWeight: 700, fontSize: "15px", color: "var(--sr-ink)", mb: 1.25 }}>
            ธีมหน้าจอ · Display
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
            {(
              [
                { key: "auto" as ThemeChoice, label: "Auto", Icon: CircleHalf },
                { key: "day" as ThemeChoice, label: "Light", Icon: Sun },
                { key: "night" as ThemeChoice, label: "Dark", Icon: Moon },
              ]
            ).map(({ key, label, Icon }) => {
              const active = themeChoice === key;
              return (
                <Box
                  key={key}
                  role="button"
                  tabIndex={0}
                  onClick={() => applyTheme(key)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") applyTheme(key); }}
                  sx={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5,
                    py: 1.25, borderRadius: "12px", cursor: "pointer",
                    background: active ? "linear-gradient(135deg, #E0708F, #B23A63)" : "#E0708F12",
                    border: active ? "1px solid #B23A63" : "1px solid #E0708F40",
                    color: active ? "#fff" : "var(--sr-ink)",
                  }}
                >
                  <Icon size={19} weight={active ? "fill" : "regular"} />
                  <Typography sx={{ fontFamily: SANS, fontSize: 12, fontWeight: 700, color: "inherit" }}>
                    {label}
                  </Typography>
                </Box>
              );
            })}
          </Box>
          <Typography sx={{ fontFamily: SANS, fontSize: 10.5, color: "var(--sr-muted)", mt: 1.25, lineHeight: 1.4 }}>
            Auto เปลี่ยนตามเวลากรุงเทพ (06:00–18:00 = สว่าง) — เลือก Light/Dark เพื่อล็อกไว้เอง
          </Typography>
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
            background: "linear-gradient(160deg, rgba(224,112,143,0.10) 0%, var(--sr-panel) 55%, var(--sr-panel) 100%)",
            border: "1px solid rgba(194,24,91,0.20)",
            boxShadow: "0 8px 20px rgba(194,24,91,0.10)",
            cursor: "pointer",
            "&:active": { background: "rgba(194,24,91,0.08)" },
          }}
        >
          <Box sx={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg, #E0708F, #C2185B)", boxShadow: "0 3px 8px rgba(194,24,91,0.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Gear size={19} weight="duotone" color="#fff" />
          </Box>
          <Typography sx={{ flex: 1, fontFamily: SANS, fontWeight: 700, fontSize: "14px", color: "var(--sr-ink)" }}>
            ตั้งค่า · Settings
          </Typography>
          <CaretRight size={16} color="var(--sr-dim)" />
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

/** Status tile — 🆕 Round 28x.101 (founder: "ปรับให้สวยขึ้น สีสดสวยขึ้น") each
 *  status now carries its OWN true gradient (accent → accentTo) instead of
 *  every tile fading into the same shared maroon end-stop, so Available/In
 *  session/Resting read as genuinely different colors, not four shades of
 *  the same one. Inactive tiles also got a visible colored tint + ring
 *  instead of a near-invisible 10%-opacity wash. */
interface StatusChoiceProps {
  label: string;
  hint: string;
  Icon: PhosphorIcon;
  accent: string;
  accentTo: string;
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
}

const StatusChoice: React.FC<StatusChoiceProps> = ({ label, hint, Icon, accent, accentTo, active, disabled, onClick }) => (
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
      background: active ? `linear-gradient(135deg, ${accent}, ${accentTo})` : `${accent}12`,
      border: active ? `1px solid ${accentTo}` : `1px solid ${accent}40`,
      boxShadow: active ? `0 6px 14px ${accent}40` : "none",
      color: active ? "#fff" : "var(--sr-ink)",
      transition: "transform 0.15s ease, box-shadow 0.15s ease",
      "&:hover": !disabled
        ? {
            transform: "translateY(-1px)",
            background: active ? `linear-gradient(135deg, ${accent}, ${accentTo})` : `${accent}1F`,
          }
        : undefined,
      "&.Mui-disabled": { opacity: 0.55, color: active ? "#fff" : "var(--sr-ink)" },
    }}
  >
    <Box
      sx={{
        width: 30, height: 30, borderRadius: "50%",
        background: active ? "rgba(255,255,255,0.22)" : `${accent}26`,
        color: active ? "#fff" : accent,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={17} weight="duotone" />
    </Box>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontFamily: SANS, fontSize: "12px", fontWeight: 700, lineHeight: 1.15, color: "inherit" }}>
        {label}
      </Typography>
      <Typography sx={{ fontFamily: SANS, fontSize: "9.5px", fontWeight: 500, opacity: active ? 0.85 : 0.7, color: "inherit", lineHeight: 1.25 }}>
        {hint}
      </Typography>
    </Box>
  </Button>
);

export default TherapistProfilePage;
