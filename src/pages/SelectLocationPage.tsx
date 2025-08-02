import React, { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Typography,
  TextField,
  Snackbar,
  IconButton,
  Paper,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { useNavigate, useLocation } from "react-router-dom";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";

const containerStyle = {
  width: "100%",
  height: "50vh",
  borderRadius: "12px",
};

const defaultCenter = { lat: 13.736717, lng: 100.523186 };

// ✅ libraries แยกออกมาเป็น const
const libraries: ("places")[] = ["places"];

const SelectLocationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { therapistId: string; service: string };

  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState("");
  const [detail, setDetail] = useState("");
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries, // ✅ ใช้ const
  });

  // ✅ ดึงชื่อสถานที่จาก lat/lng
  const getPlaceNameFromLatLng = (lat: number, lng: number) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.length) {
        setAddress(results[0].formatted_address);
      } else {
        setAddress("Unable to retrieve location name");
      }
    });
  };

  // ✅ ใช้ Autocomplete (API เดิม) ให้ sync กับแผนที่
  useEffect(() => {
    if (!isLoaded || !inputRef.current || !window.google) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      fields: ["geometry", "name", "formatted_address"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (!place.geometry || !place.geometry.location) return;

      const lat = place.geometry.location.lat();
      const lng = place.geometry.location.lng();

      setCurrentLocation({ lat, lng });
      setAddress(place.name || place.formatted_address || "");
      mapRef.current?.panTo({ lat, lng });
    });
  }, [isLoaded]);

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng) {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      setCurrentLocation({ lat, lng });
      getPlaceNameFromLatLng(lat, lng);
    }
  };

  const handleUseMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCurrentLocation({ lat, lng });
        getPlaceNameFromLatLng(lat, lng);
        mapRef.current?.panTo({ lat, lng });
      },
      () => alert("Unable to access your location")
    );
  };

  const handleConfirm = () => {
    if (!currentLocation || !address) return alert("Please select location first");
    navigate(
      `/booking/${state.therapistId}?service=${encodeURIComponent(
        state.service
      )}&selectedLat=${currentLocation.lat}&selectedLng=${currentLocation.lng}&selectedAddress=${encodeURIComponent(
        address
      )}&placeDetail=${encodeURIComponent(detail)}`
    );
  };

  if (!isLoaded) return <Typography>Loading map...</Typography>;

  return (
    <Box sx={{ maxWidth: 430, mx: "auto", p: 3 }}>
      <Typography color= '#3a3420'fontSize={25} fontWeight="bold" textAlign="center" mb={2}>
        Select Service Location
      </Typography>

      <Paper sx={{ p: 2, mb: 2, borderRadius: 4 }}>
        <TextField
          inputRef={inputRef}
          placeholder="Search location (Google)"
          fullWidth
          sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 4 } }}
        />

        <Box sx={{ borderRadius: 3, overflow: "hidden", mb: 2 }}>
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={currentLocation || defaultCenter}
            zoom={15}
            onClick={handleMapClick}
            onLoad={(map) => {
              mapRef.current = map;
            }}
          >
            {currentLocation && <Marker position={currentLocation} />}
          </GoogleMap>
        </Box>

        <Button
          variant="outlined"
          fullWidth
          onClick={handleUseMyLocation}
          sx={{
            mb: 2,
            borderRadius: 3,
            textTransform: "none",
            fontWeight: "bold",
          }}
        >
          Use My Current Location
        </Button>

        <TextField
          label="Location Name"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          fullWidth
          multiline
          InputProps={{
            endAdornment: (
              <IconButton onClick={() => navigator.clipboard.writeText(address)}>
                <ContentCopyIcon />
              </IconButton>
            ),
          }}
          sx={{ mb: 2, "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
        />

        <Button
          variant="contained"
          fullWidth
          onClick={handleConfirm}
          disabled={!currentLocation || !address}
          sx={{
            py: 1.4,
            fontWeight: "bold",
            fontSize: 14,
            borderRadius: 4,
            background: "#FEAE96",
          }}
        >
          Confirm Location
        </Button>
      </Paper>

      <Snackbar
        open={copied}
        autoHideDuration={2000}
        onClose={() => setCopied(false)}
        message="Address copied!"
      />
    </Box>
  );
};

export default SelectLocationPage;