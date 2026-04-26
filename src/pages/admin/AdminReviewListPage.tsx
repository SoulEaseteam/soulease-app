import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Typography,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { db } from "@/lib/firebase";
import {
  collection,
  updateDoc,
  doc,
  orderBy,
  query,
  onSnapshot,
  getDocs,
} from "firebase/firestore";
import dayjs from "dayjs";

interface Review {
  id: string;
  therapistId: string;
  therapistName?: string;
  userId?: string;
  comment: string;
  rating: number;
  createdAt?: any;
  status?: "pending" | "approved" | "rejected";
}

const AdminReviewListPage: React.FC = () => {
  const theme = useTheme();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [editDialog, setEditDialog] = useState(false);
  const [editReviewId, setEditReviewId] = useState<string | null>(null);
  const [editedComment, setEditedComment] = useState("");

  // 🧠 Load reviews + therapist name
  useEffect(() => {
    const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, async (snap) => {
      try {
        const therapistSnap = await getDocs(collection(db, "therapists"));
        const therapistMap: Record<string, string> = {};
        therapistSnap.docs.forEach((t) => {
          therapistMap[t.id] = t.data().name || "Unknown";
        });

        const list: Review[] = snap.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            therapistId: data.therapistId || "",
            therapistName: therapistMap[data.therapistId] || "Unknown",
            comment: data.comment || "",
            rating: data.rating || 0,
            createdAt: data.createdAt || null,
            status: data.status || "pending",
          };
        });

        setReviews(list);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  const handleUpdateStatus = async (
    id: string,
    status: "approved" | "rejected"
  ) => {
    try {
      await updateDoc(doc(db, "reviews", id), { status });
    } catch (err) {
      console.error("Error updating status:", err);
    }
  };

  const handleEditReview = (review: Review) => {
    setEditReviewId(review.id);
    setEditedComment(review.comment);
    setEditDialog(true);
  };

  const handleSaveComment = async () => {
    if (!editReviewId) return;
    try {
      await updateDoc(doc(db, "reviews", editReviewId), {
        comment: editedComment,
      });
      setEditDialog(false);
      setEditReviewId(null);
      setEditedComment("");
    } catch (err) {
      console.error("Error saving comment:", err);
    }
  };

  const columns: GridColDef<Review>[] = [
    { field: "therapistName", headerName: "Therapist", flex: 1 },
    { field: "rating", headerName: "⭐ Rating", width: 120 },
    { field: "comment", headerName: "Comment", flex: 2 },
    {
      field: "createdAt",
      headerName: "Date",
      width: 180,
      valueGetter: (_value: any, row: any) => {
        try {
          const raw = row.createdAt;
          if (!raw) return "-";
          const date =
            raw?.toDate?.() || (raw?.seconds && new Date(raw.seconds * 1000));
          return date ? dayjs(date).format("YYYY-MM-DD HH:mm") : "-";
        } catch {
          return "-";
        }
      },
    },
    {
      field: "status",
      headerName: "Status",
      width: 150,
      renderCell: (params: any) => {
        const color =
          params.value === "approved"
            ? "success"
            : params.value === "rejected"
            ? "error"
            : "warning";
        return <Chip label={params.value} color={color} />;
      },
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 250,
      renderCell: (params: any) => (
        <Box display="flex" gap={1}>
          <Button
            size="small"
            variant="contained"
            color="success"
            disabled={params.row.status === "approved"}
            onClick={() => handleUpdateStatus(params.row.id, "approved")}
          >
            Approve
          </Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            disabled={params.row.status === "rejected"}
            onClick={() => handleUpdateStatus(params.row.id, "rejected")}
          >
            Reject
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => handleEditReview(params.row)}
          >
            Edit
          </Button>
        </Box>
      ),
    },
  ];

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        ⭐ Manage Therapist Reviews
      </Typography>

      {loading ? (
        <Box textAlign="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : (
        <Box
          sx={{
            height: 500,
            width: "100%",
            mt: 2,
            "& .MuiDataGrid-root": {
              border: "none",
              borderRadius: 3,
              overflow: "hidden",
            },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor:
                theme.palette.mode === "dark" ? "#2c2c2c" : "#f0f0f0",
              color: theme.palette.mode === "dark" ? "#fff" : "#000",
              fontWeight: "bold",
              fontSize: "1rem",
            },
            "& .MuiDataGrid-row": {
              "&:nth-of-type(odd)": {
                backgroundColor:
                  theme.palette.mode === "dark" ? "#1b1b1b" : "#fafafa",
              },
              "&:hover": {
                backgroundColor:
                  theme.palette.mode === "dark" ? "#333" : "#e6f0ff",
              },
            },
          }}
        >
          <DataGrid
            rows={reviews}
            columns={columns}
            getRowId={(row) => row.id}
            disableRowSelectionOnClick
            autoHeight
          />
        </Box>
      )}

      {/* ✏️ Edit Dialog */}
      <Dialog open={editDialog} onClose={() => setEditDialog(false)} fullWidth>
        <DialogTitle>Edit Review Comment</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={3}
            value={editedComment}
            onChange={(e) => setEditedComment(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialog(false)}>Cancel</Button>
          <Button onClick={handleSaveComment} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminReviewListPage;