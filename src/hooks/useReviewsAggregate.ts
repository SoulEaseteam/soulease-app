// REMOVED — Round 28q (founder 2026-05-02): "Multiple Firestore
// listeners ... เอาออก".
//
// This hook used to spin up TWO always-on snapshot subscriptions
// (`bookings WHERE status in [...]` + `therapists`) just to render
// a live "★ X · N reviews" tile in the Hero. Per founder direction we
// now gate reviews behind login + tie them to a rewards loop, so the
// public aggregate display is no longer needed and the listeners are
// pure waste.
//
// File kept as an empty stub because the sandbox forbids unlinking.
// Safe to delete physically in a follow-up commit.
export {};
