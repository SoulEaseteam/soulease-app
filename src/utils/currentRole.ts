// src/utils/currentRole.ts
//
// 🆕 Round 28x.99 (founder: "แล้วเราจะกดเข้าเองนับไหม" → "ทั้งหมด") — a
// module-level cache of the signed-in user's role, updated by
// AuthProvider on every auth-state change. Plain utility modules (like
// analytics.ts) aren't React components and can't call useAuth(), but they
// need to know "is this visitor staff?" synchronously at event-fire time.
//
// Safe to read before any tracked event fires: AuthProvider blocks the
// entire app's render (`if (loading) return null`) until role resolution
// finishes, so by the time any page component mounts and calls
// trackHomeView/trackServiceView/etc., this cache already holds the real
// value — never a stale "not yet known" gap.

export type CachedRole = "admin" | "therapist" | "user" | null;

let _role: CachedRole = null;

export function setCachedRole(role: CachedRole): void {
  _role = role;
}

export function getCachedRole(): CachedRole {
  return _role;
}
