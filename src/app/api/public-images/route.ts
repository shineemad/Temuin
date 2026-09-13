import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getFoundReport, getLostReport } from "@/lib/reports";
import { isPubliclyVisible } from "@/lib/public-reports";
import { STORAGE_BUCKET } from "@/lib/constants";

/**
 * Serve foto laporan untuk feed PUBLIK via signed URL.
 * Hanya untuk laporan yang statusnya boleh tampil publik. Foto barang memang
 * dimaksudkan terlihat agar pemilik mengenali barangnya; gerbang kepemilikan
 * ada di verifikasi + operator, bukan di visibilitas foto.
 */
export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const id = request.nextUrl.searchParams.get("id");
  if ((type !== "lost" && type !== "found") || !id) {
    return new NextResponse("Bad request", { status: 400 });
  }

  const reportType = type === "lost" ? "LOST" : "FOUND";
  if (!(await isPubliclyVisible(reportType, id))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const report =
    type === "lost" ? await getLostReport(id) : await getFoundReport(id);
  if (!report?.image_url) return new NextResponse("Not found", { status: 404 });

  const { data } = await supabaseAdmin()
    .storage.from(STORAGE_BUCKET)
    .createSignedUrl(report.image_url, 300);
  if (!data?.signedUrl) return new NextResponse("Not found", { status: 404 });

  return NextResponse.redirect(data.signedUrl);
}
