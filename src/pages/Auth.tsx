import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { z } from "zod";
import { motion } from "framer-motion";
import { FadeIn } from "@/components/animations";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageSelector from "@/components/LanguageSelector";
import Logo from "@/components/Logo";
import { DEMO_MODE } from "@/lib/demoMode";

// ─── Error helpers ────────────────────────────────────────────────────────────

function isNetworkError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message ?? err ?? "").toLowerCase();
  return (
    msg.includes("failed to fetch") ||
    msg.includes("load failed") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("err_network") ||
    msg.includes("err_name_not_resolved") ||
    msg.includes("err_internet_disconnected")
  );
}

function friendlyAuthError(err: unknown, fallback: string): string {
  if (isNetworkError(err)) {
    return "Connection failed. Please check your internet and try again.";
  }
  const msg = String((err as { message?: string })?.message ?? "");
  // Supabase returns "Invalid login credentials" for both wrong password AND
  // unconfirmed email (to prevent email enumeration), so include the hint.
  if (msg.includes("Invalid login credentials")) {
    return "Invalid email or password. If you just signed up, please confirm your email first (check your inbox).";
  }
  if (msg.toLowerCase().includes("email not confirmed")) {
    return "Please confirm your email before logging in — check your inbox for the confirmation link.";
  }
  if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("user already")) {
    return "An account with this email already exists. Please log in instead.";
  }
  if (msg.toLowerCase().includes("rate limit")) {
    return "Too many attempts. Please wait a moment and try again.";
  }
  if (msg.toLowerCase().includes("database error")) {
    return "There was a problem creating your account. Please try again.";
  }
  return msg || fallback;
}

const signupSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  fullName: z.string().trim().min(2, "Name must be at least 2 characters"),
  role: z.enum(["vendor", "officer"]),
  marketName: z.string().trim().optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ── DEMO MODE BYPASS ──────────────────────────────────────────────────────────
const AuthDemoRedirect = () => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/dashboard", { replace: true });
  }, [navigate]);
  return null;
};

// ── Profile recovery: creates a missing profile row for an authenticated user ─
async function ensureProfileExists(
  userId: string,
  fullName: string,
  role: "vendor" | "officer",
  marketName: string | null
) {
  try {
    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (!existing) {
      await supabase.from("profiles").insert({
        id: userId,
        full_name: fullName || "User",
        role: role as any,
        market_name: marketName,
      });
      // Ensure user_roles entry too
      await supabase.from("user_roles").upsert(
        { user_id: userId, role: role as any },
        { onConflict: "user_id,role" }
      );
    }
  } catch (err) {
    // Non-fatal — dashboard will handle missing profile gracefully
    console.warn("ensureProfileExists failed:", err);
  }
}

const RealAuth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const initialTab = location.pathname === "/register" ? "signup" : "login";

  // Sign up fields
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"vendor" | "officer">("vendor");
  const [marketName, setMarketName] = useState("");

  // Login fields
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        if (session) navigate("/dashboard");
      })
      .catch(() => {
        // Network failure on session check — non-fatal, errors shown on submit.
      })
      .finally(() => setCheckingSession(false));

    return () => subscription.unsubscribe();
  }, [navigate]);

  // ── Sign Up ────────────────────────────────────────────────────────────────

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = signupSchema.parse({
        email: signupEmail,
        password: signupPassword,
        fullName,
        role,
        marketName: role === "vendor" ? marketName : undefined,
      });

      if (role === "vendor" && !marketName.trim()) {
        toast.error("Market name is required");
        return;
      }

      setLoading(true);

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          data: {
            full_name: validated.fullName,
            role: validated.role,
            market_name: role === "vendor" ? marketName : null,
          },
          // Uses window.location.origin so it works on any domain (Replit, Vercel, custom)
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        toast.error(friendlyAuthError(error, "Failed to create account"));
        return;
      }

      if (data.user) {
        if (!data.session) {
          // Email confirmation is required in this Supabase project.
          // The auth user has been created; profile row will be created by
          // the on_auth_user_created trigger. User must confirm email first.
          toast.success(
            "Account created! Check your email for a confirmation link, then come back to log in.",
            { duration: 8000 }
          );
        } else {
          // Email confirmation disabled — user is immediately logged in.
          // Make sure the profile exists (safety net if trigger was delayed).
          await ensureProfileExists(
            data.user.id,
            validated.fullName,
            validated.role,
            role === "vendor" ? marketName : null
          );
          toast.success("Account created and logged in!");
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(friendlyAuthError(error, "Failed to create account"));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Login ──────────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const validated = loginSchema.parse({
        email: loginEmail,
        password: loginPassword,
      });

      setLoading(true);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        toast.error(friendlyAuthError(error, "Failed to login"));
        return;
      }

      // Recovery path: if the signup trigger failed and this user has no profile
      // row, create it now so the dashboard doesn't silently break.
      if (data.user) {
        const meta = data.user.user_metadata ?? {};
        await ensureProfileExists(
          data.user.id,
          meta.full_name ?? "",
          (meta.role as "vendor" | "officer") ?? "vendor",
          meta.market_name ?? null
        );
      }

      toast.success("Logged in successfully!");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(friendlyAuthError(error, "Failed to login"));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Loading skeleton ───────────────────────────────────────────────────────

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-4">
            <Skeleton className="h-10 w-10 rounded-full mx-auto" />
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-[300px] w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden">
      <div className="absolute top-4 right-4 z-20">
        <LanguageSelector />
      </div>

      {/* Animated background blobs */}
      <motion.div
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <motion.div
          className="absolute top-20 -left-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-20 -right-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl"
          animate={{ x: [0, -30, 0], y: [0, 20, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      <div className="w-full max-w-md space-y-6 relative z-10">
        <FadeIn delay={0.1}>
          <div className="text-center space-y-3">
            <motion.div
              className="flex items-center justify-center mb-2"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            >
              <Logo size="lg" animate />
            </motion.div>
            <p className="text-muted-foreground" data-testid="text-tagline">
              {t.wasteManagementSystem}
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <Tabs defaultValue={initialTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 glass border border-white/10 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg" data-testid="tab-login">
                {t.login}
              </TabsTrigger>
              <TabsTrigger value="signup" className="rounded-lg" data-testid="tab-signup">
                {t.signUp}
              </TabsTrigger>
            </TabsList>

            {/* ── Login ── */}
            <TabsContent value="login">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="glass border-white/10 rounded-2xl">
                  <CardHeader>
                    <CardTitle>{t.welcomeBack}</CardTitle>
                    <CardDescription>{t.enterCredentials}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <Label htmlFor="login-email">{t.email}</Label>
                        <Input
                          id="login-email"
                          type="email"
                          placeholder="your@email.com"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          autoComplete="email"
                          required
                        />
                      </motion.div>
                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Label htmlFor="login-password">{t.password}</Label>
                        <Input
                          id="login-password"
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          autoComplete="current-password"
                          required
                        />
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          type="submit"
                          className="w-full btn-neon rounded-xl h-11 font-semibold border-0"
                          disabled={loading}
                          data-testid="button-submit-login"
                        >
                          {loading ? t.loggingIn : t.login}
                        </Button>
                      </motion.div>
                      <p className="text-xs text-center text-muted-foreground pt-1">
                        New user? Check your email for a confirmation link after signing up.
                      </p>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* ── Sign Up ── */}
            <TabsContent value="signup">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card className="glass border-white/10 rounded-2xl">
                  <CardHeader>
                    <CardTitle>{t.createAccount}</CardTitle>
                    <CardDescription>{t.joinInitiative}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <Label htmlFor="fullname">{t.fullName}</Label>
                        <Input
                          id="fullname"
                          type="text"
                          placeholder="John Doe"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          autoComplete="name"
                          required
                        />
                      </motion.div>
                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.15 }}
                      >
                        <Label htmlFor="email">{t.email}</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your@email.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          autoComplete="email"
                          required
                        />
                      </motion.div>
                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                      >
                        <Label htmlFor="password">{t.password}</Label>
                        <Input
                          id="password"
                          type="password"
                          placeholder="At least 6 characters"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          autoComplete="new-password"
                          required
                        />
                      </motion.div>
                      <motion.div
                        className="space-y-2"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.25 }}
                      >
                        <Label htmlFor="role">{t.iAmA}</Label>
                        <Select
                          value={role}
                          onValueChange={(value: "vendor" | "officer") => setRole(value)}
                        >
                          <SelectTrigger id="role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vendor">{t.marketVendor}</SelectItem>
                            <SelectItem value="officer">{t.municipalityOfficer}</SelectItem>
                          </SelectContent>
                        </Select>
                      </motion.div>
                      {role === "vendor" && (
                        <motion.div
                          className="space-y-2"
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Label htmlFor="market">{t.marketName}</Label>
                          <Input
                            id="market"
                            type="text"
                            placeholder="e.g., Central Market"
                            value={marketName}
                            onChange={(e) => setMarketName(e.target.value)}
                            required={role === "vendor"}
                          />
                        </motion.div>
                      )}
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                          type="submit"
                          className="w-full btn-neon rounded-xl h-11 font-semibold border-0"
                          disabled={loading}
                          data-testid="button-submit-signup"
                        >
                          {loading ? t.creatingAccount : t.createAccount}
                        </Button>
                      </motion.div>
                      <p className="text-xs text-center text-muted-foreground pt-1">
                        After signing up, check your email for a confirmation link before logging in.
                      </p>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </FadeIn>
      </div>
    </div>
  );
};

const Auth = () => (DEMO_MODE ? <AuthDemoRedirect /> : <RealAuth />);

export default Auth;
