// src/utils/updateLocation.ts
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export const updateUserLocation = async (
  userId: string,
  collection: "therapists" | "users"
) => {
  if (!navigator.geolocation) {
    alert("Geolocation is not supported on this device");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;

      try {
        await updateDoc(doc(db, collection, userId), {
          currentLocation: { lat: latitude, lng: longitude },
          updatedAt: serverTimestamp(),
        });

        alert("📍 Location updated successfully!");
      } catch (error) {
        console.error("❌ Failed to update location:", error);
        alert("❌ Failed to update location.");
      }
    },
    (error) => {
      alert(`❌ Failed to get location: ${error.message}`);
    },
    { enableHighAccuracy: true }
  );
};