import { describe, it, expect } from "vitest";
import { canTransitionCustody } from "@/lib/custody";

describe("canTransitionCustody", () => {
  it("mengizinkan transisi maju yang sah", () => {
    expect(canTransitionCustody("AWAITING", "IN_CUSTODY")).toBe(true);
    expect(canTransitionCustody("IN_CUSTODY", "RELEASED")).toBe(true);
  });

  it("menolak lompatan & mundur", () => {
    expect(canTransitionCustody("AWAITING", "RELEASED")).toBe(false);
    expect(canTransitionCustody("IN_CUSTODY", "AWAITING")).toBe(false);
    expect(canTransitionCustody("RELEASED", "IN_CUSTODY")).toBe(false);
  });

  it("menolak transisi ke status yang sama", () => {
    expect(canTransitionCustody("AWAITING", "AWAITING")).toBe(false);
    expect(canTransitionCustody("RELEASED", "RELEASED")).toBe(false);
  });
});
