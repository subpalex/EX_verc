export type WasteLevel = "Low" | "Medium" | "High";
export type WasteType = "Plastic" | "Organic" | "Mixed";

export interface AIAnalysisResult {
  wasteLevel: WasteLevel;
  wasteType: WasteType;
  confidence: number;
  explanation: string;
}

export function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

/**
 * Deterministically derive a mocked AI result from a File so the same image
 * always produces the same output within a session.
 */
export function simulateAIAnalysis(file: File): AIAnalysisResult {
  const seed = file.size + file.name.length + file.lastModified;

  const r0 = seededRandom(seed);
  const r1 = seededRandom(seed + 7);
  const r2 = seededRandom(seed + 13);

  const wasteLevel: WasteLevel = (["Low", "Medium", "High"] as WasteLevel[])[
    Math.floor(r0 * 3)
  ];
  const wasteType: WasteType = (["Plastic", "Organic", "Mixed"] as WasteType[])[
    Math.floor(r1 * 3)
  ];
  const confidence = Math.floor(80 + r2 * 16); // 80–95

  const explanations: Record<WasteLevel, string> = {
    High: "Dense waste accumulation detected. Immediate cleaning required.",
    Medium: "Moderate waste detected. Cleaning recommended.",
    Low: "Area appears relatively clean.",
  };

  return { wasteLevel, wasteType, confidence, explanation: explanations[wasteLevel] };
}

/** Builds the auto-fill description string included in the submitted report. */
export function generateAutoDescription(result: AIAnalysisResult): string {
  const urgency: Record<WasteLevel, string> = {
    High: "Immediate action required.",
    Medium: "Cleaning recommended.",
    Low: "Area is relatively clean.",
  };
  return `${result.wasteLevel} waste detected (${result.wasteType}, ${result.confidence}% confidence). ${urgency[result.wasteLevel]}`;
}

/**
 * Adapter: converts a real MobileNetResult into the legacy AIAnalysisResult
 * shape so the existing dashboard UI (badges, comments auto-fill, etc.)
 * keeps working without changes.
 */
import type { MobileNetResult, Cleanliness } from "./aiMobileNet";

const CLEANLINESS_TO_LEVEL: Record<Cleanliness, WasteLevel> = {
  Dirty: "High",
  Moderate: "Medium",
  Clean: "Low",
};

function inferWasteType(predictions: { label: string }[]): WasteType {
  const txt = predictions.map((p) => p.label.toLowerCase()).join(" ");
  if (/\bplastic|bottle|bag|wrapper|container\b/.test(txt)) return "Plastic";
  if (/\bfood|fruit|vegetable|peel|organic|leaf\b/.test(txt)) return "Organic";
  return "Mixed";
}

export function mobileNetResultToLegacy(real: MobileNetResult): AIAnalysisResult {
  return {
    wasteLevel: CLEANLINESS_TO_LEVEL[real.cleanliness],
    wasteType: inferWasteType(real.predictions),
    confidence: real.confidence,
    explanation: real.description,
  };
}
