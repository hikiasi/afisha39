"use client";

/**
 * Шапка приложения: логотип, якорная навигация и бейдж учебного проекта.
 * Липкая (sticky) шапка с полупрозрачным размытием фона.
 */

import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { NAV_ITEMS } from "./site-header-nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="press flex items-center gap-2" aria-label="Афиша39 — на главную">
          <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-card">
            <CalendarDays className="size-4.5" strokeWidth={2.2} aria-hidden />
          </span>
          <span className="text-[17px] font-semibold tracking-tight">
            Афиша<span className="text-primary">39</span>
          </span>
        </Link>

        <nav className="ml-auto hidden items-center gap-1 sm:flex" aria-label="Основная навигация">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Мобильная навигация — компактный скролл-ряд */}
        <nav
          className="scrollbar-none ml-auto flex items-center gap-3 overflow-x-auto text-[13px] font-medium text-muted-foreground sm:hidden"
          aria-label="Мобильная навигация"
        >
          {NAV_ITEMS.map((item) => (
            <a key={item.href} href={item.href} className="shrink-0">
              {item.label}
            </a>
          ))}
        </nav>

        <span className="ml-4 hidden rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground md:inline-block">
          КГТУ · 23-ИЭ-1
        </span>
      </div>
    </header>
  );
}
