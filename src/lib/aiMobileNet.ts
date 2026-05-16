/**
 * Real-time, browser-only image analysis powered by TensorFlow.js + MobileNet.
 *
 * Both libraries are loaded on demand from a public CDN so:
 *   - they are NOT bundled into the main app (keeps initial JS small)
 *   - no `npm install` is required
 *   - everything runs entirely in the user's browser (no backend / no API keys)
 */

export type Cleanliness = "Clean" | "Moderate" | "Dirty";
export type Priority = "Low" | "Medium" | "High";

export interface PredictionLabel {
  label: string;
  probability: number; // 0..1
}

export interface MobileNetResult {
  predictions: PredictionLabel[]; // top-N labels from MobileNet
  cleanliness: Cleanliness;
  priority: Priority;
  confidence: number; // 0..100, top label probability
  description: string; // human-readable summary
}

// ─── CDN script loader ────────────────────────────────────────────────────────

const TFJS_CDN = "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.20.0/dist/tf.min.js";
const MOBILENET_CDN =
  "https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.1/dist/mobilenet.min.js";

let scriptsReady: Promise<void> | null = null;
let modelPromise: Promise<MobileNetModel> | null = null;

interface MobileNetModel {
  classify: (
    img: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
    topK?: number
  ) => Promise<{ className: string; probability: number }[]>;
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

/** Loads the TF.js + MobileNet scripts once, then caches the promise. */
function ensureScripts(): Promise<void> {
  if (!scriptsReady) {
    scriptsReady = (async () => {
      await loadScript(TFJS_CDN);
      await loadScript(MOBILENET_CDN);
    })();
  }
  return scriptsReady;
}

/** Loads (and caches) the MobileNet model. First call may take a few seconds. */
export async function loadMobileNetModel(): Promise<MobileNetModel> {
  await ensureScripts();
  if (!modelPromise) {
    const mn = (window as unknown as {
      mobilenet?: { load: (cfg?: { version?: number; alpha?: number }) => Promise<MobileNetModel> };
    }).mobilenet;
    if (!mn) throw new Error("MobileNet global not found after CDN load");
    // version 2, alpha 1.0 — best accuracy/speed trade-off for browser use
    modelPromise = mn.load({ version: 2, alpha: 1.0 });
  }
  return modelPromise;
}

/** Optional warm-up — call once on app mount to start downloading in the background. */
export function preloadMobileNet(): void {
  loadMobileNetModel().catch(() => {
    /* network errors are handled at analyze-time */
  });
}

// ─── File → HTMLImageElement ──────────────────────────────────────────────────

function fileToImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not decode image"));
    };
    img.src = url;
  });
}

// ─── Cleanliness classification rules ────────────────────────────────────────

const DIRTY_KEYWORDS = [
  "trash",
  "garbage",
  "plastic",
  "waste",
  "litter",
  "rubbish",
  "ashcan",
  "bin",
  "dumpster",
  "refuse",
  "junk",
];

const MODERATE_KEYWORDS = [
  "street",
  "outdoor",
  "pollution",
  "road",
  "sidewalk",
  "alley",
  "pavement",
  "highway",
  "parking",
  "construction",
];

const DESCRIPTIONS: Record<Cleanliness, string> = {
  Dirty: "Waste detected in the area. Immediate cleaning required.",
  Moderate: "Some waste presence detected. Cleaning recommended.",
  Clean: "Area appears clean.",
};

const PRIORITY_MAP: Record<Cleanliness, Priority> = {
  Dirty: "High",
  Moderate: "Medium",
  Clean: "Low",
};

/** Maps an array of MobileNet predictions to a cleanliness category. */
export function classifyCleanliness(labels: string[]): Cleanliness {
  const haystack = labels.join(" ").toLowerCase();
  if (DIRTY_KEYWORDS.some((k) => haystack.includes(k))) return "Dirty";
  if (MODERATE_KEYWORDS.some((k) => haystack.includes(k))) return "Moderate";
  return "Clean";
}

// ─── Public analyze() ────────────────────────────────────────────────────────

/**
 * Run real MobileNet inference on a user-uploaded file and return a structured
 * cleanliness assessment.
 */
export async function analyzeImageWithMobileNet(file: File): Promise<MobileNetResult> {
  const [model, img] = await Promise.all([loadMobileNetModel(), fileToImageElement(file)]);

  // Top-5 ImageNet predictions for the image
  const raw = await model.classify(img, 5);

  // MobileNet labels look like "ashcan, trash can, garbage can, wastebin, ..."
  // Take the first synonym for a cleaner display label.
  const predictions: PredictionLabel[] = raw.map((p) => ({
    label: p.className.split(",")[0].trim(),
    probability: p.probability,
  }));

  const cleanliness = classifyCleanliness(raw.map((p) => p.className));
  const priority = PRIORITY_MAP[cleanliness];
  const confidence = Math.round((predictions[0]?.probability ?? 0) * 100);

  // Free the object URL created in fileToImageElement
  if (img.src.startsWith("blob:")) URL.revokeObjectURL(img.src);

  return {
    predictions,
    cleanliness,
    priority,
    confidence,
    description: DESCRIPTIONS[cleanliness],
  };
}

/** One-line summary used for auto-filling the report's description field. */
export function describeResult(result: MobileNetResult): string {
  const top = result.predictions
    .slice(0, 3)
    .map((p) => p.label)
    .join(", ");
  return `${result.description} Detected: ${top} (${result.confidence}% confidence).`;
}
