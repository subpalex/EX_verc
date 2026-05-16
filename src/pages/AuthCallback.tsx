import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";

/**
 * Production auth callback handler.
 *
 * When Supabase sends a confirmation / magic-link email it redirects the user
 * to `<origin>/auth/callback?code=XXXX` (PKCE flow).  The Dashboard component
 * calls getSession() immediately on mount, gets null (the code hasn't been
 * exchanged yet) and redirects to /login — discarding the token.
 *
 * This dedicated page:
 *   1. Lets the Supabase client exchange the ?code= for a real session.
 *   2. Navigates to /dashboard on success.
 *   3. Shows a clear error and routes back to /login on failure.
 *
 * Does not affect the Replit dev environment — dev signups that already have a
 * live session are redirected by the Auth page's onAuthStateChange before they
 * ever reach here.
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const handleCallback = async () => {
      try {
        // supabase-js v2 + PKCE: getSession() triggers the code→token exchange
        // when ?code= is present in the current URL.  We just need to call it
        // and wait — the client handles everything automatically.
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (cancelled) return;

        if (sessionError) {
          console.error("[AuthCallback] session error:", sessionError.message);
          setError(sessionError.message);
          setTimeout(() => navigate("/login"), 3000);
          return;
        }

        if (data.session) {
          console.log("[AuthCallback] session established, redirecting to dashboard");
          navigate("/dashboard", { replace: true });
        } else {
          // No session and no error — URL might not have contained a valid code.
          // Fall back gracefully.
          console.warn("[AuthCallback] no session after code exchange — going to login");
          navigate("/login", { replace: true });
        }
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Authentication failed";
        console.error("[AuthCallback] unexpected error:", msg);
        setError(msg);
        setTimeout(() => navigate("/login"), 3000);
      }
    };

    handleCallback();
    return () => { cancelled = true; };
  }, [navigate]);

  // ── Render ─────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
          <h2 className="text-lg font-semibold">Confirmation failed</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-muted-foreground">Redirecting you to login…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="text-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground">Confirming your account…</p>
      </div>
    </div>
  );
};

export default AuthCallback;
