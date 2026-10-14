/**
 * GET /api/events/[id] — карточка одного события с развёрнутыми данными
 * площадки и категории. Отвечает 404 с телом JSON, если событие не найдено.
 *
 * Пример: /api/events/organnyj-vecher-bah-brukner-improvviso-e20261016-1
 */

import { getEventById } from "@/lib/events";
import { jsonError, JSON_HEADERS } from "@/lib/api-utils";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = getEventById(id);
    if (!event) {
      return jsonError(`Событие с идентификатором «${id}» не найдено.`, 404);
    }
    return new Response(JSON.stringify(event, null, process.env.NODE_ENV === "development" ? 2 : 0), {
      status: 200,
      headers: JSON_HEADERS,
    });
  } catch (error) {
    console.error("[api/events/[id]]", error);
    return jsonError("Внутренняя ошибка сервера при получении события.", 500);
  }
}
