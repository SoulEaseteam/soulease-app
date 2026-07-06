// src/pages/admin/AdminTherapistDetailPage.tsx
//
// 🆕 Round 28s271 (founder: screenshot of this page + the separate
//   /admin/edit-therapist page — "เหมือนซ้ำ แก้ และปรับให้สวยขึ้นและเพิ่มมี
//   ฟังชั้นที่ต้องมี") — this page and EditTherapistPage.tsx were two
//   different "edit a therapist" surfaces reachable from the SAME roster
//   card (View → here, Edit → the other page), each editing an
//   overlapping-but-different field subset with no shared logic. Merged
//   into ONE page: every field from both old pages now lives here,
//   EditTherapistPage.tsx is deleted, and the roster's Edit button now
//   opens this page with `?edit=1`.
import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  IconButton,
  Avatar,
  Badge,
  TextField,
  MenuItem,
  Tooltip,
} from "@mui/material";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import dayjs from "dayjs";
import {
  ArrowLeft, PencilSimple, FloppyDisk, X, Eye,
  Star, ChatCircleText, Clock, MapPin, Medal, EyeSlash, Prohibit, Umbrella,
  Calendar, ChartBar, ClockCounterClockwise, TelegramLogo, IdentificationCard, Image as ImageIcon, Sparkle,
  Check, Warning,
} from "phosphor-react";
import { calculateTherapistStatus, isOverrideExpired } from "@/utils/calculateTherapistStatus";
import { endOfTodayBKK, fmtBKKTimeShort } from "@/utils/time";
import { useTherapistBookings, findActiveBooking } from "@/utils/useTherapistBookings";
import { logAdminAction } from "@/utils/auditLog";
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";

type Avail = "available" | "bookable" | "resting" | "holiday";
type StatusOverride = "Auto" | "available" | "bookable" | "resting";

const STATUS_COLOR: Record<Avail, string> = {
  available: adminColor.green,
  bookable: adminColor.amber,
  resting: adminColor.dim,
  holiday: adminColor.red,
};

const badgeOptions = ["", "VIP", "HOT", "NEW"] as const;

const selectMenuProps = {
  PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px", boxShadow: "0 8px 24px rgba(31,41,51,0.16)" } },
} as const;

const fieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: "10px", background: adminColor.panel, fontSize: 13.5 },
  "& .MuiInputLabel-root": { fontSize: 13 },
} as const;

const SectionHeader: React.FC<{ icon: React.ReactNode; children: React.ReactNode }> = ({ icon, children }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: "6px", mb: "10px", color: adminColor.dim }}>
    {icon}
    <Typography sx={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.07em" }}>{children}</Typography>
  </Box>
);

interface FormState {
  name: string;
  customId: string;
  image: string;
  specialty: string;
  rating: string;
  reviews: string;
  startTime: string;
  endTime: string;
  badge: string;
  statusOverride: StatusOverride;
  isHoliday: boolean;
  currentLocation: string;
  hidden: boolean;
  blocked: boolean;
  telegramChatId: string;
}

const EMPTY_FORM: FormState = {
  name: "", customId: "", image: "", specialty: "", rating: "", reviews: "",
  startTime: "", endTime: "", badge: "", statusOverride: "Auto", isHoliday: false,
  currentLocation: "", hidden: false, blocked: false, telegramChatId: "",
};

function toFormState(data: Record<string, unknown>): FormState {
  const rawOverride = data.statusOverride;
  const statusOverride: StatusOverride =
    rawOverride === "available" || rawOverride === "bookable" || rawOverride === "resting" ? rawOverride : "Auto";
  const loc = data.currentLocation;
  return {
    name: (data.name as string) || "",
    customId: (data.customId as string) || "",
    image: (data.image as string) || "",
    specialty: (data.specialty as string) || "",
    rating: data.rating != null ? String(data.rating) : "",
    reviews: data.reviews != null ? String(data.reviews) : "",
    startTime: (data.startTime as string) || "",
    endTime: (data.endTime as string) || "",
    badge: (data.badge as string) || "",
    statusOverride,
    isHoliday: !!data.isHoliday,
    currentLocation:
      loc && typeof loc === "object" ? `${(loc as { lat: number }).lat}, ${(loc as { lng: number }).lng}` : (loc as string) || "",
    hidden: !!data.hidden,
    blocked: !!data.blocked,
    telegramChatId: (data.telegramChatId as string) || "",
  };
}

const AdminTherapistDetailPage: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [docId, setDocId] = useState<string | null>(null);
  const [rawDoc, setRawDoc] = useState<Record<string, unknown> | null>(null);
  const [todayBookings, setTodayBookings] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [lastBookingAt, setLastBookingAt] = useState<Date | null>(null);
  const [saving, setSaving] = useState(false);

  // 🆕 opening the roster's Pencil icon lands here with ?edit=1 pre-armed.
  const [editing, setEditing] = useState(() => searchParams.get("edit") === "1");
  const [formData, setFormData] = useState<FormState>(EMPTY_FORM);
  const originalRef = useRef<FormState>(EMPTY_FORM);

  // ── Live status — same engine + live-bookings merge as the roster
  //    grid (28s267), replacing this page's old hand-rolled, simpler
  //    calc that didn't account for real active bookings.
  const liveBookings = useTherapistBookings(docId);
  const activeBooking = findActiveBooking(liveBookings);

  useEffect(() => {
    if (!id) return;

    let unsubTherapist: (() => void) | null = null;
    let unsubBookings: (() => void) | null = null;

    const fetchData = async () => {
      setLoading(true);

      let docRef: ReturnType<typeof doc> | null = null;
      let resolvedId: string | null = null;

      try {
        const directRef = doc(db, "therapists", id);
        const directSnap = await getDoc(directRef);
        if (directSnap.exists()) {
          docRef = directRef;
          resolvedId = directSnap.id;
        }
      } catch {
        // doc not found at direct ID — fallback to query by field
      }

      if (!docRef) {
        const q = query(collection(db, "therapists"), where("id", "==", id));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          resolvedId = snapshot.docs[0].id;
          docRef = snapshot.docs[0].ref;
        }
      }

      if (!docRef || !resolvedId) {
        setRawDoc(null);
        setLoading(false);
        return;
      }

      setDocId(resolvedId);

      unsubTherapist = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setRawDoc({ id: snap.id, ...data });
          const next = toFormState(data);
          originalRef.current = next;
          // Don't stomp in-progress edits with a live update mid-typing.
          setFormData((prev) => (editing ? prev : next));
        }
      });

      unsubBookings = onSnapshot(
        query(collection(db, "bookings"), where("therapistId", "==", resolvedId)),
        (snap) => {
          const today = dayjs().format("YYYY-MM-DD");
          let todayCount = 0;
          let last: Date | null = null;
          snap.forEach((d) => {
            const b = d.data();
            if (b.date === today) todayCount++;
            if (b.startAt?.toDate) {
              const dDate = b.startAt.toDate();
              if (!last || dDate > last) last = dDate;
            }
          });
          setTodayBookings(todayCount);
          setTotalBookings(snap.size);
          setLastBookingAt(last);
        }
      );

      setLoading(false);
    };

    void fetchData();

    return () => {
      unsubTherapist?.();
      unsubBookings?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const engineInput = rawDoc
    ? { ...(rawDoc as any), activeBooking: !!activeBooking, busyUntil: activeBooking?.endAt ?? null }
    : null;
  const engine = engineInput ? calculateTherapistStatus(engineInput) : null;
  const computedStatus: Avail = engine?.status ?? "resting";
  const overrideActive =
    formData.statusOverride !== "Auto" && !isOverrideExpired((rawDoc as { overrideUntil?: unknown } | null)?.overrideUntil);

  const statusLine = (() => {
    switch (computedStatus) {
      case "available": return "ว่างตอนนี้";
      case "bookable": return activeBooking ? `กำลังนวด · ถึง ${fmtBKKTimeShort(activeBooking.endAt, "—")}` : "จองได้ตอนนี้";
      case "resting": return engine?.nextAvailable ? `พัก · เริ่ม ${engine.nextAvailable}` : "พัก";
      case "holiday": return "วันหยุดวันนี้";
      default: return "";
    }
  })();

  const startEditing = () => {
    setFormData(originalRef.current);
    setEditing(true);
  };
  const cancelEditing = () => {
    setFormData(originalRef.current);
    setEditing(false);
    if (searchParams.get("edit")) {
      searchParams.delete("edit");
      setSearchParams(searchParams, { replace: true });
    }
  };

  const toggleHoliday = (checked: boolean) => {
    setFormData((f) => ({ ...f, isHoliday: checked, ...(checked ? { statusOverride: "Auto" as StatusOverride } : {}) }));
  };
  const changeOverride = (value: StatusOverride) => {
    setFormData((f) => ({ ...f, statusOverride: value, ...(value !== "Auto" ? { isHoliday: false } : {}) }));
  };

  const handleSave = async () => {
    if (!docId) return;
    setSaving(true);

    let locationValue: unknown = formData.currentLocation;
    if (typeof locationValue === "string" && locationValue.includes(",")) {
      const [latStr, lngStr] = locationValue.split(",");
      const lat = parseFloat(latStr.trim());
      const lng = parseFloat(lngStr.trim());
      if (!isNaN(lat) && !isNaN(lng)) locationValue = { lat, lng };
    }

    const patch: Record<string, unknown> = {
      name: formData.name,
      customId: formData.customId,
      image: formData.image,
      specialty: formData.specialty,
      rating: Number(formData.rating) || 0,
      reviews: Number(formData.reviews) || 0,
      startTime: formData.startTime,
      endTime: formData.endTime,
      badge: formData.badge,
      statusOverride: formData.statusOverride,
      // 🆕 Round 28s267's rule, applied here too — a manual override now
      //   expires at end of BKK day instead of sticking forever.
      overrideUntil: formData.statusOverride !== "Auto" ? endOfTodayBKK().toDate() : null,
      isHoliday: formData.isHoliday,
      currentLocation: locationValue,
      hidden: formData.hidden,
      blocked: formData.blocked,
      telegramChatId: formData.telegramChatId,
      updatedAt: serverTimestamp(),
    };

    const changedFields = (Object.keys(formData) as (keyof FormState)[]).filter(
      (k) => formData[k] !== originalRef.current[k]
    );

    try {
      await updateDoc(doc(db, "therapists", docId), patch);
      if (changedFields.length) {
        void logAdminAction("therapist.update", {
          therapistId: docId,
          therapistName: formData.name,
          changedFields,
        });
      }
      originalRef.current = formData;
      setEditing(false);
      if (searchParams.get("edit")) {
        searchParams.delete("edit");
        setSearchParams(searchParams, { replace: true });
      }
    } catch (err) {
      console.error("Failed saving therapist:", err);
      window.alert("บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <Box sx={{ p: 4, textAlign: "center" }}>
        <CircularProgress sx={{ color: adminColor.accent }} />
      </Box>
    );

  if (!rawDoc || !docId)
    return (
      <Box sx={{ p: 4 }}>
        <Typography sx={{ color: adminColor.text }}>Therapist not found.</Typography>
      </Box>
    );

  const ringColor = computedStatus === "resting" ? adminColor.line2 : STATUS_COLOR[computedStatus];

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, background: `radial-gradient(120% 90% at 15% 0%, ${adminColor.panel3} 0%, ${adminColor.bg} 55%)`, minHeight: "100%" }}>
      <Button
        onClick={() => navigate(-1)}
        startIcon={<ArrowLeft size={13} weight="bold" />}
        variant="outlined"
        sx={{ borderColor: adminColor.accent, color: adminColor.accent, fontWeight: "bold", textTransform: "none", borderRadius: "10px", mb: 2.5, "&:hover": { borderColor: adminColor.accentDeep, background: adminColor.panel2 } }}
      >
        Back
      </Button>

      <Box sx={{ background: adminColor.panel, borderRadius: "20px", border: `1px solid ${adminColor.line}`, boxShadow: "0 4px 18px rgba(31,41,51,0.08)", p: { xs: 2.5, md: 3.5 } }}>
        {/* ── Header ─────────────────────────────────────────────── */}
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            variant="dot"
            sx={{ "& .MuiBadge-badge": { background: STATUS_COLOR[computedStatus], width: 15, height: 15, borderRadius: "50%", border: `3px solid ${adminColor.panel}` } }}
          >
            <Avatar src={formData.image} sx={{ width: 76, height: 76, boxShadow: `0 0 0 3px ${adminColor.panel}, 0 0 0 5px ${ringColor}` }} />
          </Badge>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography sx={{ fontFamily: adminFont.serif, fontWeight: 700, fontSize: 24, color: adminColor.text }}>{formData.name || "-"}</Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: "6px", fontSize: 13, fontWeight: 600, color: STATUS_COLOR[computedStatus], mt: "4px" }}>
              {computedStatus === "holiday" ? <Umbrella size={13} weight="bold" /> : <Check size={13} weight="bold" />}
              {statusLine}
              {overrideActive && (
                <Box sx={{ display: "flex", alignItems: "center", gap: "3px", fontSize: 11, fontWeight: 700, color: adminColor.red, background: "rgba(220,38,38,0.08)", borderRadius: "6px", px: "6px", py: "1px", ml: "6px" }}>
                  <Warning size={11} weight="bold" /> override ถึงสิ้นวัน
                </Box>
              )}
            </Box>
            <Typography sx={{ fontSize: 12.5, color: adminColor.dim, mt: "4px" }}>{formData.specialty || "ยังไม่ระบุความถนัด"}</Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            {!editing ? (
              <Tooltip title="Edit">
                <IconButton onClick={startEditing} sx={{ color: adminColor.accent, background: adminColor.panel2, "&:hover": { background: "rgba(78,126,140,0.14)" } }}>
                  <PencilSimple size={18} />
                </IconButton>
              </Tooltip>
            ) : (
              <>
                <Button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  startIcon={<FloppyDisk size={15} weight="bold" />}
                  sx={{ background: `linear-gradient(180deg,#5A8998,${adminColor.accent})`, color: "#fff", textTransform: "none", fontWeight: 700, borderRadius: "10px", boxShadow: "0 3px 10px rgba(78,126,140,0.32)", "&:hover": { background: adminColor.accentDeep } }}
                >
                  Save
                </Button>
                <Button onClick={cancelEditing} startIcon={<X size={15} weight="bold" />} variant="outlined" sx={{ borderColor: adminColor.line2, color: adminColor.muted, textTransform: "none", fontWeight: 700, borderRadius: "10px" }}>
                  Cancel
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* ── Stats row (always visible, always live) ───────────── */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "10px", mt: 2.5, mb: 3 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px", background: adminColor.panel2, borderRadius: "12px", p: "9px 14px" }}>
            <Calendar size={15} color={adminColor.dim} />
            <Typography sx={{ ...adminFigureSx, fontSize: 14 }}>{todayBookings}</Typography>
            <Typography sx={{ fontSize: 11, color: adminColor.dim }}>วันนี้</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px", background: adminColor.panel2, borderRadius: "12px", p: "9px 14px" }}>
            <ChartBar size={15} color={adminColor.dim} />
            <Typography sx={{ ...adminFigureSx, fontSize: 14 }}>{totalBookings}</Typography>
            <Typography sx={{ fontSize: 11, color: adminColor.dim }}>ทั้งหมด</Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: "8px", background: adminColor.panel2, borderRadius: "12px", p: "9px 14px" }}>
            <ClockCounterClockwise size={15} color={adminColor.dim} />
            <Typography sx={{ fontSize: 12.5, fontWeight: 600, color: adminColor.muted }}>
              {lastBookingAt ? dayjs(lastBookingAt).format("YYYY-MM-DD HH:mm") : "ยังไม่เคยมีงาน"}
            </Typography>
          </Box>
        </Box>

        {!editing ? (
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <ReadRow icon={<Star size={14} />} label="Rating" value={formData.rating || "0"} />
              <ReadRow icon={<ChatCircleText size={14} />} label="Reviews" value={formData.reviews || "0"} />
              <ReadRow icon={<Clock size={14} />} label="Hours" value={`${formData.startTime || "--:--"} – ${formData.endTime || "--:--"}`} />
              <ReadRow icon={<MapPin size={14} />} label="Location" value={formData.currentLocation || "—"} />
              <ReadRow icon={<Medal size={14} />} label="Badge" value={formData.badge || "None"} />
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <ReadRow icon={<IdentificationCard size={14} />} label="Custom ID" value={formData.customId || "—"} />
              <ReadRow icon={<TelegramLogo size={14} />} label="Telegram" value={formData.telegramChatId || "ยังไม่ผูก"} />
              <ReadRow icon={<EyeSlash size={14} />} label="Hidden" value={formData.hidden ? "ซ่อนจากหน้าเว็บ" : "แสดงปกติ"} alert={formData.hidden} />
              <ReadRow icon={<Prohibit size={14} />} label="Blocked" value={formData.blocked ? "ปิดใช้งาน" : "ใช้งานปกติ"} alert={formData.blocked} />
              <ReadRow icon={<Umbrella size={14} />} label="Holiday" value={formData.isHoliday ? "วันหยุดวันนี้" : "ไม่ได้หยุด"} alert={formData.isHoliday} />
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
            <Box>
              <SectionHeader icon={<Sparkle size={13} />}>โปรไฟล์</SectionHeader>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                <TextField label="Name" fullWidth size="small" sx={fieldSx} value={formData.name} onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))} />
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField label="Custom ID (for URL)" fullWidth size="small" sx={fieldSx} value={formData.customId} onChange={(e) => setFormData((f) => ({ ...f, customId: e.target.value }))} />
                  <TextField label="Image URL" fullWidth size="small" sx={fieldSx} value={formData.image} onChange={(e) => setFormData((f) => ({ ...f, image: e.target.value }))} />
                </Box>
                <TextField label="Specialty" fullWidth size="small" sx={fieldSx} value={formData.specialty} onChange={(e) => setFormData((f) => ({ ...f, specialty: e.target.value }))} />
              </Box>
            </Box>

            <Box>
              <SectionHeader icon={<Clock size={13} />}>ตารางเวลาและสถานะ</SectionHeader>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1.25 }}>
                <Box sx={{ display: "flex", gap: 1 }}>
                  <TextField label="Start Time" type="time" fullWidth size="small" sx={fieldSx} InputLabelProps={{ shrink: true }} value={formData.startTime} onChange={(e) => setFormData((f) => ({ ...f, startTime: e.target.value }))} />
                  <TextField label="End Time" type="time" fullWidth size="small" sx={fieldSx} InputLabelProps={{ shrink: true }} value={formData.endTime} onChange={(e) => setFormData((f) => ({ ...f, endTime: e.target.value }))} />
                </Box>
                <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                  <TextField
                    select label="Status Override" fullWidth size="small" sx={fieldSx}
                    value={formData.statusOverride}
                    onChange={(e) => changeOverride(e.target.value as StatusOverride)}
                    SelectProps={{ MenuProps: selectMenuProps, displayEmpty: true }}
                  >
                    <MenuItem value="Auto">Auto</MenuItem>
                    <MenuItem value="available">Available</MenuItem>
                    <MenuItem value="bookable">Bookable</MenuItem>
                    <MenuItem value="resting">Resting</MenuItem>
                  </TextField>
                  {/* 🆕 Round 28s271 — Holiday was previously only settable from
                      the roster grid; missing here (flagged in CLAUDE.md's
                      Phase-4 TODO: "EditTherapistPage vs grid inconsistency"). */}
                  <Box
                    onClick={() => toggleHoliday(!formData.isHoliday)}
                    sx={{
                      display: "flex", alignItems: "center", gap: "6px", fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                      borderRadius: "10px", padding: "9px 14px", whiteSpace: "nowrap",
                      border: `1px solid ${formData.isHoliday ? "rgba(220,38,38,0.25)" : adminColor.line}`,
                      background: formData.isHoliday ? "rgba(220,38,38,0.09)" : adminColor.panel2,
                      color: formData.isHoliday ? adminColor.red : adminColor.dim,
                    }}
                  >
                    <Umbrella size={14} weight={formData.isHoliday ? "fill" : "regular"} /> Holiday
                  </Box>
                </Box>
                <TextField label="Location (lat,lng)" fullWidth size="small" sx={fieldSx} value={formData.currentLocation} onChange={(e) => setFormData((f) => ({ ...f, currentLocation: e.target.value }))} />
              </Box>
            </Box>

            <Box>
              <SectionHeader icon={<Star size={13} />}>ชื่อเสียง</SectionHeader>
              <Box sx={{ display: "flex", gap: 1 }}>
                <TextField label="Rating" type="number" fullWidth size="small" sx={fieldSx} value={formData.rating} onChange={(e) => setFormData((f) => ({ ...f, rating: e.target.value }))} />
                <TextField label="Reviews" type="number" fullWidth size="small" sx={fieldSx} value={formData.reviews} onChange={(e) => setFormData((f) => ({ ...f, reviews: e.target.value }))} />
                <TextField
                  select label="Badge" fullWidth size="small" sx={fieldSx}
                  value={formData.badge}
                  onChange={(e) => setFormData((f) => ({ ...f, badge: e.target.value }))}
                  SelectProps={{ MenuProps: selectMenuProps, displayEmpty: true }}
                >
                  {badgeOptions.map((b) => (
                    <MenuItem key={b} value={b}>{b || "None"}</MenuItem>
                  ))}
                </TextField>
              </Box>
            </Box>

            <Box>
              <SectionHeader icon={<EyeSlash size={13} />}>การมองเห็น</SectionHeader>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Box
                  onClick={() => setFormData((f) => ({ ...f, hidden: !f.hidden }))}
                  sx={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", borderRadius: "10px", padding: "9px 14px", border: `1px solid ${formData.hidden ? "rgba(220,38,38,0.25)" : adminColor.line}`, background: formData.hidden ? "rgba(220,38,38,0.09)" : adminColor.panel2, color: formData.hidden ? adminColor.red : adminColor.dim }}
                >
                  <EyeSlash size={14} weight={formData.hidden ? "fill" : "regular"} /> Hide from Homepage
                </Box>
                <Box
                  onClick={() => setFormData((f) => ({ ...f, blocked: !f.blocked }))}
                  sx={{ flex: 1, display: "flex", alignItems: "center", gap: "6px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", borderRadius: "10px", padding: "9px 14px", border: `1px solid ${formData.blocked ? "rgba(220,38,38,0.25)" : adminColor.line}`, background: formData.blocked ? "rgba(220,38,38,0.09)" : adminColor.panel2, color: formData.blocked ? adminColor.red : adminColor.dim }}
                >
                  <Prohibit size={14} weight={formData.blocked ? "fill" : "regular"} /> Blocked (Unavailable)
                </Box>
              </Box>
            </Box>

            <Box>
              <SectionHeader icon={<TelegramLogo size={13} />}>ติดต่อ</SectionHeader>
              {/* 🆕 Round 28b27 — when set, the therapist receives a personal
                  DM from @SunRedBot every time a booking is assigned to
                  them. Onboarding: therapist sends /myid to @SunRedBot to
                  get this number. */}
              <TextField
                label="Telegram Chat ID (for job DMs)" fullWidth size="small" sx={fieldSx}
                value={formData.telegramChatId}
                onChange={(e) => setFormData((f) => ({ ...f, telegramChatId: e.target.value }))}
                helperText="Therapist sends /myid to @SunRedBot to get this number. Leave blank if not on Telegram."
                placeholder="e.g. 123456789"
                inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
              />
            </Box>
          </Box>
        )}

        <Box sx={{ mt: 3, pt: 2.5, borderTop: `1px solid ${adminColor.line}` }}>
          <Button
            onClick={() => navigate(`/therapists/${docId}`)}
            startIcon={<Eye size={15} />}
            sx={{ color: adminColor.accent, textTransform: "none", fontWeight: 700 }}
          >
            View Public Profile
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

const ReadRow: React.FC<{ icon: React.ReactNode; label: string; value: string; alert?: boolean }> = ({ icon, label, value, alert }) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: "10px", background: adminColor.panel2, borderRadius: "10px", p: "9px 13px" }}>
    <Box sx={{ color: alert ? adminColor.red : adminColor.dim, display: "flex" }}>{icon}</Box>
    <Typography sx={{ fontSize: 11.5, color: adminColor.dim, minWidth: 70 }}>{label}</Typography>
    <Typography sx={{ fontSize: 13, fontWeight: 600, color: alert ? adminColor.red : adminColor.text, ml: "auto", textAlign: "right" }}>{value}</Typography>
  </Box>
);

export default AdminTherapistDetailPage;
