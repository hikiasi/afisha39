import type { Metadata } from "next";
import { Golos_Text, Playfair_Display } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { QueryProvider } from "@/components/afisha/query-provider";

/**
 * Типографика проекта:
 *  — Golos Text — гротеск с полной кириллицей (основа интерфейса);
 *  — Playfair Display — дисплейная антиква для заголовков (редакционный стиль).
 * next/font скачивает файлы на этапе сборки и хостит их локально,
 * поэтому в рантайме запросов к внешним серверам нет.
 */
const golos = Golos_Text({
  variable: "--font-golos",
  subsets: ["cyrillic", "latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["cyrillic", "latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Афиша39 — куда сходить в Калининграде",
  description:
    "Афиша событий Калининграда: концерты, спектакли, выставки, экскурсии и фестивали. Учебный проект по дисциплине «Сетевые информационные технологии» (КГТУ, 23-ИЭ-1).",
  keywords: [
    "Калининград",
    "афиша",
    "события",
    "куда сходить",
    "КГТУ",
    "сетевые информационные технологии",
  ],
  authors: [{ name: "Волков Иван Николаевич" }],
  openGraph: {
    title: "Афиша39 — куда сходить в Калининграде",
    description:
      "Концерты, спектакли, выставки, экскурсии и фестивали Калининграда в одном каталоге.",
    locale: "ru_RU",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${golos.variable} ${playfair.variable} antialiased bg-background text-foreground flex min-h-screen flex-col`}
      >
        <QueryProvider>{children}</QueryProvider>
        <Toaster />
      </body>
    </html>
  );
}
