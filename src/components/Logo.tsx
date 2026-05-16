import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LogoProps {
  /** Visual size preset */
  size?: "sm" | "md" | "lg" | "xl";
  /** Hide the wordmark and only show the icon */
  iconOnly?: boolean;
  /** Animate a soft pulsing glow */
  animate?: boolean;
  className?: string;
}

const SIZES: Record<NonNullable<LogoProps["size"]>, { box: string; icon: string; text: string; gap: string }> = {
  sm: { box: "h-7 w-7",  icon: "h-3.5 w-3.5", text: "text-base",   gap: "gap-2" },
  md: { box: "h-9 w-9",  icon: "h-4.5 w-4.5", text: "text-xl",     gap: "gap-2.5" },
  lg: { box: "h-12 w-12", icon: "h-6 w-6",     text: "text-2xl",    gap: "gap-3" },
  xl: { box: "h-16 w-16", icon: "h-8 w-8",     text: "text-4xl",    gap: "gap-4" },
};

/**
 * UrbanEye AI brand mark — eye + AI circuit icon with neon gradient,
 * paired with a gradient wordmark.
 */
export const Logo = ({
  size = "md",
  iconOnly = false,
  animate = false,
  className,
}: LogoProps) => {
  const s = SIZES[size];

  return (
    <div className={cn("inline-flex items-center", s.gap, className)}>
      {/* ─── Icon ─── */}
      <div className="relative shrink-0">
        <motion.div
          className={cn(
            s.box,
            "rounded-xl bg-gradient-brand flex items-center justify-center shadow-glow-soft relative overflow-hidden",
          )}
          animate={animate ? { boxShadow: [
            "0 0 16px hsl(190 100% 50% / 0.35)",
            "0 0 28px hsl(190 100% 50% / 0.6)",
            "0 0 16px hsl(190 100% 50% / 0.35)",
          ] } : undefined}
          transition={animate ? { duration: 2.5, repeat: Infinity, ease: "easeInOut" } : undefined}
        >
          {/* Eye + AI circuit SVG */}
          <svg
            viewBox="0 0 24 24"
            className={cn(s.icon, "text-[hsl(225,35%,7%)] relative z-10")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* Eye outline */}
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            {/* Iris */}
            <circle cx="12" cy="12" r="3" />
            {/* AI circuit nodes */}
            <circle cx="12" cy="12" r="0.6" fill="currentColor" stroke="none" />
            <circle cx="6"  cy="12" r="0.5" fill="currentColor" stroke="none" />
            <circle cx="18" cy="12" r="0.5" fill="currentColor" stroke="none" />
            {/* Circuit traces */}
            <path d="M12 9V7M12 15v2" strokeWidth="1.4" />
          </svg>

          {/* Inner shimmer */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent" />
        </motion.div>

        {/* Pulsing outer ring */}
        {animate && (
          <motion.div
            className="absolute inset-0 rounded-xl border border-[hsl(var(--neon-blue))]/40"
            animate={{ scale: [1, 1.3, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }}
          />
        )}
      </div>

      {/* ─── Wordmark ─── */}
      {!iconOnly && (
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className={cn(s.text, "font-bold text-gradient tracking-tight")}>
            UrbanEye
          </span>
          <span className={cn(
            s.text,
            "font-light text-foreground/90 tracking-wider",
          )}>
            AI
          </span>
        </div>
      )}
    </div>
  );
};

export default Logo;
