// src/pages/ServiceDetailPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import services from "@/data/services";
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Divider,
  Paper,
} from "@mui/material";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

// Normalize
const normalize = (str: string) =>
  decodeURIComponent(str).toLowerCase().replace(/\s+/g, "-");

const ServiceDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const therapistId = searchParams.get("therapistId") || null;

  const normalizedKey = normalize(id || "");

  const service = services.find(
    (s) =>
      normalize(s.id) === normalizedKey || normalize(s.name) === normalizedKey
  );

  const [tab, setTab] = useState(0);
  const [servedCount, setServedCount] = useState<number>(0);

  useEffect(() => {
    const fetchServed = async () => {
      if (!service?.name) return;

      try {
        const q = query(
          collection(db, "bookings"),
          where("serviceName", "==", service.name),
          where("status", "in", ["confirmed", "completed", "paid", "done"])
        );
        const snap = await getDocs(q);
        setServedCount(snap.size);
      } catch (err) {
        console.error("Error fetching served count:", err);
      }
    };

    fetchServed();
  }, [service?.name]);

  if (!service) {
    return (
      <Box p={4}>
        <Typography color="error" fontWeight="bold">
          Service not found.
        </Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "#fafafa",
        pb: 10,
        fontFamily: "Trebuchet MS, sans-serif",
      }}
    >
      <Box sx={{ maxWidth: 420, mx: "auto", position: "relative" }}>
        <Typography
          variant="h6"
          fontWeight="bold"
          textAlign="center"
          sx={{
            pt: 6,
            pb: 3,
            background: "rgba(255, 255, 255, 0.5)",
            borderBottom: "1px solid rgba(0,0,0,0.05)",
            backdropFilter: "blur(8px)",
            position: "sticky",
            top: 0,
            zIndex: 1000,
            width: "100%",
            color: "#4A3F2F",
          }}
        >
          {service.name}
        </Typography>

        <Box sx={{ px: 2, position: "relative", mt: 2 }}>
          <Box
            sx={{
              overflow: "hidden",
              borderRadius: 4,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <img
              src={service.image}
              alt={service.name}
              style={{ width: "100%", display: "block" }}
            />
          </Box>

          {service.badge && (
            <Box
              sx={{
                position: "absolute",
                top: 20,
                left: 20,
                background: "linear-gradient(to bottom, #FE0944, #FEAE96)",
                color: "white",
                px: 1.4,
                py: 0.7,
                fontSize: 12,
                borderRadius: 3,
                fontWeight: "bold",
                boxShadow: "0 3px 6px rgba(0,0,0,0.15)",
              }}
            >
              {service.badge}
            </Box>
          )}
        </Box>

        <Box sx={{ px: 4, mt: 3 }}>
          <Typography fontWeight="bold" fontSize={22} color="#3A3420">
            {service.name}
          </Typography>

          <Typography fontSize={16} color="#6B6B6B" mt={0.5}>
            {service.price.toLocaleString()}฿ | ⏱ {service.duration} mins.
          </Typography>

          {servedCount > 0 && (
            <Typography fontSize={14} color="#999" mt={0.5}>
              ⭐ Used by {servedCount} customers
            </Typography>
          )}
        </Box>

        <Paper
          elevation={4}
          sx={{
            mx: 2,
            p: 3,
            mt: 4,
            borderRadius: 4,
            background: "rgba(255, 255, 255, 0.9)",
            backdropFilter: "blur(8px)",
          }}
        >
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            variant="fullWidth"
            textColor="secondary"
            indicatorColor="secondary"
            sx={{
              "& .MuiTab-root": {
                fontSize: 14,
                fontWeight: "bold",
                color: "#3A3420",
              },
              "& .Mui-selected": {
                color: "#FE0944 !important",
              },
            }}
          >
            <Tab label="Details" />
            <Tab label="Notices" />
          </Tabs>

          <Divider sx={{ my: 2 }} />

          {tab === 0 && (
            <>
              <Typography
                fontWeight="bold"
                color="#3A3420"
                sx={{ mt: 2, mb: 1 }}
              >
                ▼ Description
              </Typography>

              <Typography
                fontSize={14}
                lineHeight={1.8}
                color="#6B6B6B"
                sx={{ textIndent: "1.6em" }}
              >
                {service.detail}
              </Typography>

              <Typography
                fontWeight="bold"
                color="#3A3420"
                sx={{ mt: 4, mb: 1 }}
              >
                ▼ Benefits
              </Typography>

              {service.benefit.map((b) => (
                <Typography
                  key={b}
                  fontSize={14}
                  lineHeight={1.8}
                  color="#6B6B6B"
                  sx={{ textIndent: "1.6em", mb: 1 }}
                >
                  • {b}
                </Typography>
              ))}
            </>
          )}

          {tab === 1 && (
            <Box sx={{ mt: 2 }}>
              <Typography
                fontWeight="bold"
                color="#3A3420"
                fontSize={16}
                textAlign="center"
                mb={2}
              >
                ・Service Notes・
              </Typography>

              {[
                "1. Please send your booking ID to customer service after completing the reservation.",
                "2. If your location is nearby, you may pay in cash.",
                "3. If the travel distance is far (over 25 km), deposit 500 THB may be required.",
                "4. Supported payment: VISA, PromptPay, PayNow, Cash, WeChat.",
              ].map((n) => (
                <Typography
                  key={n}
                  fontSize={14}
                  color="#6B6B6B"
                  lineHeight={1.7}
                  sx={{ textIndent: "1.6em", mb: 1.3 }}
                >
                  {n}
                </Typography>
              ))}
            </Box>
          )}
        </Paper>
      </Box>
    </Box>
  );
};

export default ServiceDetailPage;