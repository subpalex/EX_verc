import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ScanSearch,
  Trophy,
  Camera,
  CheckCircle2,
  TrendingUp,
  LogOut,
  User,
} from "lucide-react";
import { AIWasteDetection } from "@/components/dashboard/AIWasteDetection";
import Logo from "@/components/Logo";
import LanguageSelector from "@/components/LanguageSelector";
import { DEMO_USER } from "@/lib/demoMode";

/**
 * Standalone demo dashboard used when DEMO_MODE is on.
 * Self-contained: no Supabase calls, no auth dependencies. Showcases the
 * real TensorFlow.js + MobileNet AI image analysis with mocked stats so the
 * app can be presented end-to-end without a backend.
 */
const DemoDashboard = () => {
  const navigate = useNavigate();

  // Mocked stats for the presentation. Numbers chosen to look realistic.
  const stats = [
    { label: "Photos Submitted", value: 12, icon: Camera },
    { label: "Points This Week", value: 27, icon: TrendingUp },
    { label: "Reviewed", value: 9, icon: CheckCircle2 },
    { label: "Weekly Rank", value: "#3", icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header bar */}
      <header className="glass-card border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 sticky top-0 z-30 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <Logo size="md" />
        </div>
        <div className="flex items-center gap-3">
          <LanguageSelector />
          <div className="hidden sm:flex items-center gap-2 glass border border-white/10 rounded-xl px-3 py-1.5">
            <div className="w-7 h-7 rounded-full bg-gradient-brand flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="text-xs leading-tight">
              <p className="font-semibold" data-testid="text-user-name">
                {DEMO_USER.name}
              </p>
              <p className="text-muted-foreground">{DEMO_USER.role}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="glass border-white/10 gap-2"
            onClick={() => navigate("/")}
            data-testid="button-exit-demo"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Exit Demo</span>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-8">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-2"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Welcome back, <span className="text-gradient">{DEMO_USER.name}</span>
            </h1>
            <Badge
              variant="outline"
              className="border-primary/40 bg-primary/10 text-primary"
            >
              {DEMO_USER.role}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Capture a photo and let UrbanEye AI analyze the cleanliness in real time.
          </p>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
        >
          {stats.map((s, i) => {
            const Icon = s.icon;
            return (
              <Card
                key={s.label}
                className="glass border-white/10 rounded-2xl"
                data-testid={`card-stat-${i}`}
              >
                <CardContent className="p-4 sm:p-5 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
                      {s.label}
                    </span>
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <p className="text-2xl sm:text-3xl font-bold text-gradient">{s.value}</p>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>

        {/* AI Waste Detection — the real, working TF.js MobileNet flow */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <ScanSearch className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Live AI Analysis</h2>
          </div>
          <AIWasteDetection />
        </motion.div>

        <p className="text-xs text-center text-muted-foreground pt-2">
          Demo Mode — image analysis runs entirely in your browser via
          TensorFlow.js + MobileNet. No backend required.
        </p>
      </main>
    </div>
  );
};

export default DemoDashboard;
