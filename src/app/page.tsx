/**
 * Главная (и единственная) страница приложения «Афиша39».
 *
 * Приложение построено как одностраничный клиент (SPA) с секциями
 * и модальными представлениями; данные всех интерактивных блоков
 * приходят из собственного REST API (см. секцию «REST API»).
 */

import { SiteHeader } from "@/components/afisha/site-header";
import { Hero } from "@/components/afisha/hero";
import { Catalog } from "@/components/afisha/catalog";
import { VenuesSection } from "@/components/afisha/venues-section";
import { ApiSection } from "@/components/afisha/api-section";
import { AboutSection } from "@/components/afisha/about-section";
import { SiteFooter } from "@/components/afisha/site-footer";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <Hero />
        <Catalog />
        <VenuesSection />
        <ApiSection />
        <AboutSection />
      </main>
      <SiteFooter />
    </>
  );
}
