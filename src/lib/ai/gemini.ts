// Integrasi Gemini AI — SERVER-SIDE ONLY.
// GEMINI_API_KEY dibaca dari environment variable dan tidak pernah
// dikirim ke browser. Semua fungsi mengembalikan null saat gagal;
// pemanggil wajib memakai fallback deterministik.

import { GoogleGenAI, Type, type Schema } from "@google/genai";
import type { Extraction, ImageAnalysis } from "@/lib/types";
import { l2normalize } from "@/lib/utils";

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIM = 768;

export function geminiEnabled(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function model(): string {
  return process.env.GEMINI_MODEL || "gemini-flash-latest";
}

let cached: GoogleGenAI | null = null;
function client(): GoogleGenAI {
  if (!cached)
    cached = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
  return cached;
}

function withTimeout<T>(p: Promise<T>, ms = 30_000): Promise<T> {
  return Promise.race([
    p,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Gemini timeout")), ms),
    ),
  ]);
}

type Part =
  | { text: string }
  | { inlineData: { data: string; mimeType: string } };

async function generateJson<T>(
  parts: Part[],
  schema: Schema,
): Promise<T | null> {
  if (!geminiEnabled()) return null;
  try {
    const m = model();
    const response = await withTimeout(
      client().models.generateContent({
        model: m,
        contents: [{ role: "user", parts }],
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
          temperature: 0.1,
          // Matikan thinking untuk kecepatan (didukung gemini-2.5-flash*)
          ...(m.startsWith("gemini-2.5-flash")
            ? { thinkingConfig: { thinkingBudget: 0 } }
            : {}),
        },
      }),
    );
    const text = (response.text ?? "")
      .replace(/^```(?:json)?|```$/gm, "")
      .trim();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (err) {
    console.error("[gemini] generateContent gagal:", err);
    return null;
  }
}

// ---------------------------------------------------------------
// A. INFORMATION EXTRACTION
// ---------------------------------------------------------------

const EXTRACTION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    item_type: { type: Type.STRING, nullable: true },
    category: { type: Type.STRING, nullable: true },
    color: { type: Type.STRING, nullable: true },
    color_secondary: { type: Type.STRING, nullable: true },
    brand: { type: Type.STRING, nullable: true },
    model: { type: Type.STRING, nullable: true },
    material: { type: Type.STRING, nullable: true },
    unique_features: { type: Type.ARRAY, items: { type: Type.STRING } },
    keywords: { type: Type.ARRAY, items: { type: Type.STRING } },
    normalized_description: { type: Type.STRING, nullable: true },
  },
  required: ["unique_features", "keywords"],
};

export interface ExtractionInput {
  item_name: string;
  category: string;
  color: string | null;
  brand: string | null;
  model: string | null;
  material: string | null;
  description: string;
  unique_features: string | null;
  location_name: string;
}

export async function extractReportAttributes(
  input: ExtractionInput,
): Promise<Extraction | null> {
  const prompt = `You are an information extraction system for a lost & found platform in Indonesia.
Extract structured attributes about the ITEM from this report. Input may be in Indonesian or English.

RULES:
- Output all values in CANONICAL lowercase ENGLISH (translate Indonesian: "dompet"->"wallet", "hitam"->"black", "kulit"->"leather").
- item_type: single generic noun for the item (wallet, phone, keys, backpack, watch...).
- color: primary color only. color_secondary: second color if any.
- brand/model: only if stated. Do not guess.
- unique_features: short english phrases of distinguishing marks (e.g. "letter A keychain", "cracked screen corner", "batman sticker"). Max 8.
- keywords: 5-12 lowercase english search keywords.
- normalized_description: one clean english sentence describing the item (no location, no dates, no personal data).
- Use null for unknown fields. Never invent details that are not in the input.

REPORT:
item name: ${input.item_name}
category (user selected): ${input.category}
color: ${input.color ?? "-"}
brand: ${input.brand ?? "-"}
model: ${input.model ?? "-"}
material: ${input.material ?? "-"}
description: ${input.description}
unique features: ${input.unique_features ?? "-"}`;

  const result = await generateJson<Extraction>(
    [{ text: prompt }],
    EXTRACTION_SCHEMA,
  );
  if (!result) return null;
  return {
    item_type: result.item_type ?? null,
    category: result.category ?? input.category,
    color: result.color ?? null,
    color_secondary: result.color_secondary ?? null,
    brand: result.brand ?? null,
    model: result.model ?? null,
    material: result.material ?? null,
    unique_features: (result.unique_features ?? []).slice(0, 8),
    keywords: (result.keywords ?? []).slice(0, 12),
    normalized_description: result.normalized_description ?? null,
  };
}

// ---------------------------------------------------------------
// B. SEMANTIC EMBEDDING
// ---------------------------------------------------------------

export async function embedForMatching(text: string): Promise<number[] | null> {
  if (!geminiEnabled() || !text.trim()) return null;
  try {
    const res = await withTimeout(
      client().models.embedContent({
        model: EMBEDDING_MODEL,
        contents: [text.slice(0, 1800)],
        config: {
          taskType: "SEMANTIC_SIMILARITY",
          outputDimensionality: EMBEDDING_DIM,
        },
      }),
    );
    const values = res.embeddings?.[0]?.values;
    if (!values || values.length === 0) return null;
    return l2normalize(values);
  } catch (err) {
    console.error("[gemini] embedContent gagal:", err);
    return null;
  }
}

// ---------------------------------------------------------------
// C. IMAGE UNDERSTANDING
// ---------------------------------------------------------------

const IMAGE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    object: { type: Type.STRING, nullable: true },
    category: { type: Type.STRING, nullable: true },
    color: { type: Type.STRING, nullable: true },
    brand: { type: Type.STRING, nullable: true },
    material: { type: Type.STRING, nullable: true },
    distinctive_features: { type: Type.ARRAY, items: { type: Type.STRING } },
    description: { type: Type.STRING, nullable: true },
  },
  required: ["distinctive_features"],
};

export async function analyzeItemImage(
  base64: string,
  mimeType: string,
): Promise<ImageAnalysis | null> {
  const prompt = `Analyze the item in this photo for a lost & found platform.
Return lowercase english values: object (generic noun), category, color (primary), brand (only if visibly readable, prefix "possibly " if uncertain), material, distinctive_features (visible unique marks: stickers, scratches, keychains, engravings; max 8), description (one english sentence).
Use null when not identifiable. Ignore background and hands. Never identify people.`;

  const result = await generateJson<ImageAnalysis>(
    [{ inlineData: { data: base64, mimeType } }, { text: prompt }],
    IMAGE_SCHEMA,
  );
  if (!result) return null;
  return {
    object: result.object ?? null,
    category: result.category ?? null,
    color: result.color ?? null,
    brand: result.brand ?? null,
    material: result.material ?? null,
    distinctive_features: (result.distinctive_features ?? []).slice(0, 8),
    description: result.description ?? null,
  };
}

// ---------------------------------------------------------------
// D. OWNERSHIP VERIFICATION JUDGE
// ---------------------------------------------------------------

export interface VerificationJudgeInput {
  key: string;
  question: string;
  claimantAnswer: string;
  /** Data pembanding dari laporan penemu (tidak pernah dikirim ke claimant). */
  reference: string;
}

export interface VerificationJudgeResult {
  key: string;
  verdict: "match" | "partial" | "no_match" | "unknown";
  note: string;
}

const JUDGE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    results: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING },
          verdict: {
            type: Type.STRING,
            enum: ["match", "partial", "no_match", "unknown"],
          },
          note: { type: Type.STRING },
        },
        required: ["key", "verdict", "note"],
      },
    },
  },
  required: ["results"],
};

export async function judgeVerificationAnswers(
  items: VerificationJudgeInput[],
): Promise<VerificationJudgeResult[] | null> {
  if (items.length === 0) return [];
  const prompt = `You are an ownership-verification assistant for a lost & found platform.
For each item, compare the CLAIMANT ANSWER against the REFERENCE (private info written by the finder, may be Indonesian or English).
Judge semantic equivalence, not exact wording ("dompet kulit hitam" matches "black leather wallet").

Verdicts:
- "match": answer clearly describes the same detail
- "partial": some overlap but incomplete or slightly off
- "no_match": contradicts or unrelated
- "unknown": reference too vague to judge

note: ONE short neutral sentence in Indonesian explaining the verdict. NEVER quote or reveal the reference content in the note.

ITEMS:
${items
  .map(
    (it, i) => `${i + 1}. key: ${it.key}
question: ${it.question}
claimant answer: ${it.claimantAnswer || "(kosong)"}
reference: ${it.reference || "(kosong)"}`,
  )
  .join("\n\n")}`;

  const result = await generateJson<{ results: VerificationJudgeResult[] }>(
    [{ text: prompt }],
    JUDGE_SCHEMA,
  );
  if (!result?.results) return null;
  return result.results;
}
