/**
 * Серверный движок запросов к датасету событий «Афиша39».
 *
 * Датасет (src/data/events.json) загружается в память процесса один раз
 * и обслуживает запросы REST API: фильтрация, поиск, сортировка,
 * пагинация и агрегированная статистика.
 */

import raw from "@/data/events.json";
import type {
  Category,
  CategoryWithCount,
  Dataset,
  EventItem,
  EventsQuery,
  EventWithVenue,
  Stats,
  Venue,
  VenueWithCount,
} from "./types";

const data = raw as unknown as Dataset;

export const CATEGORIES: Category[] = [
  { id: "concerts", name: "Музыка", color: "#BE123C", tint: "#FFF1F2" },
  { id: "theatre", name: "Театр", color: "#9A3412", tint: "#FFF7ED" },
  { id: "exhibitions", name: "Выставки", color: "#0F766E", tint: "#F0FDFA" },
  { id: "festivals", name: "Фестивали", color: "#A21CAF", tint: "#FDF4FF" },
  { id: "kids", name: "Детям", color: "#0369A1", tint: "#F0F9FF" },
  { id: "sports", name: "Спорт", color: "#15803D", tint: "#F0FDF4" },
  { id: "humor", name: "Юмор", color: "#7C3AED", tint: "#F5F3FF" },
  { id: "education", name: "Лекции и встречи", color: "#44403C", tint: "#FAFAF9" },
  { id: "citywalks", name: "Экскурсии", color: "#0E7490", tint: "#ECFEFF" },
];

const categoryById = new Map(CATEGORIES.map((c) => [c.id, c]));
const venueById = new Map(data.venues.map((v) => [v.id, v]));

/* ------------------------------------------------------------------ */
/*  Работа с датами                                                    */
/* ------------------------------------------------------------------ */

const pad = (n: number) => String(n).padStart(2, "0");

/** Локальная «наивная» дата YYYY-MM-DD (без таймзоны) */
function localDay(d = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(day: string, days: number): string {
  const d = new Date(day + "T00:00:00");
  d.setDate(d.getDate() + days);
  return localDay(d);
}

function dayOfWeek(day: string): number {
  return new Date(day + "T00:00:00").getDay();
}

/** Диапазон [от, до) в наивных датах для запроса date= */
export function resolveDateRange(range: string): { from: string; to: string } | null {
  const today = localDay();
  switch (range) {
    case "today":
      return { from: today, to: addDays(today, 1) };
    case "tomorrow":
      return { from: addDays(today, 1), to: addDays(today, 2) };
    case "week":
      return { from: today, to: addDays(today, 7) };
    case "month":
      return { from: today, to: addDays(today, 31) };
    case "weekend": {
      // Ближайшие суббота и воскресенье (включая текущие, если сегодня выходной)
      const dow = dayOfWeek(today);
      const daysToSat = (6 - dow + 7) % 7;
      const sat = addDays(today, daysToSat);
      return { from: sat, to: addDays(sat, 2) };
    }
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Основные выборки                                                   */
/* ------------------------------------------------------------------ */

function withVenue(e: EventItem): EventWithVenue {
  const venue = venueById.get(e.venueId)!;
  const category = categoryById.get(e.categoryId)!;
  return { ...e, venue, category };
}

export function queryEvents(query: EventsQuery) {
  const nowDay = localDay();
  let items = data.events.filter((e) => query.includePast || e.startsAt.slice(0, 10) >= nowDay);

  if (query.category) {
    items = items.filter((e) => e.categoryId === query.category);
  }
  if (query.venue) {
    items = items.filter((e) => e.venueId === query.venue);
  }
  if (query.price === "free") {
    items = items.filter((e) => e.price === 0);
  } else if (query.price === "paid") {
    items = items.filter((e) => e.price !== 0);
  }

  const range = query.date ? resolveDateRange(query.date) : null;
  if (range) {
    items = items.filter((e) => {
      const day = e.startsAt.slice(0, 10);
      return day >= range.from && day < range.to;
    });
  }

  if (query.q) {
    const q = query.q.trim().toLowerCase();
    if (q) {
      items = items.filter((e) => {
        const venue = venueById.get(e.venueId);
        const cat = categoryById.get(e.categoryId);
        const haystack = [
          e.title,
          e.description,
          venue?.name ?? "",
          venue?.shortName ?? "",
          venue?.address ?? "",
          cat?.name ?? "",
        ]
          .join(" ")
          .toLowerCase();
        return q.split(/\s+/).every((word) => haystack.includes(word));
      });
    }
  }

  /* Сортировка по цене: события с неизвестной ценой (-1) — в конце списка */
  const priceRank = (p: number) => (p === -1 ? Number.MAX_SAFE_INTEGER : p);
  const priceRankDesc = (p: number) => (p === -1 ? -1 : p);
  const sort = query.sort ?? "date";
  items = [...items].sort((a, b) => {
    if (sort === "price") return priceRank(a.price) - priceRank(b.price) || (a.startsAt < b.startsAt ? -1 : 1);
    if (sort === "price_desc") return priceRankDesc(b.price) - priceRankDesc(a.price) || (a.startsAt < b.startsAt ? -1 : 1);
    return a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0;
  });

  const total = items.length;
  const offset = Math.max(0, query.offset ?? 0);
  const limit = Math.min(200, Math.max(1, query.limit ?? 24));
  const page = items.slice(offset, offset + limit).map(withVenue);

  return { total, offset, limit, items: page };
}

export function getEventById(id: string): EventWithVenue | null {
  const e = data.events.find((ev) => ev.id === id);
  return e ? withVenue(e) : null;
}

export function listVenues(): VenueWithCount[] {
  const nowDay = localDay();
  return data.venues.map((v) => {
    const upcoming = data.events.filter(
      (e) => e.venueId === v.id && e.startsAt.slice(0, 10) >= nowDay
    );
    const cats = [...new Set(upcoming.map((e) => e.categoryId))];
    return { ...v, eventsCount: upcoming.length, categories: cats };
  });
}

export function listCategories(): CategoryWithCount[] {
  const nowDay = localDay();
  return CATEGORIES.map((c) => ({
    ...c,
    eventsCount: data.events.filter(
      (e) => e.categoryId === c.id && e.startsAt.slice(0, 10) >= nowDay
    ).length,
  }));
}

export function getStats(): Stats {
  const nowDay = localDay();
  const upcoming = data.events.filter((e) => e.startsAt.slice(0, 10) >= nowDay);
  const today = localDay();

  const byCategory = CATEGORIES.map((c) => ({
    id: c.id,
    name: c.name,
    count: upcoming.filter((e) => e.categoryId === c.id).length,
  })).filter((c) => c.count > 0);

  return {
    total: data.events.length,
    upcoming: upcoming.length,
    free: upcoming.filter((e) => e.price === 0).length,
    today: upcoming.filter((e) => e.startsAt.slice(0, 10) === today).length,
    thisWeek: upcoming.filter((e) => e.startsAt.slice(0, 10) < addDays(today, 7)).length,
    venues: data.venues.length,
    categories: byCategory.length,
    byCategory,
    generatedAt: data.generatedAt,
  };
}

export function getDatasetInfo() {
  return {
    generatedAt: data.generatedAt,
    generator: data.generator,
    source: data.source,
    note: data.note,
    horizonDays: data.horizonDays,
    events: data.events.length,
    venues: data.venues.length,
  };
}

export type { EventItem, Venue, Category, EventWithVenue, VenueWithCount, CategoryWithCount, Stats };
