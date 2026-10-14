import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Автономная сборка (один исполняемый файл сервера) — удобно для деплоя.
  // Vercel игнорирует этот режим и использует собственную инфраструктуру.
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Скрыть плавающий значок dev-режима Next.js (не влияет на продакшен)
  devIndicators: false,
};

export default nextConfig;
