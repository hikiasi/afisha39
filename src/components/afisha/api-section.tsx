"use client";

/**
 * Секция «REST API»: живая документация эндпоинтов.
 * Кнопка «Выполнить» отправляет реальный запрос к собственному API
 * приложения и показывает тело JSON-ответа — наглядная демонстрация
 * клиент-серверного взаимодействия по протоколу HTTP.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, Terminal } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Endpoint {
  method: "GET";
  path: string;
  title: string;
  description: string;
  params: { name: string; example: string; description: string }[];
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/events",
    title: "Каталог событий",
    description:
      "Возвращает события с фильтрацией, поиском, сортировкой и пагинацией. Каждый объект уже содержит развёрнутые данные площадки и категории.",
    params: [
      { name: "category", example: "concerts", description: "категория события" },
      { name: "date", example: "weekend", description: "today | tomorrow | weekend | week | month" },
      { name: "price", example: "free", description: "all | free | paid" },
      { name: "q", example: "орган", description: "поисковая строка" },
      { name: "sort", example: "date", description: "date | price | price_desc" },
      { name: "limit", example: "3", description: "размер страницы (1–200)" },
      { name: "offset", example: "0", description: "смещение страницы" },
    ],
  },
  {
    method: "GET",
    path: "/api/events/[id]",
    title: "Карточка события",
    description:
      "Возвращает одно событие по его идентификатору. Если событие не найдено — ответ 404 с описанием ошибки в теле JSON.",
    params: [{ name: "id", example: "(path)", description: "идентификатор события" }],
  },
  {
    method: "GET",
    path: "/api/venues",
    title: "Справочник площадок",
    description: "Список площадок с числом предстоящих событий и набором категорий.",
    params: [],
  },
  {
    method: "GET",
    path: "/api/categories",
    title: "Категории событий",
    description: "Список категорий с количеством предстоящих событий в каждой.",
    params: [],
  },
  {
    method: "GET",
    path: "/api/stats",
    title: "Статистика каталога",
    description:
      "Агрегированные показатели: общее число событий, бесплатные события, события сегодня и на неделе, распределение по категориям.",
    params: [],
  },
];

function ApiPlayground({ endpoint }: { endpoint: Endpoint }) {
  const [response, setResponse] = useState<string | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState<number | null>(null);

  const sampleUrl =
    endpoint.path === "/api/events"
      ? "/api/events?category=concerts&date=month&limit=2"
      : endpoint.path === "/api/events/[id]"
        ? null
        : endpoint.path;

  const { data: anyEvent } = useQuery<{ items: { id: string; title: string }[] }>({
    queryKey: ["events", "sample"],
    queryFn: async () => {
      const res = await fetch("/api/events?limit=1");
      return res.json();
    },
    enabled: endpoint.path === "/api/events/[id]",
  });

  async function run() {
    let url = sampleUrl;
    if (endpoint.path === "/api/events/[id]") {
      const id = anyEvent?.items?.[0]?.id;
      if (!id) {
        toast({ title: "Нет доступных событий для примера" });
        return;
      }
      url = `/api/events/${encodeURIComponent(id)}`;
    }
    if (!url) return;

    setLoading(true);
    setResponse(null);
    const started = performance.now();
    try {
      const res = await fetch(url);
      const ms = Math.round(performance.now() - started);
      const json = await res.json();
      setStatus(res.status);
      setElapsed(ms);
      setResponse(JSON.stringify(json, null, 2).slice(0, 2400));
    } catch {
      setStatus(0);
      setResponse('// Сетевая ошибка: сервер недоступен');
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-border/70 bg-secondary/50 px-4 py-3 sm:px-5">
        <span className="rounded-md bg-emerald-600/10 px-2 py-1 font-mono text-[12px] font-bold text-emerald-700">
          {endpoint.method}
        </span>
        <code className="min-w-0 break-all font-mono text-[13px] font-semibold text-foreground">
          {endpoint.path}
        </code>
        <span className="ml-auto hidden text-[13px] font-medium text-muted-foreground sm:block">
          {endpoint.title}
        </span>
      </div>

      <div className="p-4 sm:p-5">
        <p className="text-[13px] leading-relaxed text-muted-foreground">{endpoint.description}</p>

        {endpoint.params.length > 0 && (
          <div className="mt-3 space-y-1">
            {endpoint.params.map((p) => (
              <p key={p.name} className="font-mono text-[12px] leading-relaxed text-muted-foreground">
                <span className="font-semibold text-foreground">{p.name}</span>
                <span className="text-muted-foreground/60">={p.example}</span>{" "}
                <span className="font-sans text-muted-foreground/80">— {p.description}</span>
              </p>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={run}
            disabled={loading}
            className="press inline-flex items-center gap-1.5 rounded-lg bg-foreground px-3.5 py-2 text-[13px] font-semibold text-background transition-colors hover:bg-foreground/85 disabled:opacity-60"
          >
            {loading ? (
              <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden />
            ) : (
              <Play className="size-3.5" aria-hidden />
            )}
            Выполнить
          </button>
          {sampleUrl && (
            <code className="min-w-0 flex-1 truncate rounded-lg bg-secondary px-3 py-2 font-mono text-[12px] text-muted-foreground">
              {sampleUrl}
            </code>
          )}
        </div>

        {response !== null && (
          <div className="mt-3 overflow-hidden rounded-xl border border-border">
            <div className="flex items-center gap-2 border-b border-border bg-secondary/60 px-3 py-1.5">
              <Terminal className="size-3.5 text-muted-foreground" aria-hidden />
              <span className="text-[12px] font-medium text-muted-foreground">Ответ</span>
              <span
                className={`ml-auto rounded px-1.5 py-0.5 font-mono text-[11px] font-bold ${
                  status && status < 400 ? "bg-emerald-600/10 text-emerald-700" : "bg-red-600/10 text-red-700"
                }`}
              >
                {status} {elapsed !== null ? `· ${elapsed} мс` : ""}
              </span>
            </div>
            <pre className="max-h-[19rem] overflow-auto whitespace-pre-wrap break-words bg-stone-950 p-3.5 font-mono text-[12px] leading-relaxed text-stone-200 [overflow-wrap:anywhere]">
              {response}
            </pre>
          </div>
        )}
      </div>
    </article>
  );
}

export function ApiSection() {
  return (
    <section id="api" className="scroll-mt-20" aria-label="REST API проекта">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
        <div className="mb-8 max-w-3xl">
          <span className="mb-3 inline-block rounded-full border border-border bg-card px-3 py-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground shadow-card">
            Сетевые технологии на практике
          </span>
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">
            REST API приложения
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
            Каталог, поиск и статистика страницы обслуживаются собственным REST-интерфейсом:
            пять эндпоинтов, JSON-представления ресурсов, корректные коды ответов и
            кеширование на уровне HTTP-заголовков. Ниже — живая консоль: каждый запрос
            выполняется по-настоящему, из вашего браузера.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {ENDPOINTS.map((e) => (
            <ApiPlayground key={e.path} endpoint={e} />
          ))}
        </div>
      </div>
    </section>
  );
}
