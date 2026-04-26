// src/utils/updateUserLocation.ts
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { getCurrentLocation } from "@/utils/getCurrentLocation";

export const updateUserLocation = async (
  uid: string,
  collectionName: "therapists" | "users"
) => {
  const { lat, lng } = await getCurrentLocation();
  await updateDoc(doc(db, collectionName, uid), {
    currentLocation: { lat, lng },
    updatedAt: serverTimestamp(),
  });
  return { lat, lng };
};