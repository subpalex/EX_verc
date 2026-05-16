import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Upload, LogOut, Camera, Image as ImageIcon,
  MapPin, ScanSearch, Brain, Zap, AlertTriangle, CheckCircle2,
  Info, X, SendHorizontal,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { FadeIn, AnimatedCard, AnimatedCounter } from "@/components/animations";
import { useLanguage } from "@/contexts/LanguageContext";
import Logo from "@/components/Logo";
import LanguageSelector from "@/components/LanguageSelector";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { UploadStatusBar } from "@/components/dashboard/UploadStatusBar";
import { AIWasteDetection } from "@/components/dashboard/AIWasteDetection";
import {
  generateAutoDescription,
  mobileNetResultToLegacy,
  type AIAnalysisResult,
  type WasteLevel,
} from "@/lib/aiWasteSimulation";
import { analyzeImageWithMobileNet, preloadMobileNet } from "@/lib/aiMobileNet";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VendorDashboardProps {
  session: Session;
}

interface PhotoData {
  id: string;
  photo_url: string;
  market_name: string;
  description: string;
  status: string;
  created_at: string;
  cleanliness_status: Database["public"]["Enums"]["cleanliness_status"] | null;
  is_verified: boolean;
  grade: number | null;
  area: string | null;
}

// ─── Inline AI result (compact, for inside the form card) ─────────────────────

const LEVEL_STYLES: Record<WasteLevel, { badge: string; bg: string; icon: JSX.Element }> = {
  Low: {
    badge: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border-green-200 dark:border-green-700",
    bg: "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  Medium: {
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 border-yellow-200 dark:border-yellow-700",
    bg: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  High: {
    badge: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border-red-200 dark:border-red-700",
    bg: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
};

const InlineAIResult = ({ result }: { result: AIAnalysisResult }) => {
  const s = LEVEL_STYLES[result.wasteLevel];
  const confidenceColor =
    result.confidence >= 90
      ? "text-green-600 dark:text-green-400"
      : result.confidence >= 85
      ? "text-yellow-600 dark:text-yellow-400"
      : "text-orange-600 dark:text-orange-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="space-y-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mr-1">
          AI Result:
        </span>
        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${s.badge}`}>
          {s.icon}
          {result.wasteLevel} waste
        </span>
        <Badge variant="outline" className="text-xs">
          {result.wasteType}
        </Badge>
        <span className={`inline-flex items-center gap-1 text-xs font-bold ${confidenceColor}`}>
          <Zap className="h-3 w-3" />
          {result.confidence}%
        </span>
      </div>

      <div className={`rounded-lg border p-3 ${s.bg}`}>
        <div className="flex items-start gap-2">
          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
          <p className="text-xs leading-relaxed">{result.explanation}</p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground italic flex items-center gap-1">
        <Brain className="h-3 w-3 shrink-0" />
        Description auto-filled from AI analysis — you can edit it below.
      </p>
    </motion.div>
  );
};

const InlineAnalyzingState = () => (
  <motion.div
    key="inline-analyzing"
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.25 }}
    className="flex items-center gap-3 px-3 py-3 rounded-lg bg-primary/5 border border-primary/20"
  >
    <div className="relative shrink-0">
      <motion.div
        className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
        animate={{ scale: [1, 1.15, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Brain className="h-4 w-4 text-primary" />
      </motion.div>
      <motion.div
        className="absolute inset-0 rounded-full border-2 border-primary/30"
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        style={{ borderTopColor: "hsl(var(--primary))" }}
      />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium">Analyzing image using AI...</p>
      <div className="mt-1.5 h-1 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-primary rounded-full"
          animate={{ x: ["-100%", "200%"] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>
    </div>
  </motion.div>
);

// ─── Status badge helper ───────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "reviewed") {
    return (
      <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 rounded font-medium">
        ✓ Reviewed
      </span>
    );
  }
  return (
    <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 px-2 py-1 rounded font-medium">
      Pending
    </span>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const VendorDashboard = ({ session }: VendorDashboardProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [cleanlinessStatus, setCleanlinessStatus] = useState<Database["public"]["Enums"]["cleanliness_status"]>("clean");
  const [comments, setComments] = useState("");
  const [stallNumber, setStallNumber] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [selectedArea, setSelectedArea] = useState("");
  const [photos, setPhotos] = useState<PhotoData[]>([]);
  const [photoCount, setPhotoCount] = useState(0);
  const [vendorName, setVendorName] = useState("");

  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [aiAnalyzing, setAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);

  const uploadQueue = useUploadQueue({
    maxRetries: 5,
    onSuccess: (_item) => {
      toast.success(`✅ ${t.uploadSuccess}`);
      fetchPhotos();
      fetchVendorData();
    },
    onError: (_item, error) => {
      toast.error(`${t.uploadFailed}: ${error}`);
    },
  });

  const MARKET_AREAS = [
    { value: "vegetables", label: t.vegetablesSection },
    { value: "fruits", label: t.fruitsSection },
    { value: "flower", label: t.flowerMarket },
    { value: "fish", label: t.fishMarket },
    { value: "meat", label: t.meatMarket },
    { value: "pathway", label: t.pathway },
    { value: "dustbin", label: t.dustbinZone },
    { value: "other", label: t.other },
  ];

  useEffect(() => {
    fetchVendorData();
    fetchPhotos();
    preloadMobileNet();
  }, [session.user.id]);

  // ── Data fetchers ──────────────────────────────────────────────────────────

  const fetchVendorData = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, market_name, photo_count")
      .eq("id", session.user.id)
      .single();

    if (data) {
      setVendorName(data.full_name || "");
      setStallNumber(data.market_name || "");
      setPhotoCount(data.photo_count || 0);
    }
  };

  const fetchPhotos = async () => {
    const { data } = await supabase
      .from("market_photos")
      .select("id, photo_url, market_name, description, status, created_at, cleanliness_status, is_verified, grade, area")
      .eq("vendor_id", session.user.id)
      .order("created_at", { ascending: false });

    if (data) setPhotos(data as PhotoData[]);
  };

  // ── AI helpers ─────────────────────────────────────────────────────────────

  const clearPendingFile = () => {
    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);
    setPendingFile(null);
    setImagePreviewUrl(null);
    setAiResult(null);
    setAiAnalyzing(false);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error(t.pleaseUploadImage);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t.fileSizeLimit);
      return;
    }

    if (imagePreviewUrl) URL.revokeObjectURL(imagePreviewUrl);

    const url = URL.createObjectURL(file);
    setPendingFile(file);
    setImagePreviewUrl(url);
    setAiResult(null);
    setAiAnalyzing(true);

    try {
      const real = await analyzeImageWithMobileNet(file);
      const result = mobileNetResultToLegacy(real);
      setAiResult(result);
      setComments(generateAutoDescription(result));
    } catch (err) {
      console.error("[AI] MobileNet analysis failed, falling back to neutral result", err);
      const fallback: AIAnalysisResult = {
        wasteLevel: "Medium",
        wasteType: "Mixed",
        confidence: 50,
        explanation: "AI analysis unavailable — please describe the area manually.",
      };
      setAiResult(fallback);
      setComments("");
    } finally {
      setAiAnalyzing(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!pendingFile) return;

    try {
      const photoSchema = z.object({
        stallNumber: z
          .string()
          .trim()
          .min(1, "Stall number is required")
          .max(50, "Stall number must be less than 50 characters")
          .regex(/^[a-zA-Z0-9\s-]+$/, "Stall number can only contain letters, numbers, spaces, and hyphens"),
        comments: z
          .string()
          .trim()
          .max(500, "Comments must be less than 500 characters"),
        contactInfo: z
          .string()
          .trim()
          .max(100, "Contact info must be less than 100 characters")
          .regex(/^[\w\s@.+-]*$/, "Invalid characters in contact info")
          .optional()
          .or(z.literal("")),
        area: z.string().min(1, "Market area is required"),
      });

      const validation = photoSchema.safeParse({ stallNumber, comments, contactInfo, area: selectedArea });
      if (!validation.success) {
        toast.error(validation.error.errors[0].message);
        return;
      }

      const queued = await uploadQueue.addToQueue(
        pendingFile,
        stallNumber,
        comments,
        cleanlinessStatus,
        selectedArea,
        session.user.id
      );

      const optimisticPhoto: PhotoData = {
        id: queued.id,
        photo_url: queued.localPreviewUrl,
        market_name: stallNumber,
        description: comments,
        status: "pending",
        created_at: new Date().toISOString(),
        cleanliness_status: cleanlinessStatus,
        is_verified: false,
        grade: null,
        area: selectedArea,
      };

      setPhotos((prev) => [optimisticPhoto, ...prev]);
      setPhotoCount((prev) => prev + 1);

      toast.message(t.uploadQueued);

      setComments("");
      setCleanlinessStatus("clean");
      setSelectedArea("");
      clearPendingFile();
    } catch (error: any) {
      toast.error(error?.message || t.uploadError);
    }
  };

  // ── Auth ───────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn("Sign out error (clearing local session anyway):", error);
    }
    localStorage.removeItem("sb-gbqoewouvejuapmgrlhd-auth-token");
    navigate("/login");
    window.location.reload();
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
      {(!uploadQueue.isOnline || !uploadQueue.isBackendHealthy || uploadQueue.failedCount > 0) && (
        <UploadStatusBar
          queue={uploadQueue.queue}
          isOnline={uploadQueue.isOnline}
          isBackendHealthy={uploadQueue.isBackendHealthy}
          pendingCount={0}
          failedCount={uploadQueue.failedCount}
          uploadingCount={0}
          onRetryAll={uploadQueue.retryFailedUploads}
          onRetryUpload={uploadQueue.retryUpload}
          onDismiss={uploadQueue.removeFromQueue}
          onClearFailed={uploadQueue.clearFailed}
        />
      )}

      {/* Header */}
      <FadeIn>
        <div className="flex items-center justify-between glass-card px-5 py-4">
          <div className="flex items-center gap-4">
            <Logo size="md" />
            <div className="hidden sm:block h-px w-px bg-border" />
            <div className="hidden sm:block">
              <h1 className="text-xl font-bold leading-tight">{t.vendorDashboard}</h1>
              <p className="text-sm text-muted-foreground">
                {vendorName} • {stallNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector />
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="rounded-xl"
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t.logout}
              </Button>
            </motion.div>
          </div>
        </div>
      </FadeIn>

      {/* Stats — Photos Submitted only */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <AnimatedCard delay={0}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Camera className="h-4 w-4" />
                {t.photosSubmitted}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedCounter value={photoCount} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Total reports submitted</p>
            </CardContent>
          </Card>
        </AnimatedCard>
        <AnimatedCard delay={0.05}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                Reviewed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                <AnimatedCounter value={photos.filter(p => p.status === "reviewed").length} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">Reports reviewed by officers</p>
            </CardContent>
          </Card>
        </AnimatedCard>
      </div>

      {/* Tabs: Submit Report + AI Detect */}
      <FadeIn delay={0.3}>
        <Tabs defaultValue="submit" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-sm">
            <TabsTrigger value="submit">
              <Upload className="h-4 w-4 mr-2" />
              {t.submitReport}
            </TabsTrigger>
            <TabsTrigger value="ai-detection">
              <ScanSearch className="h-4 w-4 mr-2" />
              AI Detect
            </TabsTrigger>
          </TabsList>

          {/* ── Submit Report Tab ── */}
          <TabsContent value="submit" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Left: report form */}
              <AnimatedCard delay={0.1} hover={false}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      {t.reportStallStatus}
                    </CardTitle>
                    <CardDescription>{t.reportStallStatusDesc}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">

                    {/* Stall number */}
                    <div className="space-y-2">
                      <Label htmlFor="stall-number">{t.stallNumber} *</Label>
                      <Input
                        id="stall-number"
                        placeholder={t.stallPlaceholder}
                        value={stallNumber}
                        onChange={(e) => setStallNumber(e.target.value)}
                        data-testid="input-stall-number"
                      />
                    </div>

                    {/* Market area */}
                    <div className="space-y-2">
                      <Label>{t.marketArea} *</Label>
                      <Select value={selectedArea} onValueChange={setSelectedArea}>
                        <SelectTrigger data-testid="select-area">
                          <SelectValue placeholder={t.selectArea} />
                        </SelectTrigger>
                        <SelectContent>
                          {MARKET_AREAS.map((area) => (
                            <SelectItem key={area.value} value={area.value}>
                              <span className="flex items-center gap-2">
                                <MapPin className="h-3 w-3" />
                                {area.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Cleanliness status */}
                    <div className="space-y-3">
                      <Label>{t.currentStatus} *</Label>
                      <RadioGroup
                        value={cleanlinessStatus}
                        onValueChange={(value) =>
                          setCleanlinessStatus(value as Database["public"]["Enums"]["cleanliness_status"])
                        }
                      >
                        {[
                          { value: "clean", label: t.clean, emoji: "✅" },
                          { value: "needs_cleaning", label: t.needsCleaning, emoji: "⚠️" },
                          { value: "overflowing", label: t.overflowing, emoji: "🚨" },
                        ].map((option) => (
                          <motion.div key={option.value} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent/50 cursor-pointer transition-colors">
                              <RadioGroupItem value={option.value} id={option.value} />
                              <Label htmlFor={option.value} className="flex-1 cursor-pointer font-normal">
                                {option.emoji} <span className="font-medium">{option.label}</span>
                              </Label>
                            </div>
                          </motion.div>
                        ))}
                      </RadioGroup>
                    </div>

                    {/* Comments (auto-filled by AI) */}
                    <div className="space-y-2">
                      <Label htmlFor="comments">{t.comments}</Label>
                      <Textarea
                        id="comments"
                        placeholder={t.anyNotes}
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        rows={3}
                        data-testid="textarea-comments"
                      />
                    </div>

                    {/* Photo upload zone / preview */}
                    <div className="space-y-3">
                      <input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                        disabled={aiAnalyzing}
                        ref={photoInputRef}
                        className="hidden"
                      />

                      <AnimatePresence mode="wait">
                        {!pendingFile && (
                          <motion.div
                            key="upload-zone"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Label htmlFor="photo-upload" className="cursor-pointer">
                              <motion.div
                                className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors"
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <motion.div
                                  animate={{ y: [0, -5, 0] }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                >
                                  <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                                </motion.div>
                                <p className="text-sm">📸 {t.photoRequired}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  AI analysis runs automatically after selection
                                </p>
                              </motion.div>
                            </Label>
                          </motion.div>
                        )}

                        {pendingFile && imagePreviewUrl && (
                          <motion.div
                            key="preview"
                            initial={{ opacity: 0, scale: 0.97 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ duration: 0.25 }}
                            className="space-y-3"
                          >
                            <div className="relative rounded-lg overflow-hidden border bg-muted">
                              <img
                                src={imagePreviewUrl}
                                alt="Preview"
                                className="w-full h-48 object-cover"
                              />
                              <div className="absolute top-2 left-2">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full backdrop-blur-sm">
                                  <Brain className="h-3 w-3" />
                                  {aiAnalyzing ? "Analyzing..." : "AI analyzed"}
                                </span>
                              </div>
                              {!aiAnalyzing && (
                                <button
                                  type="button"
                                  onClick={clearPendingFile}
                                  className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
                                  title="Remove photo"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>

                            <AnimatePresence mode="wait">
                              {aiAnalyzing && <InlineAnalyzingState key="analyzing" />}
                              {!aiAnalyzing && aiResult && (
                                <InlineAIResult key="result" result={aiResult} />
                              )}
                            </AnimatePresence>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Submit button — visible only once AI is done */}
                    <AnimatePresence>
                      {pendingFile && aiResult && !aiAnalyzing && (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 8 }}
                          transition={{ duration: 0.3 }}
                        >
                          <Button
                            onClick={handleSubmitReport}
                            className="w-full gap-2"
                            size="lg"
                            data-testid="button-submit-report"
                          >
                            <SendHorizontal className="h-4 w-4" />
                            {t.submitReport}
                          </Button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                  </CardContent>
                </Card>
              </AnimatedCard>

              {/* Right: my submissions */}
              <AnimatedCard delay={0.2} hover={false}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      {t.mySubmissions}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {photos.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>{t.noPhotosYet}</p>
                      </div>
                    ) : (
                      <div className="space-y-4 max-h-[600px] overflow-y-auto">
                        <AnimatePresence>
                          {photos.map((photo, index) => (
                            <motion.div
                              key={photo.id}
                              className="border rounded-lg overflow-hidden"
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ scale: 1.02 }}
                              data-testid={`card-submission-${photo.id}`}
                            >
                              <img
                                src={photo.photo_url}
                                alt="Market"
                                className="w-full h-48 object-cover"
                              />
                              <div className="p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm font-medium capitalize">
                                    {photo.cleanliness_status?.replace("_", " ") || t.pending}
                                  </span>
                                  <StatusBadge status={photo.status} />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(photo.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                        </AnimatePresence>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </AnimatedCard>
            </div>
          </TabsContent>

          {/* ── AI Detect Tab ── */}
          <TabsContent value="ai-detection" className="space-y-4">
            <FadeIn delay={0.1}>
              <AIWasteDetection />
            </FadeIn>
          </TabsContent>
        </Tabs>
      </FadeIn>
    </div>
  );
};

export default VendorDashboard;
