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
import { Crown, Warning, MagnifyingGlass, UsersThree, Repeat, CurrencyCircleDollar } from "phosphor-react";
import { adminColor, adminFont, adminFigureSx } from "@/theme/adminTheme";

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
  phone: string;        // normalized display key
  name: string;
  orders: number;       // all bookings placed (incl. cancelled)
  served: number;       // actually-delivered (completed/done) — the VIP basis
  noShowCount: number;
  totalSpent: number;   // revenue from served bookings only
  lastVisit: Date | null; // service date of the most recent served booking
}

const VIP_THRESHOLD = 5;
const NO_SHOW_STATUSES = new Set(["no_show", "no-show", "noshow"]);
// 🆕 Round 28s285 — a booking counts as a real "visit" + realized revenue
//   only once it's actually been delivered. Everything else (cancelled,
//   still-pending, refunded, etc.) is an order but not a served visit.
const SERVED_STATUSES = new Set(["completed", "done"]);

// 🆕 Round 28s285 — normalize a phone so the SAME guest booking as
//   "+66 81 234 5678" (customer flow, E.164) and "0812345678" (admin-add)
//   collapse into ONE CRM row instead of two. Strips formatting and maps a
//   Thai +66 prefix back to the local 0-prefix; leaves foreign numbers as
//   their raw digits (kept distinct).
function normPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("66") && digits.length >= 11) return "0" + digits.slice(2);
  return digits;
}

function serviceDate(b: { startAt?: { toDate?: () => Date }; date?: string }): Date | null {
  if (b.startAt?.toDate) {
    const d = b.startAt.toDate();
    if (d && !isNaN(d.getTime())) return d;
  }
  if (typeof b.date === "string") {
    const d = new Date(b.date);
    if (!isNaN(d.getTime())) return d;
  }
  return null;
}

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
            startAt?: { toDate?: () => Date }; date?: string;
          };
          const raw = b.phone?.trim();
          if (!raw) return;
          const phone = normPhone(raw);
          if (!phone) return;
          if (!byPhone[phone]) {
            byPhone[phone] = {
              phone,
              name: b.contactName || b.customerName || phone,
              orders: 0, served: 0, noShowCount: 0, totalSpent: 0, lastVisit: null,
            };
          }
          const row = byPhone[phone];
          // Prefer a real name over the phone-as-name placeholder.
          const nm = (b.contactName || b.customerName || "").trim();
          if (nm && (row.name === row.phone || !row.name)) row.name = nm;

          row.orders += 1;
          const status = b.status ?? "";
          if (NO_SHOW_STATUSES.has(status)) row.noShowCount += 1;
          if (SERVED_STATUSES.has(status)) {
            row.served += 1;
            row.totalSpent += b.totalPrice ?? b.servicePrice ?? 0;
            const visit = serviceDate(b);
            if (visit && (!row.lastVisit || visit > row.lastVisit)) row.lastVisit = visit;
          }
        });
        // Sort by realized value (served visits), then lifetime spend.
        setInsights(Object.values(byPhone).sort((a, b) => b.served - a.served || b.totalSpent - a.totalSpent));
      } catch (err) {
        console.error("[customer insights] fetch failed:", err);
      } finally {
        setInsightsLoading(false);
      }
    })();
  }, []);

  const [query, setQuery] = useState("");
  const filteredInsights = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return insights;
    const qd = q.replace(/\D/g, "");
    return insights.filter(
      (i) => i.name.toLowerCase().includes(q) || (qd && i.phone.includes(qd))
    );
  }, [insights, query]);

  const vipCount = useMemo(() => insights.filter((i) => i.served >= VIP_THRESHOLD).length, [insights]);
  const repeatCount = useMemo(() => insights.filter((i) => i.served >= 2).length, [insights]);
  const withNoShow = useMemo(() => insights.filter((i) => i.noShowCount > 0).length, [insights]);
  const totalRevenue = useMemo(() => insights.reduce((s, i) => s + i.totalSpent, 0), [insights]);

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
          {p.row.served >= VIP_THRESHOLD && <Crown size={14} weight="fill" color={adminColor.amber} />}
          <span style={{ fontWeight: p.row.served >= VIP_THRESHOLD ? 700 : 400 }}>{p.row.name}</span>
        </Box>
      ),
    },
    {
      field: "phone", headerName: "Phone", flex: 1,
      // 🆕 Round 28s285 — tap-to-call, matching the booking-list convention.
      renderCell: (p) => (
        <Box sx={{ display: "flex", alignItems: "center", height: "100%" }}>
          <a href={`tel:${p.row.phone}`} style={{ color: adminColor.accent, textDecoration: "none", fontWeight: 600 }} onClick={(e) => e.stopPropagation()}>
            {p.row.phone}
          </a>
        </Box>
      ),
    },
    {
      field: "served", headerName: "Visits", flex: 0.6, type: "number",
      description: "จำนวนครั้งที่มารับบริการจริง (completed) — เกณฑ์ VIP",
      renderCell: (p) => <span style={{ ...(adminFigureSx as object), fontWeight: 700 }}>{p.row.served}</span>,
    },
    {
      field: "orders", headerName: "Orders", flex: 0.6, type: "number",
      description: "จำนวนออเดอร์ทั้งหมด (รวมยกเลิก)",
      renderCell: (p) => <span style={{ ...(adminFigureSx as object), color: adminColor.dim }}>{p.row.orders}</span>,
    },
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
        รวมจากเบอร์โทรในออเดอร์ทั้งหมด (รวมเบอร์ +66/0 ให้เป็นคนเดียว) — VIP = มารับบริการจริง {VIP_THRESHOLD}+ ครั้ง
      </Typography>

      {/* 🆕 Round 28s285 — icon-circle stat pills, matching Dashboard/Earnings. */}
      <Box sx={{ display: "flex", gap: 1.25, mb: 2, flexWrap: "wrap" }}>
        {([
          { icon: <UsersThree size={16} color="#fff" weight="fill" />, grad: `radial-gradient(circle at 35% 30%, #6FA0AD, ${adminColor.accent})`, num: insights.length, label: "Unique guests", color: adminColor.text },
          { icon: <Repeat size={16} color="#fff" weight="bold" />, grad: `radial-gradient(circle at 35% 30%, #3B82F6, ${adminColor.blue})`, num: repeatCount, label: "Repeat (2+)", color: adminColor.blue },
          { icon: <Crown size={16} color="#fff" weight="fill" />, grad: `radial-gradient(circle at 35% 30%, #F59E0B, ${adminColor.amber})`, num: vipCount, label: `VIP (${VIP_THRESHOLD}+)`, color: adminColor.amber },
          { icon: <Warning size={16} color="#fff" weight="fill" />, grad: `radial-gradient(circle at 35% 30%, #EF4444, ${adminColor.red})`, num: withNoShow, label: "With no-shows", color: adminColor.red },
          { icon: <CurrencyCircleDollar size={16} color="#fff" weight="fill" />, grad: `radial-gradient(circle at 35% 30%, #22C55E, ${adminColor.green})`, num: `฿${totalRevenue.toLocaleString()}`, label: "Realized revenue", color: adminColor.green },
        ]).map((c, i) => (
          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: "10px", background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "15px", p: "8px 15px 8px 8px", boxShadow: "0 1px 3px rgba(31,41,51,0.04)" }}>
            <Box sx={{ width: 32, height: 32, borderRadius: "50%", background: c.grad, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{c.icon}</Box>
            <Box>
              <Typography sx={{ ...adminFigureSx, fontSize: 17, color: c.color, lineHeight: 1.1 }}>{c.num}</Typography>
              <Typography sx={{ fontSize: 10, color: adminColor.dim, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{c.label}</Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* 🆕 Round 28s285 — search guests by name or phone. */}
      <Box sx={{ mb: 1.5, maxWidth: 360, display: "flex", alignItems: "center", gap: 1, background: adminColor.panel, border: `1px solid ${adminColor.line}`, borderRadius: "12px", p: "9px 13px" }}>
        <MagnifyingGlass size={15} color={adminColor.dim} />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ค้นหาชื่อ / เบอร์โทร…"
          style={{ border: "none", outline: "none", background: "transparent", fontSize: 13.5, color: adminColor.text, width: "100%", fontFamily: SANS }}
        />
      </Box>

      <Paper sx={{ height: 440, p: 0, borderRadius: 3, background: adminColor.panel2, mb: 4, overflow: "hidden" }}>
        <DataGrid
          rows={filteredInsights}
          columns={insightColumns}
          loading={insightsLoading}
          getRowId={(row) => row.phone}
          disableRowSelectionOnClick
          initialState={{ sorting: { sortModel: [{ field: "served", sort: "desc" }] } }}
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
          {/* 🆕 Round 28s265 (audit: dropdowns app-wide inheriting the
              global theme's translucent Paper background) — SelectProps
              forces an opaque menu; was missing here. */}
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
            SelectProps={{ MenuProps: { PaperProps: { sx: { background: adminColor.panel2, color: adminColor.text, borderRadius: "12px" } } } }}
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
