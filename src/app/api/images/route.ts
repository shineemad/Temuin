import { NextResponse, type NextRequest } from "next/server";
import { getProfile, getSessionUser } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getFoundReport, getLostReport } from "@/lib/reports";
import { STORAGE_BUCKET } from "@/lib/constants";

/**
 * Serve foto laporan dari bucket PRIVAT via signed URL.
 * Diizinkan untuk: pemilik laporan, pemilik laporan lawan pada match
 * yang melibatkan laporan ini, dan admin.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const type = request.nextUrl.searchParams.get("type");
  const id = request.nextUrl.searchParams.get("id");
  if ((type !== "lost" && type !== "found") || !id) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const report =
    type === "lost" ? await getLostReport(id) : await getFoundReport(id);
  if (!report?.image_url) return new NextResponse("Not found", { status: 404 });

  let authorized = report.user_id === user.id;

  if (!authorized) {
    const db = supabaseAdmin();
    const col = type === "lost" ? "lost_report_id" : "found_report_id";
    const { data: matches } = await db
      .from("matches")
      .select("lost_report_id, found_report_id")
      .eq(col, id);
    const counterpartIds = (
      (matches ?? []) as Array<{
        lost_report_id: string;
        found_report_id: string;
      }>
    ).map((m) => (type === "lost" ? m.found_report_id : m.lost_report_id));

    if (counterpartIds.length > 0) {
      const otherTable = type === "lost" ? "found_reports" : "lost_reports";
      const { count } = await db
        .from(otherTable)
        .select("id", { count: "exact", head: true })
        .in("id", counterpartIds)
        .eq("user_id", user.id);
      authorized = (count ?? 0) > 0;
    }
  }

  if (!authorized) {
    const profile = await getProfile(user.id);
    authorized = profile?.role === "admin";
  }

  if (!authorized) return new NextResponse("Forbidden", { status: 403 });

  const { data } = await supabaseAdmin()
    .storage.from(STORAGE_BUCKET)
    .createSignedUrl(report.image_url, 300);
  if (!data?.signedUrl) return new NextResponse("Not found", { status: 404 });

  return NextResponse.redirect(data.signedUrl);
}
