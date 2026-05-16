import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import VendorDashboard from "@/components/dashboard/VendorDashboard";
import OfficerDashboard from "@/components/dashboard/OfficerDashboard";
import { Loader2 } from "lucide-react";
import { DEMO_MODE } from "@/lib/demoMode";
import DemoDashboard from "./DemoDashboard";

const Dashboard = () => {
  // ── DEMO MODE BYPASS ──────────────────────────────────────────────────────
  // When DEMO_MODE is on, skip all auth/session logic and render the
  // standalone demo dashboard. Original code below is preserved.
  if (DEMO_MODE) {
    return <DemoDashboard />;
  }

  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset state on mount to ensure clean slate
    setSession(null);
    setUserRole(null);
    setLoading(true);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth state changed:", event, session?.user?.id);
      setSession(session);
      if (!session) {
        // Clear role when logged out
        setUserRole(null);
        setLoading(false);
        navigate("/login");
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // Fetch fresh user role on sign in
        fetchUserProfile(session.user.id);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        setLoading(false);
        navigate("/login");
      } else {
        fetchUserProfile(session.user.id);
      }
    }).catch((err) => {
      // Network/DNS failure on initial session check — don't crash, just send to login
      console.error("Session check failed:", err);
      setLoading(false);
      navigate("/login");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchUserProfile = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (error) {
        // If we get a 401/403 or no role, the session is likely stale
        console.error("Error fetching user role:", error);
        // Force clear stale session
        localStorage.removeItem("sb-gbqoewouvejuapmgrlhd-auth-token");
        try { await supabase.auth.signOut(); } catch {}
        navigate("/auth");
        return;
      }
      setUserRole(data.role);
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {userRole === "vendor" && <VendorDashboard session={session} />}
      {(userRole === "officer" || userRole === "admin") && <OfficerDashboard session={session} />}
    </div>
  );
};

export default Dashboard;
