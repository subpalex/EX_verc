import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { DEMO_MODE } from "@/lib/demoMode";

/**
 * Small floating badge that signals the app is running in demo mode
 * (authentication is bypassed). Renders nothing when DEMO_MODE is off.
 */
export const DemoBadge = () => {
  if (!DEMO_MODE) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3, duration: 0.4 }}
      data-testid="badge-demo-mode"
      className="fixed bottom-20 left-4 z-50 glass border border-primary/40 px-3 py-1.5 rounded-xl shadow-glow-soft text-xs font-semibold flex items-center gap-1.5 backdrop-blur-xl"
    >
      <Sparkles className="h-3.5 w-3.5 text-primary" />
      <span className="text-gradient">Demo Mode</span>
      <span className="text-muted-foreground font-normal">· Auth Disabled</span>
    </motion.div>
  );
};

export default DemoBadge;
