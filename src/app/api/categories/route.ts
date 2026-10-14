/**
 * GET /api/categories — справочник категорий событий с числом
 * предстояших событий в каждой категории.
 */

import { listCategories } from "@/lib/events";
import { JSON_HEADERS } from "@/lib/api-utils";

export async function GET() {
  const categories = listCategories();
  return new Response(JSON.stringify({ count: categories.length, items: categories }, null, 0), {
    status: 200,
    headers: JSON_HEADERS,
  });
}
