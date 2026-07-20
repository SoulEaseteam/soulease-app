// src/pages/therapist/TherapistHomePage.tsx
//
// 🆕 Round 28x.87 (founder reference screenshots of a competitor's "หน้าทำงาน"
//   dashboard + "อยากได้ 3 แท็บแบบภาพอ้างอิง") — a genuine home/dashboard tab
//   for staff, closing the gap between the reference (Home · Jobs · Chat ·
//   Profile) and what StaffLayout had (Jobs · Profile only). Chat stays out —
//   already declined earlier this session as a big, separate feature.
//
//   Working Status (Auto/Available/In session/Resting, Holiday mode, the
//   location glance + standby-location link) moves here from
//   TherapistProfilePage — "what's my status right now" belongs on the
//   landing dashboard, not buried behind the identity page. Profile keeps
//   just her photo/name/rating + the Settings entry.
//
//   Quick menu is deliberately thin: of the reference's 5 tiles, the founder
//   called 2 of them explicitly OUT (คลังวิดีโอ — big feature, storage +
//   approval flow, not now · เปลี่ยนเมือง — Bangkok only, skip), and a 3rd
//   (บริการของฉัน / ตั้งค่าบริการ — per-therapist pricing) isn't asked for and
//   would conflict with SunRed's centralized fixed pricing (CLAUDE.md §2) —
//   not silently building a business-model change. Only รายการรีพอร์ต
//   ("build it now") is real.

import React, { useEffect, useState } from "react";
import { Box, Typography, CircularProgress, Button, Switch, Snackbar, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";
import RoomRoundedIcon from "@mui/icons-material/RoomRounded";
import NavigationRoundedIcon from "@mui/icons-material/NavigationRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import HotelRoundedIcon from "@mui/icons-material/HotelRounded";
import EventBusyRoundedIcon from "@mui/icons-material/EventBusyRounded";
import { Flag } from "phosphor-react";
import { collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";

import { auth, db } from "@/lib/firebase";
import { responsiveShell } from "@/theme/breakpoints";
import { useTherapistSelf } from "@/hooks/useTherapistSelf";
import type { StatusOverride } from "@/types/therapist";

const SERIF = '"Playfair Display", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

const TherapistHomePage: React.FC = () => {
  const navigate = useNavigate();
  const { therapist, therapistDocId, loading } = useTherapistSelf();

  const [savingField, setSavingField] = useState<null | "statusOverride" | "isHoliday">(null);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  // 🆕 28x.87 — live count of her OPEN reports, for the quick-menu badge.
  const [openReportCount, setOpenReportCount] = useState(0);
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(collection(db, "reports"), where("therapistUid", "==", uid), where("status", "==", "open"));
    const unsub = onSnapshot(q, (snap) => setOpenReportCount(snap.size), () => setOpenReportCount(0));
    return () => unsub();
  }, []);

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
      console.error("[TherapistHome] updateOverride failed:", err);
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
      console.error("[TherapistHome] updateHoliday failed:", err);
      setToast({ msg: "Couldn't update holiday mode. Please try again.", severity: "error" });
    } finally {
      setSavingField(null);
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
        <Typography sx={{ fontFamily: SANS, fontSize: "13px", color: "var(--sr-muted)" }}>
          Please contact admin if this is unexpected.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ ...responsiveShell, minHeight: "100vh", background: "var(--sr-bg)", paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))", fontFamily: SANS }}>
      {/* Header */}
      <Box sx={{ px: 2.5, pt: 3, pb: 1 }}>
        <Typography sx={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, color: "var(--sr-ink)", letterSpacing: "-0.01em" }}>
          หน้าทำงาน
        </Typography>
        <Typography sx={{ fontFamily: SANS, fontSize: 13, color: "var(--sr-muted)", mt: 0.4 }}>
          สู้ๆ นะวันนี้
        </Typography>
      </Box>

      {/* Working Status — moved from TherapistProfilePage (28x.87). Firestore
          rules whitelist statusOverride + isHoliday on therapist docs, so
          writes here succeed for the doc owner and are rejected for anyone
          else. */}
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

      {/* Quick menu — deliberately thin, see file header for what's excluded
          and why. */}
      <Box sx={{ paddingX: 2, marginTop: 2 }}>
        <Typography sx={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, color: "var(--sr-muted)", letterSpacing: "0.1em", textTransform: "uppercase", mb: 1 }}>
          เมนูด่วน
        </Typography>
        <Box
          role="button"
          tabIndex={0}
          onClick={() => navigate("/therapist/reports")}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") void navigate("/therapist/reports"); }}
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
          <Box
            sx={{
              width: 36, height: 36, borderRadius: "10px", flexShrink: 0,
              background: "rgba(217,124,149,0.14)", color: "#D97C95",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Flag size={18} weight="duotone" />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontFamily: SANS, fontWeight: 700, fontSize: "14px", color: "var(--sr-ink)" }}>
              รายการรีพอร์ต · Reports
            </Typography>
            <Typography sx={{ fontFamily: SANS, fontSize: "10.5px", color: "var(--sr-body)", mt: "1px" }}>
              {openReportCount > 0 ? `${openReportCount} รายการยังไม่ได้อ่าน` : "แจ้งจากลูกค้าจะขึ้นที่นี่"}
            </Typography>
          </Box>
          {openReportCount > 0 && (
            <Box
              sx={{
                minWidth: 22, height: 22, px: "6px", borderRadius: "11px",
                background: "#C0562E", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: SANS, fontSize: 11.5, fontWeight: 800,
              }}
            >
              {openReportCount}
            </Box>
          )}
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

/** Same StatusChoice tile as before (moved from TherapistProfilePage). */
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

export default TherapistHomePage;
