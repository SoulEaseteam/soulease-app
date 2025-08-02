import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Snackbar,
  Alert,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogActions,
  Button,
} from "@mui/material";
import { DataGrid, GridToolbarContainer, GridToolbarExport } from "@mui/x-data-grid";
import { collection, getDocs, doc, deleteDoc, updateDoc, orderBy, query } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "@/firebase";
import DeleteIcon from "@mui/icons-material/Delete";
import LockResetIcon from "@mui/icons-material/LockReset";

interface Admin {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: any;
}

const AdminManageAdminsPage: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });
  const [confirmDelete, setConfirmDelete] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  // ✅ Fetch Admins
  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, "admins"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const list: Admin[] = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        name: docSnap.data().name || "N/A",
        email: docSnap.data().email || "N/A",
        role: docSnap.data().role || "admin",
        createdAt: docSnap.data().createdAt,
      }));
      setAdmins(list);
    } catch (error) {
      console.error("Error fetching admins:", error);
      setSnackbar({ open: true, message: "❌ Failed to load admins", severity: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  // ✅ Reset Password (ส่ง Email ให้ Admin)
  const handleResetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      setSnackbar({ open: true, message: `📩 Password reset email sent to ${email}`, severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "❌ Failed to send reset email", severity: "error" });
    }
  };

  // ✅ Confirm Delete
  const handleDeleteAdmin = async () => {
    if (!confirmDelete.id) return;
    try {
      await deleteDoc(doc(db, "admins", confirmDelete.id));
      await deleteDoc(doc(db, "users", confirmDelete.id));
      setAdmins((prev) => prev.filter((a) => a.id !== confirmDelete.id));
      setSnackbar({ open: true, message: "🗑️ Admin deleted successfully", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "❌ Failed to delete admin", severity: "error" });
    } finally {
      setConfirmDelete({ open: false, id: null });
    }
  };

  // ✅ Update Role
  const handleRoleChange = async (id: string, newRole: string) => {
    try {
      await updateDoc(doc(db, "admins", id), { role: newRole });
      await updateDoc(doc(db, "users", id), { role: newRole });
      setAdmins((prev) => prev.map((a) => (a.id === id ? { ...a, role: newRole } : a)));
      setSnackbar({ open: true, message: "✅ Role updated successfully", severity: "success" });
    } catch {
      setSnackbar({ open: true, message: "❌ Failed to update role", severity: "error" });
    }
  };

  const filteredAdmins = admins.filter(
    (a) =>
      (filterRole === "all" || a.role === filterRole) &&
      (a.name.toLowerCase().includes(search.toLowerCase()) || a.email.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    { field: "name", headerName: "Name", flex: 1 },
    { field: "email", headerName: "Email", flex: 1 },
    {
      field: "role",
      headerName: "Role",
      flex: 1,
      renderCell: (params: any) => (
        <Select
          size="small"
          value={params.row.role}
          onChange={(e) => handleRoleChange(params.row.id, e.target.value)}
        >
          <MenuItem value="admin">Admin</MenuItem>
          <MenuItem value="superadmin">Super Admin</MenuItem>
        </Select>
      ),
    },
    {
      field: "createdAt",
      headerName: "Created At",
      flex: 1,
      valueGetter: (params: any) =>
        params.row.createdAt?.toDate ? params.row.createdAt.toDate().toLocaleString() : "-",
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params: any) => (
        <>
          <IconButton color="primary" onClick={() => handleResetPassword(params.row.email)}>
            <LockResetIcon />
          </IconButton>
          <IconButton color="error" onClick={() => setConfirmDelete({ open: true, id: params.row.id })}>
            <DeleteIcon />
          </IconButton>
        </>
      ),
    },
  ];

  const CustomToolbar = () => (
    <GridToolbarContainer>
      <GridToolbarExport />
    </GridToolbarContainer>
  );

  return (
    <Box p={3}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        👑 Manage Admins
      </Typography>

      <Box mb={2} display="flex" gap={2}>
        <TextField label="Search..." size="small" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select size="small" value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
          <MenuItem value="all">All Roles</MenuItem>
          <MenuItem value="admin">Admin</MenuItem>
          <MenuItem value="superadmin">Super Admin</MenuItem>
        </Select>
      </Box>

      <Paper sx={{ p: 2, height: 500 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="100%">
            <CircularProgress />
          </Box>
        ) : (
          <DataGrid
            rows={filteredAdmins}
            columns={columns}
            getRowId={(row) => row.id}
            pageSizeOptions={[5, 10, 20]}
            initialState={{ pagination: { paginationModel: { pageSize: 5 } } }}
            slots={{ toolbar: CustomToolbar }}
          />
        )}
      </Paper>

      {/* ✅ Confirm Delete Dialog */}
      <Dialog open={confirmDelete.open} onClose={() => setConfirmDelete({ open: false, id: null })}>
        <DialogTitle>⚠️ Confirm Delete Admin?</DialogTitle>
        <DialogActions>
          <Button onClick={() => setConfirmDelete({ open: false, id: null })}>Cancel</Button>
          <Button color="error" onClick={handleDeleteAdmin}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity}>{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
};

export default AdminManageAdminsPage;