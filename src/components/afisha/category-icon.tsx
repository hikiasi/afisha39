"use client";

/**
 * Отображение иконки категории по её идентификатору.
 * Единая точка сопоставления идентификаторов и графем Lucide.
 */

import {
  Baby,
  Drama,
  GraduationCap,
  MapPinned,
  Mic,
  Music,
  Palette,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  concerts: Music,
  theatre: Drama,
  exhibitions: Palette,
  festivals: Sparkles,
  kids: Baby,
  sports: Trophy,
  humor: Mic,
  education: GraduationCap,
  citywalks: MapPinned,
};

export function CategoryIcon({
  categoryId,
  className,
  style,
}: {
  categoryId: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const Icon = ICONS[categoryId] ?? Sparkles;
  return <Icon className={className} style={style} aria-hidden strokeWidth={1.8} />;
}
