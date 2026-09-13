import { Skeleton } from "@/components/ui";

export default function AppLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Memuat halaman">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-64" />
      <span className="sr-only">Memuat…</span>
    </div>
  );
}
