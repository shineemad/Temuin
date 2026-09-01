import { supabaseAdmin } from "@/lib/supabase/admin";
import type {
  AiAnalysis,
  FoundReport,
  LostReport,
  ReportStatus,
  ReportType,
  StatusHistory,
} from "@/lib/types";

export function reportTable(
  type: ReportType,
): "lost_reports" | "found_reports" {
  return type === "LOST" ? "lost_reports" : "found_reports";
}

export function reportFkColumn(
  type: ReportType,
): "lost_report_id" | "found_report_id" {
  return type === "LOST" ? "lost_report_id" : "found_report_id";
}

export async function getLostReport(id: string): Promise<LostReport | null> {
  const { data } = await supabaseAdmin()
    .from("lost_reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as LostReport | null) ?? null;
}

export async function getFoundReport(id: string): Promise<FoundReport | null> {
  const { data } = await supabaseAdmin()
    .from("found_reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as FoundReport | null) ?? null;
}

export async function getAnalysis(
  type: ReportType,
  reportId: string,
): Promise<AiAnalysis | null> {
  const { data } = await supabaseAdmin()
    .from("ai_analysis")
    .select("*")
    .eq(reportFkColumn(type), reportId)
    .maybeSingle();
  return (data as AiAnalysis | null) ?? null;
}

export async function addStatusHistory(
  type: ReportType,
  reportId: string,
  status: ReportStatus,
  note?: string,
): Promise<void> {
  await supabaseAdmin()
    .from("report_status_history")
    .insert({ [reportFkColumn(type)]: reportId, status, note: note ?? null });
}

/** Update status laporan + catat riwayat. Tidak menurunkan status final (RETURNED/CLOSED). */
export async function setReportStatus(
  type: ReportType,
  reportId: string,
  status: ReportStatus,
  note?: string,
): Promise<void> {
  const db = supabaseAdmin();
  const { data } = await db
    .from(reportTable(type))
    .select("status")
    .eq("id", reportId)
    .maybeSingle();
  const current = (data?.status ?? null) as ReportStatus | null;
  if (!current || current === status) return;
  if (current === "RETURNED" || current === "CLOSED") return;
  await db.from(reportTable(type)).update({ status }).eq("id", reportId);
  await addStatusHistory(type, reportId, status, note);
}

export async function getStatusHistory(
  type: ReportType,
  reportId: string,
): Promise<StatusHistory[]> {
  const { data } = await supabaseAdmin()
    .from("report_status_history")
    .select("*")
    .eq(reportFkColumn(type), reportId)
    .order("created_at", { ascending: true });
  return (data as StatusHistory[] | null) ?? [];
}
