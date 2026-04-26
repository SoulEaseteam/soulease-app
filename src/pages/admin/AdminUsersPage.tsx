// src/pages/admin/AdminUsersPage.tsx
import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  useTheme,
  Stack,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { auth, db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { toast } from "react-toastify";

type Role = "admin" | "therapist" | "user";

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: Role | null;
}

const AdminUsersPage: React.FC = () => {
  const theme = useTheme();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<User | null>(null);

  const currentAdminUid = auth.currentUser?.uid;

  // --------------------------------------------------------------------
  // Load Users
  // --------------------------------------------------------------------
  const fetchUsers = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(db, "users"));

      setUsers(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }))
      );
    } catch (err) {
      console.error("Fetch users failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // --------------------------------------------------------------------
  // Edit functions
  // --------------------------------------------------------------------
  const handleOpenEdit = (u: User) => {
    setEditingUser(u);
    setForm({ ...u });
  };

  const handleCloseEdit = () => {
    setEditingUser(null);
    setForm(null);
  };

  const handleSave = async () => {
    if (!editingUser || !form) return;

    const isSelf = editingUser.id === currentAdminUid;

    try {
      await updateDoc(doc(db, "users", editingUser.id), {
        name: form.name,
        email: form.email,
        phone: form.phone,
        role: isSelf ? editingUser.role : form.role, // ❗ ห้ามเปลี่ยน role ตัวเอง
      });
      handleCloseEdit();
      await fetchUsers();
    } catch (err) {
      console.error("Update failed:", err);
    }
  };

  // --------------------------------------------------------------------
  // Delete
  // --------------------------------------------------------------------
  const handleDelete = async (id?: string) => {
    if (!id) return;

    if (id === currentAdminUid) {
      toast.warning("You cannot delete your own admin account.");
      return;
    }

    if (!confirm("❗ ต้องการลบผู้ใช้นี้หรือไม่?")) return;

    try {
      await deleteDoc(doc(db, "users", id));
      await fetchUsers();
    } catch (err) {
      console.error("Delete user failed:", err);
    }
  };

  // --------------------------------------------------------------------
  // DataGrid Columns
  // --------------------------------------------------------------------
  const columns: GridColDef<User>[] = [
    { field: "name", headerName: "Name", flex: 1 },
    { field: "email", headerName: "Email", flex: 1.2 },
    { field: "phone", headerName: "Phone", flex: 1 },
    { field: "role", headerName: "Role", flex: 0.8 },

    {
      field: "actions",
      headerName: "Actions",
      sortable: false,
      filterable: false,
      align: "center",
      headerAlign: "center",
      flex: 1,
      renderCell: (params) => {
        const row = params.row;

        return (
          <Stack direction="row" spacing={1} justifyContent="center">
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleOpenEdit(row)}
            >
              Edit
            </Button>

            <Button
              variant="outlined"
              size="small"
              color="error"
              disabled={row.id === currentAdminUid} // ❗ ป้องกันลบตัวเอง
              onClick={() => handleDelete(row.id)}
            >
              Delete
            </Button>
          </Stack>
        );
      },
    },
  ];

  // --------------------------------------------------------------------
  // Component Return
  // --------------------------------------------------------------------
  return (
    <Box p={3}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        👥 Manage Users
      </Typography>

      <Paper
        sx={{
          height: 640,
          p: 2,
          borderRadius: 3,
        }}
      >
        <DataGrid
          rows={users}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
        />
      </Paper>

      {/* ------------------ EDIT DIALOG ------------------ */}
      <Dialog open={!!editingUser} onClose={handleCloseEdit} fullWidth maxWidth="sm">
        <DialogTitle>✏️ Edit User</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            margin="dense"
            value={form?.name ?? ""}
            onChange={(e) => setForm((p) => (p ? { ...p, name: e.target.value } : p))}
          />

          <TextField
            label="Email"
            fullWidth
            margin="dense"
            value={form?.email ?? ""}
            onChange={(e) => setForm((p) => (p ? { ...p, email: e.target.value } : p))}
          />

          <TextField
            label="Phone"
            fullWidth
            margin="dense"
            value={form?.phone ?? ""}
            onChange={(e) => setForm((p) => (p ? { ...p, phone: e.target.value } : p))}
          />

          {/* ❗ ถ้าเป็น admin ตัวเอง => ปิดการแก้ role */}
          <TextField
            select
            label="Role"
            fullWidth
            margin="dense"
            value={form?.role ?? "user"}
            onChange={(e) =>
              setForm((p) => (p ? { ...p, role: e.target.value as Role } : p))
            }
            disabled={editingUser?.id === currentAdminUid}
          >
            <MenuItem value="admin">Admin</MenuItem>
            <MenuItem value="therapist">Therapist</MenuItem>
            <MenuItem value="user">User</MenuItem>
          </TextField>

          {editingUser?.id === currentAdminUid && (
            <Typography color="error" fontSize={13} mt={1}>
              ⚠️ You cannot modify your own admin role.
            </Typography>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={handleCloseEdit}>Cancel</Button>
          <Button variant="contained" onClick={handleSave}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminUsersPage;