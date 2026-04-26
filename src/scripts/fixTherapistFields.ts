import { db } from "@/lib/firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";

async function fixFields() {
  const snap = await getDocs(collection(db, "therapists"));

  snap.forEach(async (d) => {
    await updateDoc(doc(db, "therapists", d.id), {
      toggle: d.data().toggle ?? true,
      holiday: d.data().holiday ?? false,
      statusOverride: d.data().statusOverride ?? "Auto",
      badge: d.data().badge ?? "NONE",
    });

    console.log("Updated therapist:", d.id);
  });
}

fixFields();