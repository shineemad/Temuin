import { PublicHeader } from "@/components/public-header";
import { Skeleton } from "@/components/ui";

export default function BarangLoading() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />
      <main className="mx-auto max-w-4xl px-4 py-8" aria-busy="true">
        <Skeleton className="h-5 w-40" />
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          <Skeleton className="aspect-[4/3]" />
          <div className="space-y-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-24" />
          </div>
        </div>
      </main>
    </div>
  );
}
