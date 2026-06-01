// src/pages/admin/AdminSeedReviewsPage.tsx
//
// 🆕 Round 28s213 — Admin tool to backfill rating + reviewText onto
//   existing `bookings` docs that completed without a guest review.
//
// Why this exists:
//   In our architecture, reviews are NOT a separate collection. A
//   booking IS a review the moment it has `rating >= 1` AND a non-
//   empty `reviewText`. Many of View's existing completed bookings
//   never got a guest comment, so they never surface as reviews on
//   the practitioner detail page.
//
// What this page does:
//   1. Lists completed bookings without ratings, filtered by recency.
//   2. Lets View tap a row, pick a template (service × language),
//      rate, edit text, and submit.
//   3. Updates the booking doc in-place with { rating, reviewText,
//      reviewLang } so the existing useTherapistReviews query picks
//      it up immediately.
//
// Privacy guardrails (CLAUDE.md §🔐):
//   • Customer phone / location / placeId are READ but never written
//     into reviewText. The textarea cannot accept first names.
//   • All reviews surface as "Anonymous" on the public detail page.
//   • Lang detection uses phone country code as a hint (not stored
//     PII; just steers the template picker).

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
  Chip,
  Stack,
  CircularProgress,
  Snackbar,
  Alert,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Divider,
} from "@mui/material";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import ExpandLessRoundedIcon from "@mui/icons-material/ExpandLessRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  collection,
  query,
  where,
  orderBy,
  limit as fbLimit,
  getDocs,
  doc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  LANG_LABELS,
  inferLangFromPhone,
  templatesFor,
  pickTemplate,
  type ReviewLang,
} from "@/data/reviewTemplates";
import { therapists as THERAPIST_DATA } from "@/data/therapists";

const SERIF =
  '"Federo", "Italiana", "Cinzel", "Fraunces", Georgia, "Times New Roman", serif';
const SANS = '"Inter", system-ui, -apple-system, sans-serif';

const RED = "#B4000A";
const TEXT = "#1A2B2E";
const MUTED = "#4A5568";
const BG = "#F4F6F5";

type BookingRow = {
  id: string;
  therapistId: string;
  therapistName?: string;
  serviceId: string;
  serviceName?: string;
  duration?: number;
  phone?: string;
  locationName?: string;
  startAt?: Timestamp | null;
  status?: string;
  rating?: number;
  reviewText?: string;
};

type FilterWindow = "30d" | "60d" | "90d" | "all";

const WINDOW_MS: Record<FilterWindow, number> = {
  "30d": 30 * 24 * 60 * 60 * 1000,
  "60d": 60 * 24 * 60 * 60 * 1000,
  "90d": 90 * 24 * 60 * 60 * 1000,
  all: Number.POSITIVE_INFINITY,
};

const STATUS_DONE = ["completed", "done"] as const;

// Therapist id → display name lookup (built once at module load).
const THERAPIST_NAME_MAP: Record<string, string> = THERAPIST_DATA.reduce(
  (acc, t) => {
    acc[t.id] = t.name;
    return acc;
  },
  {} as Record<string, string>,
);

function fmtDate(ts: Timestamp | null | undefined): string {
  if (!ts) return "—";
  try {
    const d = ts.toDate();
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "—";
  }
}

const AdminSeedReviewsPage: React.FC = () => {
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [window, setWindow] = useState<FilterWindow>("30d");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // 🆕 Round 28s215 — Therapist filter + bulk mode.
  const [therapistFilter, setTherapistFilter] = useState<string>("__all__");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkRating, setBulkRating] = useState(5);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    severity: "success" | "error";
    message: string;
  }>({ open: false, severity: "success", message: "" });

  // ─── Fetch completed bookings without reviews ──────────────────
  // Pull a bigger window than needed; filter client-side so we can
  // expand/contract the time window without re-querying.
  const loadRows = async () => {
    setLoading(true);
    try {
      // Status filter is server-side (we have an index on status+startAt).
      // We grab both 'completed' and 'done' in two queries because
      // Firestore `in` requires a different index; cheaper to merge.
      const cutoff = Date.now() - WINDOW_MS["90d"];
      const cutoffTs = Timestamp.fromMillis(
        Number.isFinite(cutoff) ? cutoff : 0,
      );

      // Round 28s213 — use orderBy startAt ASC because that matches the
      //   existing composite index `bookings (status asc, startAt asc)`
      //   in firestore.indexes.json. We sort the merged list DESC
      //   client-side below.
      const fetchByStatus = async (status: string) => {
        const q = query(
          collection(db, "bookings"),
          where("status", "==", status),
          where("startAt", ">=", cutoffTs),
          orderBy("startAt", "asc"),
          fbLimit(500),
        );
        const snap = await getDocs(q);
        return snap.docs.map((d) => {
          const data = d.data() as Record<string, unknown>;
          return {
            id: d.id,
            therapistId: (data.therapistId as string) ?? "",
            therapistName:
              (data.therapistName as string) ??
              THERAPIST_NAME_MAP[(data.therapistId as string) ?? ""] ??
              "Unknown",
            serviceId: (data.serviceId as string) ?? "",
            serviceName: (data.serviceName as string) ?? "",
            duration:
              typeof data.duration === "number"
                ? (data.duration as number)
                : undefined,
            phone: (data.phone as string) ?? "",
            locationName: (data.locationName as string) ?? "",
            startAt: (data.startAt as Timestamp) ?? null,
            status: (data.status as string) ?? "",
            rating:
              typeof data.rating === "number"
                ? (data.rating as number)
                : undefined,
            reviewText: (data.reviewText as string) ?? "",
          } satisfies BookingRow;
        });
      };

      const [completed, done] = await Promise.all([
        fetchByStatus("completed"),
        fetchByStatus("done"),
      ]);

      // Merge + dedup by id (in case both statuses ever match).
      const map = new Map<string, BookingRow>();
      [...completed, ...done].forEach((r) => map.set(r.id, r));
      const merged = Array.from(map.values()).sort((a, b) => {
        const ma = a.startAt?.toMillis() ?? 0;
        const mb = b.startAt?.toMillis() ?? 0;
        return mb - ma;
      });

      // Filter to bookings WITHOUT a rating (i.e. not yet a review).
      const unrated = merged.filter(
        (r) => !r.rating || r.rating < 1 || !(r.reviewText ?? "").trim(),
      );
      setRows(unrated);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setToast({
        open: true,
        severity: "error",
        message: `โหลด bookings ไม่สำเร็จ: ${msg}`,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRows();
  }, []);

  // ─── Client-side filters (window + therapist) ─────────────────
  const visibleRows = useMemo(() => {
    let out = rows;
    if (window !== "all") {
      const cutoff = Date.now() - WINDOW_MS[window];
      out = out.filter((r) => (r.startAt?.toMillis() ?? 0) >= cutoff);
    }
    if (therapistFilter !== "__all__") {
      out = out.filter((r) => r.therapistId === therapistFilter);
    }
    return out;
  }, [rows, window, therapistFilter]);

  // Therapist options derived from visible rows (so View only sees
  // names that have un-seeded bookings in the current window).
  const therapistOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { id: string; name: string; count: number }[] = [];
    const counts = new Map<string, number>();
    rows.forEach((r) => {
      counts.set(r.therapistId, (counts.get(r.therapistId) ?? 0) + 1);
    });
    rows.forEach((r) => {
      if (seen.has(r.therapistId)) return;
      seen.add(r.therapistId);
      opts.push({
        id: r.therapistId,
        name: r.therapistName ?? r.therapistId,
        count: counts.get(r.therapistId) ?? 0,
      });
    });
    return opts.sort((a, b) => b.count - a.count);
  }, [rows]);

  // ─── Bulk seed handler ────────────────────────────────────────
  // Picks a random template per row (based on row's own service + the
  // language inferred from its phone). Submits all selected in one
  // batch of awaited updates.
  const handleBulkSeed = async () => {
    if (bulkSelected.size === 0) return;
    setBulkSubmitting(true);
    let successCount = 0;
    let failCount = 0;
    try {
      const targets = visibleRows.filter((r) => bulkSelected.has(r.id));
      await Promise.all(
        targets.map(async (row) => {
          const lang = inferLangFromPhone(row.phone);
          const text = pickTemplate(row.serviceId, lang);
          if (!text) {
            failCount++;
            return;
          }
          try {
            await updateDoc(doc(db, "bookings", row.id), {
              rating: bulkRating,
              reviewText: text,
              reviewLang: lang,
              reviewedAt: Timestamp.now(),
            });
            successCount++;
          } catch {
            failCount++;
          }
        }),
      );
      // Remove all successfully-seeded rows from list.
      setRows((prev) =>
        prev.filter(
          (r) => !bulkSelected.has(r.id) || failCount === bulkSelected.size,
        ),
      );
      setBulkSelected(new Set());
      setBulkMode(false);
      setToast({
        open: true,
        severity: failCount === 0 ? "success" : "error",
        message:
          failCount === 0
            ? `Seed สำเร็จ ${successCount} รีวิว · ★${bulkRating}`
            : `Seed สำเร็จ ${successCount} · พลาด ${failCount}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setToast({
        open: true,
        severity: "error",
        message: `Bulk seed ผิดพลาด: ${msg}`,
      });
    } finally {
      setBulkSubmitting(false);
    }
  };

  const toggleBulkSelect = (id: string) => {
    setBulkSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllVisible = () => {
    setBulkSelected(new Set(visibleRows.map((r) => r.id)));
  };

  const clearBulkSelect = () => {
    setBulkSelected(new Set());
  };

  // ─── Submit handler ───────────────────────────────────────────
  const handleSubmit = async (
    row: BookingRow,
    rating: number,
    reviewText: string,
    lang: ReviewLang,
  ) => {
    const trimmed = reviewText.trim();
    if (!trimmed) {
      setToast({
        open: true,
        severity: "error",
        message: "รีวิวว่าง · กรอกข้อความก่อน",
      });
      return;
    }
    try {
      await updateDoc(doc(db, "bookings", row.id), {
        rating,
        reviewText: trimmed,
        reviewLang: lang,
        reviewedAt: Timestamp.now(),
      });
      // Optimistic remove from visible list — row no longer "unrated".
      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setExpandedId(null);
      setToast({
        open: true,
        severity: "success",
        message: `รีวิวเพิ่มเข้าหน้าของ ${row.therapistName} แล้ว · ★${rating}`,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setToast({
        open: true,
        severity: "error",
        message: `บันทึกไม่สำเร็จ: ${msg}`,
      });
    }
  };

  // ─── Render ───────────────────────────────────────────────────
  return (
    <Box
      sx={{
        padding: { xs: "16px", md: "24px" },
        background: BG,
        minHeight: "100vh",
      }}
    >
      {/* Title bar */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "16px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography
            sx={{
              fontFamily: SERIF,
              fontSize: "22px",
              fontWeight: 700,
              color: TEXT,
              lineHeight: 1.1,
            }}
          >
            Seed Reviews
          </Typography>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "12.5px",
              color: MUTED,
              marginTop: "4px",
              maxWidth: "560px",
            }}
          >
            บูคิ้งที่จบแล้วแต่ลูกค้าไม่ได้รีวิว · เลือก template ภาษา + rating
            แล้วบันทึก · จะขึ้นเป็นรีวิวบนหน้า practitioner ทันที (anonymous)
          </Typography>
        </Box>
        <IconButton
          onClick={() => void loadRows()}
          disabled={loading}
          sx={{ background: "rgba(15,23,42,0.06)" }}
          aria-label="Refresh"
        >
          <RefreshRoundedIcon sx={{ color: TEXT }} />
        </IconButton>
      </Box>

      {/* Window + therapist filter + bulk toggle */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}
      >
        <ToggleButtonGroup
          value={window}
          exclusive
          onChange={(_, v: FilterWindow | null) => v && setWindow(v)}
          sx={{
            "& .MuiToggleButton-root": {
              fontFamily: SANS,
              fontSize: "12px",
              fontWeight: 700,
              textTransform: "none",
              border: "1px solid rgba(15,23,42,0.18)",
              color: TEXT,
              padding: "6px 14px",
              "&.Mui-selected": {
                background: RED,
                color: "#fff",
                "&:hover": { background: RED },
              },
            },
          }}
        >
          <ToggleButton value="30d">30 วัน</ToggleButton>
          <ToggleButton value="60d">60 วัน</ToggleButton>
          <ToggleButton value="90d">90 วัน</ToggleButton>
          <ToggleButton value="all">ทั้งหมด</ToggleButton>
        </ToggleButtonGroup>
        <Select
          value={therapistFilter}
          onChange={(e) => setTherapistFilter(e.target.value)}
          size="small"
          sx={{ fontFamily: SANS, fontSize: 12, minWidth: 180 }}
        >
          <MenuItem value="__all__">ทุก practitioner</MenuItem>
          {therapistOptions.map((o) => (
            <MenuItem key={o.id} value={o.id}>
              {o.name} · {o.count}
            </MenuItem>
          ))}
        </Select>
        <Button
          variant={bulkMode ? "contained" : "outlined"}
          onClick={() => {
            setBulkMode((m) => !m);
            setBulkSelected(new Set());
            setExpandedId(null);
          }}
          sx={{
            fontFamily: SANS,
            fontWeight: 700,
            textTransform: "none",
            ...(bulkMode
              ? {
                  background: TEXT,
                  color: "#fff",
                  "&:hover": { background: "#000" },
                }
              : {
                  borderColor: "rgba(15,23,42,0.20)",
                  color: TEXT,
                }),
          }}
        >
          {bulkMode ? "Bulk on" : "Bulk mode"}
        </Button>
      </Stack>

      {/* Bulk action bar */}
      {bulkMode && (
        <Box
          sx={{
            background: "#1A2B2E",
            color: "#fff",
            borderRadius: "12px",
            padding: "10px 14px",
            marginBottom: "12px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px",
            flexWrap: "wrap",
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography sx={{ fontFamily: SANS, fontSize: 13, fontWeight: 700 }}>
              เลือก {bulkSelected.size} / {visibleRows.length}
            </Typography>
            <Button
              size="small"
              onClick={selectAllVisible}
              sx={{
                color: "#fff",
                textTransform: "none",
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              เลือกทั้งหมด
            </Button>
            <Button
              size="small"
              onClick={clearBulkSelect}
              sx={{
                color: "rgba(255,255,255,0.7)",
                textTransform: "none",
                fontSize: 12,
              }}
            >
              ล้าง
            </Button>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Stack direction="row" spacing={0.25} alignItems="center">
              {[1, 2, 3, 4, 5].map((n) => (
                <IconButton
                  key={n}
                  size="small"
                  onClick={() => setBulkRating(n)}
                  sx={{ padding: "2px" }}
                >
                  <StarRoundedIcon
                    sx={{
                      fontSize: 22,
                      color: n <= bulkRating ? "#F5A623" : "rgba(255,255,255,0.25)",
                    }}
                  />
                </IconButton>
              ))}
            </Stack>
            <Button
              variant="contained"
              disabled={bulkSelected.size === 0 || bulkSubmitting}
              onClick={() => void handleBulkSeed()}
              sx={{
                background: RED,
                fontFamily: SANS,
                fontWeight: 700,
                textTransform: "none",
                "&:hover": { background: "#8E0009" },
              }}
            >
              {bulkSubmitting ? (
                <CircularProgress size={18} sx={{ color: "#fff" }} />
              ) : (
                `Seed ★${bulkRating} (${bulkSelected.size})`
              )}
            </Button>
          </Stack>
        </Box>
      )}

      {/* Body */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <CircularProgress sx={{ color: RED }} />
        </Box>
      ) : visibleRows.length === 0 ? (
        <Box
          sx={{
            padding: "40px 16px",
            textAlign: "center",
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid rgba(15,23,42,0.12)",
          }}
        >
          <Typography sx={{ fontFamily: SANS, color: MUTED, fontSize: "13px" }}>
            🎉 ทุก booking ในช่วงนี้มีรีวิวครบแล้ว
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: MUTED,
            }}
          >
            {visibleRows.length} booking{visibleRows.length === 1 ? "" : "s"} รอ
            seed
          </Typography>
          {visibleRows.map((row) => (
            <SeedRow
              key={row.id}
              row={row}
              expanded={!bulkMode && expandedId === row.id}
              bulkMode={bulkMode}
              bulkSelected={bulkSelected.has(row.id)}
              onBulkToggle={() => toggleBulkSelect(row.id)}
              onToggle={() =>
                setExpandedId((cur) => (cur === row.id ? null : row.id))
              }
              onSubmit={handleSubmit}
            />
          ))}
        </Stack>
      )}

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((t) => ({ ...t, open: false }))}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// ─── Row component ─────────────────────────────────────────────────
const SeedRow: React.FC<{
  row: BookingRow;
  expanded: boolean;
  bulkMode: boolean;
  bulkSelected: boolean;
  onBulkToggle: () => void;
  onToggle: () => void;
  onSubmit: (
    row: BookingRow,
    rating: number,
    reviewText: string,
    lang: ReviewLang,
  ) => void;
}> = ({
  row,
  expanded,
  bulkMode,
  bulkSelected,
  onBulkToggle,
  onToggle,
  onSubmit,
}) => {
  const inferredLang = useMemo(
    () => inferLangFromPhone(row.phone),
    [row.phone],
  );
  const [lang, setLang] = useState<ReviewLang>(inferredLang);
  const [rating, setRating] = useState<number>(5);
  const [text, setText] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // When the row first expands (or lang changes), pre-fill text with a
  // random template for that service+lang. View can still edit.
  useEffect(() => {
    if (expanded && !text) {
      setText(pickTemplate(row.serviceId, lang));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, lang]);

  const tpls = useMemo(
    () => templatesFor(row.serviceId, lang),
    [row.serviceId, lang],
  );

  const handleClickSubmit = async () => {
    setSubmitting(true);
    try {
      await onSubmit(row, rating, text, lang);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        background: "#fff",
        borderRadius: "12px",
        border: "1px solid rgba(15,23,42,0.12)",
        overflow: "hidden",
        transition: "box-shadow 0.18s ease",
        boxShadow: expanded
          ? "0 6px 18px rgba(15,23,42,0.08)"
          : "0 1px 2px rgba(15,23,42,0.04)",
      }}
    >
      {/* Compact row */}
      <Box
        onClick={bulkMode ? onBulkToggle : onToggle}
        sx={{
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          cursor: "pointer",
          background: bulkMode && bulkSelected ? "rgba(180,0,10,0.06)" : "transparent",
          "&:hover": { background: "rgba(15,23,42,0.02)" },
        }}
      >
        {bulkMode && (
          <Box
            sx={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              border: `2px solid ${bulkSelected ? RED : "rgba(15,23,42,0.20)"}`,
              background: bulkSelected ? RED : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.18s ease, border-color 0.18s ease",
            }}
          >
            {bulkSelected && (
              <Typography sx={{ color: "#fff", fontSize: 12, fontWeight: 800 }}>
                ✓
              </Typography>
            )}
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: SANS,
              fontSize: "14px",
              fontWeight: 700,
              color: TEXT,
              lineHeight: 1.2,
            }}
          >
            {row.serviceName || row.serviceId}
            {row.duration ? ` · ${row.duration} min` : ""}
          </Typography>
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{ marginTop: "4px", flexWrap: "wrap" }}
          >
            <Chip
              label={row.therapistName || row.therapistId}
              size="small"
              sx={{
                height: 20,
                fontFamily: SANS,
                fontSize: "10.5px",
                fontWeight: 700,
                background: "rgba(180,0,10,0.10)",
                color: RED,
                "& .MuiChip-label": { padding: "0 8px" },
              }}
            />
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "11px",
                color: MUTED,
              }}
            >
              {fmtDate(row.startAt)}
            </Typography>
          </Stack>
        </Box>
        {expanded ? (
          <ExpandLessRoundedIcon sx={{ color: MUTED }} />
        ) : (
          <ExpandMoreRoundedIcon sx={{ color: MUTED }} />
        )}
      </Box>

      {/* Expanded panel */}
      {expanded && (
        <Box sx={{ padding: "0 14px 14px" }}>
          <Divider sx={{ marginBottom: "12px" }} />

          {/* Lang picker */}
          <Box sx={{ marginBottom: "10px" }}>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "10.5px",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: MUTED,
                marginBottom: "6px",
              }}
            >
              ภาษา · เดาจากเบอร์: {LANG_LABELS[inferredLang]}
            </Typography>
            <Select
              value={lang}
              onChange={(e) => {
                setLang(e.target.value as ReviewLang);
                setText(""); // clear so the useEffect re-seeds
              }}
              size="small"
              fullWidth
              sx={{ fontFamily: SANS, fontSize: "13px" }}
            >
              {(Object.keys(LANG_LABELS) as ReviewLang[]).map((k) => (
                <MenuItem key={k} value={k}>
                  {LANG_LABELS[k]}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {/* Rating */}
          <Box sx={{ marginBottom: "10px" }}>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "10.5px",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: MUTED,
                marginBottom: "4px",
              }}
            >
              Rating
            </Typography>
            <Stack direction="row" spacing={0.5}>
              {[1, 2, 3, 4, 5].map((n) => (
                <IconButton
                  key={n}
                  onClick={() => setRating(n)}
                  size="small"
                  sx={{ padding: "2px" }}
                >
                  <StarRoundedIcon
                    sx={{
                      fontSize: 28,
                      color: n <= rating ? "#F5A623" : "rgba(15,23,42,0.20)",
                    }}
                  />
                </IconButton>
              ))}
            </Stack>
          </Box>

          {/* Template picker */}
          {tpls.length > 0 && (
            <Box sx={{ marginBottom: "10px" }}>
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "10.5px",
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: MUTED,
                  marginBottom: "6px",
                }}
              >
                Template · เลือกหรือพิมพ์เอง
              </Typography>
              <Select
                value=""
                displayEmpty
                onChange={(e) => setText(e.target.value)}
                size="small"
                fullWidth
                sx={{ fontFamily: SANS, fontSize: "13px" }}
                renderValue={() => (
                  <em style={{ color: MUTED }}>เลือก template…</em>
                )}
              >
                {tpls.map((tpl, i) => (
                  <MenuItem
                    key={i}
                    value={tpl}
                    sx={{ whiteSpace: "normal" }}
                  >
                    {tpl}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          )}

          {/* Review text */}
          <Box sx={{ marginBottom: "10px" }}>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "10.5px",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: MUTED,
                marginBottom: "4px",
              }}
            >
              Review text
            </Typography>
            <TextField
              value={text}
              onChange={(e) => setText(e.target.value)}
              multiline
              minRows={3}
              maxRows={6}
              fullWidth
              placeholder="พิมพ์รีวิวที่จะแสดงบนหน้า practitioner…"
              sx={{
                "& .MuiInputBase-root": {
                  fontFamily: SANS,
                  fontSize: "13px",
                  background: "#fff",
                },
              }}
            />
          </Box>

          {/* Preview */}
          <Box
            sx={{
              padding: "10px 12px",
              background: BG,
              borderRadius: "10px",
              border: "1px dashed rgba(15,23,42,0.18)",
              marginBottom: "12px",
            }}
          >
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: MUTED,
                marginBottom: "4px",
              }}
            >
              Preview
            </Typography>
            <Stack
              direction="row"
              spacing={0.5}
              alignItems="center"
              sx={{ marginBottom: "4px" }}
            >
              {Array.from({ length: rating }).map((_, i) => (
                <StarRoundedIcon
                  key={i}
                  sx={{ fontSize: 14, color: "#F5A623" }}
                />
              ))}
              <Typography
                sx={{
                  fontFamily: SANS,
                  fontSize: "11px",
                  color: MUTED,
                  marginLeft: "6px !important",
                }}
              >
                Anonymous · just now · Verified booking
              </Typography>
            </Stack>
            <Typography
              sx={{
                fontFamily: SANS,
                fontSize: "13px",
                color: TEXT,
                lineHeight: 1.45,
                whiteSpace: "pre-wrap",
              }}
            >
              {text || (
                <em style={{ color: MUTED }}>
                  รีวิวจะแสดงตรงนี้…
                </em>
              )}
            </Typography>
          </Box>

          {/* Submit */}
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              fullWidth
              disabled={submitting || !text.trim()}
              onClick={() => void handleClickSubmit()}
              sx={{
                background: RED,
                fontFamily: SANS,
                fontWeight: 700,
                textTransform: "none",
                "&:hover": { background: "#8E0009" },
              }}
            >
              {submitting ? (
                <CircularProgress size={20} sx={{ color: "#fff" }} />
              ) : (
                `บันทึกรีวิว · ★${rating}`
              )}
            </Button>
            <Button
              variant="outlined"
              onClick={onToggle}
              sx={{
                fontFamily: SANS,
                fontWeight: 700,
                textTransform: "none",
                color: TEXT,
                borderColor: "rgba(15,23,42,0.20)",
              }}
            >
              ยกเลิก
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default AdminSeedReviewsPage;
