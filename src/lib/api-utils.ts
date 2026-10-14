/**
 * Общие заголовки ответов REST API «Афиша39».
 *
 * Cache-Control с директивой s-maxage позволяет CDN и серверам-посредникам
 * кешировать GET-ответы, а stale-while-revalidate — отдавать кеш сразу,
 * обновляя его в фоне. Это один из механизмов HTTP, рассматриваемых
 * в курсовой работе.
 */

export const JSON_HEADERS: HeadersInit = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
};

export function jsonError(message: string, status: number, details?: unknown) {
  return Response.json({ error: message, status, details: details ?? null }, { status, headers: JSON_HEADERS });
}
