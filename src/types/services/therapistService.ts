// src/services/therapistService.ts
import { db } from "@/lib/firebase";
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  QueryConstraint,
  limit,
} from "firebase/firestore";
import type { Therapist } from "@/types/therapist";

const therapistRef = collection(db, "therapists");

/** ----------------------------------------------------
 * 1) Get therapist with fallback logic
 * ---------------------------------------------------- */
export const getTherapistByAnyId = async (idOrEmailOrUid: string): Promise<Therapist | null> => {
  // 1) Try documentId directly
  const directRef = doc(db, "therapists", idOrEmailOrUid);
  const directSnap = await getDoc(directRef);
  if (directSnap.exists()) {
    return { id: directSnap.id, ...directSnap.data() } as Therapist;
  }

  // 2) Try id field
  const q1 = query(therapistRef, where("id", "==", idOrEmailOrUid), limit(1));
  const snap1 = await getDocs(q1);
  if (!snap1.empty) {
    const d = snap1.docs[0];
    return { id: d.id, ...d.data() } as Therapist;
  }

  // 3) Try email field
  const q2 = query(therapistRef, where("email", "==", idOrEmailOrUid), limit(1));
  const snap2 = await getDocs(q2);
  if (!snap2.empty) {
    const d = snap2.docs[0];
    return { id: d.id, ...d.data() } as Therapist;
  }

  // 4) Try uid field
  const q3 = query(therapistRef, where("uid", "==", idOrEmailOrUid), limit(1));
  const snap3 = await getDocs(q3);
  if (!snap3.empty) {
    const d = snap3.docs[0];
    return { id: d.id, ...d.data() } as Therapist;
  }

  return null;
};

/** ----------------------------------------------------
 * 2) Get a single therapist by Firestore docId
 * ---------------------------------------------------- */
export const getTherapistById = async (id: string): Promise<Therapist | null> => {
  const ref = doc(db, "therapists", id);
  const snap = await getDoc(ref);
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as Therapist) : null;
};

/** ----------------------------------------------------
 * 3) Get all therapists (with filters)
 * ---------------------------------------------------- */
export const listTherapists = async (options?: {
  onlyAvailable?: boolean;
  serviceId?: string; // ⭐ Filter by service they can perform
  orderByField?: keyof Therapist;
  orderDirection?: "asc" | "desc";
}): Promise<Therapist[]> => {
  const constraints: QueryConstraint[] = [];

  if (options?.onlyAvailable) {
    constraints.push(where("available", "==", "available"));
  }

  if (options?.orderByField) {
    constraints.push(
      orderBy(options.orderByField as string, options.orderDirection || "asc")
    );
  }

  let qBase =
    constraints.length > 0 ? query(therapistRef, ...constraints) : therapistRef;

  const snap = await getDocs(qBase);
  let data = snap.docs.map(
    (d) => ({ id: d.id, ...d.data() } as Therapist)
  );

  /** ⭐ Client-side filter — serviceId filtering */
  if (options?.serviceId) {
    data = data.filter((t) =>
      Array.isArray(t.servicesAvailable) &&
      t.servicesAvailable.includes(options.serviceId!)
    );
  }

  return data;
};

/** ----------------------------------------------------
 * 4) Real-time listener
 * ---------------------------------------------------- */
export const subscribeTherapists = (
  callback: (therapists: Therapist[]) => void
) => {
  return onSnapshot(therapistRef, (snap) => {
    const data = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() } as Therapist)
    );
    callback(data);
  });
};

/** ----------------------------------------------------
 * 5) Update ONLY availability
 * ---------------------------------------------------- */
export const updateTherapistStatus = async (
  id: string,
  status: Therapist["available"]
) => {
  await updateDoc(doc(db, "therapists", id), { available: status });
};

/** ----------------------------------------------------
 * 6) Update multiple fields (admin or system)
 * ---------------------------------------------------- */
export const updateTherapistFields = async (
  id: string,
  fields: Partial<Therapist>
) => {
  await updateDoc(doc(db, "therapists", id), fields);
};