/**
 * Подвал сайта. Прижат к нижней границе окна, когда контент короче
 * экрана (flex-колонка в RootLayout и mt-auto здесь).
 */

import { CalendarDays } from "lucide-react";
import { SiteHeaderNavList } from "./site-header-nav";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border/70 bg-card">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-2">
              <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
                <CalendarDays className="size-4.5" strokeWidth={2.2} aria-hidden />
              </span>
              <span className="text-[17px] font-semibold tracking-tight">
                Афиша<span className="text-primary">39</span>
              </span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
              Справочник событий Калининграда: концерты, спектакли, выставки,
              экскурсии и фестивали — в одном каталоге. Данные собираются с
              публичной афиши{" "}
              <a
                href="https://klops.ru/afisha/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary underline-offset-2 hover:underline"
              >
                klops.ru
              </a>
              .
            </p>
          </div>

          <nav aria-label="Навигация в подвале">
            <p className="mb-3 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
              Разделы
            </p>
            <SiteHeaderNavList />
          </nav>
        </div>

        <div className="mt-8 flex flex-col gap-2 border-t border-border/70 pt-5 text-[12.5px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            Учебный проект по дисциплине «Сетевые информационные технологии» ·
            КГТУ, группа 23-ИЭ-1 · Волков Иван Николаевич
          </p>
          <p>Калининград · 2026</p>
        </div>
      </div>
    </footer>
  );
}
