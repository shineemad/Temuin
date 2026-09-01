import { supabaseAdmin } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import type { FoundReport, LostReport, Match } from "@/lib/types";

export type MatchRole = "owner" | "finder" | "admin";

export interface MatchContext {
  match: Match;
  lost: LostReport;
  found: FoundReport;
  role: MatchRole;
}

/** Ambil match + kedua laporan, dengan authorization berbasis peran. */
export async function getMatchForUser(
  matchId: string,
  userId: string,
): Promise<MatchContext | null> {
  const db = supabaseAdmin();
  const { data: matchRaw } = await db
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .maybeSingle();
  if (!matchRaw) return null;
  const match = matchRaw as Match;

  const [{ data: lostRaw }, { data: foundRaw }] = await Promise.all([
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
  if (!lostRaw || !foundRaw) return null;
  const lost = lostRaw as LostReport;
  const found = foundRaw as FoundReport;

  let role: MatchRole | null = null;
  if (lost.user_id === userId) role = "owner";
  else if (found.user_id === userId) role = "finder";
  else {
    const profile = await getProfile(userId);
    if (profile?.role === "admin") role = "admin";
  }
  if (!role) return null;

  return { match, lost, found, role };
}

/** Semua match yang melibatkan laporan milik user. */
export async function getMatchesForUser(userId: string): Promise<
  Array<{
    match: Match;
    lost: LostReport;
    found: FoundReport;
    role: "owner" | "finder";
  }>
> {
  const db = supabaseAdmin();
  const [{ data: lostIdsRaw }, { data: foundIdsRaw }] = await Promise.all([
    db.from("lost_reports").select("id").eq("user_id", userId),
    db.from("found_reports").select("id").eq("user_id", userId),
  ]);
  const lostIds = ((lostIdsRaw ?? []) as Array<{ id: string }>).map(
    (r) => r.id,
  );
  const foundIds = ((foundIdsRaw ?? []) as Array<{ id: string }>).map(
    (r) => r.id,
  );
  if (lostIds.length === 0 && foundIds.length === 0) return [];

  const orParts: string[] = [];
  if (lostIds.length > 0)
    orParts.push(`lost_report_id.in.(${lostIds.join(",")})`);
  if (foundIds.length > 0)
    orParts.push(`found_report_id.in.(${foundIds.join(",")})`);

  const { data: matchesRaw } = await db
    .from("matches")
    .select("*")
    .or(orParts.join(","))
    .order("final_score", { ascending: false });
  const matches = (matchesRaw ?? []) as Match[];
  if (matches.length === 0) return [];

  const allLostIds = Array.from(new Set(matches.map((m) => m.lost_report_id)));
  const allFoundIds = Array.from(
    new Set(matches.map((m) => m.found_report_id)),
  );
  const [{ data: lostRaw }, { data: foundRaw }] = await Promise.all([
    db.from("lost_reports").select("*").in("id", allLostIds),
    db.from("found_reports").select("*").in("id", allFoundIds),
  ]);
  const lostById = new Map(
    ((lostRaw ?? []) as LostReport[]).map((r) => [r.id, r]),
  );
  const foundById = new Map(
    ((foundRaw ?? []) as FoundReport[]).map((r) => [r.id, r]),
  );

  const result: Array<{
    match: Match;
    lost: LostReport;
    found: FoundReport;
    role: "owner" | "finder";
  }> = [];
  for (const match of matches) {
    const lost = lostById.get(match.lost_report_id);
    const found = foundById.get(match.found_report_id);
    if (!lost || !found) continue;
    result.push({
      match,
      lost,
      found,
      role: lost.user_id === userId ? "owner" : "finder",
    });
  }
  return result;
}
