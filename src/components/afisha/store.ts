"use client";

/**
 * Хранилище состояния интерфейса каталога (Zustand).
 * Поисковая строка в hero-секции и панель фильтров в каталоге
 * разделены вёрсткой, но работают с одним общим состоянием.
 */

import { create } from "zustand";
import type { DateRange, PriceFilter, SortOrder } from "@/lib/types";

interface CatalogState {
  q: string;
  category: string | null;
  date: DateRange | null;
  price: PriceFilter;
  sort: SortOrder;
  setQuery: (q: string) => void;
  setCategory: (c: string | null) => void;
  setDate: (d: DateRange | null) => void;
  setPrice: (p: PriceFilter) => void;
  setSort: (s: SortOrder) => void;
  reset: () => void;
}

export const useCatalog = create<CatalogState>((set) => ({
  q: "",
  category: null,
  date: null,
  price: "all",
  sort: "date",
  setQuery: (q) => set({ q }),
  setCategory: (category) => set({ category }),
  setDate: (date) => set({ date }),
  setPrice: (price) => set({ price }),
  setSort: (sort) => set({ sort }),
  reset: () => set({ q: "", category: null, date: null, price: "all", sort: "date" }),
}));
