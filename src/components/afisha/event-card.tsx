"use client";

/**
 * Карточка события каталога.
 *
 * Основа обложки — программная: градиент в цвете категории, шумовой
 * слой (grain) и иконка-водяной знак. Если источник публикует обложку
 * события, она выводится поверх градиента; при ошибке загрузки
 * карточка бесшовно возвращается к программной обложке.
 */

import { memo, useState } from "react";
import type { EventWithVenue } from "@/lib/types";
import { badgeDayParts, daysFromNowLabel, formatCardDate, formatPrice } from "./meta";
import { CategoryIcon } from "./category-icon";

interface EventCardProps {
  event: EventWithVenue;
  onOpen: (event: EventWithVenue) => void;
  index?: number;
}

export const EventCard = memo(function EventCard({ event, onOpen, index = 0 }: EventCardProps) {
  const { day, month } = badgeDayParts(event.startsAt);
  const cat = event.category;
  const [coverOk, setCoverOk] = useState(Boolean(event.imageUrl));

  return (
    <article
      className="reveal is-visible"
      style={{
        transitionDelay: `${Math.min(index, 11) * 35}ms`,
      }}
    >
      <button
        type="button"
        onClick={() => onOpen(event)}
        className="press lift group flex h-full w-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card text-left shadow-card hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20"
        aria-label={`Открыть подробности: ${event.title}`}
      >
        {/* Обложка */}
        <div className="grain relative aspect-[16/9] overflow-hidden" style={{ background: cat.tint }}>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${cat.tint} 0%, ${cat.color}14 55%, ${cat.color}2e 100%)`,
            }}
          />
          {/* Обложка события из источника; при сбое — программная основа */}
          {event.imageUrl && coverOk && (
            <span className="absolute inset-0 block">
              <img
                src={event.imageUrl}
                alt=""
                loading="lazy"
                onError={() => setCoverOk(false)}
                className="h-full w-full object-cover"
              />
              <span
                aria-hidden
                className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-stone-950/45 to-transparent"
              />
            </span>
          )}
          <CategoryIcon
            categoryId={cat.id}
            className="absolute -bottom-5 -right-4 size-28 opacity-[0.13] transition-transform duration-500 [transition-timing-function:var(--ease-out-expo)] group-hover:scale-110 group-hover:-rotate-6"
            style={{ color: cat.color }}
          />
          <span
            aria-hidden
            className="absolute left-0 top-0 h-px w-full"
            style={{ background: `linear-gradient(90deg, ${cat.color}00, ${cat.color}55, ${cat.color}00)` }}
          />

          {/* Бейдж даты */}
          <div className="absolute left-4 top-4 flex size-14 flex-col items-center justify-center rounded-xl bg-card/95 shadow-card backdrop-blur-sm">
            <span className="text-lg font-bold leading-none tabular-nums" style={{ color: cat.color }}>
              {day}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {month}
            </span>
          </div>

          {/* Возрастной ценз */}
          {event.ageLimit && (
            <span className="absolute right-4 top-4 rounded-md bg-stone-900/70 px-2 py-1 text-[11px] font-semibold text-stone-50">
              {event.ageLimit}
            </span>
          )}

          {/* Плашка категории */}
          <span
            className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold"
            style={{ background: cat.color, color: "#fffdf9" }}
          >
            <CategoryIcon categoryId={cat.id} className="size-3.5" />
            {cat.name}
          </span>

          {event.recurring && (
            <span className="absolute bottom-4 right-4 rounded-full bg-card/90 px-2.5 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur-sm">
              {event.recurring}
            </span>
          )}
        </div>

        {/* Тело карточки */}
        <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
          <h3 className="text-[15px] font-semibold leading-snug text-foreground transition-colors duration-200 group-hover:text-primary sm:text-base">
            {event.title}
          </h3>

          <p className="text-[13px] leading-snug text-muted-foreground">
            {event.venue.shortName}
            {event.venue.address ? ` · ${event.venue.address}` : ""}
          </p>

          <div className="mt-auto flex items-center justify-between gap-2 pt-2">
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium tabular-nums text-foreground">
                {formatCardDate(event)}
              </p>
              <p className="text-xs text-muted-foreground">{daysFromNowLabel(event.startsAt)}</p>
            </div>
            <span
              className={
                event.price === 0
                  ? "shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[13px] font-semibold text-emerald-700"
                  : "shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[13px] font-semibold text-secondary-foreground"
              }
            >
              {formatPrice(event)}
            </span>
          </div>
        </div>
      </button>
    </article>
  );
});
