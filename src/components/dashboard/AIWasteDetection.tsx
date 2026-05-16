import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ScanSearch,
  Upload,
  RotateCcw,
  Brain,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Info,
  Sparkles,
} from "lucide-react";
import {
  analyzeImageWithMobileNet,
  preloadMobileNet,
  type MobileNetResult,
  type Cleanliness,
  type Priority,
} from "@/lib/aiMobileNet";

// ─── Sub-components ───────────────────────────────────────────────────────────

export const AnalyzingLoader = ({ stage }: { stage: string }) => (
  <motion.div
    key="loader"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    transition={{ duration: 0.3 }}
    className="flex flex-col items-center justify-center py-12 gap-6"
  >
    <div className="relative">
      <motion.div
        className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center"
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Brain className="h-8 w-8 text-primary" />
      </motion.div>
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-primary/30"
        animate={{ rotate: 360 }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
        style={{ borderTopColor: "hsl(var(--primary))" }}
      />
    </div>
    <div className="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
      <motion.div
        className="h-full bg-primary rounded-full"
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
    <div className="text-center space-y-1">
      <p className="text-sm font-medium text-foreground" data-testid="text-ai-stage">
        {stage}
      </p>
      <p className="text-xs text-muted-foreground">Powered by TensorFlow.js + MobileNet</p>
    </div>
  </motion.div>
);

export const CleanlinessBadge = ({ level }: { level: Cleanliness }) => {
  const config: Record<Cleanliness, { classes: string; icon: JSX.Element }> = {
    Clean: {
      classes:
        "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    Moderate: {
      classes:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    },
    Dirty: {
      classes:
        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    },
  };
  const { classes, icon } = config[level];
  return (
    <span
      data-testid={`badge-cleanliness-${level.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${classes}`}
    >
      {icon}
      {level}
    </span>
  );
};

export const PriorityBadge = ({ priority }: { priority: Priority }) => {
  const classes: Record<Priority, string> = {
    Low: "bg-green-500/15 text-green-600 dark:text-green-300 border-green-500/30",
    Medium: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-300 border-yellow-500/30",
    High: "bg-red-500/15 text-red-600 dark:text-red-300 border-red-500/30",
  };
  return (
    <span
      data-testid={`badge-priority-${priority.toLowerCase()}`}
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold border ${classes[priority]}`}
    >
      <Sparkles className="h-3.5 w-3.5" />
      {priority}
    </span>
  );
};

const ResultCard = ({
  result,
  previewUrl,
  onReset,
}: {
  result: MobileNetResult;
  previewUrl: string;
  onReset: () => void;
}) => {
  const confidenceColor =
    result.confidence >= 70
      ? "text-green-600 dark:text-green-400"
      : result.confidence >= 40
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-orange-600 dark:text-orange-400";

  const explanationBg: Record<Cleanliness, string> = {
    Clean: "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
    Moderate: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800",
    Dirty: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
  };

  return (
    <motion.div
      key="result"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-4"
    >
      <div className="relative rounded-xl overflow-hidden border bg-muted aspect-video">
        <img src={previewUrl} alt="Analyzed" className="w-full h-full object-cover" />
        <div className="absolute top-3 left-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-black/60 text-white text-xs rounded-full backdrop-blur-sm">
            <Brain className="h-3 w-3" />
            MobileNet · TensorFlow.js
          </span>
        </div>
      </div>

      {/* Cleanliness, Priority, Confidence */}
      <div className="grid grid-cols-3 gap-3">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border rounded-xl p-3 text-center space-y-2 shadow-sm"
        >
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Cleanliness
          </p>
          <CleanlinessBadge level={result.cleanliness} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border rounded-xl p-3 text-center space-y-2 shadow-sm"
        >
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Priority
          </p>
          <PriorityBadge priority={result.priority} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-card border rounded-xl p-3 text-center space-y-2 shadow-sm"
        >
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
            Confidence
          </p>
          <div className="flex items-center justify-center gap-1">
            <Zap className={`h-4 w-4 ${confidenceColor}`} />
            <span
              data-testid="text-confidence"
              className={`text-lg font-bold ${confidenceColor}`}
            >
              {result.confidence}%
            </span>
          </div>
        </motion.div>
      </div>

      {/* Top detected labels */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="bg-card border rounded-xl p-4 space-y-3"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Top Detected Labels
        </p>
        <div className="space-y-2">
          {result.predictions.map((p, i) => {
            const pct = Math.round(p.probability * 100);
            return (
              <div key={i} className="space-y-1" data-testid={`row-label-${i}`}>
                <div className="flex justify-between items-center text-sm">
                  <span className="font-medium capitalize">{p.label}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary to-secondary"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ delay: 0.4 + i * 0.08, duration: 0.5 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Description */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className={`rounded-xl border p-4 ${explanationBg[result.cleanliness]}`}
      >
        <div className="flex items-start gap-3">
          <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              AI Recommendation
            </p>
            <p className="text-sm leading-relaxed" data-testid="text-description">
              {result.description}
            </p>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
        <Button
          variant="outline"
          onClick={onReset}
          className="w-full gap-2"
          data-testid="button-analyze-another"
        >
          <RotateCcw className="h-4 w-4" />
          Analyze Another Image
        </Button>
      </motion.div>
    </motion.div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

type Phase = "idle" | "analyzing" | "result" | "error";

export const AIWasteDetection = () => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [stage, setStage] = useState("Analyzing image with AI...");
  const [result, setResult] = useState<MobileNetResult | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Warm up the model in the background as soon as the dashboard mounts so
  // the first user analysis feels instant.
  useEffect(() => {
    preloadMobileNet();
  }, []);

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setError(null);
    setPhase("analyzing");
    setStage("Loading AI model...");

    try {
      // Tiny delay so the loader animation has time to appear smoothly
      setTimeout(() => setStage("Analyzing image with MobileNet..."), 400);
      const res = await analyzeImageWithMobileNet(file);
      setResult(res);
      setPhase("result");
    } catch (e) {
      console.error("[AI] analysis failed", e);
      setError(e instanceof Error ? e.message : "Unknown error");
      setPhase("error");
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setPhase("idle");
  };

  return (
    <Card className="w-full glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanSearch className="h-5 w-5 text-primary" />
          AI Waste Detection
        </CardTitle>
        <CardDescription>
          Upload a photo for real-time, on-device analysis with TensorFlow.js + MobileNet
        </CardDescription>
      </CardHeader>

      <CardContent>
        <AnimatePresence mode="wait">
          {phase === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.25 }}
            >
              <label
                htmlFor="ai-file-input"
                className="cursor-pointer block"
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
              >
                <motion.div
                  animate={dragOver ? { scale: 1.02 } : {}}
                  className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
                    dragOver
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/60 hover:bg-muted/40"
                  }`}
                >
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                    className="flex justify-center mb-4"
                  >
                    <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                      <Upload className="h-7 w-7 text-primary" />
                    </div>
                  </motion.div>
                  <p className="text-sm font-medium mb-1">
                    Drop an image here, or click to select
                  </p>
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, WebP — analyzed entirely in your browser
                  </p>
                </motion.div>
              </label>
              <input
                id="ai-file-input"
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                data-testid="input-ai-image"
              />
            </motion.div>
          )}

          {phase === "analyzing" && <AnalyzingLoader key="analyzing" stage={stage} />}

          {phase === "result" && result && previewUrl && (
            <ResultCard key="result" result={result} previewUrl={previewUrl} onReset={handleReset} />
          )}

          {phase === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-10 space-y-3"
            >
              <AlertTriangle className="h-10 w-10 text-destructive mx-auto" />
              <p className="text-sm font-medium">Analysis failed</p>
              <p className="text-xs text-muted-foreground">{error}</p>
              <Button variant="outline" onClick={handleReset} data-testid="button-retry">
                Try Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

export default AIWasteDetection;
