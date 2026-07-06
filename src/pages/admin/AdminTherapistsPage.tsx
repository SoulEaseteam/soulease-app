import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  Switch,
  IconButton,
  CircularProgress,
  Chip,
  Tooltip,
  Card,
  CardContent,
  Stack,
  Avatar,
  useMediaQuery,
  Button,
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import SpaIcon from "@mui/icons-material/Spa";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";

import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";

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
import { calculateTherapistStatus } from "@/utils/calculateTherapistStatus";
import type { Therapist } from "@/types/therapist";
import { logAdminAction } from "@/utils/auditLog";
import { nowBKK, endOfTodayBKK, toBKK, fmtBKKTimeShort } from "@/utils/time";
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
};

const STATUS_COLOR: Record<TherapistStatus, string> = {
  available: adminColor.green,
  bookable: adminColor.amber,
  resting: adminColor.dim,
  holiday: adminColor.red,
};

const selectMenuProps = {
  PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px", boxShadow: "0 8px 24px rgba(31,41,51,0.16)" } },
} as const;

function isOverrideExpired(overrideUntil: unknown): boolean {
  const expiry = toBKK(overrideUntil as never);
  return !!expiry && expiry.isBefore(nowBKK());
}

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
  const [paginationModel, setPaginationModel] = useState({ page: 0, pageSize: 10 });

  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width:900px)");

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
      const computedStatus = calculateTherapistStatus(merged).status;
      const overrideActive =
        !!raw.statusOverride && raw.statusOverride !== "Auto" && !isOverrideExpired(raw.overrideUntil);
      return {
        ...raw,
        computedStatus,
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
    return therapists.filter((t) => {
      const nameOk = (t.name || "")
        .toLowerCase()
        .includes(search.trim().toLowerCase());

      const statusOk = filter === "all" || filter === t.computedStatus;

      return nameOk && statusOk;
    });
  }, [therapists, search, filter]);

  // 🆕 Round 28s267 (audit: filter/search left the grid stranded on an
  //   out-of-range page) — jump back to page 1 whenever the visible set
  //   changes shape.
  useEffect(() => {
    setPaginationModel((m) => (m.page === 0 ? m : { ...m, page: 0 }));
  }, [search, filter]);

  // ==========================================================
  // OVERRIDE CHANGE (shared by DataGrid cell + mobile Select)
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
  // DESKTOP COLUMNS
  // ==========================================================
  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Name",
      width: 190,
      renderCell: (p) => (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 0.5 }}>
          <Avatar src={p.row.image || ""} />
          <Typography sx={{ fontFamily: adminFont.sans, color: adminColor.text }}>{p.row.name || "-"}</Typography>
        </Stack>
      ),
    },
    {
      field: "computedStatus",
      headerName: "Status",
      width: 140,
      renderCell: (p) => (
        <Chip
          label={String(p.row.computedStatus || "").toUpperCase()}
          sx={{
            background: `${STATUS_COLOR[p.row.computedStatus as TherapistStatus]}1F`,
            color: STATUS_COLOR[p.row.computedStatus as TherapistStatus],
            fontWeight: 700,
          }}
        />
      ),
    },
    {
      field: "isHoliday",
      headerName: "Holiday",
      width: 130,
      renderCell: (p) =>
        p.row.isHoliday ? (
          <Chip label="Holiday" icon={<BeachAccessIcon sx={{ color: `${adminColor.red} !important` }} />} sx={{ background: `${adminColor.red}1F`, color: adminColor.red, fontWeight: 700 }} />
        ) : (
          <Chip label="Active" icon={<SpaIcon sx={{ color: `${adminColor.green} !important` }} />} sx={{ background: `${adminColor.green}1F`, color: adminColor.green, fontWeight: 700 }} />
        ),
    },
    {
      field: "toggleHoliday",
      headerName: "",
      width: 85,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Switch
          checked={Boolean(p.row.isHoliday)}
          onChange={(e) => applyHoliday(p.row as TherapistRow, e.target.checked)}
        />
      ),
    },
    {
      field: "statusOverride",
      headerName: "Override",
      width: 150,
      renderCell: (p) => (
        <Select
          size="small"
          value={p.row.statusOverride || "Auto"}
          MenuProps={selectMenuProps}
          onChange={(e) => applyOverride(p.row as TherapistRow, e.target.value as TherapistStatusOverride)}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="Auto">Auto</MenuItem>
          <MenuItem value="available">Available</MenuItem>
          <MenuItem value="bookable">Bookable</MenuItem>
          <MenuItem value="resting">Resting</MenuItem>
        </Select>
      ),
    },
    {
      field: "startTime",
      headerName: "Start",
      width: 110,
      renderCell: (p) => (
        <TextField
          type="time"
          size="small"
          value={p.row.startTime || ""}
          onChange={(e) => applyTime(p.row as TherapistRow, "startTime", e.target.value)}
        />
      ),
    },
    {
      field: "endTime",
      headerName: "End",
      width: 110,
      renderCell: (p) => (
        <TextField
          type="time"
          size="small"
          value={p.row.endTime || ""}
          onChange={(e) => applyTime(p.row as TherapistRow, "endTime", e.target.value)}
        />
      ),
    },
    {
      field: "todayBookings",
      headerName: "Today",
      width: 90,
      renderCell: (p) => <Typography sx={adminFigureSx}>{p.row.todayBookings || 0}</Typography>,
    },
    {
      field: "totalBookings",
      headerName: "Total",
      width: 90,
      renderCell: (p) => <Typography sx={adminFigureSx}>{p.row.totalBookings || 0}</Typography>,
    },
    {
      // 🆕 Round 28s267 — replaces the old manual "Session" switch
      //   (isBooked), which nothing kept in sync with real bookings and
      //   is now fully superseded by the live-bookings merge above. This
      //   column shows the REAL thing instead: is she in an active job
      //   right now, and until when.
      field: "activeBookingEndAt",
      headerName: "Now",
      width: 120,
      sortable: false,
      filterable: false,
      renderCell: (p) =>
        p.row.activeBookingEndAt ? (
          <Chip
            size="small"
            label={`ถึง ${fmtBKKTimeShort(p.row.activeBookingEndAt, "—")}`}
            sx={{ background: `${adminColor.amber}1F`, color: adminColor.amber, fontWeight: 700 }}
          />
        ) : (
          <Typography sx={{ fontSize: 12.5, color: adminColor.dim, fontFamily: adminFont.sans }}>ว่าง</Typography>
        ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 170,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="View">
            <IconButton onClick={() => navigate(`/admin/therapists/${p.row.id}`)} sx={{ color: adminColor.dim }}>
              <VisibilityIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Edit">
            <IconButton onClick={() => navigate(`/admin/edit-therapist/${p.row.id}`)} sx={{ color: adminColor.accent }}>
              <EditIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Delete">
            <IconButton onClick={() => void handleDelete(p.row as TherapistRow)} sx={{ color: adminColor.red }}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  // ==========================================================
  // MOBILE VIEW
  // ==========================================================
  const mobileCards = (
    <Stack spacing={2}>
      {filtered.map((t) => (
        <Card key={t.id} sx={{ borderRadius: 3, background: adminColor.panel, border: `1px solid ${adminColor.line}` }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Avatar src={t.image || ""} sx={{ width: 56, height: 56 }} />

              <Box flexGrow={1}>
                <Typography fontWeight="bold" sx={{ color: adminColor.text, fontFamily: adminFont.sans }}>{t.name || "-"}</Typography>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 1 }}>
                  <Chip
                    size="small"
                    label={String(t.computedStatus).toUpperCase()}
                    sx={{ background: `${STATUS_COLOR[t.computedStatus]}1F`, color: STATUS_COLOR[t.computedStatus], fontWeight: 700 }}
                  />
                  {t.activeBookingEndAt ? (
                    <Chip size="small" label={`ถึง ${fmtBKKTimeShort(t.activeBookingEndAt, "—")}`} sx={{ background: `${adminColor.amber}1F`, color: adminColor.amber, fontWeight: 700 }} />
                  ) : null}
                </Stack>

                <Typography fontSize={13} mt={1} sx={{ color: adminColor.muted }}>
                  Time: {t.startTime || "--:--"} - {t.endTime || "--:--"}
                </Typography>

                <Typography fontSize={13} sx={{ color: adminColor.muted, ...adminFigureSx, fontWeight: 600 }}>
                  Today: {t.todayBookings || 0} | Total: {t.totalBookings || 0}
                </Typography>

                <Stack direction="row" spacing={2} mt={1.5} alignItems="center" flexWrap="wrap">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontSize={12} sx={{ color: adminColor.muted }}>Holiday</Typography>
                    <Switch
                      size="small"
                      checked={Boolean(t.isHoliday)}
                      onChange={(e) => applyHoliday(t, e.target.checked)}
                    />
                  </Stack>
                </Stack>

                <Box mt={1.5}>
                  <Select
                    size="small"
                    fullWidth
                    value={t.statusOverride || "Auto"}
                    MenuProps={selectMenuProps}
                    onChange={(e) => applyOverride(t, e.target.value as TherapistStatusOverride)}
                  >
                    <MenuItem value="Auto">Auto</MenuItem>
                    <MenuItem value="available">Available</MenuItem>
                    <MenuItem value="bookable">Bookable</MenuItem>
                    <MenuItem value="resting">Resting</MenuItem>
                  </Select>
                </Box>

                <Stack direction="row" spacing={1} mt={1.5}>
                  <TextField
                    type="time"
                    size="small"
                    fullWidth
                    value={t.startTime || ""}
                    onChange={(e) => applyTime(t, "startTime", e.target.value)}
                  />
                  <TextField
                    type="time"
                    size="small"
                    fullWidth
                    value={t.endTime || ""}
                    onChange={(e) => applyTime(t, "endTime", e.target.value)}
                  />
                </Stack>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} mt={2} justifyContent="flex-end">
              <IconButton onClick={() => navigate(`/admin/therapists/${t.id}`)} sx={{ color: adminColor.dim }}>
                <VisibilityIcon />
              </IconButton>

              <IconButton onClick={() => navigate(`/admin/edit-therapist/${t.id}`)} sx={{ color: adminColor.accent }}>
                <EditIcon />
              </IconButton>

              <IconButton onClick={() => void handleDelete(t)} sx={{ color: adminColor.red }}>
                <DeleteIcon />
              </IconButton>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <Box sx={{ p: 2 }}>
      <Box mb={2}>
        <Button
          onClick={() => {
            if (window.history.length > 1) {
              void navigate(-1);
            } else {
              void navigate("/admin/dashboard");
            }
          }}
          startIcon={<ArrowBackIosNewIcon />}
          variant="outlined"
          sx={{
            borderColor: adminColor.accent,
            color: adminColor.accent,
            fontWeight: "bold",
            textTransform: "none",
            borderRadius: 2,
            "&:hover": {
              borderColor: adminColor.accentDeep,
              background: adminColor.panel2,
            },
          }}
        >
          Back
        </Button>
      </Box>

      <Typography variant="h5" fontWeight="bold" mb={2} sx={{ color: adminColor.text, fontFamily: adminFont.serif }}>
        👑 Therapist Manager
      </Typography>

      {/* 🆕 Round 28s230 (FIX C) — live roster summary + one-tap relight.
          Counts use the same BKK engine as the public site (FIX B), so this
          is exactly what guests see right now. */}
      <Box
        sx={{
          mb: 2.5, p: 1.5, borderRadius: 2,
          background: adminColor.panel, border: `1px solid ${adminColor.line}`,
          display: "flex", flexWrap: "wrap", alignItems: "center", gap: 1.5,
        }}
      >
        <Typography sx={{ ...adminFigureSx, fontSize: 14, color: summary.available > 0 ? adminColor.green : adminColor.red }}>
          🟢 ว่าง {summary.available}
        </Typography>
        <Typography sx={{ ...adminFigureSx, fontSize: 14, color: adminColor.amber }}>🟠 จองได้ {summary.bookable}</Typography>
        <Typography sx={{ ...adminFigureSx, fontSize: 14, color: adminColor.dim }}>⚪ พัก {summary.resting}</Typography>
        <Typography sx={{ ...adminFigureSx, fontSize: 14, color: adminColor.dim }}>🏖️ หยุด {summary.holiday}</Typography>
        {summary.override > 0 && (
          <Typography sx={{ ...adminFigureSx, fontSize: 14, color: adminColor.red }}>
            ⚠️ override ค้าง {summary.override}
          </Typography>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button
          onClick={() => void rosterBatch("all-available")}
          disabled={batching}
          variant="contained"
          size="small"
          sx={{ background: adminColor.green, textTransform: "none", fontWeight: 700, borderRadius: 2, "&:hover": { background: "#15803d" } }}
        >
          คืนนี้เปิดทั้งร้าน
        </Button>
        <Button
          onClick={() => void rosterBatch("auto")}
          disabled={batching}
          variant="outlined"
          size="small"
          sx={{ borderColor: adminColor.line2, color: adminColor.muted, textTransform: "none", fontWeight: 700, borderRadius: 2 }}
        >
          กลับ Auto
        </Button>
      </Box>

      <Stack direction="row" spacing={2} mb={3}>
        <TextField
          label="Search Therapist"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
        />

        <Select
          size="small"
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | TherapistStatus)}
          sx={{ minWidth: 140 }}
          MenuProps={selectMenuProps}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="available">Available</MenuItem>
          <MenuItem value="bookable">Bookable</MenuItem>
          <MenuItem value="resting">Resting</MenuItem>
          <MenuItem value="holiday">Holiday</MenuItem>
        </Select>
      </Stack>

      {loading ? (
        <Box textAlign="center" mt={5}>
          <CircularProgress />
        </Box>
      ) : isMobile ? (
        mobileCards
      ) : (
        <DataGrid
          rows={filtered}
          columns={columns}
          autoHeight
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          paginationModel={paginationModel}
          onPaginationModelChange={setPaginationModel}
          sx={{
            bgcolor: adminColor.panel,
            borderRadius: 2,
            p: 1,
            border: `1px solid ${adminColor.line}`,
            boxShadow: "0 4px 18px rgba(31,41,51,0.08)",
          }}
        />
      )}
    </Box>
  );
};

export default AdminTherapistsPage;
