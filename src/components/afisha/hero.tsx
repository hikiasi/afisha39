"use client";

/**
 * Hero-секция: редакционная вёрстка с дисплейной антиквой,
 * поисковой строкой и живой статистикой каталога (GET /api/stats).
 */

import { useQuery } from "@tanstack/react-query";
import { ArrowDown, MapPin, Search, Sparkles, Ticket, Waves } from "lucide-react";
import { useCatalog } from "./store";
import { Skeleton } from "@/components/ui/skeleton";

interface Stats {
  upcoming: number;
  free: number;
  today: number;
  thisWeek: number;
  venues: number;
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-2xl font-semibold tabular-nums text-foreground">{value}</span>
      <span className="text-[13px] leading-tight text-muted-foreground">{label}</span>
    </div>
  );
}

export function Hero() {
  const setQuery = useCatalog((s) => s.setQuery);
  const { data, isLoading } = useQuery<Stats>({
    queryKey: ["stats"],
    queryFn: async () => {
      const res = await fetch("/api/stats");
      if (!res.ok) throw new Error("Не удалось загрузить статистику");
      return res.json();
    },
  });

  return (
    <section className="relative overflow-hidden border-b border-border/70" aria-label="Главный экран">
      {/* Декоративное янтарное свечение */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-40 size-[480px] rounded-full opacity-70 blur-3xl"
        style={{ background: "radial-gradient(closest-side, #fde68a 0%, rgba(253,230,138,0) 72%)" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-40 top-40 size-[380px] rounded-full opacity-50 blur-3xl"
        style={{ background: "radial-gradient(closest-side, #99f6e4 0%, rgba(153,246,228,0) 72%)" }}
      />

      <div className="relative mx-auto max-w-6xl px-4 pb-12 pt-14 sm:px-6 sm:pb-16 sm:pt-20">
        <div className="grid items-end gap-10 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[13px] font-medium text-muted-foreground shadow-card">
              <MapPin className="size-3.5 text-primary" aria-hidden />
              Калининград · справочник событий
            </p>

            <h1 className="font-display text-[clamp(2.2rem,5.5vw,4rem)] font-semibold leading-[1.06] text-balance">
              Куда сходить
              <br />
              в Калининграде<span className="text-primary">?</span>
            </h1>

            <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground sm:text-base">
              Концерты в кирхе королевы Луизы, спектакли драмтеатра, выставки
              Музея янтаря, стендап и экскурсии — реальные события города
              с актуальными датами и ссылками на билеты.
            </p>

            {/* Поисковая строка */}
            <form
              className="mt-8 flex max-w-xl items-center gap-2"
              role="search"
              onSubmit={(e) => e.preventDefault()}
            >
              <label htmlFor="hero-search" className="sr-only">
                Поиск по событиям, площадкам и местам
              </label>
              <div className="relative flex-1">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 size-4.5 -translate-y-1/2 text-muted-foreground"
                  aria-hidden
                />
                <input
                  id="hero-search"
                  type="search"
                  placeholder="Спектакль, музей, экскурсия…"
                  onChange={(e) => setQuery(e.target.value)}
                  className="h-12 w-full rounded-xl border border-border bg-card pl-11 pr-4 text-[15px] shadow-card outline-none transition-[box-shadow,border-color] duration-200 placeholder:text-muted-foreground/70 focus:border-primary focus:ring-4 focus:ring-primary/15"
                />
              </div>
              <a
                href="#catalog"
                className="press inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-card transition-colors duration-200 hover:bg-primary/90"
              >
                <Ticket className="size-4" aria-hidden />
                Каталог
              </a>
            </form>
          </div>

          {/* Живая статистика из REST API */}
          <aside
            className="rounded-2xl border border-border bg-card/80 p-6 shadow-card backdrop-blur-sm"
            aria-label="Статистика каталога"
          >
            <div className="mb-5 flex items-center gap-2 text-[13px] font-medium uppercase tracking-wide text-muted-foreground">
              <Sparkles className="size-4 text-primary" aria-hidden />
              Сейчас в афише
            </div>
            {isLoading ? (
              <div className="grid grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-8 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-6">
                <Stat value={data?.upcoming ?? 0} label="предстоящих событий" />
                <Stat value={data?.free ?? 0} label="со свободным входом" />
                <Stat value={data?.thisWeek ?? 0} label="на этой неделе" />
                <Stat value={data?.venues ?? 0} label="площадок города" />
              </div>
            )}
            <div className="mt-6 flex items-center gap-2 border-t border-border/70 pt-4 text-[13px] text-muted-foreground">
              <Waves className="size-4 text-teal-700" aria-hidden />
              События: klops.ru · данные — REST API приложения
            </div>
          </aside>
        </div>

        <a
          href="#catalog"
          className="mt-12 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowDown className="size-4 animate-bounce" aria-hidden />
          Листайте к каталогу событий
        </a>
      </div>
    </section>
  );
}
