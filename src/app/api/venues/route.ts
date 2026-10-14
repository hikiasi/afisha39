/**
 * GET /api/venues — справочник площадок с числом предстоящих событий
 * и списком представленных категорий.
 */

import { listVenues } from "@/lib/events";
import { JSON_HEADERS } from "@/lib/api-utils";

export async function GET() {
  const venues = listVenues();
  return new Response(JSON.stringify({ count: venues.length, items: venues }, null, 0), {
    status: 200,
    headers: JSON_HEADERS,
  });
}
