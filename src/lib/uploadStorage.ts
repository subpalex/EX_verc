// IndexedDB wrapper for persisting upload queue locally
// Ensures uploads are never lost even if browser crashes or app is closed

const DB_NAME = "marketsense-uploads";
const DB_VERSION = 1;
const STORE_NAME = "pending-uploads";

export interface StoredUploadItem {
  id: string;
  fileData: ArrayBuffer;
  fileName: string;
  fileType: string;
  fileSize: number;
  stallNumber: string;
  comments: string;
  cleanlinessStatus: "clean" | "needs_cleaning" | "overflowing";
  area: string;
  userId: string;
  storagePath: string;
  storageUploaded: boolean;
  status: "pending" | "uploading" | "success" | "failed";
  retryCount: number;
  error?: string;
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error("IndexedDB error:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("userId", "userId", { unique: false });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
  });

  return dbPromise;
}

export async function saveUploadToStorage(item: StoredUploadItem): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(item);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to save upload to storage:", error);
    throw error;
  }
}

export async function getUploadFromStorage(id: string): Promise<StoredUploadItem | undefined> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to get upload from storage:", error);
    return undefined;
  }
}

export async function getAllPendingUploads(userId?: string): Promise<StoredUploadItem[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        let results = request.result as StoredUploadItem[];
        
        // Filter by userId if provided
        if (userId) {
          results = results.filter((item) => item.userId === userId);
        }
        
        // Filter to only pending/failed items (not success)
        results = results.filter(
          (item) => item.status === "pending" || item.status === "failed" || item.status === "uploading"
        );
        
        // Sort by createdAt
        results.sort((a, b) => a.createdAt - b.createdAt);
        
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to get pending uploads:", error);
    return [];
  }
}

export async function updateUploadInStorage(
  id: string,
  updates: Partial<StoredUploadItem>
): Promise<void> {
  try {
    const existing = await getUploadFromStorage(id);
    if (!existing) return;

    await saveUploadToStorage({ ...existing, ...updates });
  } catch (error) {
    console.error("Failed to update upload in storage:", error);
  }
}

export async function removeUploadFromStorage(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to remove upload from storage:", error);
  }
}

export async function clearSuccessfulUploads(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const items = request.result as StoredUploadItem[];
        const successItems = items.filter((item) => item.status === "success");
        
        successItems.forEach((item) => {
          store.delete(item.id);
        });
        
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to clear successful uploads:", error);
  }
}

// Check if IndexedDB is available
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

// Convert File to ArrayBuffer for storage
export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// Convert ArrayBuffer back to File
export function arrayBufferToFile(
  buffer: ArrayBuffer,
  fileName: string,
  fileType: string
): File {
  const blob = new Blob([buffer], { type: fileType });
  return new File([blob], fileName, { type: fileType });
}
