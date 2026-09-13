import type { Metadata } from "next";
import {
  Check,
  HelpCircle,
  Inbox,
  Minus,
  PackageCheck,
  PackageSearch,
  ShieldCheck,
  X,
} from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { getOperatorQueues } from "@/lib/operator-queues";
import { verificationRecommendation } from "@/lib/verification";
import { categoryLabel } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { VerificationCheck } from "@/lib/types";
import { Card, EmptyState, PageHeader, ScoreRing } from "@/components/ui";
import {
  DecideClaimForm,
  HandoverButton,
  ReceiveButton,
} from "@/components/operator-panels";

export const metadata: Metadata = { title: "Konsol Pos" };

function verdictBadge(verdict: VerificationCheck["verdict"]) {
  const map = {
    match: {
      icon: Check,
      cls: "bg-emerald-50 text-emerald-700 ring-emerald-200",
      label: "Cocok",
    },
    partial: {
      icon: HelpCircle,
      cls: "bg-amber-50 text-amber-700 ring-amber-200",
      label: "Sebagian",
    },
    no_match: {
      icon: X,
      cls: "bg-rose-50 text-rose-700 ring-rose-200",
      label: "Tidak cocok",
    },
    unknown: {
      icon: Minus,
      cls: "bg-slate-100 text-slate-500 ring-slate-200",
      label: "Tak cukup data",
    },
  } as const;
  const m = map[verdict];
  const Icon = m.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${m.cls}`}
    >
      <Icon className="size-3" />
      {m.label}
    </span>
  );
}

export default async function PosPage() {
  await requireAdmin();
  const { awaiting, verify, handover } = await getOperatorQueues();

  return (
    <div className="space-y-8 animate-fade-up">
      <PageHeader
        title="Konsol Pos"
        description="Terima barang, tinjau klaim dibantu AI, dan konfirmasi serah terima."
      />

      {/* ===== TERIMA ===== */}
      <section>
        <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-bold tracking-wide text-slate-900 uppercase">
          <Inbox className="size-4 text-brand-600" />
          Menunggu diterima ({awaiting.length})
        </h2>
        {awaiting.length === 0 ? (
          <EmptyState
            title="Tidak ada barang menunggu"
            description="Barang temuan yang dititipkan ke pos akan muncul di sini."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {awaiting.map(({ found, pos }) => (
              <Card
                key={found.id}
                className="flex items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    {found.item_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {categoryLabel(found.category)} •{" "}
                    {formatDate(found.found_date)}
                    {pos ? ` • ${pos.name}` : ""}
                  </p>
                </div>
                <ReceiveButton foundId={found.id} />
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* ===== VERIFIKASI (co-pilot) ===== */}
      <section>
        <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-bold tracking-wide text-slate-900 uppercase">
          <ShieldCheck className="size-4 text-brand-600" />
          Klaim menunggu keputusan ({verify.length})
        </h2>
        {verify.length === 0 ? (
          <EmptyState
            title="Tidak ada klaim menunggu"
            description="Klaim yang sudah diverifikasi pengklaim akan muncul di sini untuk kamu putuskan."
          />
        ) : (
          <div className="space-y-4">
            {verify.map(({ claim, lost, found, verification }) => {
              const score =
                verification?.score ?? claim.verification_score ?? 0;
              const rec = verificationRecommendation(Number(score));
              return (
                <Card key={claim.id} className="p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-slate-400">
                        Klaim atas
                      </p>
                      <h3 className="font-display text-lg font-bold text-slate-900">
                        {found.item_name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {categoryLabel(found.category)} • pelapor hilang: “
                        {lost.item_name}”
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <ScoreRing score={Math.round(Number(score))} size={64} />
                      <span
                        className={`rounded-lg px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${rec.className}`}
                      >
                        {rec.label}
                      </span>
                    </div>
                  </div>

                  {/* Co-pilot: analisis AI per jawaban */}
                  <div className="mt-4 rounded-xl bg-slate-50 p-4">
                    <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
                      <ShieldCheck className="size-3.5 text-brand-500" />
                      Analisis AI — kamu yang memutuskan
                    </p>
                    <div className="space-y-3">
                      {(verification?.checks ?? []).map((c) => (
                        <div
                          key={c.key}
                          className="border-t border-slate-200/70 pt-3 first:border-t-0 first:pt-0"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-800">
                              {c.label}
                            </p>
                            {verdictBadge(c.verdict)}
                          </div>
                          <p className="mt-1 text-sm text-slate-600">
                            <span className="text-slate-400">Jawaban: </span>
                            {verification?.answers?.[c.key] || "—"}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500 italic">
                            {c.note}
                          </p>
                        </div>
                      ))}
                    </div>
                    <details className="mt-3">
                      <summary className="cursor-pointer text-xs font-medium text-slate-400 hover:text-slate-600">
                        Lihat info verifikasi rahasia penemu
                      </summary>
                      <p className="mt-2 rounded-lg bg-white p-3 text-sm text-slate-700 ring-1 ring-slate-200">
                        {found.private_verification_info}
                      </p>
                    </details>
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    <ShieldCheck className="mr-1 inline size-3" />
                    {rec.hint}
                  </p>

                  <DecideClaimForm claimId={claim.id} />
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* ===== SERAH TERIMA ===== */}
      <section>
        <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-bold tracking-wide text-slate-900 uppercase">
          <PackageCheck className="size-4 text-brand-600" />
          Siap diserahkan ({handover.length})
        </h2>
        {handover.length === 0 ? (
          <EmptyState
            title="Tidak ada yang siap diserahkan"
            description="Klaim yang sudah kamu setujui menunggu pengambilan akan muncul di sini."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {handover.map(({ claim, lost, pos }) => (
              <Card
                key={claim.id}
                className="flex items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">
                    <PackageSearch className="mr-1 inline size-4 text-slate-400" />
                    {lost.item_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    Disetujui • ambil di {pos ? pos.name : "pos"}
                  </p>
                </div>
                <HandoverButton claimId={claim.id} />
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
