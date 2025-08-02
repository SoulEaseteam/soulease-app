import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth, db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

interface AuthData {
  user: User | null;
  role: "admin" | "therapist" | "user" | null;
  loading: boolean;
}

export function useAuth(): AuthData {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<"admin" | "therapist" | "user" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const ref = doc(db, "users", firebaseUser.uid);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          setRole(snap.data().role || "user");
        } else {
          setRole("user");
        }
      } else {
        setRole(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, role, loading };
}