import { describe, it, expect } from "vitest";
import { textSimilarity } from "@/lib/utils";

// Smoke test: memastikan harness vitest + alias @/ berjalan.
describe("textSimilarity", () => {
  it("mengembalikan 1 untuk teks identik", () => {
    expect(textSimilarity("dompet coklat", "dompet coklat")).toBe(1);
  });

  it("mengembalikan 0 untuk teks tanpa irisan kata", () => {
    expect(textSimilarity("dompet", "sepatu")).toBe(0);
  });

  it("bernilai di antara 0 dan 1 untuk irisan sebagian", () => {
    const sim = textSimilarity("dompet kulit coklat", "dompet coklat");
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });
});
