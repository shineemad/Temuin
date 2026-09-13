// Query & serializer untuk feed publik. Field sensitif (private_verification_info,
// koordinat presisi, user_id) TIDAK pernah ikut ke sini.

import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  FoundReport,
  LostReport,
  PublicReport,
  ReportStatus,
  ReportType,
} from "@/lib/types";

// Hanya status ini yang boleh tampil di feed publik.
const PUBLIC_STATUSES: ReportStatus[] = ["ACTIVE", "MATCH_FOUND", "CLAIMED"];

const PUBLIC_COLUMNS =
  "id, item_name, category, color, brand, description, location_name, image_url, status, created_at";

type LostRow = Pick<
  LostReport,
  | "id"
  | "item_name"
  | "category"
  | "color"
  | "brand"
  | "description"
  | "location_name"
  | "image_url"
  | "status"
  | "created_at"
> & { lost_date: string };

type FoundRow = Pick<
  FoundReport,
  | "id"
  | "item_name"
  | "category"
  | "color"
  | "brand"
  | "description"
  | "location_name"
  | "image_url"
  | "status"
  | "created_at"
> & { found_date: string; pos_id: string | null };

function toPublic(
  row: LostRow | FoundRow,
  type: ReportType,
  posName: string | null,
): PublicReport {
  return {
    id: row.id,
    type,
    item_name: row.item_name,
    category: row.category,
    color: row.color,
    brand: row.brand,
    description: row.description,
    location_name: row.location_name,
    date:
      type === "LOST"
        ? (row as LostRow).lost_date
        : (row as FoundRow).found_date,
    has_image: Boolean(row.image_url),
    status: row.status,
    pos_name: posName,
    created_at: row.created_at,
  };
}

export interface PublicSearchFilters {
  q?: string;
  type?: ReportType | "ALL";
  category?: string;
  limit?: number;
}

export async function searchPublicReports(
  filters: PublicSearchFilters = {},
): Promise<PublicReport[]> {
  try {
    const db = supabaseAdmin();
    const limit = Math.min(filters.limit ?? 40, 100);
    const wantLost = filters.type !== "FOUND";
    const wantFound = filters.type !== "LOST";

    async function run(type: ReportType): Promise<PublicReport[]> {
      const table = type === "LOST" ? "lost_reports" : "found_reports";
      const dateCol = type === "LOST" ? "lost_date" : "found_date";
      let query = db
        .from(table)
        .select(
          `${PUBLIC_COLUMNS}, ${dateCol}${type === "FOUND" ? ", pos_id" : ""}`,
        )
        .in("status", PUBLIC_STATUSES)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (filters.category) query = query.eq("category", filters.category);
      if (filters.q) {
        const term = `%${filters.q}%`;
        query = query.or(
          `item_name.ilike.${term},description.ilike.${term},location_name.ilike.${term}`,
        );
      }
      const { data } = await query;
      const rows = (data ?? []) as unknown as Array<LostRow | FoundRow>;
      return rows.map((r) => toPublic(r, type, null));
    }

    const results = await Promise.all([
      wantLost ? run("LOST") : Promise.resolve([]),
      wantFound ? run("FOUND") : Promise.resolve([]),
    ]);
    return results
      .flat()
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, limit);
  } catch (err) {
    console.error("[public-reports] searchPublicReports gagal:", err);
    return [];
  }
}

export async function getPublicFeed(limit = 8): Promise<PublicReport[]> {
  return searchPublicReports({ type: "ALL", limit });
}

export async function getPublicReport(
  id: string,
): Promise<PublicReport | null> {
  try {
    const db = supabaseAdmin();
    const [{ data: lost }, { data: found }] = await Promise.all([
      db
        .from("lost_reports")
        .select(`${PUBLIC_COLUMNS}, lost_date`)
        .eq("id", id)
        .in("status", PUBLIC_STATUSES)
        .maybeSingle(),
      db
        .from("found_reports")
        .select(`${PUBLIC_COLUMNS}, found_date, pos_id`)
        .eq("id", id)
        .in("status", PUBLIC_STATUSES)
        .maybeSingle(),
    ]);
    if (lost) return toPublic(lost as unknown as LostRow, "LOST", null);
    if (found) {
      const row = found as unknown as FoundRow;
      let posName: string | null = null;
      if (row.pos_id) {
        const { data: pos } = await db
          .from("pos")
          .select("name")
          .eq("id", row.pos_id)
          .maybeSingle();
        posName = (pos as { name: string } | null)?.name ?? null;
      }
      return toPublic(row, "FOUND", posName);
    }
    return null;
  } catch (err) {
    console.error("[public-reports] getPublicReport gagal:", err);
    return null;
  }
}

/** Cek apakah sebuah laporan boleh tampil publik (untuk endpoint gambar publik). */
export async function isPubliclyVisible(
  type: ReportType,
  id: string,
): Promise<boolean> {
  try {
    const table = type === "LOST" ? "lost_reports" : "found_reports";
    const { data } = await supabaseAdmin()
      .from(table)
      .select("status")
      .eq("id", id)
      .maybeSingle();
    const status = (data as { status: ReportStatus } | null)?.status;
    return status ? PUBLIC_STATUSES.includes(status) : false;
  } catch {
    return false;
  }
}
