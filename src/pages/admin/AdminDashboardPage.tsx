// src/pages/admin/AdminDashboardPage.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Divider,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import { signOut } from "firebase/auth";
import { collection, getDocs } from "firebase/firestore";
import dayjs from "dayjs";

import PrintIcon from "@mui/icons-material/Print";
import DescriptionIcon from "@mui/icons-material/Description";
import TableViewIcon from "@mui/icons-material/TableView";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import PublicIcon from "@mui/icons-material/Public";
import LogoutIcon from "@mui/icons-material/Logout";

import Chart from "@/components/admin/Chart";
import RevenueLineChart from "@/components/admin/RevenueLineChart";
import TopServicesChart from "@/components/admin/TopServicesChart";
import TopTherapistsChart from "@/components/admin/TopTherapistsChart";
import { ExportToExcel, ExportToPDF } from "@/utils/exportTools";

interface StatCardProps {
  title: string;
  value: number | string;
  subtext?: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtext, color }) => (
  <Paper
    elevation={6}
    sx={{
      p: 2,
      borderRadius: 2,
      background: color,
      color: "#fff",
      textAlign: "center",
    }}
  >
    <Typography variant="subtitle1">{title}</Typography>
    <Typography variant="h4" fontWeight="bold">
      {value}
    </Typography>
    {subtext && <Typography variant="body2">{subtext}</Typography>}
  </Paper>
);

const AdminDashboardPage: React.FC = () => {
  const [bookingsToday, setBookingsToday] = useState(0);
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [usersCount, setUsersCount] = useState(0);
  const [therapistsCount, setTherapistsCount] = useState(0);
  const [adminsCount, setAdminsCount] = useState(0);
  const [servicesCount, setServicesCount] = useState(0);

  const reportRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // ✅ ดึงข้อมูลจาก Firestore
  const fetchData = async () => {
    const todayStart = dayjs().startOf("day").toDate();

    const bookingsSnap = await getDocs(collection(db, "bookings"));
    const usersSnap = await getDocs(collection(db, "users"));
    const therapistsSnap = await getDocs(collection(db, "therapists"));
    const adminsSnap = await getDocs(collection(db, "admins"));
    const servicesSnap = await getDocs(collection(db, "services"));

    let todayCount = 0;
    let todayTotal = 0;
    let total = 0;
    let revenue = 0;

    bookingsSnap.forEach((docSnap) => {
      const data = docSnap.data();

      total++;

      // ✅ คำนวณยอดรวมแบบ fallback
      const bookingRevenue =
        data.totalPrice ||
        (data.servicePrice || 0) + (data.taxiFee || 0);

      revenue += bookingRevenue;

      if (data.createdAt?.toDate && data.createdAt.toDate() >= todayStart) {
        todayCount++;
        todayTotal += bookingRevenue;
      }
    });

    setBookingsToday(todayCount);
    setTodayRevenue(todayTotal);
    setTotalBookings(total);
    setTotalRevenue(revenue);
    setUsersCount(usersSnap.size);
    setTherapistsCount(therapistsSnap.size);
    setAdminsCount(adminsSnap.size);
    setServicesCount(servicesSnap.size);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/admin/login");
  };

  const handlePrint = () => {
    if (reportRef.current) {
      const printContents = reportRef.current.innerHTML;
      const win = window.open("", "", "width=900,height=700");
      if (win) {
        win.document.write(`
          <html><head><title>Daily Report</title></head>
          <body>${printContents}</body></html>
        `);
        win.document.close();
        win.focus();
        win.print();
        win.close();
      }
    }
  };

  return (
    <Box p={3} fontFamily="'Trebuchet MS', sans-serif">
      <Typography variant="h4" gutterBottom>
        📊 Admin Dashboard
      </Typography>

      <Box ref={reportRef}>
        <Grid container spacing={2}>
          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              title="📅 Bookings Today"
              value={bookingsToday}
              color="linear-gradient(135deg,#6a11cb,#2575fc)"
              subtext={`฿${todayRevenue}`}
            />
          </Grid>

          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              title="📦 Total Bookings"
              value={totalBookings}
              color="linear-gradient(135deg,#ff416c,#ff4b2b)"
              subtext={`฿${totalRevenue}`}
            />
          </Grid>

          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              title="👥 Users"
              value={usersCount}
              color="linear-gradient(135deg,#11998e,#38ef7d)"
            />
          </Grid>

          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              title="🧖 Therapists"
              value={therapistsCount}
              color="linear-gradient(135deg,#f7971e,#ffd200)"
            />
          </Grid>

          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              title="👑 Admins"
              value={adminsCount}
              color="linear-gradient(135deg,#2980b9,#6dd5fa)"
            />
          </Grid>

          <Grid item xs={6} sm={4} md={2}>
            <StatCard
              title="🛎️ Services"
              value={servicesCount}
              color="linear-gradient(135deg,#8e2de2,#4a00e0)"
            />
          </Grid>
        </Grid>

        {/* 🔹 กราฟ */}
        <Box mt={3}>
          <Paper elevation={6} sx={{ p: 3, borderRadius: 2 }}>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              📈 Booking Statistics (7 Days)
            </Typography>
            <Chart />
            <RevenueLineChart />

            <Grid container spacing={2} mt={2}>
              <Grid item xs={12} md={6}>
                <TopServicesChart />
              </Grid>
              <Grid item xs={12} md={6}>
                <TopTherapistsChart />
              </Grid>
            </Grid>
          </Paper>
        </Box>
      </Box>

      {/* 🔹 Admin Tools */}
      <Divider sx={{ my: 3 }}>
        <Typography variant="subtitle1" color="text.secondary">
          🛠 Admin Tools
        </Typography>
      </Divider>

      <Box display="flex" flexWrap="wrap" gap={1} justifyContent="center">
        <Button
          variant="contained"
          size="small"
          startIcon={<PrintIcon />}
          onClick={handlePrint}
        >
          Print
        </Button>

        <Button
          variant="outlined"
          size="small"
          startIcon={<DescriptionIcon />}
          onClick={() => navigate("/admin/reports")}
        >
          Full Reports
        </Button>

        <Button
          variant="outlined"
          size="small"
          startIcon={<TableViewIcon />}
          onClick={ExportToExcel}
        >
          Excel
        </Button>

        <Button
          variant="outlined"
          size="small"
          startIcon={<PictureAsPdfIcon />}
          onClick={ExportToPDF}
        >
          PDF
        </Button>

        <Button
          variant="outlined"
          size="small"
          startIcon={<PublicIcon />}
          onClick={() => window.open("/", "_blank")}
        >
          View Public
        </Button>

        
      </Box>
    </Box>
  );
};

export default AdminDashboardPage;