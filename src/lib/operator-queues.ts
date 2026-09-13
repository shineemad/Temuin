// Data untuk konsol operator /pos: tiga antrean (terima, verifikasi, serah terima).
import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  Claim,
  ClaimVerification,
  FoundReport,
  LostReport,
  Match,
  Pos,
} from "@/lib/types";

export interface AwaitingItem {
  found: FoundReport;
  pos: Pos | null;
}

export interface VerifyItem {
  claim: Claim;
  lost: LostReport;
  found: FoundReport;
  verification: ClaimVerification | null;
}

export interface HandoverItem {
  claim: Claim;
  lost: LostReport;
  found: FoundReport;
  pos: Pos | null;
}

export interface OperatorQueues {
  awaiting: AwaitingItem[];
  verify: VerifyItem[];
  handover: HandoverItem[];
}

async function loadReports(
  match: Match,
): Promise<{ lost: LostReport; found: FoundReport } | null> {
  const db = supabaseAdmin();
  const [{ data: lost }, { data: found }] = await Promise.all([
    db
      .from("lost_reports")
      .select("*")
      .eq("id", match.lost_report_id)
      .maybeSingle(),
    db
      .from("found_reports")
      .select("*")
      .eq("id", match.found_report_id)
      .maybeSingle(),
  ]);
  if (!lost || !found) return null;
  return { lost: lost as LostReport, found: found as FoundReport };
}

async function bundleClaim(
  claim: Claim,
  withVerification: boolean,
): Promise<{
  lost: LostReport;
  found: FoundReport;
  verification: ClaimVerification | null;
} | null> {
  const db = supabaseAdmin();
  const { data: matchRaw } = await db
    .from("matches")
    .select("*")
    .eq("id", claim.match_id)
    .maybeSingle();
  if (!matchRaw) return null;
  const reports = await loadReports(matchRaw as Match);
  if (!reports) return null;
  let verification: ClaimVerification | null = null;
  if (withVerification) {
    const { data: ver } = await db
      .from("claim_verifications")
      .select("*")
      .eq("claim_id", claim.id)
      .maybeSingle();
    verification = (ver as ClaimVerification | null) ?? null;
  }
  return { ...reports, verification };
}

export async function getOperatorQueues(): Promise<OperatorQueues> {
  try {
    const db = supabaseAdmin();
    const [
      { data: posRaw },
      { data: awaitingRaw },
      { data: vRaw },
      { data: hRaw },
    ] = await Promise.all([
      db.from("pos").select("*"),
      db
        .from("found_reports")
        .select("*")
        .eq("holding", "POS")
        .eq("custody_status", "AWAITING")
        .order("created_at", { ascending: true }),
      db
        .from("claims")
        .select("*")
        .eq("status", "UNDER_VERIFICATION")
        .order("updated_at", { ascending: true }),
      db
        .from("claims")
        .select("*")
        .eq("status", "APPROVED")
        .order("reviewed_at", { ascending: true }),
    ]);

    const posList = (posRaw ?? []) as Pos[];
    const posById = new Map(posList.map((p) => [p.id, p]));

    const awaiting: AwaitingItem[] = ((awaitingRaw ?? []) as FoundReport[]).map(
      (found) => ({
        found,
        pos: found.pos_id ? (posById.get(found.pos_id) ?? null) : null,
      }),
    );

    const vClaims = (vRaw ?? []) as Claim[];
    const verifyBundles = await Promise.all(
      vClaims.map((c) => bundleClaim(c, true)),
    );
    const verify: VerifyItem[] = [];
    vClaims.forEach((claim, i) => {
      const b = verifyBundles[i];
      if (b)
        verify.push({
          claim,
          lost: b.lost,
          found: b.found,
          verification: b.verification,
        });
    });

    const hClaims = (hRaw ?? []) as Claim[];
    const handoverBundles = await Promise.all(
      hClaims.map((c) => bundleClaim(c, false)),
    );
    const handover: HandoverItem[] = [];
    hClaims.forEach((claim, i) => {
      const b = handoverBundles[i];
      if (b)
        handover.push({
          claim,
          lost: b.lost,
          found: b.found,
          pos: b.found.pos_id ? (posById.get(b.found.pos_id) ?? null) : null,
        });
    });

    return { awaiting, verify, handover };
  } catch (err) {
    console.error("[operator-queues] gagal:", err);
    return { awaiting: [], verify: [], handover: [] };
  }
}
