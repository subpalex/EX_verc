import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  saveUploadToStorage,
  getAllPendingUploads,
  updateUploadInStorage,
  removeUploadFromStorage,
  isIndexedDBAvailable,
  fileToArrayBuffer,
  arrayBufferToFile,
  type StoredUploadItem,
} from "@/lib/uploadStorage";

export interface UploadItem {
  id: string;
  file: File;
  stallNumber: string;
  comments: string;
  cleanlinessStatus: Database["public"]["Enums"]["cleanliness_status"];
  area: string;
  userId: string;

  localPreviewUrl: string;
  storagePath: string;
  storageUploaded: boolean;

  status: "pending" | "uploading" | "success" | "failed";
  retryCount: number;
  error?: string;
  progress: number; // 0-100 upload progress
}

interface UseUploadQueueOptions {
  maxRetries?: number;
  timeoutMs?: number;
  onSuccess?: (item: UploadItem) => void;
  onError?: (item: UploadItem, error: string) => void;
  onStatusChange?: (item: UploadItem) => void;
}

const DEFAULT_MAX_RETRIES = 5;
const RETRY_DELAY_BASE_MS = 1000;
const HEALTH_CHECK_TIMEOUT_MS = 5000;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Health check function to verify backend is reachable
async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT_MS);
    
    const { error } = await supabase
      .from("profiles")
      .select("id")
      .limit(1)
      .abortSignal(controller.signal);
    
    clearTimeout(timeoutId);
    return !error;
  } catch {
    return false;
  }
}

// Log upload attempt to database
async function logUpload(
  vendorId: string,
  uploadId: string,
  fileName: string,
  fileSize: number,
  status: string,
  storagePath: string,
  errorMessage?: string,
  retryCount?: number
): Promise<void> {
  try {
    await supabase.from("upload_logs").upsert({
      vendor_id: vendorId,
      upload_id: uploadId,
      file_name: fileName,
      file_size: fileSize,
      status,
      storage_path: storagePath,
      error_message: errorMessage,
      retry_count: retryCount || 0,
      completed_at: status === "success" || status === "failed" ? new Date().toISOString() : null,
    }, {
      onConflict: "upload_id",
      ignoreDuplicates: false,
    });
  } catch (error) {
    console.error("Failed to log upload:", error);
  }
}

export function useUploadQueue(options: UseUploadQueueOptions = {}) {
  const {
    maxRetries = DEFAULT_MAX_RETRIES,
    timeoutMs = 60_000,
    onSuccess,
    onError,
    onStatusChange,
  } = options;

  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(true);

  const processingRef = useRef(false);
  const queueRef = useRef<UploadItem[]>([]);
  const initialLoadDone = useRef(false);

  // Keep queueRef in sync synchronously via a wrapper
  const setQueueAndRef = useCallback((updater: UploadItem[] | ((prev: UploadItem[]) => UploadItem[])) => {
    setQueue((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      queueRef.current = next;
      return next;
    });
  }, []);

  // Network status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Load persisted uploads from IndexedDB on mount
  useEffect(() => {
    async function loadPersistedUploads() {
      if (!isIndexedDBAvailable() || initialLoadDone.current) return;
      initialLoadDone.current = true;

      try {
        const storedItems = await getAllPendingUploads();
        
        if (storedItems.length > 0) {
          const restoredItems: UploadItem[] = storedItems.map((stored) => {
            const file = arrayBufferToFile(stored.fileData, stored.fileName, stored.fileType);
            return {
              id: stored.id,
              file,
              stallNumber: stored.stallNumber,
              comments: stored.comments,
              cleanlinessStatus: stored.cleanlinessStatus,
              area: stored.area,
              userId: stored.userId,
              localPreviewUrl: URL.createObjectURL(file),
              storagePath: stored.storagePath,
              storageUploaded: stored.storageUploaded,
              status: stored.status === "uploading" ? "pending" : stored.status as any,
              retryCount: stored.retryCount,
              error: stored.error,
              progress: 0,
            };
          });

          setQueueAndRef((prev) => [...prev, ...restoredItems]);
        }
      } catch (error) {
        console.error("Failed to load persisted uploads:", error);
      }
    }

    loadPersistedUploads();
  }, []);

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      queueRef.current.forEach((item) => {
        if (item.localPreviewUrl) URL.revokeObjectURL(item.localPreviewUrl);
      });
    };
  }, []);

  const updateItem = useCallback(
    (id: string, patch: Partial<UploadItem>) => {
      setQueueAndRef((prev) =>
        prev.map((item) => {
          if (item.id !== id) return item;
          const updated = { ...item, ...patch };
          onStatusChange?.(updated);
          return updated;
        })
      );
      
      // Also update IndexedDB
      if (isIndexedDBAvailable()) {
        updateUploadInStorage(id, patch as Partial<StoredUploadItem>);
      }
    },
    [onStatusChange]
  );

  const addToQueue = useCallback(
    async (
      file: File,
      stallNumber: string,
      comments: string,
      cleanlinessStatus: Database["public"]["Enums"]["cleanliness_status"],
      area: string,
      userId: string
    ) => {
      const ext = file.name.split(".").pop() || "jpg";
      const id = `upload-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const item: UploadItem = {
        id,
        file,
        stallNumber,
        comments,
        cleanlinessStatus,
        area,
        userId,

        localPreviewUrl: URL.createObjectURL(file),
        storagePath: `${userId}/${id}.${ext}`,
        storageUploaded: false,

        status: "pending",
        retryCount: 0,
        progress: 0,
      };

      // Persist to IndexedDB immediately
      if (isIndexedDBAvailable()) {
        try {
          const fileData = await fileToArrayBuffer(file);
          await saveUploadToStorage({
            id,
            fileData,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            stallNumber,
            comments,
            cleanlinessStatus,
            area,
            userId,
            storagePath: item.storagePath,
            storageUploaded: false,
            status: "pending",
            retryCount: 0,
            createdAt: Date.now(),
          });
        } catch (error) {
          console.error("Failed to persist upload to IndexedDB:", error);
        }
      }

      // Log initial upload attempt
      logUpload(userId, id, file.name, file.size, "pending", item.storagePath);

      setQueueAndRef((prev) => [...prev, item]);
      return item;
    },
    []
  );

  const withTimeout = useCallback(
    async <T,>(promise: Promise<T>) => {
      const timeoutPromise = new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("Upload timed out. Please try again.")), timeoutMs)
      );
      return (await Promise.race([promise, timeoutPromise])) as T;
    },
    [timeoutMs]
  );

  const performUpload = useCallback(
    async (item: UploadItem, onProgress: (progress: number) => void) => {
      if (!navigator.onLine) throw new Error("No internet connection.");

      // 1) Ensure file is in storage (idempotent path + upsert)
      if (!item.storageUploaded) {
        onProgress(10);
        
        const { error: uploadError } = await withTimeout(
          supabase.storage
            .from("market-photos")
            .upload(item.storagePath, item.file, { cacheControl: "3600", upsert: true })
        );
        
        if (uploadError) throw uploadError;

        onProgress(60);
        updateItem(item.id, { storageUploaded: true });
        
        // Update IndexedDB
        if (isIndexedDBAvailable()) {
          await updateUploadInStorage(item.id, { storageUploaded: true });
        }
      }

      onProgress(70);

      // 2) Insert DB row (idempotent – check if already inserted by a previous timed-out attempt)
      const {
        data: { publicUrl },
      } = supabase.storage.from("market-photos").getPublicUrl(item.storagePath);

      onProgress(80);

      // Check for existing row to prevent duplicates on retry
      const { data: existingRow } = await supabase
        .from("market_photos")
        .select("id")
        .eq("photo_url", publicUrl)
        .eq("vendor_id", item.userId)
        .maybeSingle();

      if (!existingRow) {
        const { error: dbError } = await supabase.from("market_photos").insert([
          {
            vendor_id: item.userId,
            photo_url: publicUrl,
            market_name: item.stallNumber,
            description: item.comments,
            status: "pending",
            cleanliness_status: item.cleanlinessStatus,
            area: item.area,
          },
        ]);

        if (dbError) throw dbError;
      }

      onProgress(100);
    },
    [updateItem, withTimeout]
  );

  const tryUploadOnce = useCallback(
    async (item: UploadItem) => {
      updateItem(item.id, { status: "uploading", error: undefined, progress: 0 });
      
      await performUpload(item, (progress) => {
        updateItem(item.id, { progress });
      });
      
      updateItem(item.id, { status: "success", progress: 100 });
      
      // Log success
      logUpload(item.userId, item.id, item.file.name, item.file.size, "success", item.storagePath);
      
      // Remove from IndexedDB on success
      if (isIndexedDBAvailable()) {
        await removeUploadFromStorage(item.id);
      }
      
      onSuccess?.(item);
    },
    [onSuccess, performUpload, updateItem]
  );

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    try {
      while (true) {
        const next = queueRef.current.find((i) => i.status === "pending");
        if (!next) break;

        // Wait for connection
        while (!navigator.onLine) {
          await sleep(1000);
        }

        // Exponential backoff based on retryCount (skip health check to avoid blocking)
        if (next.retryCount > 0) {
          const delay = RETRY_DELAY_BASE_MS * Math.pow(2, Math.min(next.retryCount - 1, 4));
          await sleep(delay);
        }

        try {
          await tryUploadOnce(next);
        } catch (err: any) {
          const message = err?.message || "Upload failed";

          setQueueAndRef((prev) =>
            prev.map((i) => {
              if (i.id !== next.id) return i;
              const newRetry = i.retryCount + 1;
              const shouldRetry = newRetry < maxRetries;
              const updated: UploadItem = {
                ...i,
                retryCount: newRetry,
                status: shouldRetry ? "pending" : "failed",
                error: message,
                progress: 0,
              };
              onStatusChange?.(updated);
              return updated;
            })
          );

          // Update IndexedDB
          if (isIndexedDBAvailable()) {
            const newRetry = next.retryCount + 1;
            await updateUploadInStorage(next.id, {
              retryCount: newRetry,
              status: newRetry < maxRetries ? "pending" : "failed",
              error: message,
            });
          }

          // Log failure
          const newRetry = next.retryCount + 1;
          logUpload(
            next.userId,
            next.id,
            next.file.name,
            next.file.size,
            newRetry < maxRetries ? "pending" : "failed",
            next.storagePath,
            message,
            newRetry
          );

          if (next.retryCount + 1 >= maxRetries) {
            onError?.(next, message);
          }
        }

        // Give React a tick to flush state
        await sleep(50);
      }
    } finally {
      processingRef.current = false;
      setIsProcessing(false);
    }
  }, [maxRetries, onError, onStatusChange, tryUploadOnce]);

  // auto-start processing when there are pending items
  useEffect(() => {
    const hasPending = queue.some((i) => i.status === "pending");
    if (hasPending && !processingRef.current) {
      processQueue();
    }
  }, [queue, processQueue]);

  const retryFailedUploads = useCallback(() => {
    setQueueAndRef((prev) =>
      prev.map((item) =>
        item.status === "failed" ? { ...item, status: "pending", error: undefined, progress: 0 } : item
      )
    );
    
    // Update IndexedDB
    if (isIndexedDBAvailable()) {
      queue.filter((i) => i.status === "failed").forEach((item) => {
        updateUploadInStorage(item.id, { status: "pending", error: undefined });
      });
    }
  }, [queue]);

  const retryUpload = useCallback((id: string) => {
    setQueueAndRef((prev) =>
      prev.map((item) =>
        item.id === id && item.status === "failed"
          ? { ...item, status: "pending", error: undefined, progress: 0 }
          : item
      )
    );
    
    // Update IndexedDB
    if (isIndexedDBAvailable()) {
      updateUploadInStorage(id, { status: "pending", error: undefined });
    }
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueueAndRef((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.localPreviewUrl) URL.revokeObjectURL(item.localPreviewUrl);
      return prev.filter((i) => i.id !== id);
    });
    
    // Remove from IndexedDB
    if (isIndexedDBAvailable()) {
      removeUploadFromStorage(id);
    }
  }, []);

  const clearFailed = useCallback(() => {
    setQueueAndRef((prev) => {
      prev
        .filter((i) => i.status === "failed")
        .forEach((i) => {
          if (i.localPreviewUrl) URL.revokeObjectURL(i.localPreviewUrl);
          // Remove from IndexedDB
          if (isIndexedDBAvailable()) {
            removeUploadFromStorage(i.id);
          }
        });
      return prev.filter((i) => i.status !== "failed");
    });
  }, []);

  const counts = useMemo(
    () => ({
      pendingCount: queue.filter((i) => i.status === "pending").length,
      failedCount: queue.filter((i) => i.status === "failed").length,
      uploadingCount: queue.filter((i) => i.status === "uploading").length,
    }),
    [queue]
  );

  return {
    queue,
    isProcessing,
    isOnline,
    isBackendHealthy,
    addToQueue,
    retryUpload,
    retryFailedUploads,
    removeFromQueue,
    clearFailed,
    ...counts,
  };
}
