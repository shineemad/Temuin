import { supabaseAdmin } from "@/lib/supabase/admin";
import { getMatchForUser, type MatchRole } from "@/lib/matches";
import type {
  Claim,
  ClaimVerification,
  Conversation,
  FoundReport,
  LostReport,
  Match,
} from "@/lib/types";

export interface ClaimContext {
  claim: Claim;
  match: Match;
  lost: LostReport;
  found: FoundReport;
  role: MatchRole;
  isClaimant: boolean;
  isFinder: boolean;
  verification: ClaimVerification | null;
  conversation: Conversation | null;
}

export async function getClaimForUser(
  claimId: string,
  userId: string,
): Promise<ClaimContext | null> {
  const db = supabaseAdmin();
  const { data: claimRaw } = await db
    .from("claims")
    .select("*")
    .eq("id", claimId)
    .maybeSingle();
  if (!claimRaw) return null;
  const claim = claimRaw as Claim;

  const matchCtx = await getMatchForUser(claim.match_id, userId);
  if (!matchCtx) return null;

  const isClaimant = claim.claimant_id === userId;
  const isFinder = matchCtx.found.user_id === userId;
  if (!isClaimant && !isFinder && matchCtx.role !== "admin") return null;

  const [{ data: verRaw }, { data: convRaw }] = await Promise.all([
    db
      .from("claim_verifications")
      .select("*")
      .eq("claim_id", claimId)
      .maybeSingle(),
    db.from("conversations").select("*").eq("claim_id", claimId).maybeSingle(),
  ]);

  return {
    claim,
    match: matchCtx.match,
    lost: matchCtx.lost,
    found: matchCtx.found,
    role: matchCtx.role,
    isClaimant,
    isFinder,
    verification: (verRaw as ClaimVerification | null) ?? null,
    conversation: (convRaw as Conversation | null) ?? null,
  };
}

export interface ClaimListItem {
  claim: Claim;
  lost: LostReport;
  found: FoundReport;
  role: "claimant" | "finder";
}

/** Semua klaim di mana user adalah pengklaim ATAU penemu. */
export async function getClaimsForUser(
  userId: string,
): Promise<ClaimListItem[]> {
  const db = supabaseAdmin();

  // Klaim sebagai claimant.
  const { data: asClaimantRaw } = await db
    .from("claims")
    .select("*")
    .eq("claimant_id", userId)
    .order("created_at", { ascending: false });

  // Klaim atas found reports milik user.
  const { data: myFoundRaw } = await db
    .from("found_reports")
    .select("id")
    .eq("user_id", userId);
  const myFoundIds = ((myFoundRaw ?? []) as Array<{ id: string }>).map(
    (r) => r.id,
  );

  let asFinder: Claim[] = [];
  if (myFoundIds.length > 0) {
    const { data: matchesRaw } = await db
      .from("matches")
      .select("id")
      .in("found_report_id", myFoundIds);
    const matchIds = ((matchesRaw ?? []) as Array<{ id: string }>).map(
      (m) => m.id,
    );
    if (matchIds.length > 0) {
      const { data: finderClaimsRaw } = await db
        .from("claims")
        .select("*")
        .in("match_id", matchIds)
        .order("created_at", { ascending: false });
      asFinder = (finderClaimsRaw ?? []) as Claim[];
    }
  }

  const all: Array<{ claim: Claim; role: "claimant" | "finder" }> = [
    ...((asClaimantRaw ?? []) as Claim[]).map((claim) => ({
      claim,
      role: "claimant" as const,
    })),
    ...asFinder
      .filter((c) => c.claimant_id !== userId)
      .map((claim) => ({ claim, role: "finder" as const })),
  ];
  if (all.length === 0) return [];

  const matchIds = Array.from(new Set(all.map((c) => c.claim.match_id)));
  const { data: matchesRaw } = await db
    .from("matches")
    .select("*")
    .in("id", matchIds);
  const matches = (matchesRaw ?? []) as Match[];
  const matchById = new Map(matches.map((m) => [m.id, m]));

  const lostIds = Array.from(new Set(matches.map((m) => m.lost_report_id)));
  const foundIds = Array.from(new Set(matches.map((m) => m.found_report_id)));
  const [{ data: lostRaw }, { data: foundRaw }] = await Promise.all([
    lostIds.length > 0
      ? db.from("lost_reports").select("*").in("id", lostIds)
      : Promise.resolve({ data: [] }),
    foundIds.length > 0
      ? db.from("found_reports").select("*").in("id", foundIds)
      : Promise.resolve({ data: [] }),
  ]);
  const lostById = new Map(
    ((lostRaw ?? []) as LostReport[]).map((r) => [r.id, r]),
  );
  const foundById = new Map(
    ((foundRaw ?? []) as FoundReport[]).map((r) => [r.id, r]),
  );

  const result: ClaimListItem[] = [];
  for (const { claim, role } of all) {
    const match = matchById.get(claim.match_id);
    if (!match) continue;
    const lost = lostById.get(match.lost_report_id);
    const found = foundById.get(match.found_report_id);
    if (!lost || !found) continue;
    result.push({ claim, lost, found, role });
  }
  result.sort((a, b) => (a.claim.created_at < b.claim.created_at ? 1 : -1));
  return result;
}
