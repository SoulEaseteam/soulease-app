// src/pages/admin/AdminSeedReviewsPage.tsx
//
// 🆕 Round 28s213 — Admin tool to backfill rating + reviewText onto
//   existing `bookings` docs that completed without a guest review.
//
// Why this exists:
//   In our architecture, reviews are NOT a separate collection. A
//   booking IS a review the moment it has a non-empty `reviewText`.
//   Many of View's existing completed bookings never got a guest
//   comment, so they never surface as reviews on the practitioner
//   detail page.
//
// What this page does:
//   1. Lists completed bookings without a review, filtered by recency.
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
//
// 🆕 Round 28s292 (founder: "admin/reviews ปรับแก้ และ ตกแต่งสวยงาม" —
//   the seed tool that ships with it) — full pass:
//   • Data-loss bug: the "needs seeding" filter was
//     `!rating || rating<1 || !reviewText.trim()` — a booking with REAL
//     guest reviewText but no rating field (the exact case round 28s291
//     just proved exists in production) got pulled into this queue, and
//     both single-submit and bulk-seed overwrite reviewText
//     unconditionally. That could silently clobber a real guest comment
//     with a synthetic template. Fixed: "needs seeding" now means ONLY
//     "no reviewText at all" — matching the same definition of "review"
//     round 28s291 established (reviewText presence, not rating).
//   • "ทั้งหมด" (All) time-window toggle silently did nothing — the
//     server fetch was hardcoded to a 90-day cutoff regardless of the
//     selected window, so "All" quietly showed the same rows as "90
//     days". Now refetches with the correct cutoff per window (epoch-0
//     for "All"), same composite index, so it's an honest "all".
//   • Ocean Study restyle — this was the last page still on the
//     pre-28s235 theme; icons moved from @mui/icons-material to
//     phosphor-react to match every other migrated admin page.
//   • Added a service-name search box (every other admin list page
//     gained one this session) and two icon-circle stat pills for
//     visual parity with AdminReviewListPage.
//   • Timestamp.now() → serverTimestamp() for `reviewedAt`.

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Select,
  MenuItem,
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
import { Star, CaretDown, CaretUp, ArrowClockwise, MagnifyingGlass, ClockCounterClockwise, UsersThree, Check } from "phosphor-react";
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
  serverTimestamp,
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
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";

const SERIF = adminFont.serif;
const SANS = adminFont.sans;

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
  const [searchQuery, setSearchQuery] = useState("");
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [bulkRating, setBulkRating] = useState(5);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    severity: "success" | "error";
    message: string;
  }>({ open: false, severity: "success", message: "" });

  // ─── Fetch completed bookings without a review ─────────────────
  // 🆕 Round 28s292 — cutoff now matches the selected window (was
  //   hardcoded to 90d regardless of the toggle, so "All" silently
  //   behaved like "90 days"). Re-runs whenever `window` changes.
  const loadRows = async (win: FilterWindow) => {
    setLoading(true);
    try {
      const ms = WINDOW_MS[win];
      const cutoffTs = Timestamp.fromMillis(
        Number.isFinite(ms) ? Date.now() - ms : 0,
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

      // 🆕 Round 28s292 — "needs seeding" = no reviewText at all. A
      //   booking with real guest reviewText but no rating field IS
      //   already a review (round 28s291) and must never be pulled in
      //   here — both submit paths overwrite reviewText unconditionally.
      const unrated = merged.filter((r) => !(r.reviewText ?? "").trim());
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
    void loadRows(window);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window]);

  // ─── Client-side filters (therapist + search) ──────────────────
  // Time window is now server-scoped (see loadRows), so only
  // therapist + free-text search need to run client-side here.
  const visibleRows = useMemo(() => {
    let out = rows;
    if (therapistFilter !== "__all__") {
      out = out.filter((r) => r.therapistId === therapistFilter);
    }
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      out = out.filter(
        (r) =>
          (r.serviceName ?? "").toLowerCase().includes(q) ||
          (r.therapistName ?? "").toLowerCase().includes(q),
      );
    }
    return out;
  }, [rows, therapistFilter, searchQuery]);

  // Therapist options derived from all loaded rows (so View only sees
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
              reviewedAt: serverTimestamp(),
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
        reviewedAt: serverTimestamp(),
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

  const practitionerCount = therapistOptions.length;

  // ─── Render ───────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 2, md: 3 }, fontFamily: SANS }}>
      {/* 🆕 Round 28r47 (bilingual pass) — English page title + Thai
          subtitle, matching r35 pattern across admin. */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 1.5,
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <Box>
          <Typography sx={{ fontFamily: SERIF, fontSize: 22, fontWeight: 600, color: adminColor.text, lineHeight: 1 }}>
            Seed Reviews
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.4, letterSpacing: "0.02em" }}>
            เพิ่มรีวิว
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: adminColor.muted, mt: 1, maxWidth: 560 }}>
            บุ๊กกิ้งที่จบแล้วแต่ลูกค้าไม่ได้รีวิว · เลือก template ภาษา + rating
            แล้วบันทึก · จะขึ้นเป็นรีวิวบนหน้า practitioner ทันที (anonymous)
          </Typography>
        </Box>
        <IconButton
          onClick={() => void loadRows(window)}
          disabled={loading}
          sx={{ background: adminColor.panel2, border: `1px solid ${adminColor.line}` }}
          aria-label="Refresh"
        >
          <ArrowClockwise size={18} color={adminColor.text} />
        </IconButton>
      </Box>

      {/* 🆕 Round 28s292 → r47 — stat plates: icon 32 → 46, inner-highlight
          shadow, hover lift, English label + Thai subtitle. */}
      <Box sx={{ display: "flex", gap: 1.25, mb: 2, flexWrap: "wrap" }}>
        {[
          { icon: <ClockCounterClockwise size={20} weight="duotone" />, num: rows.length,          en: "Pending Seed",   th: "รอเพิ่มรีวิว",   color: adminColor.accent, figColor: adminColor.text },
          { icon: <UsersThree           size={20} weight="duotone" />, num: practitionerCount,   en: "Practitioners",  th: "หมอนวด",         color: adminColor.blue,   figColor: adminColor.blue },
        ].map((c) => (
          <Box
            key={c.en}
            sx={{
              display: "flex", alignItems: "center", gap: "12px",
              background: adminColor.panel, border: `1px solid ${adminColor.line}`,
              borderRadius: "18px", p: "10px 18px 10px 10px",
              boxShadow: "0 2px 10px rgba(31,41,51,0.04)",
              transition: "transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease",
              "&:hover": {
                transform: "translateY(-1px)",
                background: `${c.color}0A`,
                boxShadow: `0 4px 14px rgba(31,41,51,0.06), 0 2px 6px ${c.color}18`,
              },
            }}
          >
            <Box sx={{ width: 46, height: 46, borderRadius: "50%", background: `${c.color}1A`, color: c.color, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.5), 0 2px 6px ${c.color}22` }}>
              {c.icon}
            </Box>
            <Box>
              <Typography sx={{ ...adminFigureSx, fontSize: 20, color: c.figColor, lineHeight: 1.05 }}>{c.num}</Typography>
              <Typography sx={{ fontSize: 10.5, color: adminColor.muted, textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 800, lineHeight: 1 }}>{c.en}</Typography>
              <Typography sx={{ fontSize: 9.5, color: adminColor.dim, fontWeight: 600, lineHeight: 1 }}>{c.th}</Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Search + window + therapist filter + bulk toggle.
          🆕 Round 28r47 — per r43, filter labels are English-only. */}
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
        <Box sx={{ flex: 1, minWidth: 180, maxWidth: 280, display: "flex", alignItems: "center", gap: 1, background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "12px", p: "8px 12px" }}>
          <MagnifyingGlass size={15} color={adminColor.dim} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search service or practitioner…"
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 13, color: adminColor.text, width: "100%", fontFamily: SANS }}
          />
        </Box>
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
              border: `1px solid ${adminColor.line2}`,
              color: adminColor.text,
              padding: "6px 14px",
              "&.Mui-selected": {
                background: adminColor.accent,
                color: "#fff",
                "&:hover": { background: adminColor.accentDeep },
              },
            },
          }}
        >
          <ToggleButton value="30d">30d</ToggleButton>
          <ToggleButton value="60d">60d</ToggleButton>
          <ToggleButton value="90d">90d</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>
        {/* 🆕 Round 28s265 (audit: dropdowns app-wide inheriting the global
            theme's translucent Paper background) — MenuProps forces an
            opaque menu. */}
        <Select
          value={therapistFilter}
          onChange={(e) => setTherapistFilter(e.target.value)}
          size="small"
          sx={{ fontFamily: SANS, fontSize: 12, minWidth: 200, borderRadius: "10px", background: adminColor.panel }}
          MenuProps={{ PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px" } } }}
        >
          <MenuItem value="__all__">All Practitioners</MenuItem>
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
            borderRadius: "10px",
            ...(bulkMode
              ? { background: adminColor.text, color: "#fff", "&:hover": { background: "#000" } }
              : { borderColor: adminColor.line2, color: adminColor.text }),
          }}
        >
          {bulkMode ? "Bulk On" : "Bulk Mode"}
        </Button>
      </Stack>

      {/* Bulk action bar */}
      {bulkMode && (
        <Box
          sx={{
            background: adminColor.text,
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
              Selected {bulkSelected.size} / {visibleRows.length}
            </Typography>
            <Button
              size="small"
              onClick={selectAllVisible}
              sx={{ color: "#fff", textTransform: "none", fontSize: 12, fontWeight: 700 }}
            >
              Select all · เลือกทั้งหมด
            </Button>
            <Button
              size="small"
              onClick={clearBulkSelect}
              sx={{ color: "rgba(255,255,255,0.7)", textTransform: "none", fontSize: 12 }}
            >
              Clear · ล้าง
            </Button>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Stack direction="row" spacing={0.25} alignItems="center">
              {[1, 2, 3, 4, 5].map((n) => (
                <IconButton key={n} size="small" onClick={() => setBulkRating(n)} sx={{ padding: "2px" }}>
                  <Star size={20} weight="fill" color={n <= bulkRating ? adminColor.amber : "rgba(255,255,255,0.25)"} />
                </IconButton>
              ))}
            </Stack>
            <Button
              variant="contained"
              disabled={bulkSelected.size === 0 || bulkSubmitting}
              onClick={() => void handleBulkSeed()}
              sx={{
                background: adminColor.accent,
                fontFamily: SANS,
                fontWeight: 700,
                textTransform: "none",
                borderRadius: "10px",
                "&:hover": { background: adminColor.accentDeep },
              }}
            >
              {bulkSubmitting ? (
                <CircularProgress size={18} sx={{ color: "#fff" }} />
              ) : (
                `Seed · ★${bulkRating} (${bulkSelected.size})`
              )}
            </Button>
          </Stack>
        </Box>
      )}

      {/* Body */}
      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <CircularProgress sx={{ color: adminColor.accent }} />
        </Box>
      ) : visibleRows.length === 0 ? (
        <Box sx={{ padding: "40px 16px", textAlign: "center", background: adminColor.panel, borderRadius: "18px", border: `1px solid ${adminColor.line}`, boxShadow: "0 2px 10px rgba(31,41,51,0.04)" }}>
          <Typography sx={{ color: adminColor.muted, fontSize: 13 }}>
            🎉 ทุก booking ในช่วงนี้มีรีวิวครบแล้ว
          </Typography>
        </Box>
      ) : (
        <Stack spacing={1.5}>
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: adminColor.muted }}>
            {visibleRows.length} booking{visibleRows.length === 1 ? "" : "s"} pending · รอเพิ่มรีวิว
          </Typography>
          {visibleRows.map((row) => (
            <SeedRow
              key={row.id}
              row={row}
              expanded={!bulkMode && expandedId === row.id}
              bulkMode={bulkMode}
              bulkSelected={bulkSelected.has(row.id)}
              onBulkToggle={() => toggleBulkSelect(row.id)}
              onToggle={() => setExpandedId((cur) => (cur === row.id ? null : row.id))}
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
        <Alert severity={toast.severity} variant="filled" onClose={() => setToast((t) => ({ ...t, open: false }))}>
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
        background: adminColor.panel,
        borderRadius: "12px",
        border: `1px solid ${adminColor.line}`,
        overflow: "hidden",
        transition: "box-shadow 0.18s ease",
        boxShadow: expanded ? "0 6px 18px rgba(31,41,51,0.08)" : "0 1px 2px rgba(31,41,51,0.04)",
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
          background: bulkMode && bulkSelected ? `${adminColor.accent}14` : "transparent",
          "&:hover": { background: adminColor.panel2 },
        }}
      >
        {bulkMode && (
          <Box
            sx={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              border: `2px solid ${bulkSelected ? adminColor.accent : adminColor.line2}`,
              background: bulkSelected ? adminColor.accent : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              transition: "background 0.18s ease, border-color 0.18s ease",
            }}
          >
            {bulkSelected && <Check size={13} weight="bold" color="#fff" />}
          </Box>
        )}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: adminColor.text, lineHeight: 1.2 }}>
            {row.serviceName || row.serviceId}
            {row.duration ? ` · ${row.duration} min` : ""}
          </Typography>
          <Stack direction="row" spacing={0.75} alignItems="center" sx={{ mt: "4px", flexWrap: "wrap" }}>
            <Box sx={{ height: 20, display: "flex", alignItems: "center", fontSize: 10.5, fontWeight: 700, background: `${adminColor.accent}1F`, color: adminColor.accent, borderRadius: "10px", px: "8px" }}>
              {row.therapistName || row.therapistId}
            </Box>
            <Typography sx={{ fontSize: 11, color: adminColor.muted }}>
              {fmtDate(row.startAt)}
            </Typography>
          </Stack>
        </Box>
        {expanded ? (
          <CaretUp size={16} color={adminColor.muted} />
        ) : (
          <CaretDown size={16} color={adminColor.muted} />
        )}
      </Box>

      {/* Expanded panel */}
      {expanded && (
        <Box sx={{ padding: "0 14px 14px" }}>
          <Divider sx={{ mb: "12px", borderColor: adminColor.line }} />

          {/* Lang picker */}
          <Box sx={{ mb: "10px" }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: adminColor.muted, mb: "6px" }}>
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
              sx={{ fontFamily: SANS, fontSize: 13 }}
              MenuProps={{ PaperProps: { sx: { background: adminColor.panel } } }}
            >
              {(Object.keys(LANG_LABELS) as ReviewLang[]).map((k) => (
                <MenuItem key={k} value={k}>
                  {LANG_LABELS[k]}
                </MenuItem>
              ))}
            </Select>
          </Box>

          {/* Rating */}
          <Box sx={{ mb: "10px" }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: adminColor.muted, mb: "4px" }}>
              Rating
            </Typography>
            <Stack direction="row" spacing={0.5}>
              {[1, 2, 3, 4, 5].map((n) => (
                <IconButton key={n} onClick={() => setRating(n)} size="small" sx={{ padding: "2px" }}>
                  <Star size={26} weight="fill" color={n <= rating ? adminColor.amber : adminColor.line2} />
                </IconButton>
              ))}
            </Stack>
          </Box>

          {/* Template picker */}
          {tpls.length > 0 && (
            <Box sx={{ mb: "10px" }}>
              <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: adminColor.muted, mb: "6px" }}>
                Template · เลือกหรือพิมพ์เอง
              </Typography>
              <Select
                value=""
                displayEmpty
                onChange={(e) => setText(e.target.value)}
                size="small"
                fullWidth
                sx={{ fontFamily: SANS, fontSize: 13 }}
                renderValue={() => <em style={{ color: adminColor.muted }}>เลือก template…</em>}
                MenuProps={{ PaperProps: { sx: { background: adminColor.panel } } }}
              >
                {tpls.map((tpl, i) => (
                  <MenuItem key={i} value={tpl} sx={{ whiteSpace: "normal" }}>
                    {tpl}
                  </MenuItem>
                ))}
              </Select>
            </Box>
          )}

          {/* Review text */}
          <Box sx={{ mb: "10px" }}>
            <Typography sx={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: adminColor.muted, mb: "4px" }}>
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
              sx={{ "& .MuiInputBase-root": { fontFamily: SANS, fontSize: 13, background: adminColor.panel } }}
            />
          </Box>

          {/* Preview */}
          <Box sx={{ padding: "10px 12px", background: adminColor.bg, borderRadius: "10px", border: `1px dashed ${adminColor.line2}`, mb: "12px" }}>
            <Typography sx={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: adminColor.muted, mb: "4px" }}>
              Preview
            </Typography>
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: "4px" }}>
              {Array.from({ length: rating }).map((_, i) => (
                <Star key={i} size={13} weight="fill" color={adminColor.amber} />
              ))}
              <Typography sx={{ fontSize: 11, color: adminColor.muted, ml: "6px !important" }}>
                Anonymous · just now · Verified booking
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 13, color: adminColor.text, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
              {text || <em style={{ color: adminColor.muted }}>รีวิวจะแสดงตรงนี้…</em>}
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
                background: adminColor.accent,
                fontFamily: SANS,
                fontWeight: 700,
                textTransform: "none",
                borderRadius: "10px",
                "&:hover": { background: adminColor.accentDeep },
              }}
            >
              {submitting ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : `Save · บันทึกรีวิว · ★${rating}`}
            </Button>
            <Button
              variant="outlined"
              onClick={onToggle}
              sx={{ fontFamily: SANS, fontWeight: 700, textTransform: "none", color: adminColor.text, borderColor: adminColor.line2, borderRadius: "10px" }}
            >
              Cancel · ยกเลิก
            </Button>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default AdminSeedReviewsPage;
