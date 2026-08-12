// Alan sabitleri — ekranlardaki filtre ve form seçenekleri

export const BOLGELER = [
  "Marmara",
  "Ege",
  "İç Anadolu",
  "Akdeniz",
  "Karadeniz",
  "Doğu Anadolu",
  "G.Doğu Anadolu",
] as const;

export const OGRENIM_DURUMLARI = [
  "İlköğretim",
  "Ortaöğretim",
  "Lise",
  "Ön Lisans",
  "Lisans",
  "Yüksek Lisans",
] as const;

export const ASKERLIK_DURUMLARI = ["Yapıldı", "Yapılmadı", "Muaf"] as const;

export const CINSIYETLER = ["Erkek", "Kadın", "Belirtilmemiş"] as const;

export const DURUM_ETIKETLERI: Record<string, string> = {
  OLUMLU: "Olumlu",
  OLUMSUZ: "Olumsuz",
  BEKLEMEDE: "Beklemede",
  ULASILAMADI: "Ulaşılamadı",
};

export const ON_MULAKAT_SONUCLARI = [
  "Olumlu",
  "Olumsuz",
  "Beklemede",
  "Ulaşılamadı",
] as const;

export const ROL_ETIKETLERI: Record<string, string> = {
  SISTEM_YONETICISI: "Sistem Yöneticisi",
  IK_YONETICISI: "İK Yöneticisi",
  IK_UZMANI: "İK Uzmanı",
  IK_ASISTANI: "İK Asistanı",
};

export const CALL_SONUCLARI = [
  "Olumlu",
  "Olumsuz",
  "Beklemede",
  "Ulaşılamadı",
  "Hatalı Numara",
] as const;

/** Türkçe telefon normalize: 05321234567 → 0532 123 45 67 */
export function formatPhone(p: string | null | undefined): string {
  if (!p) return "—";
  const d = p.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) {
    return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`;
  }
  return p;
}

export function normalizePhone(p: string): string {
  let d = p.replace(/\D/g, "");
  if (d.length === 10 && d.startsWith("5")) d = "0" + d;
  if (d.length === 12 && d.startsWith("90")) d = "0" + d.slice(2);
  return d;
}

export function isValidTrPhone(p: string): boolean {
  const d = normalizePhone(p);
  return /^05\d{9}$/.test(d);
}

export function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return (
    date.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    " " +
    date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
  );
}

export function formatNumber(n: number): string {
  return n.toLocaleString("tr-TR");
}

export function formatPercent(n: number, digits = 1): string {
  return "%" + n.toLocaleString("tr-TR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}
