/**
 * Клиентские метаданные каталога: иконки и цвета категорий,
 * форматирование дат и цен. Набор функций используется
 * компонентами интерфейса.
 */

import type { EventWithVenue } from "@/lib/types";

/* ---------------- Категории: имена иконок Lucide ---------------- */

export const CATEGORY_ICONS: Record<string, string> = {
  concerts: "music",
  theatre: "drama",
  exhibitions: "palette",
  festivals: "sparkles",
  kids: "baby",
  sports: "trophy",
  humor: "mic",
  education: "graduation-cap",
  citywalks: "map-pinned",
};

/* ---------------- Форматирование даты и времени ---------------- */

const MONTHS_GEN = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];

const WEEKDAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];

/** «сб, 18 октября» */
export function formatDay(iso: string): string {
  const d = new Date(iso);
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

/** «19:00» */
export function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/** «18 октября, сб · 19:00» — для карточки события */
export function formatCardDate(event: Pick<EventWithVenue, "startsAt">): string {
  const d = new Date(event.startsAt);
  const h = String(d.getHours()).padStart(2, "0");
  const m = String(d.getMinutes()).padStart(2, "0");
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]}, ${WEEKDAYS[d.getDay()]} · ${h}:${m}`;
}

/** Смещение от сегодня: «сегодня» | «завтра» | «через N дней» */
export function daysFromNowLabel(iso: string): string {
  const day = new Date(iso);
  day.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((day.getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return "сегодня";
  if (diff === 1) return "завтра";
  if (diff === 2) return "послезавтра";
  return `через ${diff} дн.`;
}

/** Дата в верхнем бейдже обложки: число и месяц */
export function badgeDayParts(iso: string): { day: string; month: string } {
  const d = new Date(iso);
  return {
    day: String(d.getDate()).padStart(2, "0"),
    month: MONTHS_GEN[d.getMonth()].slice(0, 3),
  };
}

/* ---------------- Форматирование цены ---------------- */

/** 0 — свободный вход; -1 — платный вход без публикуемой цены */
export function formatPrice(event: Pick<EventWithVenue, "price" | "priceNote">): string {
  if (event.price === 0) return "Бесплатно";
  if (event.price < 0) return "Платно";
  return `от ${event.price.toLocaleString("ru-RU")} ₽`;
}

/* ---------------- Длительность ---------------- */

/** Возвращает null, когда длительность неизвестна (совпадают начало и конец) */
export function formatDuration(event: Pick<EventWithVenue, "startsAt" | "endsAt">): string | null {
  const start = new Date(event.startsAt).getTime();
  const end = new Date(event.endsAt).getTime();
  const min = Math.max(0, Math.round((end - start) / 60_000));
  if (min === 0) return null;
  if (min < 60) return `${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} ч` : `${h} ч ${m} мин`;
}

/* ---------------- Ссылка события ---------------- */

export function eventShareText(e: EventWithVenue): string {
  return `${e.title} — ${formatDay(e.startsAt)}, ${formatTime(e.startsAt)}, ${e.venue.shortName}. Подробности в Афише39.`;
}
