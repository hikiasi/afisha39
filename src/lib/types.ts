/**
 * Типы данных приложения «Афиша39»
 * Проект курсовой работы по дисциплине «Сетевые информационные технологии»
 */

export interface Category {
  id: string;
  name: string;
  /** Цвет акцента категории (hex) */
  color: string;
  /** Цвет фона для плашек (hex) */
  tint: string;
}

export interface Venue {
  id: string;
  name: string;
  shortName: string;
  address: string;
  district: string;
  description: string;
  site: string | null;
  /** Гео-координаты из микроформата schema.org источника (может не быть) */
  lat: number | null;
  lng: number | null;
}

export interface EventItem {
  id: string;
  title: string;
  categoryId: string;
  venueId: string;
  /** Локальное время начала, формат YYYY-MM-DDTHH:mm:00 */
  startsAt: string;
  endsAt: string;
  /** Цена в рублях; 0 — свободный вход; -1 — платный вход, цена не публикуется */
  price: number;
  priceNote: string | null;
  ageLimit: string | null;
  description: string;
  highlights: string[] | null;
  recurring: string | null;
  source: string;
  /** Страница события в афише источника (klops.ru) */
  sourceUrl: string;
  /** Прямая ссылка на покупку билета у продавца, если публикуется */
  ticketUrl: string | null;
  /** Обложка события из источника; при недоступности строится программно */
  imageUrl: string | null;
}

/** Событие с «развёрнутыми» связями — формат ответа REST API */
export interface EventWithVenue extends EventItem {
  venue: Venue;
  category: Category;
}

export interface Dataset {
  generatedAt: string;
  generator: string;
  source: string;
  note: string;
  horizonDays: number;
  venues: Venue[];
  events: EventItem[];
}

export interface VenueWithCount extends Venue {
  eventsCount: number;
  categories: string[];
}

export interface CategoryWithCount extends Category {
  eventsCount: number;
}

export interface Stats {
  total: number;
  upcoming: number;
  free: number;
  today: number;
  thisWeek: number;
  venues: number;
  categories: number;
  byCategory: { id: string; name: string; count: number }[];
  generatedAt: string;
}

export type DateRange = "today" | "tomorrow" | "weekend" | "week" | "month";
export type PriceFilter = "all" | "free" | "paid";
export type SortOrder = "date" | "price" | "price_desc";

export interface EventsQuery {
  category?: string;
  venue?: string;
  price?: PriceFilter;
  date?: DateRange;
  q?: string;
  sort?: SortOrder;
  limit?: number;
  offset?: number;
  includePast?: boolean;
}

export interface EventsResponse {
  total: number;
  count: number;
  offset: number;
  limit: number;
  items: EventWithVenue[];
}
