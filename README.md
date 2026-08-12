# Luna İK Platformu

Mavi yaka aday takibi, başvuru yönetimi ve yapay zeka call center verilerinin
tek merkezde toplandığı, veri gizliliği öncelikli İK web uygulaması.

## Özellikler

- **Ana Ekran** — 30 günlük başvuru istatistikleri, başvuru listesi, kaynak
  dağılımı, günlük trend ve YZ call center performans özeti
- **Aday Yönetimi** — Tüm / Olumlu / Olumsuz aday listeleri; arama, filtreleme,
  sayfalama, Excel dışa aktarma; aday detayı ve arama geçmişi
- **Analiz & Raporlar** — sonuç dağılımı, ulaşım durumu, kaynak/öğrenim
  dağılımları, İK uzmanı performansı, aylık karşılaştırmalı rapor
- **Projeler & Pozisyonlar & Norm Kadro** — proje bazlı MY/BY norm kadro ve
  eksik takibi, Excel çıktısı
- **Kaynaklar** — kaynak performansı, dönüşüm hunisi, maliyet/aday analizi
- **Yapay Zeka Call Center** — arama istatistikleri, SMS sonuçları, arama geçmişi
- **Veri Aktarımı** — Excel / CSV / JSON toplu aktarım (alan eşleme, satır bazlı
  hata raporu, mükerrer kontrolü) + telesekreter robotu için API ucu
- **Karekod Oluşturma** — kaynak/kurum/pozisyona özel QR; QR ile açılan, mobil
  uyumlu, KVKK onaylı herkese açık başvuru formu
- **Ayarlar** — kullanıcı ve rol yönetimi, pozisyon/kaynak tanımları, API
  anahtarları, denetim kaydı, sistem bilgileri

## Teknolojiler

| Katman | Teknoloji |
| --- | --- |
| Çatı | Next.js 16 (App Router, Server Actions), React 19, TypeScript |
| Arayüz | Tailwind CSS 4, Recharts, lucide-react |
| Veritabanı | Prisma 6 + SQLite (PostgreSQL'e geçişe hazır) |
| Kimlik | Argon2id + TOTP 2FA (RFC 6238, yerleşik uygulama) |
| Dosya işleme | exceljs, papaparse |

## Kurulum

```bash
npm install
cp .env.example .env        # anahtarları üretin (aşağıya bakın)
npx prisma migrate dev      # veritabanını oluşturur
npx prisma db seed          # demo verisi (1.250 aday, 10 proje, arama kayıtları)
npm run dev                 # http://localhost:3000
```

Anahtar üretimi (her ortam için ayrı üretin, asla repoya koymayın):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Demo hesaplar (seed sonrası)

| Rol | E-posta | Şifre |
| --- | --- | --- |
| Sistem Yöneticisi | `bilgiislem@tezmedikal.com.tr` | `LunaDemo2026!` |
| İK Uzmanı | `selin.yilmaz@tepe.com.tr` | `LunaDemo2026!` |

İlk girişte 2FA kurulumu zorunludur (Google/Microsoft Authenticator).
Üretime geçmeden önce tüm demo şifreleri değiştirin.

## Güvenlik mimarisi

- **Alan düzeyinde şifreleme:** Kişisel veriler (telefon, doğum tarihi, e-posta,
  adres, notlar, 2FA anahtarları) veritabanında **AES-256-GCM** ile şifreli
  saklanır (`enc:<iv>:<tag>:<ct>`). Veritabanı sızıntısında dahi kişisel veri
  anahtar olmadan okunamaz. Telefonla eşleşme için ayrı anahtarla **HMAC dizini**
  kullanılır.
- **Kimlik doğrulama:** Argon2id (OWASP parametreleri) + zorunlu TOTP 2FA.
  5 hatalı girişte 15 dk hesap kilidi; kullanıcı adı keşfine karşı sahte
  doğrulama; oturum token'ları yalnızca SHA-256 özet olarak saklanır; çerezler
  `httpOnly` + `SameSite=Lax` + (üretimde) `Secure`. Oturum süresi 8 saat.
- **Yetkilendirme (RBAC):** İK Asistanı < İK Uzmanı < İK Yöneticisi < Sistem
  Yöneticisi. Dışa aktarma asistan rolüne kapalı; kullanıcı/anahtar yönetimi
  yönetici rollerinde.
- **Denetim kaydı (KVKK):** Giriş, kişisel veri görüntüleme, güncelleme, dışa
  aktarma, toplu aktarım ve yönetim işlemleri IP ile birlikte loglanır.
- **API güvenliği:** Telesekreter ucu (`/api/ingest`) Bearer API anahtarı ile
  korunur; anahtarlar yalnızca hash olarak saklanır ve bir kez gösterilir.
  Tüm uçlarda Zod ile katı girdi doğrulama ve hız sınırlama (rate limit).
- **HTTP başlıkları:** CSP, `X-Frame-Options: DENY`, `nosniff`, HSTS,
  `Referrer-Policy`, `Permissions-Policy`.
- **Herkese açık form:** IP başına hız sınırı, pozisyon beyaz listesi, mükerrer
  başvuru kontrolü, zorunlu KVKK açık rızası (tarihiyle kaydedilir).

## Telesekreter robotu entegrasyonu

```
POST /api/ingest
Authorization: Bearer <api-anahtarı>
Content-Type: application/json

{
  "kayitlar": [{
    "adSoyad": "Mehmet Aydın",
    "telefon": "0532 123 45 67",
    "pozisyon": "Kaynakçı",
    "kaynak": "işkur.gov.tr",
    "arama": {
      "tarih": "2026-08-12T10:24:00+03:00",
      "kacinciArama": 1,
      "sonuc": "Olumlu",
      "gorusmeSuresiSn": 154,
      "smsDurumu": "Gönderildi",
      "not": "İşe başlamak istiyor."
    }
  }]
}
```

Anahtarlar **Ayarlar → Entegrasyon Yönetimi** bölümünden oluşturulur.
Aynı telefonla mevcut aday varsa arama kaydı adaya eklenir ve durumu güncellenir;
yoksa yeni aday açılır.

## PostgreSQL'e geçiş

Dağıtım kararı netleşince:

1. `prisma/schema.prisma` içinde `provider = "postgresql"` yapın
2. `DATABASE_URL`'i PostgreSQL bağlantısıyla değiştirin
3. `npx prisma migrate dev` çalıştırın

Şema SQLite'a özgü hiçbir özellik kullanmaz. Çok örnekli (multi-instance)
dağıtımda `src/lib/rate-limit.ts` Redis tabanlı bir uygulamayla değiştirilmelidir.

## Üretim notları

- `npm run build && npm start`
- Ters vekil (IIS/nginx) arkasında **HTTPS zorunlu** — 2FA ve çerez güvenliği
  için gereklidir; `APP_URL`'i gerçek alan adıyla güncelleyin
- `FIELD_ENCRYPTION_KEY` kaybedilirse şifreli veriler geri getirilemez —
  anahtarı güvenli bir kasada yedekleyin
- Veritabanı dosyasını (`prisma/*.db`) düzenli yedekleyin
