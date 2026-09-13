import { supabaseAdmin } from "@/lib/supabase/admin";
import type { CustodyStatus } from "@/lib/types";

// State machine custody. Transisi maju saja: barang tidak bisa kembali
// dari RELEASED, dan tidak bisa lompat AWAITING → RELEASED.
const CUSTODY_TRANSITIONS: Record<CustodyStatus, CustodyStatus[]> = {
  AWAITING: ["IN_CUSTODY"],
  IN_CUSTODY: ["RELEASED"],
  RELEASED: [],
};

export function canTransitionCustody(
  from: CustodyStatus,
  to: CustodyStatus,
): boolean {
  return CUSTODY_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Operator menerima barang di pos: AWAITING → IN_CUSTODY. */
export async function receiveFoundItem(
  foundId: string,
  operatorId: string,
): Promise<boolean> {
  const { data } = await supabaseAdmin()
    .from("found_reports")
    .update({
      custody_status: "IN_CUSTODY",
      received_by: operatorId,
      received_at: new Date().toISOString(),
    })
    .eq("id", foundId)
    .eq("holding", "POS")
    .eq("custody_status", "AWAITING") // guard transisi (anti double-receive)
    .select("id")
    .maybeSingle();
  return Boolean(data);
}

/** Operator menyerahkan barang ke pemilik: IN_CUSTODY → RELEASED. */
export async function releaseFoundItem(foundId: string): Promise<boolean> {
  const { data } = await supabaseAdmin()
    .from("found_reports")
    .update({
      custody_status: "RELEASED",
      released_at: new Date().toISOString(),
    })
    .eq("id", foundId)
    .eq("custody_status", "IN_CUSTODY") // guard transisi
    .select("id")
    .maybeSingle();
  return Boolean(data);
}
