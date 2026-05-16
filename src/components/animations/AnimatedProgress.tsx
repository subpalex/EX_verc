import { motion } from "framer-motion";

interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  showLabel?: boolean;
  color?: "primary" | "success" | "warning" | "destructive";
}

const colorMap = {
  primary: "bg-primary",
  success: "bg-green-500",
  warning: "bg-yellow-500",
  destructive: "bg-destructive",
};

export const AnimatedProgress = ({
  value,
  max = 100,
  className = "",
  showLabel = false,
  color = "primary",
}: AnimatedProgressProps) => {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={`w-full ${className}`}>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={`h-full ${colorMap[color]} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{
            duration: 1,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        />
      </div>
      {showLabel && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-muted-foreground mt-1 text-right"
        >
          {Math.round(percentage)}%
        </motion.p>
      )}
    </div>
  );
};
