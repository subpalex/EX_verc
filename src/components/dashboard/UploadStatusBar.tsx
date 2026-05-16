import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, WifiOff, X, Loader2, AlertCircle, Server } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface UploadItem {
  id: string;
  status: "pending" | "uploading" | "success" | "failed";
  retryCount: number;
  error?: string;
  localPreviewUrl: string;
  progress?: number;
}

interface UploadStatusBarProps {
  queue: UploadItem[];
  isOnline: boolean;
  isBackendHealthy?: boolean;
  pendingCount: number;
  failedCount: number;
  uploadingCount: number;
  onRetryAll: () => void;
  onRetryUpload: (id: string) => void;
  onDismiss: (id: string) => void;
  onClearFailed: () => void;
}

export function UploadStatusBar({
  queue,
  isOnline,
  isBackendHealthy = true,
  pendingCount,
  failedCount,
  uploadingCount,
  onRetryAll,
  onRetryUpload,
  onDismiss,
  onClearFailed,
}: UploadStatusBarProps) {
  const { t } = useLanguage();
  
  const activeItems = queue.filter(
    (item) => item.status !== "success"
  );

  // Get the currently uploading item for progress display
  const uploadingItem = queue.find((item) => item.status === "uploading");

  if (activeItems.length === 0 && isOnline && isBackendHealthy) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 z-50 w-80 space-y-2"
      >
        {/* Offline Banner */}
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-accent text-accent-foreground border border-border px-4 py-3 rounded-lg shadow-lg flex items-center gap-3"
          >
            <WifiOff className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">{t.offlineMode}</p>
              <p className="text-xs opacity-90">{t.willRetryWhenOnline}</p>
            </div>
          </motion.div>
        )}

        {/* Backend Unhealthy Banner */}
        {isOnline && !isBackendHealthy && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-warning text-warning-foreground border border-border px-4 py-3 rounded-lg shadow-lg flex items-center gap-3"
          >
            <Server className="h-5 w-5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-sm">{t.serverUnavailable || "Server unavailable"}</p>
              <p className="text-xs opacity-90">{t.retryingAutomatically || "Retrying automatically..."}</p>
            </div>
          </motion.div>
        )}

        {/* Uploading Items with Progress */}
        {uploadingCount > 0 && uploadingItem && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-primary text-primary-foreground px-4 py-3 rounded-lg shadow-lg"
          >
            <div className="flex items-center gap-3 mb-2">
              <Loader2 className="h-5 w-5 animate-spin flex-shrink-0" />
              <p className="text-sm font-medium flex-1">{t.uploadingPhoto}</p>
              <span className="text-sm font-bold">{uploadingItem.progress || 0}%</span>
            </div>
            <Progress 
              value={uploadingItem.progress || 0} 
              className="h-2 bg-primary-foreground/20"
            />
          </motion.div>
        )}

        {/* Pending Items */}
        {pendingCount > 0 && !uploadingCount && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-muted px-4 py-3 rounded-lg shadow-lg flex items-center gap-3"
          >
            <Loader2 className="h-5 w-5 animate-spin flex-shrink-0 text-muted-foreground" />
            <p className="text-sm">
              {pendingCount} {t.queuedUploads}
            </p>
          </motion.div>
        )}

        {/* Failed Items Summary */}
        {failedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-destructive text-destructive-foreground px-4 py-3 rounded-lg shadow-lg"
          >
            <div className="flex items-center gap-3 mb-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p className="text-sm font-medium flex-1">
                {failedCount} {t.failedUploads}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="secondary"
                className="flex-1 h-8 text-xs"
                onClick={onRetryAll}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                {t.retryAll}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs hover:bg-destructive-foreground/10"
                onClick={onClearFailed}
              >
                {t.dismiss}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Individual Failed Items */}
        {queue
          .filter((item) => item.status === "failed")
          .slice(0, 3)
          .map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-card border border-destructive/50 px-3 py-2 rounded-lg shadow-sm flex items-center gap-2"
            >
              <img
                src={item.localPreviewUrl}
                alt="Failed upload"
                className="w-10 h-10 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-destructive font-medium truncate">
                  {item.error || t.uploadFailed}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t.retryCount || "Retries"}: {item.retryCount}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => onRetryUpload(item.id)}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => onDismiss(item.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </motion.div>
          ))}
      </motion.div>
    </AnimatePresence>
  );
}
