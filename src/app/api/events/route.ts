/**
 * GET /api/events — каталог событий с фильтрацией, поиском, сортировкой
 * и постраничной выдачей.
 *
 * Параметры запроса:
 *   category  — идентификатор категории (concerts | theatre | ...)
 *   venue     — идентификатор площадки
 *   price     — all | free | paid
 *   date      — today | tomorrow | weekend | week | month
 *   q         — поисковая строка (регистронезависимая, по всем словам)
 *   sort      — date | price | price_desc
 *   limit     — размер страницы (1..200, по умолчанию 24)
 *   offset    — смещение страницы
 *   include   — past: включить прошедшие события
 *
 * Пример: /api/events?category=concerts&date=weekend&price=free&limit=10
 */

import { queryEvents } from "@/lib/events";
import { jsonError, JSON_HEADERS } from "@/lib/api-utils";
import type { DateRange, EventsQuery, PriceFilter, SortOrder } from "@/lib/types";
import type { NextRequest } from "next/server";

const DATE_RANGES = new Set(["today", "tomorrow", "weekend", "week", "month"]);
const PRICE_FILTERS = new Set(["all", "free", "paid"]);
const SORT_ORDERS = new Set(["date", "price", "price_desc"]);

function parsePositiveInt(value: string | null, fallback: number): number {
  const n = Number.parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;

    const query: EventsQuery = {
      category: sp.get("category") ?? undefined,
      venue: sp.get("venue") ?? undefined,
      price: (sp.get("price") as PriceFilter) ?? "all",
      date: (sp.get("date") as DateRange) ?? undefined,
      q: sp.get("q") ?? undefined,
      sort: (sp.get("sort") as SortOrder) ?? "date",
      limit: parsePositiveInt(sp.get("limit"), 24),
      offset: parsePositiveInt(sp.get("offset"), 0),
      includePast: sp.get("include") === "past",
    };

    // Валидация значений перечислений
    if (query.date && !DATE_RANGES.has(query.date)) {
      return jsonError(
        `Недопустимое значение параметра date: «${query.date}». Допустимо: ${[...DATE_RANGES].join(", ")}.`,
        400
      );
    }
    if (query.price && !PRICE_FILTERS.has(query.price)) {
      return jsonError(
        `Недопустимое значение параметра price: «${query.price}». Допустимо: ${[...PRICE_FILTERS].join(", ")}.`,
        400
      );
    }
    if (query.sort && !SORT_ORDERS.has(query.sort)) {
      return jsonError(
        `Недопустимое значение параметра sort: «${query.sort}». Допустимо: ${[...SORT_ORDERS].join(", ")}.`,
        400
      );
    }

    const result = queryEvents(query);
    return new Response(JSON.stringify(result, null, process.env.NODE_ENV === "development" ? 2 : 0), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    console.error("[api/events]", error);
    return jsonError("Внутренняя ошибка сервера при обработке запроса каталога.", 500);
  }
}
