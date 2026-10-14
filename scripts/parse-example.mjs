#!/usr/bin/env node
/**
 * ============================================================================
 *  АФИША39 — демонстрация сбора данных из внешнего источника по HTTP
 *  Проект курсовой работы по дисциплине «Сетевые информационные технологии»
 *  КГТУ, группа 23-ИЭ-1, Волков И.Н.
 * ============================================================================
 *
 *  Назначение:
 *    Скрипт показывает базовую технику, на которой строится подсистема
 *    сбора данных агрегатора: HTTP-запрос к внешнему источнику,
 *    обработка ответа, извлечение структурированных фрагментов
 *    и вывод результата в формате JSON.
 *
 *  В реальной подсистеме аналогичные модули применяются к афишам
 *  городских порталов: полученная информация приводится к формату
 *  датасета src/data/events.json (см. src/lib/types.ts).
 *
 *  Запуск:
 *    node scripts/parse-example.mjs                      (пример.com)
 *    node scripts/parse-example.mjs https://kgtu.ru     (любой адрес)
 * ============================================================================
 */

const DEFAULT_URL = "https://example.com";

/** Заголовки запроса — представляемся обычным браузером */
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml",
  "Accept-Language": "ru-RU,ru;q=0.9",
};

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&/g, "&")
    .replace(/"/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .trim();
}

/** Извлечение текста по регулярному выражению (первое совпадение) */
function firstMatch(html, re) {
  const m = html.match(re);
  if (!m) return null;
  // удаляем вложенные теги и лишние пробелы, затем декодируем сущности
  return decodeEntities(m[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
}

function extractLinks(html) {
  const out = [];
  const re = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(html)) !== null && out.length < 20) {
    const text = decodeEntities(m[2].replace(/<[^>]+>/g, " "))
      .replace(/\s+/g, " ");
    out.push({ href: m[1], text: text.slice(0, 80) });
  }
  return out;
}

async function main() {
  const url = process.argv[2] || DEFAULT_URL;
  console.log(`Источник: ${url}\n`);

  // 1. HTTP-запрос с таймаутом 10 секунд
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let res;
  try {
    res = await fetch(url, { headers: HEADERS, signal: controller.signal });
  } catch (err) {
    console.error("Не удалось выполнить запрос:", err.message);
    console.error("Проверьте адрес и подключение к сети.");
    process.exit(1);
  } finally {
    clearTimeout(timer);
  }

  // 2. Метаданные ответа — те самые данные протокола HTTP,
  //    которые рассматриваются в теоретической части курсовой работы
  console.log("Статус:", res.status, res.statusText);
  console.log("Content-Type:", res.headers.get("content-type") ?? "—");
  console.log("Cache-Control:", res.headers.get("cache-control") ?? "—");
  console.log("");

  // 3. Разбор тела ответа
  const html = await res.text();

  const page = {
    url,
    title: firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    h1: firstMatch(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i),
    description: firstMatch(html, /<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i),
    linksFound: 0,
    links: extractLinks(html),
  };
  page.linksFound = page.links.length;

  // 4. Результат в машиночитаемом виде — как если бы передавали
  //    его дальше конвейеру агрегации
  console.log(JSON.stringify(page, null, 2));
}

main();
