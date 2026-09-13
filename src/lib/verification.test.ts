import { describe, it, expect } from "vitest";
import {
  buildVerificationQuestions,
  evaluateVerificationAnswers,
  verificationRecommendation,
} from "@/lib/verification";
import type { FoundReport } from "@/lib/types";

// Tanpa GEMINI_API_KEY, evaluateVerificationAnswers memakai jalur fallback
// (kesamaan teks). Test ini mengunci perilaku fallback tersebut.

function found(overrides: Partial<FoundReport> = {}): FoundReport {
  return {
    id: "found-1",
    user_id: "u2",
    item_name: "Dompet kulit coklat",
    category: "wallet",
    color: "coklat",
    brand: "Eiger",
    model: "lipat",
    material: "kulit",
    description: "Dompet coklat berisi kartu",
    unique_features: "goresan di pojok kanan",
    private_verification_info:
      "ada kartu pelajar atas nama Budi dan foto keluarga di dalamnya",
    location_name: "Kantin pusat kampus",
    latitude: null,
    longitude: null,
    image_url: null,
    status: "ACTIVE",
    is_demo: false,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    found_date: "2026-09-01",
    found_time: "12:00",
    holding: "POS",
    pos_id: "pos-1",
    custody_status: "IN_CUSTODY",
    received_by: "op-1",
    received_at: "2026-09-01T12:30:00Z",
    released_at: null,
    ...overrides,
  };
}

describe("evaluateVerificationAnswers — fallback", () => {
  it("memberi skor tinggi saat jawaban sangat cocok dengan referensi", async () => {
    const f = found();
    const questions = buildVerificationQuestions(f);
    const answers: Record<string, string> = {
      brand: "Eiger lipat",
      features: "ada goresan di pojok kanan",
      private_detail: "ada kartu pelajar atas nama Budi dan foto keluarga",
      location: "kantin pusat kampus",
      time: "1 September siang",
    };
    const result = await evaluateVerificationAnswers(f, questions, answers);
    expect(result.evaluatedBy).toBe("fallback");
    expect(result.score).toBeGreaterThan(50);
    expect(result.checks.length).toBe(questions.length);
  });

  it("memberi skor rendah saat jawaban tidak relevan", async () => {
    const f = found();
    const questions = buildVerificationQuestions(f);
    const answers: Record<string, string> = {
      brand: "xyz",
      features: "tidak tahu",
      private_detail: "pokoknya punya saya",
      location: "entah",
      time: "lupa",
    };
    const result = await evaluateVerificationAnswers(f, questions, answers);
    expect(result.score).toBeLessThan(40);
  });

  it("rekomendasi mengikuti ambang skor", () => {
    expect(verificationRecommendation(80).label).toMatch(/pemilik sah/i);
    expect(verificationRecommendation(50).label).toMatch(/peninjauan manual/i);
    expect(verificationRecommendation(20).label).toMatch(/rendah/i);
  });
});
