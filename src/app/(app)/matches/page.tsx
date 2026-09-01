import type { Metadata } from "next";
import { Clock, MapPin, Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getMatchesForUser } from "@/lib/matches";
import { categoryLabel } from "@/lib/constants";
import { formatDate, truncate } from "@/lib/utils";
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  MatchLevelBadge,
  PageHeader,
  ScoreRing,
} from "@/components/ui";
import type { MatchComponent } from "@/lib/types";

export const metadata: Metadata = { title: "My Matches" };

function componentDetail(
  components: MatchComponent[],
  key: string,
): string | null {
  const c = components.find((x) => x.key === key);
  return c?.available && c.score !== null ? c.detail : null;
}

export default async function MatchesPage() {
  const user = await requireUser();
  const items = await getMatchesForUser(user.id);

  return (
    <div className="space-y-6 animate-fade-up">
      <PageHeader
        title="My Matches"
        description="Kandidat kecocokan yang ditemukan Temuin Matching Engine untuk laporan Anda."
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="size-6" />}
          title="Belum ada potential match"
          description="Setiap laporan baru otomatis dibandingkan dengan laporan lain. Anda akan menerima notifikasi begitu ada kandidat yang cocok."
          action={
            <ButtonLink href="/report/lost">Laporkan Barang Hilang</ButtonLink>
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map(({ match, lost, found, role }) => {
            const myItem = role === "owner" ? lost : found;
            const loc = componentDetail(match.explanation, "location");
            const time = componentDetail(match.explanation, "time");
            return (
              <Card key={match.id} className="p-5">
                <div className="flex items-start gap-4">
                  <ScoreRing
                    score={match.final_score}
                    size={76}
                    strokeWidth={7}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <MatchLevelBadge level={match.match_level} />
                      <Badge className="bg-slate-100 text-slate-500 ring-slate-200">
                        {role === "owner" ? "Anda pemilik" : "Anda penemu"}
                      </Badge>
                    </div>
                    <h3 className="mt-1.5 font-bold text-slate-900">
                      {truncate(myItem.item_name, 44)}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {categoryLabel(myItem.category)} • laporan Anda,{" "}
                      {formatDate(
                        role === "owner" ? lost.lost_date : found.found_date,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3.5">
                  {loc && (
                    <p className="flex items-center gap-2 text-xs text-slate-500">
                      <MapPin className="size-3.5 shrink-0 text-slate-400" />{" "}
                      {loc}
                    </p>
                  )}
                  {time && (
                    <p className="flex items-center gap-2 text-xs text-slate-500">
                      <Clock className="size-3.5 shrink-0 text-slate-400" />{" "}
                      {time}
                    </p>
                  )}
                </div>

                <div className="mt-4">
                  <ButtonLink
                    href={`/matches/${match.id}`}
                    variant="primary"
                    size="sm"
                    className="w-full"
                  >
                    Lihat Kecocokan
                  </ButtonLink>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
