import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db, auth } from "@/firebase";

export function useUserRole() {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const fetchRole = async () => {
      const user = auth.currentUser;
      if (!user) {
        setRole(null);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setRole(userDoc.data().role || null);
        } else {
          setRole(null);
        }
      } catch (err) {
        console.error("Error fetching user role:", err);
        setRole(null);
      }
    };

    fetchRole();
  }, []);

  return role;
}