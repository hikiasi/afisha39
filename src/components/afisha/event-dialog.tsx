"use client";

/**
 * Диалог подробного просмотра события.
 * На широких экранах — модальное окно по центру, на мобильных —
 * выглядит как нижний лист. Внутри — полная карточка: обложка,
 * метаинформация, описание и действия — покупка билета у продавца
 * или переход к странице события в афише источника.
 */

import { useState } from "react";
import { Check, Clock, Copy, ExternalLink, Globe2, MapPin, Share2, Ticket, Users } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { EventWithVenue } from "@/lib/types";
import { formatDay, formatDuration, formatPrice, formatTime } from "./meta";
import { CategoryIcon } from "./category-icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface EventDialogProps {
  event: EventWithVenue | null;
  onClose: () => void;
}

function MetaRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground">
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="text-sm font-medium text-foreground">{children}</div>
      </div>
    </div>
  );
}

export function EventDialog({ event, onClose }: EventDialogProps) {
  const [copied, setCopied] = useState(false);
  const [coverOk, setCoverOk] = useState(Boolean(event?.imageUrl));

  if (!event) return null;
  const cat = event.category;
  const duration = formatDuration(event);
  /* const-ссылка нужна, чтобы сужение типа переносилось в замыкание share() */
  const current = event;

  async function share() {
    const text = `${current.title} — ${formatDay(current.startsAt)} в ${formatTime(current.startsAt)}, ${current.venue.shortName}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Афиша39", text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({ title: "Скопировано в буфер обмена", description: text });
    } catch {
      /* пользователь отменил share — ничего не делаем */
    }
  }

  return (
    <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-2xl p-0 sm:max-w-2xl sm:rounded-2xl">
        {/* Обложка */}
        <div className="grain relative h-40 shrink-0 overflow-hidden sm:h-48" style={{ background: cat.tint }}>
          <div
            aria-hidden
            className="absolute inset-0"
            style={{
              background: `linear-gradient(135deg, ${cat.tint} 0%, ${cat.color}18 55%, ${cat.color}33 100%)`,
            }}
          />
          {event.imageUrl && coverOk && (
            <img
              src={event.imageUrl}
              alt=""
              onError={() => setCoverOk(false)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div
            aria-hidden
            className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-stone-950/55 to-transparent"
          />
          <CategoryIcon
            categoryId={cat.id}
            className="absolute -bottom-6 right-4 size-32 opacity-[0.13]"
            style={{ color: cat.color }}
          />
        </div>

        <div className="px-5 pb-6 pt-5 sm:px-7">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                className="rounded-full border-0 text-[12px] font-semibold"
                style={{ background: cat.color, color: "#fffdf9" }}
              >
                {cat.name}
              </Badge>
              {event.ageLimit && (
                <Badge variant="secondary" className="rounded-full text-[12px]">
                  {event.ageLimit}
                </Badge>
              )}
              {event.recurring && (
                <Badge variant="outline" className="rounded-full text-[12px] font-medium">
                  {event.recurring}
                </Badge>
              )}
            </div>
            <DialogTitle className="font-display text-xl font-semibold leading-snug sm:text-2xl">
              {event.title}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Событие «{event.title}». Площадка: {event.venue.name}.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <MetaRow icon={Clock} label="Когда">
              {formatDay(event.startsAt)} · {formatTime(event.startsAt)}
              {duration && <span className="ml-1 font-normal text-muted-foreground">({duration})</span>}
            </MetaRow>
            <MetaRow icon={MapPin} label="Где">
              {event.venue.name}
              <p className="mt-0.5 font-normal text-muted-foreground">
                {event.venue.address || "Адрес — на странице события источника"}
              </p>
            </MetaRow>
            <MetaRow icon={Ticket} label="Стоимость">
              <span className={event.price === 0 ? "text-emerald-700" : undefined}>
                {formatPrice(event)}
              </span>
              {event.priceNote && (
                <p className="mt-0.5 font-normal text-muted-foreground">{event.priceNote}</p>
              )}
            </MetaRow>
            <MetaRow icon={Globe2} label="Источник">
              Klops.ru — афиша Калининграда
              <p className="mt-0.5 font-normal text-muted-foreground">
                Событие синхронизировано краулером проекта
              </p>
            </MetaRow>
          </div>

          <Separator className="my-5" />

          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground">О событии</h4>
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {event.description}
            </p>
          </div>

          {event.highlights && event.highlights.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Что важно знать</h4>
              <ul className="space-y-1.5">
                {event.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            {event.ticketUrl ? (
              <a
                href={event.ticketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-card transition-colors hover:bg-primary/90"
              >
                <Ticket className="size-4" aria-hidden />
                Купить билет у продавца
              </a>
            ) : (
              <a
                href={event.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-card transition-colors hover:bg-primary/90"
              >
                <ExternalLink className="size-4" aria-hidden />
                Страница события
              </a>
            )}
            <Button
              variant="outline"
              onClick={share}
              className="press h-11 rounded-xl border-border bg-card text-sm font-semibold hover:bg-secondary"
            >
              {copied ? (
                <Check className="size-4 text-emerald-600" aria-hidden />
              ) : (
                <Share2 className="size-4" aria-hidden />
              )}
              Поделиться
            </Button>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Событие найдено в публичной афише{" "}
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              klops.ru
            </a>{" "}
            и синхронизировано краулером проекта. Даты и условия участия
            уточняйте при покупке. Идентификатор:{" "}
            <code className="font-mono text-[11px]">{event.id}</code>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
