// src/pages/admin/AdminReviewListPage.tsx
//
// 🆕 Round 28s214 — Rewritten to read from `bookings` collection instead
//   of the legacy `reviews` collection (which was empty in production
//   because no flow ever wrote to it).
//
// Reviews live on bookings: any booking with a non-empty `reviewText` is
// a review. This page lets admin:
//   • see every review on the platform with full provenance (which
//     booking, which therapist, when),
//   • edit the text (e.g. fix a typo),
//   • hide a review (clears rating + text — booking doc stays so the
//     guest's reservation history is preserved).
//
// Pair-tool: `/admin/seed-reviews` adds rating + text to completed
// bookings that never got a guest comment.
//
// 🆕 Round 28s291 (founder: "admin/reviews ปรับแก้") — full pass:
//   • Query bug: `where("rating",">=",1)` + a client-side `rating<1`
//     exclusion silently dropped every review that had `reviewText` but
//     no `rating` field — the exact same gap round 28s276 already found
//     and fixed for the therapist-detail review aggregation. That means
//     some reviews real customers can already see on the public review
//     wall (ReviewListPage.tsx filters on `reviewText`, not `rating`)
//     were INVISIBLE here — admin had no way to edit or hide them. Fixed
//     by querying `where("reviewText","!=","")` instead (this page is
//     admin-only with full Firestore access, so the anonymous-visitor
//     privacy constraint that requires `rating>=1` on the public-facing
//     hook doesn't apply here) and defaulting a missing rating to 5,
//     matching the established convention in ReviewListPage.tsx /
//     AdminUsersPage.tsx.
//   • Ocean Study restyle — this was the last admin page still on the
//     pre-28s235 theme.
//   • Edit/Hide now call logAdminAction, matching every other
//     consequential admin write this session.
//   • Search box + rating filter + language filter, matching every other
//     admin list page touched this session.
//   • Timestamp.now() → serverTimestamp() for consistency with the rest
//     of the codebase (client clock → server clock).

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Stack,
  IconButton,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { db } from "@/lib/firebase";
import {
  collection,
  updateDoc,
  doc,
  onSnapshot,
  query,
  where,
  Timestamp,
  serverTimestamp,
  deleteField,
} from "firebase/firestore";
import dayjs from "dayjs";
import { Link as RouterLink } from "react-router-dom";
import { Star, ChatCircleText, Warning, MagnifyingGlass, PencilSimple, EyeSlash, ArrowSquareOut, ChatCenteredText, ArrowCounterClockwise, Eye } from "phosphor-react";
import { therapists as THERAPIST_DATA } from "@/data/therapists";
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";
import { logAdminAction } from "@/utils/auditLog";

const SANS = adminFont.sans;

const THERAPIST_NAME_MAP: Record<string, string> = THERAPIST_DATA.reduce(
  (acc, t) => {
    acc[t.id] = t.name;
    return acc;
  },
  {} as Record<string, string>,
);

interface ReviewRow {
  id: string;
  therapistId: string;
  therapistName: string;
  serviceId?: string;
  serviceName?: string;
  duration?: number;
  rating: number;
  reviewText: string;
  reviewLang?: string;
  createdAt?: Timestamp | null;
  startAt?: Timestamp | null;
  /** true when viewing the "hidden reviews" mode */
  hidden?: boolean;
  /** preserved text for hidden reviews (to allow restore) */
  hiddenText?: string;
  hiddenRating?: number;
}

const AdminReviewListPage: React.FC = () => {
  const [rows, setRows] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [editRow, setEditRow] = useState<ReviewRow | null>(null);
  const [editedText, setEditedText] = useState("");
  // 🆕 Round 28s218 — Founder: "ดาว แก้ไม่ได้". Added rating to the
  //   Edit dialog so admin can adjust ★ in the same flow.
  const [editedRating, setEditedRating] = useState<number>(5);
  const [hideDialog, setHideDialog] = useState(false);
  const [hideRow, setHideRow] = useState<ReviewRow | null>(null);

  // 🆕 Round 28s291 — search + rating + language filters.
  const [searchQuery, setSearchQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [langFilter, setLangFilter] = useState<string | null>(null);
  // 🆕 Round 28s373 — therapist filter + hidden reviews toggle
  const [therapistFilter, setTherapistFilter] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);

  // 🆕 Round 28s291 — query on `reviewText` / `hiddenText` depending on
  //   showHidden toggle. Single-field inequality, still auto-indexed.
  //   🆕 Round 28s373 — showHidden switches between two queries: visible
  //   reviews (`reviewText != ""`) and hidden reviews (`hiddenText != ""`).
  useEffect(() => {
    setLoading(true);
    const fieldName = showHidden ? "hiddenText" : "reviewText";
    const q = query(collection(db, "bookings"), where(fieldName, "!=", ""));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ReviewRow[] = [];
        snap.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          let text: string;
          let rating: number;
          if (showHidden) {
            text = ((data.hiddenText as string) ?? "").trim();
            rating =
              typeof data.hiddenRating === "number"
                ? (data.hiddenRating as number)
                : 5;
          } else {
            text = ((data.reviewText as string) ?? "").trim();
            // 🆕 Round 28s291 — missing rating defaults to 5 instead of
            //   being excluded, matching ReviewListPage.tsx / AdminUsersPage.tsx.
            rating =
              typeof data.rating === "number" ? (data.rating as number) : 5;
          }
          if (!text) return; // defensive
          const therapistId = (data.therapistId as string) ?? "";
          list.push({
            id: d.id,
            therapistId,
            therapistName:
              (data.therapistName as string) ??
              THERAPIST_NAME_MAP[therapistId] ??
              "Unknown",
            serviceId: (data.serviceId as string) ?? "",
            serviceName: (data.serviceName as string) ?? "",
            duration:
              typeof data.duration === "number"
                ? (data.duration as number)
                : undefined,
            rating,
            reviewText: text,
            reviewLang: (data.reviewLang as string) ?? undefined,
            createdAt: (data.createdAt as Timestamp) ?? null,
            startAt: (data.startAt as Timestamp) ?? null,
            hidden: showHidden,
            hiddenText: showHidden ? text : undefined,
            hiddenRating: showHidden ? rating : undefined,
          });
        });
        // Sort newest first by createdAt (fallback startAt)
        list.sort((a, b) => {
          const ma =
            a.createdAt?.toMillis() ?? a.startAt?.toMillis() ?? 0;
          const mb =
            b.createdAt?.toMillis() ?? b.startAt?.toMillis() ?? 0;
          return mb - ma;
        });
        setRows(list);
        setLoading(false);
      },
      (err) => {
        // eslint-disable-next-line no-console
        console.error("[AdminReviewList] snapshot error:", err);
        setLoading(false);
      },
    );
    return () => unsub();
  }, [showHidden]);

  const totalRating = useMemo(() => {
    if (rows.length === 0) return 0;
    const sum = rows.reduce((acc, r) => acc + r.rating, 0);
    return Math.round((sum / rows.length) * 100) / 100;
  }, [rows]);

  const lowRatingCount = useMemo(
    () => rows.filter((r) => r.rating <= 2).length,
    [rows],
  );

  const langOptions = useMemo(
    () =>
      Array.from(
        new Set(rows.map((r) => r.reviewLang).filter(Boolean) as string[]),
      ).sort(),
    [rows],
  );

  // 🆕 Round 28s373 — unique therapists from current row set
  const therapistOptions = useMemo(() => {
    const seen = new Map<string, string>();
    rows.forEach((r) => {
      if (r.therapistId && !seen.has(r.therapistId))
        seen.set(r.therapistId, r.therapistName);
    });
    return Array.from(seen.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (ratingFilter != null && r.rating !== ratingFilter) return false;
      if (langFilter != null && r.reviewLang !== langFilter) return false;
      // 🆕 Round 28s373 — therapist filter
      if (therapistFilter != null && r.therapistId !== therapistFilter)
        return false;
      if (
        q &&
        !r.therapistName.toLowerCase().includes(q) &&
        !r.reviewText.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [rows, searchQuery, ratingFilter, langFilter, therapistFilter]);

  const handleOpenEdit = (row: ReviewRow) => {
    setEditRow(row);
    setEditedText(row.reviewText);
    setEditedRating(row.rating);
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editRow) return;
    const clampedRating = Math.max(1, Math.min(5, Math.round(editedRating)));
    try {
      await updateDoc(doc(db, "bookings", editRow.id), {
        reviewText: editedText.trim(),
        rating: clampedRating,
        reviewEditedAt: serverTimestamp(),
      });
      void logAdminAction("review.edit", {
        therapistName: editRow.therapistName,
        bookingId: editRow.id,
        rating: clampedRating,
      });
      setEditDialog(false);
      setEditRow(null);
      setEditedText("");
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error saving review:", err);
    }
  };

  const handleOpenHide = (row: ReviewRow) => {
    setHideRow(row);
    setHideDialog(true);
  };

  const handleConfirmHide = async () => {
    if (!hideRow) return;
    try {
      // 🆕 Round 28s373 — save hiddenText + hiddenRating BEFORE clearing
      //   rating/reviewText so admin can restore later via the "Hidden" toggle.
      //   booking doc stays intact (session history + payment record safe).
      await updateDoc(doc(db, "bookings", hideRow.id), {
        hiddenText: hideRow.reviewText,
        hiddenRating: hideRow.rating,
        rating: deleteField(),
        reviewText: deleteField(),
        reviewLang: deleteField(),
        reviewHiddenAt: serverTimestamp(),
      });
      void logAdminAction("review.hide", {
        therapistName: hideRow.therapistName,
        bookingId: hideRow.id,
      });
      setHideDialog(false);
      setHideRow(null);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error hiding review:", err);
    }
  };

  // 🆕 Round 28s373 — restore a hidden review back to public
  const handleRestore = async (row: ReviewRow) => {
    if (!row.hiddenText) return;
    try {
      await updateDoc(doc(db, "bookings", row.id), {
        reviewText: row.hiddenText,
        rating: row.hiddenRating ?? 5,
        reviewHiddenAt: deleteField(),
        hiddenText: deleteField(),
        hiddenRating: deleteField(),
      });
      void logAdminAction("review.restore", {
        therapistName: row.therapistName,
        bookingId: row.id,
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("Error restoring review:", err);
    }
  };

  const columns: GridColDef<ReviewRow>[] = [
    {
      field: "therapistName",
      headerName: "Practitioner",
      flex: 1,
      minWidth: 140,
      renderCell: (params) => (
        <RouterLink
          to={`/admin/therapists/${params.row.therapistId}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: adminColor.accent,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          {params.row.therapistName}
        </RouterLink>
      ),
    },
    {
      field: "rating",
      headerName: "★",
      width: 80,
      renderCell: (params) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: "4px", height: "100%" }}>
          <Star size={15} weight="fill" color={adminColor.amber} />
          <Typography sx={{ ...adminFigureSx, fontSize: 13, color: adminColor.text }}>
            {params.row.rating}
          </Typography>
        </Box>
      ),
    },
    {
      field: "reviewText",
      headerName: "Review",
      flex: 2.2,
      minWidth: 240,
      renderCell: (params) => (
        <Typography
          sx={{
            fontSize: 13,
            whiteSpace: "normal",
            wordBreak: "break-word",
            lineHeight: 1.45,
            padding: "8px 0",
            color: adminColor.text,
          }}
        >
          {params.row.reviewText}
        </Typography>
      ),
    },
    {
      field: "serviceName",
      headerName: "Service",
      flex: 1,
      minWidth: 140,
      renderCell: (params) => (
        <Typography sx={{ fontSize: 12, color: adminColor.muted }}>
          {params.row.serviceName}
          {params.row.duration ? ` · ${params.row.duration}min` : ""}
        </Typography>
      ),
    },
    {
      field: "reviewLang",
      headerName: "Lang",
      width: 70,
      renderCell: (params) =>
        params.row.reviewLang ? (
          <Box
            sx={{
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.04em",
              color: adminColor.accent,
              background: `${adminColor.accent}1F`,
              borderRadius: "5px",
              px: "6px",
              py: "2px",
            }}
          >
            {params.row.reviewLang}
          </Box>
        ) : (
          <Typography sx={{ fontSize: 11, color: adminColor.dim }}>—</Typography>
        ),
    },
    {
      field: "createdAt",
      headerName: "Date",
      width: 130,
      valueGetter: (_value, row: ReviewRow) => {
        const ts = row.createdAt ?? row.startAt;
        if (!ts) return "—";
        try {
          return dayjs(ts.toDate()).format("DD MMM YY");
        } catch {
          return "—";
        }
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 110,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          {!params.row.hidden && (
            <IconButton
              size="small"
              onClick={() => handleOpenEdit(params.row)}
              sx={{ color: adminColor.text }}
              aria-label="Edit"
            >
              <PencilSimple size={16} />
            </IconButton>
          )}
          {params.row.hidden ? (
            <IconButton
              size="small"
              onClick={() => void handleRestore(params.row)}
              sx={{ color: "#16A34A" }}
              aria-label="Restore review"
              title="Restore · คืนรีวิว"
            >
              <ArrowCounterClockwise size={16} />
            </IconButton>
          ) : (
            <IconButton
              size="small"
              onClick={() => handleOpenHide(params.row)}
              sx={{ color: adminColor.red }}
              aria-label="Hide"
            >
              <EyeSlash size={16} />
            </IconButton>
          )}
        </Stack>
      ),
    },
  ];

  const gridSx = {
    background: adminColor.panel,
    border: "none",
    color: adminColor.text,
    fontFamily: SANS,
    "& .MuiDataGrid-columnHeaders": {
      background: adminColor.panel3,
      color: adminColor.muted,
      borderColor: adminColor.line,
      fontWeight: 700,
      fontSize: 12,
    },
    "& .MuiDataGrid-cell": {
      borderColor: adminColor.line,
      alignItems: "flex-start",
      paddingTop: "12px",
      paddingBottom: "12px",
    },
    "& .MuiDataGrid-row:hover": { background: adminColor.panel2 },
    "& .hidden-review-row": { opacity: 0.5, fontStyle: "italic" },
    "& .hidden-review-row:hover": { opacity: 0.7 },
    "& .MuiDataGrid-footerContainer": { borderColor: adminColor.line, color: adminColor.muted },
    "& .MuiTablePagination-root": { color: adminColor.muted },
  } as const;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, fontFamily: SANS }}>
      {/* 🆕 Round 28r47 (bilingual pass) — English page title + Thai
          subtitle, matching r35 pattern; "Seed Reviews" button pulled out
          into its own row above the stats so the header block stays clean. */}
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
          <Typography sx={{ fontFamily: adminFont.serif, fontSize: 22, fontWeight: 600, color: adminColor.text, lineHeight: 1 }}>
            Reviews
          </Typography>
          <Typography sx={{ fontFamily: SANS, fontSize: 11, color: adminColor.dim, mt: 0.4, letterSpacing: "0.02em" }}>
            รีวิว
          </Typography>
          <Typography sx={{ fontSize: 12.5, color: adminColor.muted, mt: 1 }}>
            รีวิวทุกอันในระบบ ดึงจาก booking ที่มี reviewText — แก้ไข/ซ่อนได้ที่นี่
          </Typography>
        </Box>
        <Button
          variant="contained"
          component={RouterLink}
          to="/admin/seed-reviews"
          startIcon={<ChatCenteredText size={16} />}
          sx={{
            background: adminColor.accent,
            textTransform: "none",
            fontWeight: 700,
            borderRadius: "12px",
            "&:hover": { background: adminColor.accentDeep },
          }}
        >
          Seed Reviews · เพิ่มรีวิว
        </Button>
      </Box>

      {/* 🆕 Round 28s291 → r47 — stat plates: icon 32 → 46, inner-highlight
          shadow, hover lift, English label + Thai subtitle. */}
      <Box sx={{ display: "flex", gap: 1.25, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        {([
          { icon: <ChatCircleText size={20} weight="duotone" />, num: rows.length,                            en: "Total Reviews", th: "รีวิวทั้งหมด",  color: adminColor.accent,   figColor: adminColor.text  },
          { icon: <Star           size={20} weight="duotone" />, num: rows.length ? totalRating : "—",         en: "Avg Rating",    th: "คะแนนเฉลี่ย",   color: adminColor.amber,    figColor: adminColor.amber },
          { icon: <Warning        size={20} weight="duotone" />, num: lowRatingCount,                          en: "★1-2 to Review", th: "★1-2 ต้องดู",   color: adminColor.red,      figColor: adminColor.red   },
        ]).map((c, i) => (
          <Box
            key={i}
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

      {/* 🆕 Round 28s291 → r47 — search + rating + language filters. Per
          r43 rule: filter labels English-only.
          🆕 Round 28r47 audit: both Rating + Lang TextField-selects were
          missing MenuProps.PaperProps (same 28s265 transparency class of
          bug — global theme's translucent Paper leaked through). Added. */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.5, alignItems: "center" }}>
        <Box sx={{ flex: 1, minWidth: 220, maxWidth: 360, display: "flex", alignItems: "center", gap: 1, background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "12px", p: "9px 13px" }}>
          <MagnifyingGlass size={15} color={adminColor.dim} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search practitioner or review text…"
            style={{ border: "none", outline: "none", background: "transparent", fontSize: 13.5, color: adminColor.text, width: "100%", fontFamily: SANS }}
          />
        </Box>
        <TextField
          select
          size="small"
          label="Rating"
          value={ratingFilter ?? "__all__"}
          onChange={(e) => setRatingFilter(e.target.value === "__all__" ? null : Number(e.target.value))}
          sx={{ minWidth: 130, "& .MuiOutlinedInput-root": { borderRadius: "12px", background: adminColor.panel } }}
          SelectProps={{ MenuProps: { PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px" } } } }}
        >
          <MenuItem value="__all__">All</MenuItem>
          {[5, 4, 3, 2, 1].map((n) => (
            <MenuItem key={n} value={n}>{n} stars</MenuItem>
          ))}
        </TextField>
        {langOptions.length > 0 && (
          <TextField
            select
            size="small"
            label="Language"
            value={langFilter ?? "__all__"}
            onChange={(e) => setLangFilter(e.target.value === "__all__" ? null : e.target.value)}
            sx={{ minWidth: 120, "& .MuiOutlinedInput-root": { borderRadius: "12px", background: adminColor.panel } }}
            SelectProps={{ MenuProps: { PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px" } } } }}
          >
            <MenuItem value="__all__">All</MenuItem>
            {langOptions.map((l) => (
              <MenuItem key={l} value={l}>{l.toUpperCase()}</MenuItem>
            ))}
          </TextField>
        )}

        {/* 🆕 Round 28s373 — Practitioner filter */}
        {therapistOptions.length > 1 && (
          <TextField
            select
            size="small"
            label="Practitioner · พนักงาน"
            value={therapistFilter ?? "__all__"}
            onChange={(e) =>
              setTherapistFilter(
                e.target.value === "__all__" ? null : e.target.value,
              )
            }
            sx={{ minWidth: 160, "& .MuiOutlinedInput-root": { borderRadius: "12px", background: adminColor.panel } }}
            SelectProps={{ MenuProps: { PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px" } } } }}
          >
            <MenuItem value="__all__">All Practitioners</MenuItem>
            {therapistOptions.map((t) => (
              <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
            ))}
          </TextField>
        )}

        {/* 🆕 Round 28s373 — Hidden reviews toggle */}
        <Button
          variant={showHidden ? "contained" : "outlined"}
          size="small"
          onClick={() => {
            setShowHidden((v) => !v);
            setTherapistFilter(null); // reset therapist filter on mode switch
          }}
          startIcon={showHidden ? <Eye size={15} /> : <EyeSlash size={15} />}
          sx={{
            borderRadius: "12px",
            textTransform: "none",
            fontWeight: 700,
            fontSize: 13,
            borderColor: adminColor.line2,
            color: showHidden ? "#fff" : adminColor.muted,
            background: showHidden ? adminColor.red : "transparent",
            "&:hover": {
              background: showHidden ? "#B91C1C" : `${adminColor.red}18`,
              borderColor: adminColor.red,
              color: showHidden ? "#fff" : adminColor.red,
            },
          }}
        >
          {showHidden ? "Hidden · ซ่อนอยู่" : "Show Hidden · ดูที่ซ่อน"}
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", p: 5 }}>
          <CircularProgress sx={{ color: adminColor.accent }} />
        </Box>
      ) : rows.length === 0 ? (
        <Box sx={{ p: "40px 16px", textAlign: "center", background: adminColor.panel, borderRadius: "18px", border: `1px solid ${adminColor.line}`, boxShadow: "0 2px 10px rgba(31,41,51,0.04)" }}>
          <Typography sx={{ color: adminColor.muted, mb: "12px" }}>
            ยังไม่มีรีวิวในระบบ · ใช้ Seed Reviews เพื่อ backfill จาก booking ที่
            completed แล้ว
          </Typography>
          <Button
            variant="contained"
            component={RouterLink}
            to="/admin/seed-reviews"
            startIcon={<ArrowSquareOut size={16} />}
            sx={{ background: adminColor.accent, textTransform: "none", fontWeight: 700, borderRadius: "12px", "&:hover": { background: adminColor.accentDeep } }}
          >
            Go to Seed Reviews · เพิ่มรีวิว
          </Button>
        </Box>
      ) : filteredRows.length === 0 ? (
        <Box sx={{ p: "40px 16px", textAlign: "center", background: adminColor.panel, borderRadius: "18px", border: `1px solid ${adminColor.line}`, boxShadow: "0 2px 10px rgba(31,41,51,0.04)" }}>
          <Typography sx={{ color: adminColor.muted }}>ไม่พบรีวิวที่ตรงกับตัวกรอง · No reviews match this filter</Typography>
        </Box>
      ) : (
        <Box sx={{ background: adminColor.panel, borderRadius: "18px", border: `1px solid ${adminColor.line}`, overflow: "hidden", boxShadow: "0 2px 10px rgba(31,41,51,0.04)" }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            getRowId={(row) => row.id}
            disableRowSelectionOnClick
            getRowHeight={() => "auto"}
            getRowClassName={(params) =>
              params.row.hidden ? "hidden-review-row" : ""
            }
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            pageSizeOptions={[25, 50, 100]}
            sx={gridSx}
          />
        </Box>
      )}

      {/* Edit dialog */}
      <Dialog
        open={editDialog}
        onClose={() => setEditDialog(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontWeight: 700, fontFamily: adminFont.serif, color: adminColor.text }}>
          Edit Review · {editRow?.therapistName}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 12, color: adminColor.muted, mb: "12px" }}>
            Booking ID: {editRow?.id?.slice(0, 8).toUpperCase()} · original ★
            {editRow?.rating}
          </Typography>

          {/* 🆕 Round 28s218 — Rating editor (founder: "ดาว แก้ไม่ได้"). */}
          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: adminColor.muted, mb: "4px" }}>
            Rating
          </Typography>
          <Stack direction="row" spacing={0.5} sx={{ mb: "16px" }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <IconButton
                key={n}
                onClick={() => setEditedRating(n)}
                size="small"
                sx={{ padding: "2px" }}
                aria-label={`Set rating to ${n}`}
              >
                <Star size={28} weight="fill" color={n <= editedRating ? adminColor.amber : adminColor.line2} />
              </IconButton>
            ))}
            <Typography sx={{ fontSize: 14, fontWeight: 700, color: adminColor.text, ml: "12px !important", alignSelf: "center" }}>
              {editedRating}/5
            </Typography>
          </Stack>

          <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: adminColor.muted, mb: "4px" }}>
            Review text
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={4}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel · ยกเลิก</Button>
          <Button
            onClick={() => void handleSaveEdit()}
            variant="contained"
            disabled={!editedText.trim()}
            sx={{ background: adminColor.accent, textTransform: "none", fontWeight: 700, "&:hover": { background: adminColor.accentDeep } }}
          >
            Save · บันทึก
          </Button>
        </DialogActions>
      </Dialog>

      {/* Hide confirm dialog */}
      <Dialog
        open={hideDialog}
        onClose={() => setHideDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle sx={{ fontWeight: 700, fontFamily: adminFont.serif, color: adminColor.text }}>Hide this review?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, lineHeight: 1.6, color: adminColor.text }}>
            ลบฟิลด์ <code>rating</code> + <code>reviewText</code> ออกจาก
            booking — booking doc ยังอยู่ · session history + payment record
            ไม่หาย · รีวิวจะหายจากหน้า{" "}
            <strong>{hideRow?.therapistName}</strong> ทันที
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHideDialog(false)}>Cancel · ยกเลิก</Button>
          <Button
            onClick={() => void handleConfirmHide()}
            variant="contained"
            sx={{ background: adminColor.red, textTransform: "none", fontWeight: 700, "&:hover": { background: "#B91C1C" } }}
          >
            Hide · ซ่อน
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminReviewListPage;
