import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getClaimsForUser } from "@/lib/claims";
import { categoryLabel } from "@/lib/constants";
import { formatDate, truncate } from "@/lib/utils";
import {
  Badge,
  Card,
  ClaimStatusBadge,
  EmptyState,
  PageHeader,
} from "@/components/ui";

export const metadata: Metadata = { title: "Klaim" };

export default async function KlaimPage() {
  const user = await requireUser();
  const items = await getClaimsForUser(user.id);

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Klaim"
        description="Klaim kepemilikan yang kamu ajukan atas barang temuan."
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="size-6" />}
          title="Belum ada klaim"
          description="Klaim muncul di sini saat kamu mengajukan kepemilikan atas sebuah kecocokan."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map(({ claim, lost, found, role }) => (
            <Link
              key={claim.id}
              href={`/klaim/${claim.id}`}
              className="group block"
            >
              <Card className="h-full p-5 transition-all duration-200 group-hover:shadow-lift group-hover:ring-brand-200">
                <div className="flex items-start justify-between gap-2">
                  <Badge
                    className={
                      role === "claimant"
                        ? "bg-brand-50 text-brand-700 ring-brand-200"
                        : "bg-amber-50 text-amber-700 ring-amber-200"
                    }
                  >
                    {role === "claimant" ? "Klaim Saya" : "Barang Temuan Saya"}
                  </Badge>
                  <ClaimStatusBadge status={claim.status} />
                </div>
                <h3 className="mt-3 font-bold text-slate-900 group-hover:text-brand-700">
                  {truncate(
                    role === "claimant" ? lost.item_name : found.item_name,
                    56,
                  )}
                </h3>
                <p className="mt-0.5 text-xs text-slate-400">
                  {categoryLabel(lost.category)} • diajukan{" "}
                  {formatDate(claim.created_at)}
                </p>
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs font-semibold text-slate-500">
                    {claim.verification_score !== null
                      ? `Skor verifikasi: ${Math.round(Number(claim.verification_score))}%`
                      : "Verifikasi belum diisi"}
                  </span>
                  <span className="text-xs font-medium text-slate-400 transition group-hover:text-brand-600">
                    Detail →
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
