"use client";

/**
 * Секция «Площадки»: справочник городских площадок из GET /api/venues
 * с числом предстоящих событий и цветными метками категорий.
 */

import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { CategoryIcon } from "./category-icon";
import { Skeleton } from "@/components/ui/skeleton";

interface VenueItem {
  id: string;
  name: string;
  shortName: string;
  address: string;
  district: string;
  description: string;
  eventsCount: number;
  categories: string[];
}

const CATEGORY_COLORS: Record<string, string> = {
  concerts: "#BE123C",
  theatre: "#9A3412",
  exhibitions: "#0F766E",
  festivals: "#A21CAF",
  kids: "#0369A1",
  sports: "#15803D",
  humor: "#7C3AED",
  education: "#44403C",
  citywalks: "#0E7490",
};

const CATEGORY_NAMES: Record<string, string> = {
  concerts: "Музыка",
  theatre: "Театр",
  exhibitions: "Выставки",
  festivals: "Фестивали",
  kids: "Детям",
  sports: "Спорт",
  humor: "Юмор",
  education: "Лекции и встречи",
  citywalks: "Экскурсии",
};

export function VenuesSection() {
  const { data, isLoading } = useQuery<{ items: VenueItem[] }>({
    queryKey: ["venues"],
    queryFn: async () => {
      const res = await fetch("/api/venues");
      if (!res.ok) throw new Error("Ошибка загрузки площадок");
      return res.json();
    },
  });

  const venues = [...(data?.items ?? [])].sort((a, b) => b.eventsCount - a.eventsCount);

  return (
    <section id="venues" className="scroll-mt-20 border-y border-border/70 bg-secondary/40" aria-label="Площадки">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">Площадки города</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          От исторической кирхи и сцены драмтеатра до клубов и музеев — события
          проходят на {data ? venues.length : "десятках"} площадках Калининграда и области.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-5 shadow-card">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="mt-2 h-4 w-1/2" />
                  <Skeleton className="mt-4 h-12 w-full" />
                </div>
              ))
            : venues.map((v) => (
                <article
                  key={v.id}
                  className="lift reveal is-visible rounded-2xl border border-border/70 bg-card p-5 shadow-card"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-[15px] font-semibold leading-snug">{v.shortName}</h3>
                    <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[13px] font-semibold tabular-nums text-accent-foreground">
                      {v.eventsCount}
                    </span>
                  </div>

                  <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <MapPin className="size-3.5 shrink-0" aria-hidden />
                    {v.address || "Адрес — в афише источника"}
                  </p>

                  {v.description && (
                    <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground/90">
                      {v.description}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {v.categories.slice(0, 5).map((c) => (
                      <span
                        key={c}
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{ background: `${CATEGORY_COLORS[c] ?? "#44403C"}18`, color: CATEGORY_COLORS[c] ?? "#44403C" }}
                      >
                        <CategoryIcon categoryId={c} className="size-3" />
                        {CATEGORY_NAMES[c] ?? c}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
        </div>
      </div>
    </section>
  );
}
