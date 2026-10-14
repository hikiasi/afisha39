/**
 * GET /api/stats — агрегированная статистика каталога: общие счётчики,
 * события на сегодня и на неделю, распределение по категориям,
 * а также служебные сведения о датасете.
 */

import { getStats } from "@/lib/events";
import { JSON_HEADERS } from "@/lib/api-utils";

export async function GET() {
  const stats = getStats();
  return new Response(JSON.stringify(stats, null, 0), {
    status: 200,
    headers: JSON_HEADERS,
  });
}
