import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Typography,
  useTheme,
} from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridRenderCellParams,
  GridValueGetter,
} from "@mui/x-data-grid";
import { db } from "@/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  getDoc,
  orderBy,
  query,
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

  const fetchReviews = async () => {
    try {
      const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);

      const list: Review[] = await Promise.all(
        snap.docs.map(async (docSnap) => {
          const data = docSnap.data();
          let therapistName = "Unknown";

          if (data.therapistId) {
            try {
              const tSnap = await getDoc(doc(db, "therapists", data.therapistId));
              if (tSnap.exists()) {
                therapistName = tSnap.data().name || therapistName;
              }
            } catch {}
          }

          return {
            id: docSnap.id,
            therapistId: data.therapistId || "",
            therapistName,
            comment: data.comment || "",
            rating: data.rating || 0,
            createdAt: data.createdAt || null,
            status: data.status || "pending",
          };
        })
      );

      setReviews(list);
    } catch (err) {
      console.error("Error fetching reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleUpdateStatus = async (
    id: string,
    status: "approved" | "rejected"
  ) => {
    try {
      await updateDoc(doc(db, "reviews", id), { status });
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } catch (err) {
      console.error("Error updating review:", err);
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
      valueGetter: (params: GridValueGetter<Review>) => {
        try {
          const raw = params.row.createdAt;
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
      renderCell: (params: GridRenderCellParams<Review, Review["status"]>) => {
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
      width: 220,
      renderCell: (params: GridRenderCellParams<Review>) => (
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
    </Box>
  );
};

export default AdminReviewListPage;