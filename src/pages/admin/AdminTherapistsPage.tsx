import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  IconButton,
  CircularProgress,
  Tooltip,
  Avatar,
  Badge,
  Button,
  ToggleButtonGroup,
  ToggleButton,
  InputAdornment,
} from "@mui/material";

// 🆕 Round 28s268 (founder: "ทำให้สวยขึ้น") — switched from MUI icons/emoji
//   to phosphor-react, matching every other Ocean-Study-migrated admin page
//   (AdminUsersPage, AdminBookingListPage, AdminEarningsPage, etc.).
import { Eye, PencilSimple, Trash, Umbrella, Warning, Check, Clock, MagnifyingGlass, ArrowLeft, UserPlus } from "phosphor-react";

import {
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
  writeBatch,
  serverTimestamp,
  query,
  where,
  getCountFromServer,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
// 🆕 Round 28s230 (FIX B) — use the SAME Bangkok-anchored engine the public
//   site uses (calculateTherapistStatus), not the legacy device-clock
//   computeStatus. Previously the admin grid and the live site could disagree
//   ("I set her available but the site says closed").
import { calculateTherapistStatus, isOverrideExpired } from "@/utils/calculateTherapistStatus";
import type { Therapist } from "@/types/therapist";
import { logAdminAction } from "@/utils/auditLog";
import { nowBKK, endOfTodayBKK, fmtBKKTimeShort } from "@/utils/time";
// 🆕 Round 28s267 (audit: "admin sees a different busy status than
//   customers do") — same live-bookings derivation BookingFlowPage/
//   TherapistDetailPage already use (28b49), now shared here instead of
//   trusting the legacy manual `isBooked` toggle.
import {
  ACTIVE_STATUSES,
  fromSnap,
  findActiveBooking,
  type TherapistBooking,
} from "@/utils/useTherapistBookings";
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";

// ==========================================================
// TYPES
// ==========================================================
type TherapistStatus = "available" | "bookable" | "resting" | "holiday";
type TherapistStatusOverride =
  | "Auto"
  | "available"
  | "bookable"
  | "resting"
  | null;

type RawTherapistDoc = {
  id: string;
  name?: string;
  image?: string;
  startTime?: string;
  endTime?: string;
  isHoliday?: boolean;
  isBooked?: boolean;
  statusOverride?: TherapistStatusOverride;
  overrideUntil?: unknown;
  [key: string]: any;
};

type TherapistRow = RawTherapistDoc & {
  computedStatus: TherapistStatus;
  todayBookings: number;
  totalBookings: number;
  /** 🆕 Round 28s267 — end time of the therapist's current live booking,
   *  or null if she's free right now. Replaces the old manual "Session"
   *  switch, which nothing ever kept in sync with real bookings. */
  activeBookingEndAt: Date | null;
  /** 🆕 Round 28s267 — true only when an override is BOTH set and not yet
   *  expired, so the roster summary's "ค้าง override" count doesn't keep
   *  flagging an override the engine has already stopped honouring. */
  overrideActive: boolean;
  /** 🆕 Round 28s268 — carried through from the engine so the card's
   *  single status line can say "resting · back at 20:00" instead of
   *  just "resting". */
  nextAvailable: string | null;
};

const STATUS_COLOR: Record<TherapistStatus, string> = {
  available: adminColor.green,
  bookable: adminColor.amber,
  resting: adminColor.dim,
  holiday: adminColor.red,
};

// 🆕 Round 28s269 (founder: "เอาคนหยุดไว้ด้านล่าง") — actionable people
// (available/bookable) sort above resting/holiday, matching the "cards
// recede once terminal" rule they already visually follow.
const STATUS_SORT_ORDER: Record<TherapistStatus, number> = {
  available: 0,
  bookable: 1,
  resting: 2,
  holiday: 3,
};

// 🆕 Round 28s256's nested-frame lesson, reused: a background meaningfully
// darker than the page bg needs to blend toward `dim`/`text`, not `bg`
// again (adminColor.panel3 is a bg-toward-white blend and reads almost
// identical to the page background). Same exact 18%-toward-dim blend
// AdminBookingListPage already established for this purpose.
const CARD_FRAME_BG = "#C5D8DF";

const selectMenuProps = {
  PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px", boxShadow: "0 8px 24px rgba(31,41,51,0.16)" } },
} as const;

function statusLine(row: TherapistRow): string {
  switch (row.computedStatus) {
    case "available":
      return "ว่างตอนนี้";
    case "bookable":
      return row.activeBookingEndAt
        ? `กำลังนวด · ถึง ${fmtBKKTimeShort(row.activeBookingEndAt, "—")}`
        : "จองได้ตอนนี้";
    case "resting":
      return row.nextAvailable ? `พัก · เริ่ม ${row.nextAvailable}` : "พัก";
    case "holiday":
      return "วันหยุดวันนี้";
    default:
      return "";
  }
}

const STATUS_ICON: Record<TherapistStatus, React.ElementType> = {
  available: Check,
  bookable: Clock,
  resting: Clock,
  holiday: Umbrella,
};

// ==========================================================
// CARD — module-scope so it never gets redefined per-render (the exact
// remount-on-keystroke bug filed in 28s249 for a similarly-shaped mistake).
// ==========================================================
const TherapistCard: React.FC<{
  row: TherapistRow;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (row: TherapistRow) => void;
  onToggleHoliday: (row: TherapistRow, checked: boolean) => void;
  onChangeOverride: (row: TherapistRow, value: TherapistStatusOverride) => void;
  onChangeTime: (row: TherapistRow, key: "startTime" | "endTime", value: string) => void;
}> = ({ row, onView, onEdit, onDelete, onToggleHoliday, onChangeOverride, onChangeTime }) => {
  const recede = row.computedStatus === "resting" || row.computedStatus === "holiday";
  const color = STATUS_COLOR[row.computedStatus];
  const ringColor = row.computedStatus === "resting" ? adminColor.line2 : color;
  const StatusIcon = STATUS_ICON[row.computedStatus];
  const cardBg = recede ? adminColor.panel2 : adminColor.panel;

  return (
    <Box sx={{ background: `linear-gradient(155deg, ${CARD_FRAME_BG}, #D6E5EA)`, borderRadius: "24px", p: "8px" }}>
      <Box
        sx={{
          background: cardBg,
          borderRadius: "18px",
          p: "18px 18px 14px",
          // 🆕 Round 28r46 — subtle depth at rest so cards read as
          // liftable objects, not flat; recede cards keep no shadow.
          boxShadow: recede ? "none" : "0 2px 10px rgba(31,41,51,0.04)",
          transition: "transform 0.2s cubic-bezier(.2,.8,.3,1), box-shadow 0.2s ease",
          "&:hover": recede
            ? { cursor: "pointer" }
            : { transform: "translateY(-4px)", boxShadow: "0 14px 30px rgba(31,41,51,0.16)", cursor: "pointer" },
        }}
        onClick={() => onView(row.id)}
      >
        {/* ── Head: avatar + name + status line ─────────────────── */}
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: "13px", mb: "13px" }}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            variant="dot"
            sx={{
              "& .MuiBadge-badge": {
                background: color,
                width: 13, height: 13, borderRadius: "50%",
                border: `2.5px solid ${cardBg}`,
              },
            }}
          >
            <Avatar
              src={row.image || ""}
              sx={{
                width: 54, height: 54,
                boxShadow: `0 0 0 3px ${cardBg}, 0 0 0 4.5px ${ringColor}`,
                filter: recede ? "grayscale(30%)" : "none",
              }}
            />
          </Badge>
          <Box sx={{ flex: 1, minWidth: 0, pt: "1px" }}>
            <Typography sx={{ fontFamily: adminFont.serif, fontWeight: 700, fontSize: 16.5, color: recede ? adminColor.muted : adminColor.text, m: 0, mb: "3px" }}>
              {row.name || "-"}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: "5px", fontSize: 12, fontWeight: 600, color }}>
              <StatusIcon size={12} weight="bold" />
              {statusLine(row)}
            </Box>
          </Box>
        </Box>

        {/* ── Meta row: hours + today/total ──────────────────────── */}
        <Box sx={{ display: "flex", alignItems: "center", gap: "8px", fontSize: 12, color: adminColor.muted, mb: "12px", pb: "12px", borderBottom: `1px solid ${recede ? adminColor.line2 : adminColor.line}` }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: "5px", fontWeight: 600 }}>
            <Clock size={13} color={adminColor.dim} />
            {row.startTime || "--:--"}–{row.endTime || "--:--"}
          </Box>
          <Box sx={{ display: "flex", gap: "1px", ml: "auto", background: adminColor.panel3, borderRadius: "9px", overflow: "hidden" }} onClick={(e) => e.stopPropagation()}>
            <Box sx={{ textAlign: "center", p: "5px 11px" }}>
              <Typography sx={{ ...adminFigureSx, fontSize: 14, color: recede ? adminColor.muted : adminColor.text, lineHeight: 1 }}>{row.todayBookings || 0}</Typography>
              <Typography sx={{ fontSize: 8.5, color: adminColor.dim, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, mt: "2px" }}>Today</Typography>
            </Box>
            <Box sx={{ textAlign: "center", p: "5px 11px" }}>
              <Typography sx={{ ...adminFigureSx, fontSize: 14, color: recede ? adminColor.muted : adminColor.text, lineHeight: 1 }}>{row.totalBookings || 0}</Typography>
              <Typography sx={{ fontSize: 8.5, color: adminColor.dim, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, mt: "2px" }}>Total</Typography>
            </Box>
          </Box>
        </Box>

        {/* ── Controls: holiday chip + override select + time edit ── */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }} onClick={(e) => e.stopPropagation()}>
          <Box
            onClick={() => onToggleHoliday(row, !row.isHoliday)}
            sx={{
              display: "flex", alignItems: "center", gap: "5px", fontSize: 11, fontWeight: 700, cursor: "pointer",
              borderRadius: "9px", padding: "6px 10px", border: `1px solid ${row.isHoliday ? "rgba(220,38,38,0.22)" : adminColor.line}`,
              background: row.isHoliday ? "rgba(220,38,38,0.09)" : adminColor.panel2,
              color: row.isHoliday ? adminColor.red : adminColor.dim,
            }}
          >
            <Umbrella size={13} weight={row.isHoliday ? "fill" : "regular"} />
            Holiday
          </Box>

          <Select
            size="small"
            value={row.statusOverride || "Auto"}
            MenuProps={selectMenuProps}
            onChange={(e) => onChangeOverride(row, e.target.value as TherapistStatusOverride)}
            sx={{
              fontSize: 11.5, fontWeight: 700,
              color: row.overrideActive ? adminColor.red : adminColor.accent,
              background: row.overrideActive ? "rgba(220,38,38,0.07)" : adminColor.panel2,
              borderRadius: "9px",
              "& .MuiOutlinedInput-notchedOutline": { border: `1px solid ${row.overrideActive ? "rgba(220,38,38,0.25)" : adminColor.line}` },
              "& .MuiSelect-select": { padding: "6px 10px" },
            }}
          >
            <MenuItem value="Auto">Auto</MenuItem>
            <MenuItem value="available">Available</MenuItem>
            <MenuItem value="bookable">Bookable</MenuItem>
            <MenuItem value="resting">Resting</MenuItem>
          </Select>
        </Box>

        <Box sx={{ display: "flex", gap: "8px", mt: "10px" }} onClick={(e) => e.stopPropagation()}>
          <TextField
            type="time" size="small" fullWidth value={row.startTime || ""}
            onChange={(e) => onChangeTime(row, "startTime", e.target.value)}
            sx={{ "& .MuiInputBase-input": { fontSize: 12.5, py: "6px" } }}
          />
          <TextField
            type="time" size="small" fullWidth value={row.endTime || ""}
            onChange={(e) => onChangeTime(row, "endTime", e.target.value)}
            sx={{ "& .MuiInputBase-input": { fontSize: 12.5, py: "6px" } }}
          />
        </Box>

        {/* ── Actions ─────────────────────────────────────────────── */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: "2px", mt: "12px", pt: "12px", borderTop: `1px solid ${recede ? adminColor.line2 : adminColor.line}` }} onClick={(e) => e.stopPropagation()}>
          <Tooltip title="View">
            <IconButton size="small" onClick={() => onView(row.id)} sx={{ color: adminColor.dim, "&:hover": { background: adminColor.panel2, color: adminColor.text } }}>
              <Eye size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => onEdit(row.id)} sx={{ color: adminColor.dim, "&:hover": { background: "rgba(78,126,140,0.10)", color: adminColor.accent } }}>
              <PencilSimple size={16} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={() => void onDelete(row)} sx={{ color: adminColor.dim, "&:hover": { background: "rgba(220,38,38,0.09)", color: adminColor.red } }}>
              <Trash size={16} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
    </Box>
  );
};

// ==========================================================
// MAIN PAGE
// ==========================================================
const AdminTherapistsPage: React.FC = () => {
  const [rawTherapists, setRawTherapists] = useState<RawTherapistDoc[]>([]);
  const [loading, setLoading] = useState(true);

  // 🆕 Round 28s267 — live-bookings overlays, kept as separate state so each
  //   Firestore listener stays independently bounded (see effects below).
  const [activeBookingsByTherapist, setActiveBookingsByTherapist] = useState<Map<string, TherapistBooking[]>>(new Map());
  const [todayCountByTherapist, setTodayCountByTherapist] = useState<Map<string, number>>(new Map());
  const [totalCountByTherapist, setTotalCountByTherapist] = useState<Map<string, number>>(new Map());

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | TherapistStatus>("all");

  const navigate = useNavigate();

  const timeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  // 🆕 Round 28s267 (audit: "แก้ค่าแล้วรีบกดออกจากหน้า ข้อมูลหายเงียบ") —
  //   pending debounced writes, keyed the same as timeoutRef, so unmount
  //   can FLUSH them instead of just clearing the timer and losing the edit.
  const pendingRef = useRef<Record<string, () => Promise<void>>>({});

  // ==========================================================
  // DEBOUNCED UPDATE — now takes a field map so a single logical edit
  // (e.g. statusOverride + overrideUntil) lands in one Firestore write.
  // ==========================================================
  const updateDebounced = (id: string, fields: Record<string, unknown>) => {
    const mapKey = `${id}_${Object.keys(fields).sort().join("_")}`;

    if (timeoutRef.current[mapKey]) {
      clearTimeout(timeoutRef.current[mapKey]);
    }

    const write = async () => {
      delete pendingRef.current[mapKey];
      try {
        // 🆕 Round 28s230 — bump updatedAt so stale-state tooling stays honest.
        await updateDoc(doc(db, "therapists", id), {
          ...fields,
          updatedAt: serverTimestamp(),
        });
      } catch (error) {
        console.error(`Failed updating therapist ${id}:`, fields, error);
      }
    };
    pendingRef.current[mapKey] = write;

    timeoutRef.current[mapKey] = setTimeout(() => {
      void write();
    }, 250);
  };

  const [batching, setBatching] = useState(false);
  const rosterBatch = async (mode: "all-available" | "auto") => {
    const label =
      mode === "all-available"
        ? "ตั้งหมอนวดทุกคน (ที่ไม่ใช่วันหยุด) เป็น 'ว่าง' คืนนี้?"
        : "ล้าง override ทุกคนกลับเป็น Auto (ใช้เวลาทำงานปกติ)?";
    if (!window.confirm(label)) return;
    setBatching(true);
    try {
      const batch = writeBatch(db);
      for (const t of rawTherapists) {
        if (mode === "all-available" && t.isHoliday) continue; // respect real days off
        batch.update(doc(db, "therapists", t.id), {
          statusOverride: mode === "all-available" ? "available" : "Auto",
          // 🆕 Round 28s267 — batch-set availability also expires at end of
          //   day, same safety net as the per-row override select below.
          overrideUntil: mode === "all-available" ? endOfTodayBKK().toDate() : null,
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
      void logAdminAction(mode === "all-available" ? "therapist.relight_all" : "therapist.reset_auto", {
        count: rawTherapists.length,
      });
    } catch (e) {
      console.error("[rosterBatch] failed", e);
      window.alert("อัปเดตไม่สำเร็จ ลองใหม่อีกครั้ง");
    } finally {
      setBatching(false);
    }
  };

  // ==========================================================
  // REAL-TIME LOAD — therapist roster (raw docs only; live-booking
  // overlays are merged separately below so each listener stays bounded).
  // ==========================================================
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "therapists"),
      (snap) => {
        const list: RawTherapistDoc[] = snap.docs.map((d) => ({ id: d.id, ...d.data() } as RawTherapistDoc));
        setRawTherapists(list);
        setLoading(false);
      },
      (error) => {
        console.error("Failed loading therapists:", error);
        setLoading(false);
      }
    );

    return () => {
      unsub();
      Object.values(timeoutRef.current).forEach(clearTimeout);
      // 🆕 Round 28s267 — flush any writes still pending at unmount instead
      //   of silently discarding them (the old bug: edit, immediately hit
      //   Back within 250ms, edit vanished with no save and no warning).
      Object.values(pendingRef.current).forEach((flush) => void flush());
    };
  }, []);

  // 🆕 Round 28s267 — shop-wide ACTIVE bookings only (confirmed/pending/
  //   in_progress). Bounded by status, not a `limit()`, the same way a
  //   single therapist's own listener is bounded elsewhere in the app —
  //   completed/cancelled history (the other ~590+ docs) never enters
  //   this listener at all.
  useEffect(() => {
    const q = query(collection(db, "bookings"), where("status", "in", Array.from(ACTIVE_STATUSES)));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const map = new Map<string, TherapistBooking[]>();
        snap.docs.forEach((d) => {
          const therapistId = d.data().therapistId as string | undefined;
          if (!therapistId) return;
          const b = fromSnap(d);
          if (!b) return;
          const arr = map.get(therapistId) ?? [];
          arr.push(b);
          map.set(therapistId, arr);
        });
        setActiveBookingsByTherapist(map);
      },
      (err) => console.warn("[AdminTherapistsPage] active-bookings listener failed", err)
    );
    return unsub;
  }, []);

  // 🆕 Round 28s267 (audit: "Today/Total columns always show 0") — bounded
  //   to TODAY's bookings only (one day of shop volume, safe to listen to
  //   live), grouped client-side per therapist.
  useEffect(() => {
    const todayStr = nowBKK().format("YYYY-MM-DD");
    const q = query(collection(db, "bookings"), where("date", "==", todayStr));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const map = new Map<string, number>();
        snap.docs.forEach((d) => {
          const therapistId = d.data().therapistId as string | undefined;
          if (!therapistId) return;
          map.set(therapistId, (map.get(therapistId) ?? 0) + 1);
        });
        setTodayCountByTherapist(map);
      },
      (err) => console.warn("[AdminTherapistsPage] today-bookings listener failed", err)
    );
    return unsub;
  }, []);

  // 🆕 Round 28s267 — lifetime totals via a server-side COUNT aggregation
  //   (no documents downloaded) instead of the dead, never-written
  //   `totalBookings` field. Refetched only when the roster's id set
  //   changes — a lifetime figure doesn't need sub-second freshness.
  const rosterIdsKey = rawTherapists.map((t) => t.id).sort().join(",");
  useEffect(() => {
    if (!rawTherapists.length) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        rawTherapists.map(async (t) => {
          try {
            const snap = await getCountFromServer(query(collection(db, "bookings"), where("therapistId", "==", t.id)));
            return [t.id, snap.data().count] as const;
          } catch (e) {
            console.warn("[AdminTherapistsPage] total-count failed for", t.id, e);
            return [t.id, 0] as const;
          }
        })
      );
      if (!cancelled) setTotalCountByTherapist(new Map(entries));
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterIdsKey]);

  // ==========================================================
  // MERGE — raw doc + live-booking overlays → the row the UI renders.
  // ==========================================================
  const therapists: TherapistRow[] = useMemo(() => {
    return rawTherapists.map((raw) => {
      const activeBookings = activeBookingsByTherapist.get(raw.id) ?? [];
      const activeBooking = findActiveBooking(activeBookings);
      const merged = {
        ...(raw as unknown as Therapist),
        // Always derived from live bookings — this is what makes admin's
        // own status agree with what customers already see (28b49 did the
        // same merge for the booking flow; admin never got it until now).
        activeBooking: !!activeBooking,
        busyUntil: activeBooking?.endAt ?? null,
      };
      const engine = calculateTherapistStatus(merged);
      const overrideActive =
        !!raw.statusOverride && raw.statusOverride !== "Auto" && !isOverrideExpired(raw.overrideUntil);
      return {
        ...raw,
        computedStatus: engine.status,
        nextAvailable: engine.nextAvailable,
        todayBookings: todayCountByTherapist.get(raw.id) ?? 0,
        totalBookings: totalCountByTherapist.get(raw.id) ?? 0,
        activeBookingEndAt: activeBooking?.endAt ?? null,
        overrideActive,
      } as TherapistRow;
    });
  }, [rawTherapists, activeBookingsByTherapist, todayCountByTherapist, totalCountByTherapist]);

  // 🆕 Round 28s230 (FIX C) — live roster summary + one-tap relight, so View
  //   can fix "everyone shows offline at night" from her phone in one action.
  const summary = useMemo(() => {
    const s = { available: 0, bookable: 0, resting: 0, holiday: 0, override: 0 };
    for (const t of therapists) {
      const cs = String(t.computedStatus);
      if (cs in s) (s as Record<string, number>)[cs]++;
      if (t.overrideActive) s.override++;
    }
    return s;
  }, [therapists]);

  // ==========================================================
  // FILTERED LIST
  // ==========================================================
  const filtered = useMemo(() => {
    return therapists
      .filter((t) => {
        const nameOk = (t.name || "")
          .toLowerCase()
          .includes(search.trim().toLowerCase());

        const statusOk = filter === "all" || filter === t.computedStatus;

        return nameOk && statusOk;
      })
      // 🆕 Round 28s269 — resting/holiday sink to the bottom; stable sort
      //   keeps each status group in its original (roster) order.
      .sort((a, b) => STATUS_SORT_ORDER[a.computedStatus] - STATUS_SORT_ORDER[b.computedStatus]);
  }, [therapists, search, filter]);

  // ==========================================================
  // EDIT HANDLERS
  // ==========================================================
  const applyOverride = (row: TherapistRow, value: TherapistStatusOverride) => {
    updateDebounced(row.id, {
      statusOverride: value,
      // 🆕 Round 28s267 (audit: "Override ไม่หมดอายุอัตโนมัติ") — any
      //   manual override now expires at end of BKK day instead of sticking
      //   forever until someone remembers to clear it.
      overrideUntil: value && value !== "Auto" ? endOfTodayBKK().toDate() : null,
      ...(value && value !== "Auto" ? { isHoliday: false } : {}),
    });
    void logAdminAction("therapist.update", {
      therapistId: row.id,
      therapistName: row.name,
      field: "statusOverride",
      value: value || "Auto",
    });
  };

  const applyHoliday = (row: TherapistRow, checked: boolean) => {
    updateDebounced(row.id, checked ? { isHoliday: true, statusOverride: "Auto", overrideUntil: null } : { isHoliday: false });
    void logAdminAction("therapist.update", {
      therapistId: row.id,
      therapistName: row.name,
      field: "isHoliday",
      value: checked,
    });
  };

  const applyTime = (row: TherapistRow, key: "startTime" | "endTime", value: string) => {
    updateDebounced(row.id, { [key]: value });
    void logAdminAction("therapist.update", {
      therapistId: row.id,
      therapistName: row.name,
      field: key,
      value,
    });
  };

  // ==========================================================
  // DELETE
  // ==========================================================
  const handleDelete = async (row: TherapistRow) => {
    // 🆕 Round 28s267 (audit: "ลบหมอนวดแบบไม่มีเบรก") — surface real risk
    //   before a permanent delete instead of a blind window.confirm.
    let bookingCount = 0;
    try {
      const snap = await getCountFromServer(query(collection(db, "bookings"), where("therapistId", "==", row.id)));
      bookingCount = snap.data().count;
    } catch (e) {
      console.warn("[AdminTherapistsPage] delete precheck failed", e);
    }
    const warning =
      bookingCount > 0
        ? `ลบ "${row.name || row.id}" ทิ้งถาวร?\n\nมีประวัติการจอง ${bookingCount} รายการผูกกับหมอนวดคนนี้ — รายงาน/ยอดเก่ายังอยู่ แต่จะเปิดดูโปรไฟล์หมอนวดคนนี้ไม่ได้อีก`
        : `ลบ "${row.name || row.id}" ทิ้งถาวร? (ไม่มีประวัติการจองผูกอยู่)`;
    if (!window.confirm(warning)) return;

    try {
      await deleteDoc(doc(db, "therapists", row.id));
      void logAdminAction("therapist.delete", { therapistId: row.id, therapistName: row.name, bookingCount });
    } catch (error) {
      console.error("Failed deleting therapist:", error);
      window.alert("ลบไม่สำเร็จ ลองใหม่อีกครั้ง");
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, background: `radial-gradient(120% 90% at 15% 0%, ${adminColor.panel3} 0%, ${adminColor.bg} 55%)`, minHeight: "100%" }}>
      <Box mb={2.5}>
        <Button
          onClick={() => {
            if (window.history.length > 1) {
              void navigate(-1);
            } else {
              void navigate("/admin/dashboard");
            }
          }}
          startIcon={<ArrowLeft size={13} weight="bold" />}
          variant="outlined"
          sx={{
            borderColor: adminColor.accent,
            color: adminColor.accent,
            fontWeight: "bold",
            textTransform: "none",
            borderRadius: "10px",
            "&:hover": {
              borderColor: adminColor.accentDeep,
              background: adminColor.panel2,
            },
          }}
        >
          Back
        </Button>
      </Box>

      <Box sx={{ mb: 2.5 }}>
        <Typography sx={{ fontFamily: adminFont.serif, fontSize: 25, fontWeight: 700, color: adminColor.text, lineHeight: 1.15 }}>
          Therapists
        </Typography>
        <Typography sx={{ fontSize: 12, color: adminColor.dim, mt: "3px" }}>
          หมอนวด · {therapists.length} in roster · live updates
        </Typography>
      </Box>

      {/* 🆕 Round 28s230 (FIX C) — live roster summary + one-tap relight.
          Counts use the same BKK engine as the public site (FIX B), so this
          is exactly what guests see right now. Round 28s268 — icon-circle
          stat pills, matching Dashboard/Earnings' widget vocabulary.
          🆕 Round 28r46 — bilingual English + Thai subtitle labels;
          46px icon plates + inner-highlight shadow + radius 18. */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "10px", mb: 2.5, alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: "12px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "18px", p: "9px 18px 9px 9px", boxShadow: "0 2px 10px rgba(31,41,51,0.04)" }}>
          <Box sx={{ width: 46, height: 46, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, #22C55E, ${adminColor.green})`, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 1px 3px rgba(22,163,74,0.22)" }} />
          <Box>
            <Typography sx={{ ...adminFigureSx, fontSize: 20, color: adminColor.green, lineHeight: 1.05 }}>{summary.available}</Typography>
            <Typography sx={{ fontSize: 10, color: adminColor.text, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 800, mt: "1px" }}>Available</Typography>
            <Typography sx={{ fontSize: 9.5, color: adminColor.dim, mt: "-1px" }}>ว่าง</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: "12px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "18px", p: "9px 18px 9px 9px", boxShadow: "0 2px 10px rgba(31,41,51,0.04)" }}>
          <Box sx={{ width: 46, height: 46, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, #F59E0B, ${adminColor.amber})`, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 1px 3px rgba(217,119,6,0.22)" }} />
          <Box>
            <Typography sx={{ ...adminFigureSx, fontSize: 20, color: adminColor.amber, lineHeight: 1.05 }}>{summary.bookable}</Typography>
            <Typography sx={{ fontSize: 10, color: adminColor.text, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 800, mt: "1px" }}>Bookable</Typography>
            <Typography sx={{ fontSize: 9.5, color: adminColor.dim, mt: "-1px" }}>จองได้</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: "12px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "18px", p: "9px 18px 9px 9px", boxShadow: "0 2px 10px rgba(31,41,51,0.04)" }}>
          <Box sx={{ width: 46, height: 46, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, #8CA0AB, ${adminColor.dim})`, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 3px rgba(92,111,123,0.20)" }} />
          <Box>
            <Typography sx={{ ...adminFigureSx, fontSize: 20, color: adminColor.dim, lineHeight: 1.05 }}>{summary.resting}</Typography>
            <Typography sx={{ fontSize: 10, color: adminColor.text, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 800, mt: "1px" }}>Resting</Typography>
            <Typography sx={{ fontSize: 9.5, color: adminColor.dim, mt: "-1px" }}>พัก</Typography>
          </Box>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: "12px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "18px", p: "9px 18px 9px 9px", boxShadow: "0 2px 10px rgba(31,41,51,0.04)" }}>
          <Box sx={{ width: 46, height: 46, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, #8CA0AB, ${adminColor.dim})`, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4), 0 1px 3px rgba(92,111,123,0.20)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Umbrella size={20} color="#fff" weight="fill" />
          </Box>
          <Box>
            <Typography sx={{ ...adminFigureSx, fontSize: 20, color: adminColor.dim, lineHeight: 1.05 }}>{summary.holiday}</Typography>
            <Typography sx={{ fontSize: 10, color: adminColor.text, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 800, mt: "1px" }}>Holiday</Typography>
            <Typography sx={{ fontSize: 9.5, color: adminColor.dim, mt: "-1px" }}>วันหยุด</Typography>
          </Box>
        </Box>
        {summary.override > 0 && (
          <Box sx={{ display: "flex", alignItems: "center", gap: "12px", background: `linear-gradient(180deg,${adminColor.panel},#FEF2F2)`, border: "1px solid rgba(220,38,38,0.22)", borderRadius: "18px", p: "9px 18px 9px 9px", boxShadow: "0 2px 10px rgba(220,38,38,0.06)" }}>
            <Box sx={{ width: 46, height: 46, borderRadius: "50%", background: `radial-gradient(circle at 35% 30%, #EF4444, ${adminColor.red})`, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 3px rgba(220,38,38,0.25)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Warning size={20} color="#fff" weight="fill" />
            </Box>
            <Box>
              <Typography sx={{ ...adminFigureSx, fontSize: 20, color: adminColor.red, lineHeight: 1.05 }}>{summary.override}</Typography>
              <Typography sx={{ fontSize: 10, color: adminColor.red, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 800, mt: "1px" }}>Override</Typography>
              <Typography sx={{ fontSize: 9.5, color: adminColor.dim, mt: "-1px" }}>ค้าง</Typography>
            </Box>
          </Box>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button
          onClick={() => void rosterBatch("all-available")}
          disabled={batching}
          sx={{ background: "linear-gradient(180deg,#1CAE52,#149046)", color: "#fff", textTransform: "none", fontWeight: 700, borderRadius: "11px", boxShadow: "0 3px 10px rgba(22,163,74,0.28)", "&:hover": { background: "#15803d" } }}
        >
          Open All Tonight · เปิดทั้งร้าน
        </Button>
        <Button
          onClick={() => void rosterBatch("auto")}
          disabled={batching}
          variant="outlined"
          sx={{ borderColor: adminColor.line2, color: adminColor.muted, textTransform: "none", fontWeight: 700, borderRadius: "11px" }}
        >
          Reset Auto · กลับ Auto
        </Button>
      </Box>

      {/* 🆕 Round 28s268 — search box + segmented filter pills, replacing
          the plain dropdown (easier to tap on a phone, matches the rest
          of the Ocean Study widget language).
          🆕 Round 28r46 — filter area kept ENGLISH-ONLY per r43 rule
          (no Thai on filter/search chrome). */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: "10px", mb: 2.5, alignItems: "center" }}>
        <TextField
          placeholder="Search therapists…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          size="small"
          sx={{ flex: 1, minWidth: 220, "& .MuiOutlinedInput-root": { borderRadius: "13px", background: adminColor.panel } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <MagnifyingGlass size={15} color={adminColor.dim} />
              </InputAdornment>
            ),
          }}
        />
        <ToggleButtonGroup
          value={filter}
          exclusive
          onChange={(_, v) => v && setFilter(v)}
          sx={{
            background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "13px", p: "3px", gap: "2px",
            "& .MuiToggleButton-root": {
              border: "none", borderRadius: "10px !important", fontFamily: adminFont.sans, fontSize: 12, fontWeight: 700,
              color: adminColor.dim, textTransform: "none", padding: "8px 14px",
              "&.Mui-selected": { background: `linear-gradient(180deg,#5A8998,${adminColor.accent})`, color: "#fff", boxShadow: "0 2px 6px rgba(78,126,140,0.35)" },
              "&.Mui-selected:hover": { background: `linear-gradient(180deg,#5A8998,${adminColor.accent})` },
            },
          }}
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="available">Available</ToggleButton>
          <ToggleButton value="bookable">Bookable</ToggleButton>
          <ToggleButton value="resting">Resting</ToggleButton>
          <ToggleButton value="holiday">Holiday</ToggleButton>
        </ToggleButtonGroup>

        {/* 🆕 Round 28s270 (founder: "ปุ่มเพิ่มพนักงาน") — the
            /admin/add-therapist route already existed (AddTherapistPage)
            but had no entry point from the roster page itself. */}
        <Button
          onClick={() => navigate("/admin/add-therapist")}
          startIcon={<UserPlus size={16} weight="bold" />}
          sx={{
            background: `linear-gradient(180deg,#5A8998,${adminColor.accent})`,
            color: "#fff", textTransform: "none", fontWeight: 700, borderRadius: "11px",
            boxShadow: "0 3px 10px rgba(78,126,140,0.32)",
            "&:hover": { background: adminColor.accentDeep },
          }}
        >
          Add Therapist · เพิ่มพนักงาน
        </Button>
      </Box>

      {loading ? (
        <Box textAlign="center" mt={5}>
          <CircularProgress sx={{ color: adminColor.accent }} />
        </Box>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "16px" }}>
          {filtered.map((t) => (
            <TherapistCard
              key={t.id}
              row={t}
              onView={(id) => navigate(`/admin/therapists/${id}`)}
              // 🆕 Round 28s271 — the separate /admin/edit-therapist page was
              //   merged into AdminTherapistDetailPage; ?edit=1 opens it
              //   pre-armed in edit mode instead of view mode.
              onEdit={(id) => navigate(`/admin/therapists/${id}?edit=1`)}
              onDelete={handleDelete}
              onToggleHoliday={applyHoliday}
              onChangeOverride={applyOverride}
              onChangeTime={applyTime}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

export default AdminTherapistsPage;
