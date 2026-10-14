/**
 * Общий список навигации для шапки и подвала (якорные ссылки на секции).
 * Серверный компонент — рендерится в статическом HTML.
 */

export const NAV_ITEMS = [
  { href: "#catalog", label: "События" },
  { href: "#venues", label: "Площадки" },
  { href: "#api", label: "REST API" },
  { href: "#about", label: "О проекте" },
];

export function SiteHeaderNavList() {
  return (
    <ul className="space-y-2">
      {NAV_ITEMS.map((item) => (
        <li key={item.href}>
          <a
            href={item.href}
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
