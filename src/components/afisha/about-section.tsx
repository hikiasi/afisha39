/**
 * Секция «О проекте»: цель, архитектура в двух словах, технологический
 * стек и сведения об источнике данных.
 * Секция серверная (статическая) — рендерится без клиентского JS.
 */

import { Cpu, Database, Globe2, Layers, Server } from "lucide-react";

const STACK = [
  { name: "Next.js 16", role: "React-фреймворк: SSR, маршрутизация, API-роуты" },
  { name: "TypeScript", role: "статическая типизация данных и API" },
  { name: "Tailwind CSS", role: "стилизация и адаптивная вёрстка" },
  { name: "shadcn/ui", role: "библиотека доступных UI-компонентов" },
  { name: "TanStack Query", role: "клиентское серверное состояние, кеширование" },
  { name: "Vercel", role: "облачное развёртывание и CDN" },
];

const PRINCIPLES = [
  {
    icon: Server,
    title: "Клиент-серверная архитектура",
    text: "Интерфейс и данные разделены: SPA общается с собственным REST API по протоколу HTTP, получая JSON-представления ресурсов.",
  },
  {
    icon: Database,
    title: "Реальные данные без внешней БД",
    text: "События собирает краулер с публичной серверной афиши klops.ru: обход списков, разбор микроформата schema.org/Event, сохранение в JSON-датасет, который обслуживает API.",
  },
  {
    icon: Globe2,
    title: "Собственный REST-контракт",
    text: "Пять эндпоинтов с фильтрацией, пагинацией и поиском; корректные коды ответов и HTTP-кеш — интерфейс готов к переиспользованию другими клиентами.",
  },
  {
    icon: Cpu,
    title: "Производительность",
    text: "Мгновенная клиентская фильтрация поверх кешированной выборки, скелетоны загрузки и анимации с кастомными кривыми плавности.",
  },
];

export function AboutSection() {
  return (
    <section id="about" className="scroll-mt-20 border-t border-border/70 bg-secondary/40" aria-label="О проекте">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <h2 className="font-display text-2xl font-semibold sm:text-3xl">О проекте</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
          «Афиша39» — учебное веб-приложение, разработанное в рамках курсовой работы
          по дисциплине «Сетевые информационные технологии» (КГТУ, институт цифровых
          технологий, группа 23-ИЭ-1). Цель проекта — практическое освоение
          клиент-серверной веб-разработки: от проектирования REST API и работы
          с протоколом HTTP до развёртывания приложения в облаке.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {PRINCIPLES.map((p) => (
            <article key={p.title} className="rounded-2xl border border-border/70 bg-card p-5 shadow-card">
              <span className="mb-3 grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                <p.icon className="size-5" aria-hidden />
              </span>
              <h3 className="text-[15px] font-semibold">{p.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{p.text}</p>
            </article>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-border/70 bg-card p-5 shadow-card sm:p-6">
          <div className="mb-4 flex items-center gap-2">
            <Layers className="size-4.5 text-primary" aria-hidden />
            <h3 className="text-[15px] font-semibold">Технологический стек</h3>
          </div>
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {STACK.map((s) => (
              <li key={s.name} className="rounded-xl bg-secondary/70 px-3.5 py-2.5">
                <p className="text-[13.5px] font-semibold">{s.name}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">{s.role}</p>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-6 max-w-3xl rounded-xl border border-dashed border-border bg-background/60 px-4 py-3 text-[13px] leading-relaxed text-muted-foreground">
          Каталог наполняют реальные события Калининграда: их собирает краулер
          проекта с публичной серверной афиши{" "}
          <a
            href="https://klops.ru/afisha/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            klops.ru
          </a>{" "}
          (материалы сайта распространяются по лицензии Creative Commons
          CC BY-SA 4.0, указание источника сохраняется в каждом событии).
          Обновление датасета — по расписанию, поэтому афиша всегда актуальна.
          Приложение не продаёт билеты: кнопка ведёт к официальному продавцу.
        </p>
      </div>
    </section>
  );
}
