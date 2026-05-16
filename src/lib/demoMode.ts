/**
 * DEMO MODE FLAG
 * ──────────────
 * When `true`, the app skips all Supabase authentication checks and runs with
 * a hard-coded mock user so it can be presented without a backend.
 *
 * Flip this to `false` to restore the original auth-protected flow — none of
 * the original auth code has been deleted.
 */
export const DEMO_MODE = false;

/** Hard-coded user shown across the app while DEMO_MODE is on. */
export const DEMO_USER = {
  id: "demo-user-0001",
  name: "Demo User",
  role: "Citizen" as const,
  email: "demo@urbaneye.ai",
};
