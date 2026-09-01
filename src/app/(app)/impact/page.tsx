import type { Metadata } from "next";
import { CheckCircle2, FileText, Percent, Sparkles } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { categoryLabel } from "@/lib/constants";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Impact" };

interface CategoryCount {
  key: string;
  label: string;
  count: number;
}

function BarRow({
  label,
  count,
  max,
  color,
}: {
  label: string;
  count: number;
  max: number;
  color: string;
}) {
  const width = max > 0 ? Math.max(4, (count / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <p className="truncate text-sm font-medium text-slate-700">{label}</p>
        <p className="shrink-0 text-xs font-bold text-slate-500">{count}</p>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default async function ImpactPage() {
  await requireUser();
  const db = supabaseAdmin();

  const [lostRes, foundRes, matchesRes] = await Promise.all([
    db.from("lost_reports").select("category, location_name, status, is_demo"),
    db.from("found_reports").select("category, location_name, status, is_demo"),
    db
      .from("matches")
      .select("id, final_score", { count: "exact", head: false }),
  ]);

  const lost = (lostRes.data ?? []) as Array<{
    category: string;
    location_name: string;
    status: string;
    is_demo: boolean;
  }>;
  const found = (foundRes.data ?? []) as Array<{
    category: string;
    location_name: string;
    status: string;
    is_demo: boolean;
  }>;
  const matches = (matchesRes.data ?? []) as Array<{
    id: string;
    final_score: number;
  }>;

  const totalReports = lost.length + found.length;
  const totalMatches = matches.length;
  const returned = lost.filter((r) => r.status === "RETURNED").length;
  const recoveryRate = lost.length > 0 ? (returned / lost.length) * 100 : 0;
  const hasDemo = [...lost, ...found].some((r) => r.is_demo);

  // Kategori paling sering hilang.
  const catCount = new Map<string, number>();
  for (const r of lost)
    catCount.set(r.category, (catCount.get(r.category) ?? 0) + 1);
  const topCategories: CategoryCount[] = [...catCount.entries()]
    .map(([key, count]) => ({ key, label: categoryLabel(key), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxCat = topCategories[0]?.count ?? 0;

  // Laporan per area (nama lokasi).
  const areaCount = new Map<string, number>();
  for (const r of [...lost, ...found]) {
    const area = r.location_name.trim();
    if (area) areaCount.set(area, (areaCount.get(area) ?? 0) + 1);
  }
  const topAreas = [...areaCount.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  const maxArea = topAreas[0]?.count ?? 0;

  const stats = [
    {
      label: "Reports",
      value: totalReports.toLocaleString("id-ID"),
      icon: <FileText className="size-5 text-brand-600" />,
      accent: "bg-brand-50",
    },
    {
      label: "AI Matches",
      value: totalMatches.toLocaleString("id-ID"),
      icon: <Sparkles className="size-5 text-violet-600" />,
      accent: "bg-violet-50",
    },
    {
      label: "Items Returned",
      value: returned.toLocaleString("id-ID"),
      icon: <CheckCircle2 className="size-5 text-emerald-600" />,
      accent: "bg-emerald-50",
    },
    {
      label: "Successful Recovery",
      value: `${recoveryRate.toFixed(1)}%`,
      icon: <Percent className="size-5 text-amber-600" />,
      accent: "bg-amber-50",
    },
  ];

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="Temuin Impact"
        description="Statistik dampak sosial platform — dihitung langsung dari data nyata di database."
      />

      {hasDemo && (
        <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">
          Sebagian data di bawah berasal dari seed/demo data (ditandai
          SAMPLE/DEMO) untuk keperluan pengembangan &amp; presentasi.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-5">
            <span
              className={`flex size-10 items-center justify-center rounded-xl ${s.accent}`}
            >
              {s.icon}
            </span>
            <p className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
              {s.value}
            </p>
            <p className="mt-0.5 text-sm font-medium text-slate-500">
              {s.label}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-bold tracking-wide text-slate-900 uppercase">
            Most Lost Categories
          </h2>
          {topCategories.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Belum ada data.
            </p>
          ) : (
            <div className="space-y-4">
              {topCategories.map((c) => (
                <BarRow
                  key={c.key}
                  label={c.label}
                  count={c.count}
                  max={maxCat}
                  color="bg-brand-500"
                />
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-bold tracking-wide text-slate-900 uppercase">
            Reports by Area
          </h2>
          {topAreas.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              Belum ada data.
            </p>
          ) : (
            <div className="space-y-4">
              {topAreas.map((a) => (
                <BarRow
                  key={a.label}
                  label={a.label}
                  count={a.count}
                  max={maxArea}
                  color="bg-violet-500"
                />
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 text-sm font-bold tracking-wide text-slate-900 uppercase">
            Lost vs Returned
          </h2>
          <div className="space-y-4">
            <BarRow
              label="Laporan kehilangan"
              count={lost.length}
              max={Math.max(lost.length, 1)}
              color="bg-slate-400"
            />
            <BarRow
              label="Berhasil kembali"
              count={returned}
              max={Math.max(lost.length, 1)}
              color="bg-emerald-500"
            />
          </div>
          <div className="mt-6 rounded-xl bg-emerald-50 p-4 text-center ring-1 ring-emerald-100">
            <p className="text-3xl font-extrabold text-emerald-700">
              {recoveryRate.toFixed(1)}%
            </p>
            <p className="mt-0.5 text-xs font-medium text-emerald-600">
              barang hilang berhasil dipertemukan kembali
            </p>
          </div>
        </Card>
      </div>

      <Card className="bg-ink-950 p-6 text-center sm:p-8">
        <p className="mx-auto max-w-xl text-lg font-semibold text-white">
          “Temuin automatically connects lost and found reports using AI while
          protecting sensitive information and verifying ownership before items
          are returned.”
        </p>
        <p className="mt-3 text-sm text-slate-400">
          TEMUIN — Yang Hilang, Bisa Ditemuin.
        </p>
      </Card>
    </div>
  );
}
