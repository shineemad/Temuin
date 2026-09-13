import { describe, it, expect } from "vitest";
import { computeMatch } from "@/lib/matching/engine";
import type { FoundReport, LostReport } from "@/lib/types";

function lost(overrides: Partial<LostReport> = {}): LostReport {
  return {
    id: "lost-1",
    user_id: "u1",
    item_name: "Dompet kulit coklat",
    category: "wallet",
    color: "coklat",
    brand: "Eiger",
    model: null,
    material: "kulit",
    description: "Dompet kulit coklat berisi kartu",
    unique_features: "ada goresan di pojok kanan",
    location_name: "Kantin pusat",
    latitude: -5.135,
    longitude: 119.42,
    image_url: null,
    status: "ACTIVE",
    is_demo: false,
    created_at: "2026-09-01T00:00:00Z",
    updated_at: "2026-09-01T00:00:00Z",
    lost_date: "2026-09-01",
    lost_time: "10:00",
    ...overrides,
  };
}

function found(overrides: Partial<FoundReport> = {}): FoundReport {
  return {
    id: "found-1",
    user_id: "u2",
    item_name: "Dompet coklat",
    category: "wallet",
    color: "coklat",
    brand: "Eiger",
    model: null,
    material: "kulit",
    description: "Menemukan dompet coklat dekat kantin",
    unique_features: "goresan pojok kanan",
    private_verification_info: "ada kartu pelajar atas nama B",
    location_name: "Kantin pusat",
    latitude: -5.136,
    longitude: 119.421,
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

describe("computeMatch — bobot", () => {
  it("menormalisasi bobot komponen tersedia hingga total ~100%", () => {
    const result = computeMatch(lost(), null, found(), null);
    const totalWeight = result.components
      .filter((c) => c.available && c.score !== null)
      .reduce((s, c) => s + c.weight, 0);
    expect(totalWeight).toBeGreaterThan(99);
    expect(totalWeight).toBeLessThan(101);
  });

  it("tidak pernah menyertakan komponen image", () => {
    const result = computeMatch(lost(), null, found(), null);
    expect(result.components.some((c) => c.key === "image")).toBe(false);
    expect(result.scores.image_score).toBeNull();
  });

  it("menghasilkan skor tinggi untuk laporan yang sangat mirip", () => {
    const result = computeMatch(lost(), null, found(), null);
    expect(result.finalScore).toBeGreaterThan(60);
    expect(result.finalScore).toBeLessThanOrEqual(100);
  });

  it("menghasilkan skor rendah untuk kategori & lokasi berbeda jauh", () => {
    const mismatch = found({
      item_name: "Kunci motor",
      category: "keys",
      color: "hitam",
      brand: null,
      material: "logam",
      description: "Kunci motor Honda",
      unique_features: "gantungan boneka",
      location_name: "Parkiran timur",
      latitude: -5.9,
      longitude: 120.5,
    });
    const result = computeMatch(lost(), null, mismatch, null);
    expect(result.finalScore).toBeLessThan(50);
  });
});
