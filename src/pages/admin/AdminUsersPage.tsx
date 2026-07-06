// src/pages/admin/AdminUsersPage.tsx
//
// 🆕 Round 28s234 (Phase 4 — CRM) — added a "Customer Insights" panel above
//   the account grid. WHY grouped by phone, not the `users` collection: most
//   guests book without signing up (BookingFlowPage writes userId: user?.uid
//   ?? null — guest checkout is the norm per CLAUDE.md), so `users` misses
//   most real customers. Phone is always present on a booking, so it's the
//   only reliable key for "is this a repeat guest." VIP = 5+ completed
//   bookings; no-show count flags guests worth a deposit/confirm-call policy.

import React, { useEffect, useMemo, useState } from "react";
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
import { Crown, Warning } from "phosphor-react";
import { adminColor, adminFont } from "@/theme/adminTheme";

const SANS = adminFont.sans;

type Role = "admin" | "therapist" | "user";

interface User {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: Role | null;
}

interface CustomerInsight {
  phone: string;
  name: string;
  totalBookings: number;
  noShowCount: number;
  totalSpent: number;
  lastVisit: Date | null;
}

const VIP_THRESHOLD = 5;
const NO_SHOW_STATUSES = new Set(["no_show"]);
const EXCLUDED_FROM_SPEND = new Set(["cancelled", "canceled", "refunded", "failed", "rejected", "pending"]);

const AdminUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form, setForm] = useState<User | null>(null);

  // 🆕 Round 28s234 — customer insights (grouped by phone from `bookings`).
  const [insights, setInsights] = useState<CustomerInsight[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);

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
          ...(d.data() as Omit<User, "id">),
        }))
      );
    } catch (err) {
      console.error("Fetch users failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchUsers();
  }, []);

  // --------------------------------------------------------------------
  // 🆕 Round 28s234 — customer insights from bookings, grouped by phone.
  // --------------------------------------------------------------------
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(collection(db, "bookings"));
        const byPhone: Record<string, CustomerInsight> = {};
        snap.forEach((d) => {
          const b = d.data() as {
            phone?: string; contactName?: string; customerName?: string;
            status?: string; totalPrice?: number; servicePrice?: number;
            createdAt?: { toDate?: () => Date };
          };
          const phone = b.phone?.trim();
          if (!phone) return;
          if (!byPhone[phone]) {
            byPhone[phone] = {
              phone,
              name: b.contactName || b.customerName || phone,
              totalBookings: 0, noShowCount: 0, totalSpent: 0, lastVisit: null,
            };
          }
          const row = byPhone[phone];
          row.totalBookings += 1;
          if (b.status && NO_SHOW_STATUSES.has(b.status)) row.noShowCount += 1;
          if (!(b.status && EXCLUDED_FROM_SPEND.has(b.status))) {
            row.totalSpent += b.totalPrice ?? b.servicePrice ?? 0;
          }
          const created = b.createdAt?.toDate?.();
          if (created && (!row.lastVisit || created > row.lastVisit)) row.lastVisit = created;
        });
        setInsights(Object.values(byPhone).sort((a, b) => b.totalBookings - a.totalBookings));
      } catch (err) {
        console.error("[customer insights] fetch failed:", err);
      } finally {
        setInsightsLoading(false);
      }
    })();
  }, []);

  const vipCount = useMemo(() => insights.filter((i) => i.totalBookings >= VIP_THRESHOLD).length, [insights]);
  const noShowCount = useMemo(() => insights.filter((i) => i.noShowCount > 0).length, [insights]);

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

  const insightColumns: GridColDef<CustomerInsight>[] = [
    {
      field: "name", headerName: "Guest", flex: 1.1,
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.6, height: "100%" }}>
          {p.row.totalBookings >= VIP_THRESHOLD && <Crown size={14} weight="fill" color={adminColor.highlight} />}
          <span>{p.row.name}</span>
        </Box>
      ),
    },
    { field: "phone", headerName: "Phone", flex: 1 },
    { field: "totalBookings", headerName: "Bookings", flex: 0.6, type: "number" },
    {
      field: "noShowCount", headerName: "No-shows", flex: 0.7, type: "number",
      renderCell: (p) => p.row.noShowCount > 0 ? (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, height: "100%", color: adminColor.red, fontWeight: 700 }}>
          <Warning size={13} weight="fill" />{p.row.noShowCount}
        </Box>
      ) : <span style={{ color: adminColor.dim }}>0</span>,
    },
    {
      field: "totalSpent", headerName: "Total spent", flex: 0.9,
      valueFormatter: (v) => `฿${Number(v ?? 0).toLocaleString()}`,
    },
    {
      field: "lastVisit", headerName: "Last visit", flex: 0.9,
      valueFormatter: (v) => v ? new Date(v as string).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "—",
    },
  ];

  // --------------------------------------------------------------------
  // Component Return — Round 28s234 Control Room dark theme
  // --------------------------------------------------------------------
  const gridSx = {
    background: adminColor.panel2,
    border: "none",
    color: adminColor.text,
    fontFamily: SANS,
    "& .MuiDataGrid-columnHeaders": { background: adminColor.panel3, color: adminColor.muted, borderColor: adminColor.line },
    "& .MuiDataGrid-cell": { borderColor: adminColor.line },
    "& .MuiDataGrid-row:hover": { background: adminColor.panel3 },
    "& .MuiDataGrid-footerContainer": { borderColor: adminColor.line, color: adminColor.muted },
    "& .MuiTablePagination-root": { color: adminColor.muted },
    "& .MuiDataGrid-overlay": { background: "transparent" },
  } as const;

  return (
    <Box p={3} sx={{ fontFamily: SANS }}>
      {/* ── Customer Insights (CRM) ─────────────────────────────────── */}
      <Typography sx={{ fontFamily: adminFont.serif, fontSize: 22, fontWeight: 600, color: adminColor.text, mb: 0.5 }}>
        Customer Insights
      </Typography>
      <Typography sx={{ fontSize: 12.5, color: adminColor.muted, mb: 1.5 }}>
        รวมจากเบอร์โทรในออเดอร์ทั้งหมด — VIP = จอง {VIP_THRESHOLD}+ ครั้ง
      </Typography>

      <Box sx={{ display: "flex", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
        <Box sx={{ px: 2, py: 1, borderRadius: 2, background: adminColor.panel, border: `1px solid ${adminColor.line}` }}>
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: adminColor.text, fontFamily: adminFont.serif }}>{insights.length}</Typography>
          <Typography sx={{ fontSize: 10.5, color: adminColor.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>Unique guests</Typography>
        </Box>
        <Box sx={{ px: 2, py: 1, borderRadius: 2, background: adminColor.panel, border: `1px solid ${adminColor.highlight}44` }}>
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: adminColor.highlight, fontFamily: adminFont.serif }}>{vipCount}</Typography>
          <Typography sx={{ fontSize: 10.5, color: adminColor.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>VIP guests</Typography>
        </Box>
        <Box sx={{ px: 2, py: 1, borderRadius: 2, background: adminColor.panel, border: `1px solid ${adminColor.red}44` }}>
          <Typography sx={{ fontSize: 20, fontWeight: 700, color: adminColor.red, fontFamily: adminFont.serif }}>{noShowCount}</Typography>
          <Typography sx={{ fontSize: 10.5, color: adminColor.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>With no-shows</Typography>
        </Box>
      </Box>

      <Paper sx={{ height: 420, p: 0, borderRadius: 3, background: adminColor.panel2, mb: 4, overflow: "hidden" }}>
        <DataGrid
          rows={insights}
          columns={insightColumns}
          loading={insightsLoading}
          getRowId={(row) => row.phone}
          disableRowSelectionOnClick
          initialState={{ sorting: { sortModel: [{ field: "totalBookings", sort: "desc" }] } }}
          sx={gridSx}
        />
      </Paper>

      {/* ── Registered accounts ──────────────────────────────────────── */}
      <Typography sx={{ fontFamily: adminFont.serif, fontSize: 20, fontWeight: 600, color: adminColor.text, mb: 1.5 }}>
        Accounts
      </Typography>

      <Paper
        sx={{
          height: 640,
          p: 0,
          borderRadius: 3,
          background: adminColor.panel2,
          overflow: "hidden",
        }}
      >
        <DataGrid
          rows={users}
          columns={columns}
          loading={loading}
          getRowId={(row) => row.id}
          disableRowSelectionOnClick
          sx={gridSx}
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
