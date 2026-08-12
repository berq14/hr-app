import {
  LayoutDashboard,
  Users,
  UserCheck,
  UserX,
  ChartLine,
  NotebookText,
  ListTodo,
  Database,
  Sparkles,
  UserCog,
  QrCode,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  minRole?: "IK_YONETICISI" | "SISTEM_YONETICISI";
};

export const NAV_MAIN: NavItem[] = [
  { href: "/", label: "Ana Ekran", icon: LayoutDashboard },
  { href: "/adaylar", label: "Tüm Adaylar", icon: Users },
  { href: "/adaylar/olumlu", label: "Olumlu Adaylar", icon: UserCheck },
  { href: "/adaylar/olumsuz", label: "Olumsuz Adaylar", icon: UserX },
  { href: "/analiz", label: "Analiz & Raporlar", icon: ChartLine },
];

export const NAV_SECONDARY: NavItem[] = [
  { href: "/projeler", label: "Projeler", icon: NotebookText },
  { href: "/pozisyonlar", label: "Pozisyonlar", icon: ListTodo },
  { href: "/kaynaklar", label: "Kaynaklar", icon: Database },
  { href: "/call-center", label: "Yapay Zeka Call Center", icon: Sparkles },
  { href: "/norm-kadro", label: "Norm Kadro ve Eksikler", icon: UserCog },
  { href: "/karekod", label: "Kare Kod Oluşturma", icon: QrCode },
  { href: "/ayarlar", label: "Ayarlar", icon: Settings },
];

export function pageTitle(pathname: string): string {
  const all = [...NAV_MAIN, ...NAV_SECONDARY];
  // en uzun eşleşen yol
  const match = [...all]
    .sort((a, b) => b.href.length - a.href.length)
    .find((i) => pathname === i.href || pathname.startsWith(i.href + "/"));
  if (pathname === "/") return "Ana Ekran";
  return match && match.href !== "/" ? match.label : "Ana Ekran";
}
