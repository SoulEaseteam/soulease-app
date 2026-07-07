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
import { Star, ChatCircleText, Warning, MagnifyingGlass, PencilSimple, EyeSlash, ArrowSquareOut, ChatCenteredText } from "phosphor-react";
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

  // 🆕 Round 28s291 — query on `reviewText` (what actually makes a booking
  //   a "review"), not `rating` (which some real reviews don't have). See
  //   header comment for the full story. Single-field inequality, still
  //   auto-indexed, still sorted client-side to dodge a composite index.
  useEffect(() => {
    const q = query(collection(db, "bookings"), where("reviewText", "!=", ""));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ReviewRow[] = [];
        snap.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          const text = ((data.reviewText as string) ?? "").trim();
          if (!text) return; // defensive — query already guarantees this
          // 🆕 Round 28s291 — missing rating defaults to 5 instead of being
          //   excluded, matching ReviewListPage.tsx / AdminUsersPage.tsx.
          const rating =
            typeof data.rating === "number" ? (data.rating as number) : 5;
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
  }, []);

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

  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return rows.filter((r) => {
      if (ratingFilter != null && r.rating !== ratingFilter) return false;
      if (langFilter != null && r.reviewLang !== langFilter) return false;
      if (
        q &&
        !r.therapistName.toLowerCase().includes(q) &&
        !r.reviewText.toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [rows, searchQuery, ratingFilter, langFilter]);

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
      // Clear review fields but preserve the booking doc itself (so
      // session history + payment record stay intact).
      await updateDoc(doc(db, "bookings", hideRow.id), {
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

  const columns: GridColDef<ReviewRow>[] = [
    {
      field: "therapistName",
      headerName: "Practitioner",
      flex: 1,
      minWidth: 140,
      renderCell: (params) => (
        <RouterLink
          to={`/therapists/${params.row.therapistId}`}
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
          <IconButton
            size="small"
            onClick={() => handleOpenEdit(params.row)}
            sx={{ color: adminColor.text }}
            aria-label="Edit"
          >
            <PencilSimple size={16} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleOpenHide(params.row)}
            sx={{ color: adminColor.red }}
            aria-label="Hide"
          >
            <EyeSlash size={16} />
          </IconButton>
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
    "& .MuiDataGrid-footerContainer": { borderColor: adminColor.line, color: adminColor.muted },
    "& .MuiTablePagination-root": { color: adminColor.muted },
  } as const;

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, fontFamily: SANS }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 0.5,
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <Typography sx={{ fontFamily: adminFont.serif, fontSize: 22, fontWeight: 600, color: adminColor.text }}>
          Reviews
        </Typography>
      </Box>
      <Typography sx={{ fontSize: 12.5, color: adminColor.muted, mb: 1.5 }}>
        รีวิวทุกอันในระบบ ดึงจาก booking ที่มี reviewText — แก้ไข/ซ่อนได้ที่นี่
      </Typography>

      {/* 🆕 Round 28s291 — icon-circle stat pills, matching Users/Dashboard. */}
      <Box sx={{ display: "flex", gap: 1.25, mb: 2, flexWrap: "wrap", alignItems: "center" }}>
        {([
          { icon: <ChatCircleText size={16} color="#fff" weight="fill" />, grad: `radial-gradient(circle at 35% 30%, #6FA0AD, ${adminColor.accent})`, num: rows.length, label: "Total reviews", color: adminColor.text },
          { icon: <Star size={16} color="#fff" weight="fill" />, grad: `radial-gradient(circle at 35% 30%, #F59E0B, ${adminColor.amber})`, num: rows.length ? totalRating : "—", label: "Avg rating", color: adminColor.amber },
          { icon: <Warning size={16} color="#fff" weight="fill" />, grad: `radial-gradient(circle at 35% 30%, #EF4444, ${adminColor.red})`, num: lowRatingCount, label: "★1-2 ต้องดู", color: adminColor.red },
        ]).map((c, i) => (
          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: "10px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "15px", p: "8px 15px 8px 8px", boxShadow: "0 1px 3px rgba(31,41,51,0.04)" }}>
            <Box sx={{ width: 32, height: 32, borderRadius: "50%", background: c.grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{c.icon}</Box>
            <Box>
              <Typography sx={{ ...adminFigureSx, fontSize: 17, color: c.color, lineHeight: 1.1 }}>{c.num}</Typography>
              <Typography sx={{ fontSize: 10, color: adminColor.dim, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{c.label}</Typography>
            </Box>
          </Box>
        ))}
        <Button
          variant="contained"
          component={RouterLink}
          to="/admin/seed-reviews"
          startIcon={<ChatCenteredText size={16} />}
          sx={{
            ml: "auto",
            background: adminColor.accent,
            textTransform: "none",
            fontWeight: 700,
            borderRadius: "12px",
            "&:hover": { background: adminColor.accentDeep },
          }}
        >
          Seed Reviews
        </Button>
      </Box>

      {/* 🆕 Round 28s291 — search + rating + language filters. */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 1.5, alignItems: "center" }}>
        <Box sx={{ flex: 1, minWidth: 220, maxWidth: 360, display: "flex", alignItems: "center", gap: 1, background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "12px", p: "9px 13px" }}>
          <MagnifyingGlass size={15} color={adminColor.dim} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาชื่อหมอนวด / ข้อความรีวิว…"
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
        >
          <MenuItem value="__all__">ทั้งหมด</MenuItem>
          {[5, 4, 3, 2, 1].map((n) => (
            <MenuItem key={n} value={n}>★{n}</MenuItem>
          ))}
        </TextField>
        {langOptions.length > 0 && (
          <TextField
            select
            size="small"
            label="Lang"
            value={langFilter ?? "__all__"}
            onChange={(e) => setLangFilter(e.target.value === "__all__" ? null : e.target.value)}
            sx={{ minWidth: 110, "& .MuiOutlinedInput-root": { borderRadius: "12px", background: adminColor.panel } }}
          >
            <MenuItem value="__all__">ทุกภาษา</MenuItem>
            {langOptions.map((l) => (
              <MenuItem key={l} value={l}>{l.toUpperCase()}</MenuItem>
            ))}
          </TextField>
        )}
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", p: 5 }}>
          <CircularProgress sx={{ color: adminColor.accent }} />
        </Box>
      ) : rows.length === 0 ? (
        <Box sx={{ p: "40px 16px", textAlign: "center", background: adminColor.panel, borderRadius: "16px", border: `1px solid ${adminColor.line}` }}>
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
            Go to Seed Reviews
          </Button>
        </Box>
      ) : filteredRows.length === 0 ? (
        <Box sx={{ p: "40px 16px", textAlign: "center", background: adminColor.panel, borderRadius: "16px", border: `1px solid ${adminColor.line}` }}>
          <Typography sx={{ color: adminColor.muted }}>ไม่พบรีวิวที่ตรงกับตัวกรอง</Typography>
        </Box>
      ) : (
        <Box sx={{ background: adminColor.panel, borderRadius: "16px", border: `1px solid ${adminColor.line}`, overflow: "hidden" }}>
          <DataGrid
            rows={filteredRows}
            columns={columns}
            getRowId={(row) => row.id}
            disableRowSelectionOnClick
            getRowHeight={() => "auto"}
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
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button
            onClick={() => void handleSaveEdit()}
            variant="contained"
            disabled={!editedText.trim()}
            sx={{ background: adminColor.accent, textTransform: "none", fontWeight: 700, "&:hover": { background: adminColor.accentDeep } }}
          >
            Save
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
          <Button onClick={() => setHideDialog(false)}>Cancel</Button>
          <Button
            onClick={() => void handleConfirmHide()}
            variant="contained"
            sx={{ background: adminColor.red, textTransform: "none", fontWeight: 700, "&:hover": { background: "#B91C1C" } }}
          >
            Hide review
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminReviewListPage;
