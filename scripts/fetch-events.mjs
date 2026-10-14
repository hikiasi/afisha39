#!/usr/bin/env node
/**
 * ============================================================================
 *  АФИША39 — Краулер реальных событий с афиши klops.ru
 *  Проект курсовой работы по дисциплине «Сетевые информационные технологии»
 *  КГТУ, группа 23-ИЭ-1, Волков И.Н.
 * ============================================================================
 *
 *  Назначение:
 *    Собирает РЕАЛЬНЫЕ события Калининграда с публичной серверной афиши
 *    klops.ru и формирует файл src/data/events.json — канонический
 *    датасет, который обслуживает REST API приложения.
 *
 *  Как работает:
 *    1. Обход списочных страниц: главная афиша + поисковые страницы
 *       категорий + подборка «Сходить с детьми» (серверный HTML).
 *    2. Загрузка детальных страниц событий; разбор разметки:
 *       - микроформат schema.org/Event (точные даты-время, площадка,
 *         гео-координаты);
 *       - возрастной ценз, кнопка покупки билета, описание.
 *    3. Нормализация в структуру датасета: категории, площадки,
 *       признак «вход свободный», ссылки на источник.
 *
 *  Модель цены:
 *    price = 0   — вход свободный;
 *    price = -1  — вход платный, точная цена не публикуется
 *                  (уточняется у продавца билетов).
 *
 *  Защита от сбоев источника:
 *    если собрано подозрительно мало событий (< MIN_EVENTS), файл
 *    events.json НЕ перезаписывается — приложение продолжает работать
 *    с последним удачным датасетом.
 *
 *  Запуск:
 *    node scripts/fetch-events.mjs        (Node.js >= 18)
 *    npm run data:fetch
 *
 *  Регламент вежливости: пауза между запросами, ограничение параллелизма,
 *    повторные попытки с нарастающей задержкой.
 * ============================================================================
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "src", "data", "events.json");

const BASE = "https://klops.ru";
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const REQUEST_DELAY_MS = 350; // пауза между HTTP-запросами
const CONCURRENCY = 3;        // одновременных запросов к детальным страницам
const RETRIES = 2;            // повторных попыток на запрос
const MIN_EVENTS = 20;        // защита: ниже — аварийный выход без перезаписи
const MAX_SESSIONS = 12;      // максимум сеансов, сохраняемых от одного события
const MAX_DESC_CHARS = 900;   // ограничение описания

/* ------------------------------------------------------------------ */
/*  HTTP с паузами и повторными попытками                              */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url, tries = RETRIES + 1) {
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": UA,
          Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
          "Accept-Language": "ru-RU,ru;q=0.9,en;q=0.8",
        },
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (err) {
      if (attempt === tries) throw err;
      await sleep(1000 * attempt);
    }
  }
  throw new Error("unreachable");
}

/* ------------------------------------------------------------------ */
/*  Разметка: базовые утилиты                                          */
/* ------------------------------------------------------------------ */

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&laquo;/g, "«")
    .replace(/&raquo;/g, "»")
    .replace(/&ldquo;/g, "“")
    .replace(/&rdquo;/g, "”")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&middot;/g, "·")
    .replace(/&hellip;/g, "…")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&apos;/g, "’")
    .replace(/&lquo;/g, "«")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

/** HTML-фрагмент → текст с абзацами */
function htmlToText(fragment) {
  const paragraphs = fragment
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .split(/<\/(?:p|li|div)>/i)
    .map((chunk) =>
      decodeEntities(
        chunk
          .replace(/<br\s*\/?>/gi, " ")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
      )
    )
    .filter((t) => t.length > 2);
  let text = paragraphs.join("\n\n");
  if (text.length > MAX_DESC_CHARS) {
    text = text.slice(0, MAX_DESC_CHARS);
    const dot = Math.max(text.lastIndexOf(". "), text.lastIndexOf("."));
    text = (dot > MAX_DESC_CHARS * 0.6 ? text.slice(0, dot + 1) : text) + " …";
  }
  return text;
}

/* ------------------------------------------------------------------ */
/*  Карточки списочных страниц                                         */
/* ------------------------------------------------------------------ */

/** Разбор одной карточки-ссылки <a class="card-…" href="/afisha/NNNN-…"> */
function parseCard(anchorHtml) {
  const href = anchorHtml.match(/href="(\/afisha\/(\d+)-[^"]*)"/);
  if (!href) return null;
  const id = href[2];
  if (Number(id) < 10000) return null; // отсекаем служебные ссылки вида /afisha/2026-…
  const card = { id, url: href[1] };

  const label = anchorHtml.match(/class="card-label"[^>]*>\s*([^<]+?)\s*</);
  card.category = label ? decodeEntities(label[1]) : null;

  const title =
    anchorHtml.match(/class="card-title"[^>]*>\s*([^<]+?)\s*</) ||
    anchorHtml.match(/alt="([^"]{4,})"/);
  card.title = title ? decodeEntities(title[1]) : null;

  const date = anchorHtml.match(/class="card-date">\s*([^<]+?)\s*</);
  card.dateText = date ? decodeEntities(date[1]) : null;

  const place = anchorHtml.match(/class="card-place[^"]*">\s*([^<]+?)\s*</);
  card.place = place ? decodeEntities(place[1]) : null;

  /*
   * Признак «вход свободный»: в разметке карточек есть СКРЫТЫЙ
   * шаблонный оверлей «Вход свободный» даже у платных событий,
   * поэтому единственный надёжный маркер платного входа —
   * кнопка «Купить билет». Свободный вход фиксируется только когда
   * маркер свободы присутствует, а кнопки покупки нет.
   */
  const hasBuyButton = /Купить билет/.test(anchorHtml);
  const hasFreeMark = /Вход свободный/.test(anchorHtml);
  card.free = hasFreeMark && !hasBuyButton;

  const img = anchorHtml.match(/<img\s+src="([^"]+)"/);
  card.image = img ? img[1] : null;
  return card;
}

/** Все карточки страницы списков */
function parseCards(html) {
  const cards = new Map();
  const re = /<a\s[^>]*href="\/afisha\/\d+-[^"]*"[^>]*>[\s\S]*?<\/a>/g;
  let m;
  while ((m = re.exec(html))) {
    const card = parseCard(m[0]);
    if (card) cards.set(card.id, card);
  }
  return [...cards.values()];
}

/* ------------------------------------------------------------------ */
/*  Словарь категорий источника                                        */
/* ------------------------------------------------------------------ */

/** slug поисковой страницы → id категории приложения */
const CATEGORY_PAGES = [
  { slug: "kontserty", label: "Концерты", cat: "concerts" },
  { slug: "teatr", label: "Театр", cat: "theatre" },
  { slug: "stendap", label: "Стендап", cat: "humor" },
  { slug: "vystavki", label: "Выставки", cat: "exhibitions" },
  { slug: "festivali-prazdniki", label: "Фестивали и праздники", cat: "festivals" },
  { slug: "vecherinki", label: "Вечеринки", cat: "festivals" },
  { slug: "sport", label: "Спорт", cat: "sports" },
  { slug: "lektsii", label: "Лекции и мастер-классы", cat: "education" },
  { slug: "vstrechi", label: "Встречи", cat: "education" },
  { slug: "ekskursii", label: "Экскурсии", cat: "citywalks" },
];

/** Подборка «Сходить с детьми» — перекрывает жанровую категорию */
const KIDS_SELECTION = "shodit-s-detmi";

/** Метка на карточке → id категории приложения */
const LABEL_TO_CAT = Object.fromEntries(
  CATEGORY_PAGES.map((c) => [c.label, c.cat])
);
LABEL_TO_CAT["Фестивали, праздники"] = "festivals";
LABEL_TO_CAT["Лекции, мастер-классы"] = "education";

/** Эвристики для событий без метки (слайдер «Актуальное») */
const TITLE_HEURISTICS = [
  [/(стенд[- ]?ап|квн|юмор|шутк|импровиз)/i, "humor"],
  [/(балет|опер[аеы]|спектакл|мюзикл|театр|комеди|драм[ае]|премьер|хореограф|танц[а-яё]* (?:шоу|программ)|антреприз)/i, "theatre"],
  [/(выставк|экспозици|вернисаж|фотовернисаж|галере|фотопроект)/i, "exhibitions"],
  [/(фестивал|праздник|шоу|карнавал|новый год|самайн|хеллоуин|маслениц|ярмарк)/i, "festivals"],
  [/(концерт|оркестр|органист|орган|филармон|джаз|симфони|неоклассик|саундтрек|музык|песн|певец|певица|рок|хор|ансамбл)/i, "concerts"],
  [/(матч|турнир|лига|чемпионат|спорт|хоккей|футбол|бокс|соревнован)/i, "sports"],
  [/(лекци|мастер-класс|семинар|встреча с|беседа|публ\w* чтен)/i, "education"],
  [/(экскурси|прогулк|квест по|обзорн\w+ экскурс)/i, "citywalks"],
];

/** Площадка-подсказка для событий без метки */
const VENUE_HEURISTICS = [
  [/филармон|кирх/i, "concerts"],
  [/драмтеатр|тюз|театр/i, "theatre"],
  [/музей/i, "exhibitions"],
  [/дс |дворец спорта|стадион|арена/i, "sports"],
];

function guessCategory(title, place) {
  for (const [re, cat] of TITLE_HEURISTICS) if (re.test(title)) return cat;
  for (const [re, cat] of VENUE_HEURISTICS) if (place && re.test(place)) return cat;
  return "festivals"; // нейтральное значение по умолчанию
}

/* ------------------------------------------------------------------ */
/*  Разбор детальной страницы события                                  */
/* ------------------------------------------------------------------ */

function parseEventPage(html) {
  const out = {};

  const h1 = html.match(/<h1 class="detail-title">\s*([\s\S]*?)\s*<\/h1>/);
  out.title = h1 ? decodeEntities(h1[1].replace(/<[^>]+>/g, "")) : null;

  const age = html.match(/class="detail-age">\s*([^<]+?)\s*</);
  out.age = age ? decodeEntities(age[1]) : null;

  const buy = html.match(/class="btn-theme-detail-buy[^"]*"[^>]*href="([^"]+)"/);
  out.ticketUrl = buy ? decodeEntities(buy[1]) : null;

  const og = html.match(/<meta property="og:image" content="([^"]+)"/);
  out.ogImage = og ? og[1] : null;

  /* Микроформат schema.org/Event: точные даты начала сеансов */
  out.startDates = [...html.matchAll(/itemprop="startDate">\s*([^<]+?)\s*</g)]
    .map((m) => m[1].trim())
    .filter((s) => /^\d{4}-\d{2}-\d{2}T/.test(s));

  /* Резервный разбор таблицы «Дата и место»: ячейки даты и времени */
  out.tableRows = [...html.matchAll(
    /<td class="date">\s*<div>\s*([^<]+?)\s*<\/div>[\s\S]*?<td class="time">\s*(\d{1,2}:\d{2})\s*</g
  )].map((m) => ({ dateText: decodeEntities(m[1]), time: m[2] }));

  /* Площадка: микроформат Place внутри первого Event-блока */
  const placeBlock = html.match(/itemprop="location"[^>]*>[\s\S]{0,2200}?(?=<\/div>\s*<\/div>|<a class="data-table-name)/);
  if (placeBlock) {
    const b = placeBlock[0];
    const name = b.match(/itemprop="name">\s*([^<]+?)\s*</);
    out.venueName = name ? decodeEntities(name[1]) : null;
    const addr = b.match(/itemprop="address">\s*([^<]+?)\s*</);
    out.venueAddress = addr && addr[1] !== "Без адреса" ? decodeEntities(addr[1]) : null;
    const lat = b.match(/itemprop="latitude" content="([^"]+)"/);
    const lng = b.match(/itemprop="longitude" content="([^"]+)"/);
    out.lat = lat ? Number(lat[1]) : null;
    out.lng = lng ? Number(lng[1]) : null;
    const placeUrl = b.match(/href="(\/afisha\/places\/(\d+)-[^"]*)"/);
    out.placeUrl = placeUrl ? placeUrl[1] : null;
    out.placeId = placeUrl ? placeUrl[2] : null;
  }

  const short = html.match(/class="data-table-name"[^>]*>\s*([^<]+?)\s*</);
  out.venueShort = short ? decodeEntities(short[1]) : null;

  const desc = html.match(/<div class="detail-description[^"]*">([\s\S]*?)<\/div>\s*(?:<div|$)/);
  out.description = desc ? htmlToText(desc[1]) : "";

  return out;
}

/* ------------------------------------------------------------------ */
/*  Справочник известных площадок (обогащение данных источника)         */
/* ------------------------------------------------------------------ */

/**
 * Ключевые площадки: нормализованные имена и уточняющие данные.
 * Совпадение выполняется по подстроке нормализованного названия.
 */
const KNOWN_VENUES = [
  {
    id: "philharmonic",
    match: /филармон/,
    name: "Калининградская областная филармония им. Е. Ф. Светланова",
    shortName: "Областная филармония",
    address: "пр-т Мира, 279 (кирха памяти королевы Луизы) и новый зал на Московском проспекте",
    district: "Центральный район",
    description:
      "Главная концертная организация региона: камерный зал в восстановленной кирхе королевы Луизы 1899 года и новый Большой концертный зал с органом.",
    site: "https://kldphil.ru",
  },
  {
    id: "dramteatr",
    match: /драматическ[а-яё]+ театр|драмтеатр/,
    name: "Калининградский областной драматический театр",
    shortName: "Драматический театр",
    address: "ул. Луначарского, 53",
    district: "Центральный район",
    description:
      "Старейший театр региона, открытый в 1947 году. Репертуар включает классику, современную драматургию и постановки для детей.",
    site: null,
  },
  {
    id: "amber-museum",
    match: /музей янтаря/,
    name: "Музей янтаря",
    shortName: "Музей янтаря",
    address: "пл. Маршала Василькова, 1",
    district: "Центральный район",
    description:
      "Единственный в России музей, целиком посвящённый янтарю. Расположен в башне Дона — форте городской крепостной стены XIX века.",
    site: "https://ambermuseum.ru",
  },
  {
    id: "ocean-museum",
    match: /мирового океана/,
    name: "Музей Мирового океана",
    shortName: "Музей Мирового океана",
    address: "наб. Петра Великого, 1",
    district: "Ленинградский район",
    description:
      "Морской музей на набережной реки Преголи: научно-исследовательские суда, подводная лодка Б-413 и аквариальный комплекс.",
    site: null,
  },
  {
    id: "zoo",
    match: /зоопарк|зоосад/,
    name: "Калининградский зоопарк",
    shortName: "Зоопарк",
    address: "просп. Мира, 26",
    district: "Центральный район",
    description:
      "Один из старейших зоопарков России (основан в 1896 году): более трёхсот видов животных и историческая довоенная застройка.",
    site: null,
  },
  {
    id: "cathedral",
    match: /кафедральн[а-яё]+ собор/,
    name: "Кафедральный собор (Кнайпхоф)",
    shortName: "Кафедральный собор",
    address: "ул. Канта, 1 (остров Кнайпхоф)",
    district: "Центральный район",
    description:
      "Готический собор XIV века на острове Кнайпхоф: руины у стенки И. Канта, органный зал и выставочные пространства.",
    site: null,
  },
  {
    id: "fish-village",
    match: /рыбн[а-яё]+ деревн/,
    name: "Рыбная деревня",
    shortName: "Рыбная деревня",
    address: "ул. Эпроновская, 1–9 (этнографический квартал)",
    district: "Центральный район",
    description:
      "Этнографический ремесленно-торговый квартал на берегу Преголи, стилизованный под довоенный Кёнигсберг.",
    site: null,
  },
  {
    id: "friedland-gate",
    match: /фридландск[а-яё]+ ворот/,
    name: "Фридландские ворота",
    shortName: "Фридландские ворота",
    address: "ул. Дзержинского, 30",
    district: "Московский район",
    description:
      "Музей в фортификационном сооружении XIX века: городские ворота, казематы и экспозиция о жизни старого Кёнигсберга.",
    site: null,
  },
  {
    id: "history-museum",
    match: /историко-художественн[а-яё]+ музей/,
    name: "Калининградский областной историко-художественный музей",
    shortName: "Художественный музей",
    address: "ул. Клиническая, 21",
    district: "Ленинградский район",
    description:
      "Областной музей изобразительного искусства и истории Восточной Пруссии, открытый в 1946 году в здании бывшего городского театра.",
    site: null,
  },
  {
    id: "yantar-hall",
    match: /янтарь-холл/,
    name: "Янтарь-Холл",
    shortName: "Янтарь-Холл",
    address: "г. Светлогорск, Калининградская область",
    district: "Светлогорский городской округ",
    description:
      "Современный концертно-конгрессный комплекс на побережье Балтийского моря: гастрольные шоу, фестивали и форумы.",
    site: null,
  },
  {
    id: "kgtu",
    match: /кгту|технологическ[а-яё]+ университ/,
    name: "Калининградский государственный технический университет",
    shortName: "КГТУ",
    address: "Советский проспект, 1 (учебные корпуса в центре города)",
    district: "Центральный район",
    description:
      "Старейший технический вуз региона: научно-образовательные мероприятия, конференции и студенческие проекты.",
    site: null,
  },
  {
    id: "bfu",
    match: /балтийск[а-яё]+ федеральн[а-яё]+ университ|бфу|иммануил[а-яё]+ кант/,
    name: "Балтийский федеральный университет им. И. Канта",
    shortName: "БФУ им. И. Канта",
    address: "ул. Александра Невского, 14",
    district: "Центральный район",
    description:
      "Классический университет Калининграда: лектории, научные фестивали и открытые мероприятия городских кампусов.",
    site: null,
  },
  {
    id: "curonian",
    match: /куршск[а-яё]+ кос/,
    name: "Национальный парк «Куршская коса»",
    shortName: "Куршская коса",
    address: "Куршская коса, пос. Лесной",
    district: "Зеленоградский район",
    description:
      "Национальный парк на песчаной косе между Балтийским морем и Куршским заливом: экотропы, музей и орнитологическая станция.",
    site: null,
  },
];

const translitPad = (n) => String(n).padStart(2, "0");

/** Локальная «наивная» метка времени YYYY-MM-DDTHH:mm:00 */
function naiveNow() {
  const d = new Date();
  return `${d.getFullYear()}-${translitPad(d.getMonth() + 1)}-${translitPad(d.getDate())}T${translitPad(d.getHours())}:${translitPad(d.getMinutes())}:00`;
}

const MONTHS = {
  января: 1, февраля: 2, марта: 3, апреля: 4, мая: 5, июня: 6,
  июля: 7, августа: 8, сентября: 9, октября: 10, ноября: 11, декабря: 12,
};

/** ISO-строка источника (+02:00, Калининград) → наивное локальное время */
function isoToLocalNaive(iso) {
  const m = iso.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/);
  return m ? `${m[1]}T${m[2]}:00` : null;
}

/** «17 октября 2026» + «18:00» → компоненты даты; год может отсутствовать */
function dateTextToParts(text, time) {
  const m = text.match(/(\d{1,2})\s+([а-яё]+)/i);
  if (!m) return null;
  const month = MONTHS[m[2].toLowerCase()];
  if (!month) return null;
  const yearM = text.match(/(\d{4})/);
  return { day: translitPad(Number(m[1])), month: translitPad(month), year: yearM ? yearM[1] : null, time };
}

function nowDay() {
  const d = new Date();
  return `${d.getFullYear()}-${translitPad(d.getMonth() + 1)}-${translitPad(d.getDate())}`;
}

/* ------------------------------------------------------------------ */
/*  Этап 1. Списочные страницы                                         */
/* ------------------------------------------------------------------ */

console.log("Этап 1. Обход списочных страниц klops.ru…");

const cards = new Map(); // id → card
let kidsIds = new Set();

async function crawlListing(url, label, { kids = false } = {}) {
  try {
    const html = await fetchText(url);
    const list = parseCards(html);
    let newCount = 0;
    for (const c of list) {
      if (kids) kidsIds.add(c.id);
      if (!cards.has(c.id)) {
        cards.set(c.id, c);
        newCount++;
      }
    }
    console.log(`  ${label}: ${list.length} карточек (+${newCount} новых), всего ${cards.size}`);
  } catch (err) {
    console.warn(`  ! ${label}: пропущено (${err.message})`);
  }
}

await crawlListing(`${BASE}/afisha/`, "главная афиша");

for (const cat of CATEGORY_PAGES) {
  await sleep(REQUEST_DELAY_MS);
  await crawlListing(
    `${BASE}/afisha/search?search=&category=${cat.slug}&period=plus_year`,
    `категория «${cat.label}»`
  );
}

await sleep(REQUEST_DELAY_MS);
await crawlListing(
  `${BASE}/afisha/search?search=&selections%5B%5D=${KIDS_SELECTION}&period=plus_year`,
  "подборка «Сходить с детьми»",
  { kids: true }
);

if (cards.size < MIN_EVENTS) {
  console.error(`АВАРИЙНЫЙ ВЫХОД: собрано всего ${cards.size} событий (< ${MIN_EVENTS}).`);
  console.error("Файл events.json не изменён — источник, вероятно, недоступен.");
  process.exit(1);
}

console.log(`Собрано ссылок на события: ${cards.size}`);

/* ------------------------------------------------------------------ */
/*  Этап 2. Детальные страницы                                         */
/* ------------------------------------------------------------------ */

console.log(`\nЭтап 2. Загрузка ${cards.size} детальных страниц (по ${CONCURRENCY} параллельно)…`);

const queue = [...cards.values()];
const details = new Map(); // id → detail
let failures = 0;

async function worker() {
  while (queue.length) {
    const card = queue.shift();
    if (!card) break;
    try {
      const html = await fetchText(`${BASE}${card.url}`);
      details.set(card.id, parseEventPage(html));
    } catch (err) {
      failures++;
      console.warn(`  ! событие ${card.id} (${card.title ?? "?"}) не загружено: ${err.message}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }
}

await Promise.all(Array.from({ length: CONCURRENCY }, worker));
console.log(`Детальные страницы: успешно ${details.size}, ошибок ${failures}`);

if (details.size < MIN_EVENTS) {
  console.error(`АВАРИЙНЫЙ ВЫХОД: разобрано всего ${details.size} событий (< ${MIN_EVENTS}).`);
  console.error("Файл events.json не изменён.");
  process.exit(1);
}

/* ------------------------------------------------------------------ */
/*  Этап 3. Площадки                                                   */
/* ------------------------------------------------------------------ */

console.log("\nЭтап 3. Реестр площадок…");

const venues = new Map(); // id → venue

function venueKey(detail, card) {
  if (detail?.placeId) return `v${detail.placeId}`;
  const name = detail?.venueName || card?.place || "Неизвестная площадка";
  return "n" + name.toLowerCase().replace(/[^а-яёa-z0-9]+/gi, "-").slice(0, 40);
}

function normalizeName(s) {
  return (s || "")
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[«»"„“]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findKnownVenue(name) {
  const norm = normalizeName(name);
  for (const v of KNOWN_VENUES) if (v.match.test(norm)) return v;
  return null;
}

function upsertVenue(detail, card) {
  const key = venueKey(detail, card);
  if (venues.has(key)) return venues.get(key);

  const fullName = detail?.venueName || card?.place || "Площадка не указана";
  const known = findKnownVenue(fullName);
  const venue = {
    id: known ? known.id : key,
    name: known ? known.name : fullName,
    shortName: known ? known.shortName : card?.place || fullName.slice(0, 40),
    address: known ? known.address : detail?.venueAddress || "",
    district: known ? known.district : "",
    description: known ? known.description : "",
    site: known ? known.site : null,
    lat: detail?.lat ?? null,
    lng: detail?.lng ?? null,
  };
  venues.set(key, venue);
  return venue;
}

/* ------------------------------------------------------------------ */
/*  Этап 4. Сборка датасета                                            */
/* ------------------------------------------------------------------ */

console.log("\nЭтап 4. Нормализация и сборка датасета…");

const events = [];
let skippedPast = 0;
const catStats = {};

for (const [id, card] of cards) {
  const d = details.get(id);
  if (!d) continue;

  const title = d.title || card.title || "Событие";
  const venue = upsertVenue(d, card);

  /* Категория: метка карточки → подборка «детям» → эвристика */
  let categoryId = card.category ? LABEL_TO_CAT[card.category] : null;
  if (!categoryId) categoryId = guessCategory(title, card.place || venue.shortName);
  if (kidsIds.has(id)) categoryId = "kids";

  /* Даты сеансов: точные schema.org, при отсутствии — таблица */
  let sessions = d.startDates.map(isoToLocalNaive).filter(Boolean);
  if (sessions.length === 0) {
    sessions = d.tableRows
      .map((row) => {
        const parsed = dateTextToParts(row.dateText, row.time);
        if (!parsed) return null;
        const year = parsed.year || naiveNow().slice(0, 4);
        return `${year}-${parsed.month}-${parsed.day}T${parsed.time}:00`;
      })
      .filter(Boolean);
  }
  sessions = [...new Set(sessions)].sort();
  if (sessions.length > MAX_SESSIONS) sessions = sessions.slice(0, MAX_SESSIONS);

  const future = sessions.filter((s) => s >= naiveNow());
  skippedPast += sessions.length - future.length;

  /*
   * Длительные события (выставки): дата в источнике — день открытия,
   * который давно прошёл, но экспозиция продолжает работать — источник
   * продолжает показывать её в текущей афише. Такие события сохраняем
   * с датой синхронизации и пометкой «Идёт сейчас» (окно — до года,
   * пока событие числится в афише источника).
   */
  let ongoing = false;
  if (
    future.length === 0 &&
    categoryId === "exhibitions" &&
    sessions.length > 0
  ) {
    const last = sessions[sessions.length - 1];
    const daysAgo = Math.round(
      (new Date(nowDay()) - new Date(last.slice(0, 10))) / 86400000
    );
    if (daysAgo >= 0 && daysAgo <= 365) {
      future.push(`${nowDay()}T${last.slice(11)}`);
      ongoing = true;
    }
  }
  if (future.length === 0) continue;

  const recurring = ongoing
    ? "Идёт сейчас"
    : future.length > 1
      ? `${future.length} ${future.length < 5 ? "даты" : "дат"}`
      : null;

  const imageUrl = card.image && !/Noimage/i.test(card.image)
    ? card.image
    : d.ogImage && !/Noimage/i.test(d.ogImage)
      ? d.ogImage
      : null;

  const base = {
    title,
    categoryId,
    venueId: venue.id,
    price: card.free ? 0 : -1,
    priceNote: card.free ? null : "Точная цена — на странице продавца билетов",
    ageLimit: d.age,
    description: d.description || "Описание уточняется на странице события в афише источника.",
    highlights: null,
    recurring,
    source: "Klops.ru — афиша Калининграда",
    sourceUrl: `${BASE}${card.url}`,
    ticketUrl: d.ticketUrl,
    imageUrl,
  };

  if (future.length === 1) {
    events.push({ id, startsAt: future[0], endsAt: future[0], ...base });
  } else {
    future.forEach((s, i) => {
      events.push({ id: `${id}-${i + 1}`, startsAt: s, endsAt: s, ...base });
    });
  }

  catStats[categoryId] = (catStats[categoryId] ?? 0) + future.length;
}

events.sort((a, b) => (a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0));

/* Горизонт афиши */
const lastDay = events.length ? events[events.length - 1].startsAt.slice(0, 10) : nowDay();
const horizonDays = Math.max(
  1,
  Math.round((new Date(lastDay) - new Date(nowDay())) / 86400000) + 1
);

/* Площадки без будущих событий удаляем */
const usedVenueIds = new Set(events.map((e) => e.venueId));
const venueList = [...venues.values()].filter((v) => usedVenueIds.has(v.id));

console.log(`Событий (сеансов): ${events.length}; пропущено прошедших: ${skippedPast}`);
console.log(`Площадок: ${venueList.length}; горизонт: ${horizonDays} дн.`);
console.log("По категориям:", catStats);

if (events.length < MIN_EVENTS) {
  console.error(`АВАРИЙНЫЙ ВЫХОД: после нормализации осталось ${events.length} сеансов (< ${MIN_EVENTS}).`);
  console.error("Файл events.json не изменён.");
  process.exit(1);
}

const dataset = {
  generatedAt: new Date().toISOString(),
  generator: "scripts/fetch-events.mjs — краулер реальной афиши klops.ru",
  source: "https://klops.ru/afisha/",
  note:
    "Реальные события Калининграда, собранные автоматическим обходом публичной серверной афиши klops.ru (материалы сайта распространяются по лицензии CC BY-SA 4.0). Даты и площадки — из микроформата schema.org/Event. Цена -1 означает платный вход без публикуемой цены.",
  horizonDays,
  venues: venueList,
  events,
};

const backup = existsSync(OUT) ? readFileSync(OUT, "utf8") : null;
writeFileSync(OUT, JSON.stringify(dataset, null, 2) + "\n", "utf8");
console.log(`\nГотово: ${OUT}`);
console.log(`Событий: ${events.length}, площадок: ${venueList.length}`);

/* Контрольная сводка для журнала */
const dateBounds = `${events[0].startsAt.slice(0, 10)} … ${events[events.length - 1].startsAt.slice(0, 10)}`;
console.log(`Диапазон дат: ${dateBounds}`);
console.log(`Свободный вход: ${events.filter((e) => e.price === 0).length}`);
console.log(`С кнопкой «Купить билет»: ${events.filter((e) => e.ticketUrl).length}`);
console.log(`С обложкой: ${events.filter((e) => e.imageUrl).length}`);
if (backup) console.log("(предыдущий датасет заменён)");
