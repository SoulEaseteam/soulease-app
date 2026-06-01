// src/pages/admin/AdminReviewListPage.tsx
//
// 🆕 Round 28s214 — Rewritten to read from `bookings` collection instead
//   of the legacy `reviews` collection (which was empty in production
//   because no flow ever wrote to it).
//
// Reviews live on bookings: any booking with `rating >= 1` and a non-
// empty `reviewText` is a review. This page lets admin:
//   • see every review on the platform with full provenance (which
//     booking, which therapist, when),
//   • edit the text (e.g. fix a typo),
//   • hide a review (clears rating + text — booking doc stays so the
//     guest's reservation history is preserved).
//
// Pair-tool: `/admin/seed-reviews` adds rating + text to completed
// bookings that never got a guest comment.

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Stack,
  IconButton,
} from "@mui/material";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import VisibilityOffRoundedIcon from "@mui/icons-material/VisibilityOffRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import RateReviewRoundedIcon from "@mui/icons-material/RateReviewRounded";
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
  deleteField,
} from "firebase/firestore";
import dayjs from "dayjs";
import { Link as RouterLink } from "react-router-dom";
import { therapists as THERAPIST_DATA } from "@/data/therapists";

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

  // Round 28s214 — Single-field inequality query. Firestore auto-
  //   indexes `rating` so no composite index needed. We sort client-
  //   side to avoid the composite (rating asc, createdAt desc) index
  //   that would otherwise be required by adding orderBy.
  useEffect(() => {
    const q = query(collection(db, "bookings"), where("rating", ">=", 1));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: ReviewRow[] = [];
        snap.forEach((d) => {
          const data = d.data() as Record<string, unknown>;
          const text = ((data.reviewText as string) ?? "").trim();
          if (!text) return; // bookings WITH rating but no comment aren't reviews
          const rating =
            typeof data.rating === "number" ? (data.rating as number) : 0;
          if (rating < 1) return;
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

  const handleOpenEdit = (row: ReviewRow) => {
    setEditRow(row);
    setEditedText(row.reviewText);
    setEditedRating(row.rating);
    setEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editRow) return;
    try {
      await updateDoc(doc(db, "bookings", editRow.id), {
        reviewText: editedText.trim(),
        // 🆕 Round 28s218 — Update rating too. Clamp to [1,5].
        rating: Math.max(1, Math.min(5, Math.round(editedRating))),
        reviewEditedAt: Timestamp.now(),
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
        reviewHiddenAt: Timestamp.now(),
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
            color: "#B4000A",
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
      width: 90,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.25} alignItems="center">
          <StarRoundedIcon sx={{ color: "#F5A623", fontSize: 16 }} />
          <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
            {params.row.rating}
          </Typography>
        </Stack>
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
        <Typography sx={{ fontSize: 12 }}>
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
          <Chip
            label={params.row.reviewLang.toUpperCase()}
            size="small"
            sx={{ height: 20, fontSize: 10, fontWeight: 700 }}
          />
        ) : (
          <Typography sx={{ fontSize: 11, color: "#94a3b8" }}>—</Typography>
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
      width: 130,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" spacing={0.5}>
          <IconButton
            size="small"
            onClick={() => handleOpenEdit(params.row)}
            sx={{ color: "#1A2B2E" }}
            aria-label="Edit"
          >
            <EditRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleOpenHide(params.row)}
            sx={{ color: "#B4000A" }}
            aria-label="Hide"
          >
            <VisibilityOffRoundedIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
      ),
    },
  ];

  return (
    <Box sx={{ padding: { xs: "16px", md: "24px" }, background: "#F4F6F5", minHeight: "100vh" }}>
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
            variant="h5"
            sx={{ fontWeight: 700, color: "#1A2B2E", lineHeight: 1.1 }}
          >
            Reviews
          </Typography>
          <Stack
            direction="row"
            spacing={1.5}
            alignItems="center"
            sx={{ marginTop: "6px" }}
          >
            <Chip
              label={`${rows.length} total`}
              size="small"
              sx={{
                background: "#1A2B2E",
                color: "#fff",
                fontWeight: 700,
                fontSize: 11,
              }}
            />
            {rows.length > 0 && (
              <Chip
                icon={<StarRoundedIcon sx={{ fontSize: 14 }} />}
                label={`avg ${totalRating}`}
                size="small"
                sx={{
                  background: "rgba(245,166,35,0.18)",
                  color: "#7A4D00",
                  fontWeight: 700,
                  fontSize: 11,
                  "& .MuiChip-icon": { color: "#F5A623" },
                }}
              />
            )}
          </Stack>
        </Box>
        <Button
          variant="contained"
          component={RouterLink}
          to="/admin/seed-reviews"
          startIcon={<RateReviewRoundedIcon />}
          sx={{
            background: "#B4000A",
            textTransform: "none",
            fontWeight: 700,
            "&:hover": { background: "#8E0009" },
          }}
        >
          Seed Reviews
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ textAlign: "center", padding: "40px" }}>
          <CircularProgress sx={{ color: "#B4000A" }} />
        </Box>
      ) : rows.length === 0 ? (
        <Box
          sx={{
            padding: "40px 16px",
            textAlign: "center",
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid rgba(15,23,42,0.12)",
          }}
        >
          <Typography sx={{ color: "#4A5568", marginBottom: "12px" }}>
            ยังไม่มีรีวิวในระบบ · ใช้ Seed Reviews เพื่อ backfill จาก booking ที่
            completed แล้ว
          </Typography>
          <Button
            variant="contained"
            component={RouterLink}
            to="/admin/seed-reviews"
            startIcon={<OpenInNewRoundedIcon />}
            sx={{
              background: "#B4000A",
              textTransform: "none",
              fontWeight: 700,
              "&:hover": { background: "#8E0009" },
            }}
          >
            Go to Seed Reviews
          </Button>
        </Box>
      ) : (
        <Box
          sx={{
            background: "#fff",
            borderRadius: "14px",
            border: "1px solid rgba(15,23,42,0.12)",
            overflow: "hidden",
            "& .MuiDataGrid-root": { border: "none" },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#F4F6F5",
              fontWeight: 700,
              fontSize: 12,
            },
            "& .MuiDataGrid-cell": {
              fontSize: 13,
              alignItems: "flex-start",
              paddingTop: "12px",
              paddingBottom: "12px",
            },
            "& .MuiDataGrid-row": {
              "&:hover": { backgroundColor: "rgba(180,0,10,0.03)" },
            },
          }}
        >
          <DataGrid
            rows={rows}
            columns={columns}
            getRowId={(row) => row.id}
            disableRowSelectionOnClick
            getRowHeight={() => "auto"}
            initialState={{
              pagination: { paginationModel: { pageSize: 25 } },
            }}
            pageSizeOptions={[25, 50, 100]}
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
        <DialogTitle sx={{ fontWeight: 700 }}>
          Edit Review · {editRow?.therapistName}
        </DialogTitle>
        <DialogContent>
          <Typography
            sx={{ fontSize: 12, color: "#4A5568", marginBottom: "12px" }}
          >
            Booking ID: {editRow?.id?.slice(0, 8).toUpperCase()} · original ★
            {editRow?.rating}
          </Typography>

          {/* 🆕 Round 28s218 — Rating editor (founder: "ดาว แก้ไม่ได้"). */}
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#4A5568",
              marginBottom: "4px",
            }}
          >
            Rating
          </Typography>
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ marginBottom: "16px" }}
          >
            {[1, 2, 3, 4, 5].map((n) => (
              <IconButton
                key={n}
                onClick={() => setEditedRating(n)}
                size="small"
                sx={{ padding: "2px" }}
                aria-label={`Set rating to ${n}`}
              >
                <StarRoundedIcon
                  sx={{
                    fontSize: 32,
                    color: n <= editedRating ? "#F5A623" : "rgba(15,23,42,0.20)",
                  }}
                />
              </IconButton>
            ))}
            <Typography
              sx={{
                fontSize: 14,
                fontWeight: 700,
                color: "#1A2B2E",
                marginLeft: "12px !important",
                alignSelf: "center",
              }}
            >
              {editedRating}/5
            </Typography>
          </Stack>

          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#4A5568",
              marginBottom: "4px",
            }}
          >
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
            sx={{
              background: "#B4000A",
              textTransform: "none",
              fontWeight: 700,
              "&:hover": { background: "#8E0009" },
            }}
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
        <DialogTitle sx={{ fontWeight: 700 }}>Hide this review?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13.5, lineHeight: 1.6 }}>
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
            color="error"
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Hide review
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminReviewListPage;
