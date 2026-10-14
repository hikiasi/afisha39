"use client";

/**
 * Каталог событий.
 *
 * Данные загружаются одним запросом GET /api/events?limit=200
 * и кешируются TanStack Query; мгновенная фильтрация выполняется
 * на клиенте (тот же контракт параметров поддерживает и серверный
 * API — см. раздел «REST API» на странице проекта).
 */

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarX2, Loader2, RotateCcw } from "lucide-react";
import type { DateRange, EventsResponse, PriceFilter, SortOrder } from "@/lib/types";
import { useCatalog } from "./store";
import { EventCard } from "./event-card";
import { EventDialog } from "./event-dialog";
import { CategoryIcon } from "./category-icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

const DATE_OPTIONS: { value: DateRange | "any"; label: string }[] = [
  { value: "any", label: "Любая дата" },
  { value: "today", label: "Сегодня" },
  { value: "tomorrow", label: "Завтра" },
  { value: "weekend", label: "Выходные" },
  { value: "week", label: "Ближайшая неделя" },
  { value: "month", label: "Месяц" },
];

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: "date", label: "По дате" },
  { value: "price", label: "Сначала дешёвые" },
  { value: "price_desc", label: "Сначала дорогие" },
];

/** Русская плюрализация: 1 событие, 2 события, 5 событий, 21 событие… */
function pluralEvents(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "событие";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "события";
  return "событий";
}

interface CategoryInfo {
  id: string;
  name: string;
  color: string;
  tint: string;
  eventsCount: number;
}

function sameDay(iso: string, day: Date): boolean {
  const d = new Date(iso);
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  );
}

export function Catalog() {
  const { q, category, date, price, sort, setCategory, setDate, setPrice, setSort, reset } =
    useCatalog();
  const [selected, setSelected] = useState<EventsResponse["items"][number] | null>(null);

  const { data: categories } = useQuery<{ items: CategoryInfo[] }>({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories");
      if (!res.ok) throw new Error("Ошибка загрузки категорий");
      return res.json();
    },
  });

  const { data, isLoading, isError } = useQuery<EventsResponse>({
    queryKey: ["events", "all"],
    queryFn: async () => {
      const res = await fetch("/api/events?limit=200&sort=date");
      if (!res.ok) throw new Error("Ошибка загрузки каталога");
      return res.json();
    },
  });

  /* Мгновенная клиентская фильтрация */
  const filtered = useMemo(() => {
    const items = data?.items ?? [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = 86_400_000;
    const weekendFrom = new Date(today);
    weekendFrom.setDate(weekendFrom.getDate() + ((6 - weekendFrom.getDay() + 7) % 7));

    return items.filter((e) => {
      if (category && e.categoryId !== category) return false;

      if (price === "free" && e.price !== 0) return false;
      if (price === "paid" && e.price === 0) return false;

      if (date) {
        const starts = new Date(e.startsAt);
        if (date === "today" && !sameDay(e.startsAt, today)) return false;
        if (date === "tomorrow") {
          const tomorrow = new Date(today.getTime() + day);
          if (!sameDay(e.startsAt, tomorrow)) return false;
        }
        if (date === "weekend") {
          const inWeekend =
            (sameDay(e.startsAt, weekendFrom) ||
              sameDay(e.startsAt, new Date(weekendFrom.getTime() + day))) &&
            starts >= today;
          if (!inWeekend) return false;
        }
        if (date === "week" && starts < today) return false;
        if (date === "week" && starts.getTime() >= today.getTime() + 7 * day) return false;
        if (date === "month" && starts < today) return false;
        if (date === "month" && starts.getTime() >= today.getTime() + 31 * day) return false;
      }

      if (q.trim()) {
        const words = q.trim().toLowerCase().split(/\s+/);
        const haystack =
          `${e.title} ${e.description} ${e.venue.name} ${e.venue.shortName} ${e.venue.address} ${e.category.name}`.toLowerCase();
        if (!words.every((w) => haystack.includes(w))) return false;
      }

      return true;
    });
  }, [data, category, date, price, q]);

  const sorted = useMemo(() => {
    const items = [...filtered];
    /* События с неизвестной ценой (-1) при сортировке по цене — в конце */
    const rank = (p: number) => (p === -1 ? Number.MAX_SAFE_INTEGER : p);
    if (sort === "price") items.sort((a, b) => rank(a.price) - rank(b.price));
    else if (sort === "price_desc") items.sort((a, b) => rank(b.price) - rank(a.price));
    return items;
  }, [filtered, sort]);

  const hasFilters = q || category || date || price !== "all" || sort !== "date";

  return (
    <section id="catalog" className="scroll-mt-20" aria-label="Каталог событий">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-semibold sm:text-3xl">Каталог событий</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {isLoading ? (
                <span className="mt-1 inline-block h-4 w-40 animate-pulse rounded bg-secondary align-middle" />
              ) : (
                <>
                  Найдено <span className="font-semibold tabular-nums text-foreground">{sorted.length}</span>{" "}
                  {pluralEvents(sorted.length)}
                  {q && <> по запросу «{q}»</>}
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={date ?? "any"}
              onValueChange={(v) => setDate(v === "any" ? null : (v as DateRange))}
            >
              <SelectTrigger className="h-10 w-[168px] rounded-xl bg-card text-[13px] shadow-card" aria-label="Фильтр по дате">
                <SelectValue placeholder="Любая дата" />
              </SelectTrigger>
              <SelectContent>
                {DATE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={price} onValueChange={(v) => setPrice(v as PriceFilter)}>
              <SelectTrigger className="h-10 w-[150px] rounded-xl bg-card text-[13px] shadow-card" aria-label="Фильтр по цене">
                <SelectValue placeholder="Цена" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Любая цена</SelectItem>
                <SelectItem value="free">Бесплатно</SelectItem>
                <SelectItem value="paid">Платно</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sort} onValueChange={(v) => setSort(v as SortOrder)}>
              <SelectTrigger className="h-10 w-[180px] rounded-xl bg-card text-[13px] shadow-card" aria-label="Сортировка">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Лента категорий */}
        <div className="scrollbar-none -mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist" aria-label="Категории событий">
          <button
            type="button"
            role="tab"
            aria-selected={!category}
            onClick={() => setCategory(null)}
            className={`press shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors duration-200 ${
              !category
                ? "border-primary bg-primary text-primary-foreground shadow-card"
                : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            Все категории
          </button>
          {/* Категории без предстоящих событий не показываются в фильтрах */}
          {(categories?.items ?? []).filter((c) => c.eventsCount > 0).map((c) => {
            const active = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(active ? null : c.id)}
                className={`press flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors duration-200 ${
                  active
                    ? "border-transparent text-white shadow-card"
                    : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                style={active ? { background: c.color } : undefined}
              >
                <CategoryIcon categoryId={c.id} className="size-3.5" style={active ? undefined : { color: c.color }} />
                {c.name}
                <span className={`text-xs tabular-nums ${active ? "opacity-80" : "text-muted-foreground/70"}`}>
                  {c.eventsCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* Сетка событий */}
        {isLoading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true" aria-label="Загрузка каталога">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
                <Skeleton className="aspect-[16/9] rounded-none" />
                <div className="space-y-3 p-5">
                  <Skeleton className="h-5 w-4/5" />
                  <Skeleton className="h-4 w-3/5" />
                  <Skeleton className="h-4 w-2/5" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="grid place-items-center rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-card">
            <CalendarX2 className="mb-3 size-10 text-muted-foreground" aria-hidden />
            <p className="font-semibold">Не удалось загрузить каталог</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Проверьте соединение с сервером и обновите страницу.
            </p>
          </div>
        ) : sorted.length === 0 ? (
          <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/60 px-6 py-16 text-center">
            <CalendarX2 className="mb-3 size-10 text-muted-foreground" aria-hidden />
            <p className="font-semibold">Ничего не нашлось</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Под выбранные фильтры не попало ни одного события. Попробуйте расширить
              условия поиска.
            </p>
            {hasFilters && (
              <button
                type="button"
                onClick={reset}
                className="press mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card hover:bg-primary/90"
              >
                <RotateCcw className="size-4" aria-hidden />
                Сбросить фильтры
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {sorted.map((event, i) => (
              <EventCard key={event.id} event={event} index={i} onOpen={setSelected} />
            ))}
          </div>
        )}

        {isLoading && (
          <p className="mt-8 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Загружаем события из REST API…
          </p>
        )}
      </div>

      <EventDialog event={selected} onClose={() => setSelected(null)} />
    </section>
  );
}
