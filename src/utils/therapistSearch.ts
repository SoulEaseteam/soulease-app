// src/utils/therapistSearch.ts
//
// Filter helpers for the TherapistSearchBar. Pure functions — no React,
// no Firestore — easy to unit-test and reuse from any list page.

interface SearchableTherapist {
  name?: string;
  specialty?: string;
  services?: string[];
  servicesAvailable?: string[];
  features?: { language?: string };
}

/**
 * Case-insensitive match across name, specialty, language, and service
 * lists. Returns true on empty queries (so `.filter(t => matchesQuery(t, q))`
 * is identity when q is "").
 */
export function matchesQuery(
  t: SearchableTherapist,
  query: string
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    t.name,
    t.specialty,
    t.features?.language,
    ...(t.services ?? []),
    ...(t.servicesAvailable ?? []),
  ]
    .filter((s): s is string => typeof s === "string")
    .join(" | ")
    .toLowerCase();
  return haystack.includes(q);
}
