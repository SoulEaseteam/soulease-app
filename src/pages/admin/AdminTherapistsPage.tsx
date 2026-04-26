import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box,
  Typography,
  TextField,
  Select,
  MenuItem,
  Switch,
  IconButton,
  CircularProgress,
  Chip,
  Tooltip,
  Card,
  CardContent,
  Stack,
  Avatar,
  useMediaQuery,
  Button,
} from "@mui/material";

import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import DeleteIcon from "@mui/icons-material/Delete";
import SpaIcon from "@mui/icons-material/Spa";
import BeachAccessIcon from "@mui/icons-material/BeachAccess";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";

import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef } from "@mui/x-data-grid";

import {
  collection,
  onSnapshot,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

import { db } from "@/lib/firebase";
import { useNavigate } from "react-router-dom";
import { computeStatus } from "@/utils/therapistStatus";

// ==========================================================
// TYPES
// ==========================================================
type TherapistStatus = "available" | "bookable" | "resting" | "holiday";
type TherapistStatusOverride =
  | "Auto"
  | "available"
  | "bookable"
  | "resting"
  | null;

type TherapistRow = {
  id: string;
  name?: string;
  image?: string;
  startTime?: string;
  endTime?: string;
  isHoliday?: boolean;
  isBooked?: boolean;
  statusOverride?: TherapistStatusOverride;
  todayBookings?: number;
  totalBookings?: number;
  computedStatus: TherapistStatus;
  [key: string]: any;
};

const statusColor: Record<TherapistStatus, "success" | "warning" | "default" | "error"> = {
  available: "success",
  bookable: "warning",
  resting: "default",
  holiday: "error",
};

// ==========================================================
// MAIN PAGE
// ==========================================================
const AdminTherapistsPage: React.FC = () => {
  const [therapists, setTherapists] = useState<TherapistRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | TherapistStatus>("all");

  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width:900px)");

  const timeoutRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  // ==========================================================
  // DEBOUNCED UPDATE
  // ==========================================================
  const updateDebounced = (id: string, key: string, value: any) => {
    const mapKey = `${id}_${key}`;

    if (timeoutRef.current[mapKey]) {
      clearTimeout(timeoutRef.current[mapKey]);
    }

    timeoutRef.current[mapKey] = setTimeout(async () => {
      try {
        await updateDoc(doc(db, "therapists", id), { [key]: value });
      } catch (error) {
        console.error(`Failed updating ${key} for therapist ${id}:`, error);
      }
    }, 250);
  };

  // ==========================================================
  // REAL-TIME LOAD
  // ==========================================================
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "therapists"),
      (snap) => {
        const list: TherapistRow[] = snap.docs.map((d) => {
          const data = d.data();

          const computedStatus = computeStatus({
            startTime: data.startTime,
            endTime: data.endTime,
            isBooked: data.isBooked,
            isHoliday: data.isHoliday,
            statusOverride: data.statusOverride,
          });

          return {
            id: d.id,
            ...data,
            computedStatus,
          } as TherapistRow;
        });

        setTherapists(list);
        setLoading(false);
      },
      (error) => {
        console.error("Failed loading therapists:", error);
        setLoading(false);
      }
    );

    return () => {
      unsub();
      Object.values(timeoutRef.current).forEach(clearTimeout);
    };
  }, []);

  // ==========================================================
  // FILTERED LIST
  // ==========================================================
  const filtered = useMemo(() => {
    return therapists.filter((t) => {
      const nameOk = (t.name || "")
        .toLowerCase()
        .includes(search.trim().toLowerCase());

      const statusOk = filter === "all" || filter === t.computedStatus;

      return nameOk && statusOk;
    });
  }, [therapists, search, filter]);

  // ==========================================================
  // DELETE
  // ==========================================================
  const handleDelete = async (id: string) => {
    const ok = window.confirm("Delete this therapist?");
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "therapists", id));
    } catch (error) {
      console.error("Failed deleting therapist:", error);
    }
  };

  // ==========================================================
  // DESKTOP COLUMNS
  // ==========================================================
  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Name",
      width: 190,
      renderCell: (p) => (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 0.5 }}>
          <Avatar src={p.row.image || ""} />
          <Typography>{p.row.name || "-"}</Typography>
        </Stack>
      ),
    },
    {
      field: "computedStatus",
      headerName: "Status",
      width: 140,
      renderCell: (p) => (
        <Chip
          label={String(p.row.computedStatus || "").toUpperCase()}
          color={statusColor[p.row.computedStatus as TherapistStatus]}
        />
      ),
    },
    {
      field: "isHoliday",
      headerName: "Holiday",
      width: 130,
      renderCell: (p) =>
        p.row.isHoliday ? (
          <Chip label="Holiday" color="error" icon={<BeachAccessIcon />} />
        ) : (
          <Chip label="Active" color="success" icon={<SpaIcon />} />
        ),
    },
    {
      field: "toggleHoliday",
      headerName: "",
      width: 85,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Switch
          checked={Boolean(p.row.isHoliday)}
          onChange={(e) => {
            const checked = e.target.checked;

            updateDebounced(p.row.id, "isHoliday", checked);

            // ถ้าเปิด holiday ให้ reset override เป็น Auto
            if (checked) {
              updateDebounced(p.row.id, "statusOverride", "Auto");
            }
          }}
        />
      ),
    },
    {
      field: "statusOverride",
      headerName: "Override",
      width: 150,
      renderCell: (p) => (
        <Select
          size="small"
          value={p.row.statusOverride || "Auto"}
          onChange={(e) => {
            const value = e.target.value as TherapistStatusOverride;

            updateDebounced(p.row.id, "statusOverride", value);

            // ถ้าเลือก override ที่ไม่ใช่ Auto ให้ปิด holiday
            if (value !== "Auto") {
              updateDebounced(p.row.id, "isHoliday", false);
            }
          }}
          sx={{ minWidth: 120 }}
        >
          <MenuItem value="Auto">Auto</MenuItem>
          <MenuItem value="available">Available</MenuItem>
          <MenuItem value="bookable">Bookable</MenuItem>
          <MenuItem value="resting">Resting</MenuItem>
        </Select>
      ),
    },
    {
      field: "startTime",
      headerName: "Start",
      width: 110,
      renderCell: (p) => (
        <TextField
          type="time"
          size="small"
          value={p.row.startTime || ""}
          onChange={(e) =>
            updateDebounced(p.row.id, "startTime", e.target.value)
          }
        />
      ),
    },
    {
      field: "endTime",
      headerName: "End",
      width: 110,
      renderCell: (p) => (
        <TextField
          type="time"
          size="small"
          value={p.row.endTime || ""}
          onChange={(e) =>
            updateDebounced(p.row.id, "endTime", e.target.value)
          }
        />
      ),
    },
    {
      field: "todayBookings",
      headerName: "Today",
      width: 90,
      valueGetter: (_, row) => row.todayBookings || 0,
    },
    {
      field: "totalBookings",
      headerName: "Total",
      width: 90,
      valueGetter: (_, row) => row.totalBookings || 0,
    },
    {
      field: "isBooked",
      headerName: "Session",
      width: 100,
      renderCell: (p) => (
        <Switch
          checked={Boolean(p.row.isBooked)}
          onChange={(e) =>
            updateDebounced(p.row.id, "isBooked", e.target.checked)
          }
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 170,
      sortable: false,
      filterable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={1}>
          <Tooltip title="View">
            <IconButton onClick={() => navigate(`/admin/therapists/${p.row.id}`)}>
              <VisibilityIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Edit">
            <IconButton onClick={() => navigate(`/admin/edit-therapist/${p.row.id}`)}>
              <EditIcon />
            </IconButton>
          </Tooltip>

          <Tooltip title="Delete">
            <IconButton onClick={() => handleDelete(p.row.id)}>
              <DeleteIcon color="error" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  // ==========================================================
  // MOBILE VIEW
  // ==========================================================
  const mobileCards = (
    <Stack spacing={2}>
      {filtered.map((t) => (
        <Card key={t.id} sx={{ borderRadius: 3 }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Avatar src={t.image || ""} sx={{ width: 56, height: 56 }} />

              <Box flexGrow={1}>
                <Typography fontWeight="bold">{t.name || "-"}</Typography>

                <Chip
                  size="small"
                  label={String(t.computedStatus).toUpperCase()}
                  color={statusColor[t.computedStatus]}
                  sx={{ mt: 1 }}
                />

                <Typography fontSize={13} mt={1}>
                  Time: {t.startTime || "--:--"} - {t.endTime || "--:--"}
                </Typography>

                <Typography fontSize={13}>
                  Today: {t.todayBookings || 0} | Total: {t.totalBookings || 0}
                </Typography>

                <Stack direction="row" spacing={2} mt={1.5} alignItems="center" flexWrap="wrap">
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontSize={12}>Holiday</Typography>
                    <Switch
                      size="small"
                      checked={Boolean(t.isHoliday)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        updateDebounced(t.id, "isHoliday", checked);

                        if (checked) {
                          updateDebounced(t.id, "statusOverride", "Auto");
                        }
                      }}
                    />
                  </Stack>

                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography fontSize={12}>Booked</Typography>
                    <Switch
                      size="small"
                      checked={Boolean(t.isBooked)}
                      onChange={(e) =>
                        updateDebounced(t.id, "isBooked", e.target.checked)
                      }
                    />
                  </Stack>
                </Stack>

                <Box mt={1.5}>
                  <Select
                    size="small"
                    fullWidth
                    value={t.statusOverride || "Auto"}
                    onChange={(e) => {
                      const value = e.target.value as TherapistStatusOverride;
                      updateDebounced(t.id, "statusOverride", value);

                      if (value !== "Auto") {
                        updateDebounced(t.id, "isHoliday", false);
                      }
                    }}
                  >
                    <MenuItem value="Auto">Auto</MenuItem>
                    <MenuItem value="available">Available</MenuItem>
                    <MenuItem value="bookable">Bookable</MenuItem>
                    <MenuItem value="resting">Resting</MenuItem>
                  </Select>
                </Box>

                <Stack direction="row" spacing={1} mt={1.5}>
                  <TextField
                    type="time"
                    size="small"
                    fullWidth
                    value={t.startTime || ""}
                    onChange={(e) =>
                      updateDebounced(t.id, "startTime", e.target.value)
                    }
                  />
                  <TextField
                    type="time"
                    size="small"
                    fullWidth
                    value={t.endTime || ""}
                    onChange={(e) =>
                      updateDebounced(t.id, "endTime", e.target.value)
                    }
                  />
                </Stack>
              </Box>
            </Stack>

            <Stack direction="row" spacing={1} mt={2} justifyContent="flex-end">
              <IconButton onClick={() => navigate(`/admin/therapists/${t.id}`)}>
                <VisibilityIcon />
              </IconButton>

              <IconButton onClick={() => navigate(`/admin/edit-therapist/${t.id}`)}>
                <EditIcon />
              </IconButton>

              <IconButton onClick={() => handleDelete(t.id)}>
                <DeleteIcon color="error" />
              </IconButton>
            </Stack>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );

  // ==========================================================
  // RENDER
  // ==========================================================
  return (
    <Box sx={{ p: 2 }}>
      <Box mb={2}>
        <Button
          onClick={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/admin/dashboard");
            }
          }}
          startIcon={<ArrowBackIosNewIcon />}
          variant="outlined"
          sx={{
            borderColor: "#C62828",
            color: "#C62828",
            fontWeight: "bold",
            textTransform: "none",
            borderRadius: 2,
            "&:hover": {
              borderColor: "#C62828",
              background: "rgba(198,40,40,0.05)",
            },
          }}
        >
          Back
        </Button>
      </Box>

      <Typography variant="h5" fontWeight="bold" mb={3} color="#C62828">
        👑 Therapist Manager
      </Typography>

      <Stack direction="row" spacing={2} mb={3}>
        <TextField
          label="Search Therapist"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
        />

        <Select
          size="small"
          value={filter}
          onChange={(e) => setFilter(e.target.value as "all" | TherapistStatus)}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="available">Available</MenuItem>
          <MenuItem value="bookable">Bookable</MenuItem>
          <MenuItem value="resting">Resting</MenuItem>
          <MenuItem value="holiday">Holiday</MenuItem>
        </Select>
      </Stack>

      {loading ? (
        <Box textAlign="center" mt={5}>
          <CircularProgress />
        </Box>
      ) : isMobile ? (
        mobileCards
      ) : (
        <DataGrid
          rows={filtered}
          columns={columns}
          autoHeight
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: {
              paginationModel: {
                pageSize: 10,
                page: 0,
              },
            },
          }}
          sx={{
            bgcolor: "#fff",
            borderRadius: 2,
            p: 1,
            boxShadow: "0 4px 18px rgba(0,0,0,0.08)",
          }}
        />
      )}
    </Box>
  );
};

export default AdminTherapistsPage;