# Devam Rehberi — Kaldığımız Yer ve Kurulum

Bu belge, projeye başka bir bilgisayardan devam edebilmek için mevcut durumu,
kurulum adımlarını ve açık işleri özetler.

Son güncelleme: 15 Ağustos 2026

---

## 1. Projeyi yeni bilgisayarda ayağa kaldırma

Gereksinim: **Node.js 20+** (proje Node 24 ile geliştirildi), npm, git.

```bash
git clone https://github.com/berq14/hr-app
cd hr-app
npm install
```

### .env dosyasını oluştur

`.env` repoda YOKTUR (bilinçli olarak — gizli anahtarlar repoya konmaz).
`.env.example` dosyasını kopyalayıp anahtarları üretin:

```bash
cp .env.example .env
```

Her anahtar için ayrı ayrı çalıştırıp çıktıları `.env` içine yapıştırın:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`.env` şu satırları içermeli:

```
DATABASE_URL="file:./dev.db"
FIELD_ENCRYPTION_KEY="<32-bayt-hex>"   # kişisel veri şifreleme anahtarı
SESSION_SECRET="<32-bayt-hex>"
INDEX_HMAC_KEY="<32-bayt-hex>"         # telefon arama dizini anahtarı
APP_URL="http://localhost:3000"
```

> ÖNEMLİ: `FIELD_ENCRYPTION_KEY` veritabanındaki şifreli kişisel verileri açar.
> Yeni anahtar üretirseniz ESKİ veritabanındaki şifreli alanlar okunamaz.
> Yeni kurulumda sorun değil (seed yeni veri üretir); ancak GERÇEK veri
> taşıyacaksanız eski `.env` anahtarlarını ve `prisma/dev.db` dosyasını
> birlikte taşıyın.

### Veritabanı + demo verisi

```bash
npx prisma migrate dev    # tabloları oluşturur
npx prisma db seed        # 1.250 aday, 10 proje, arama kayıtları, kullanıcılar
npm run dev               # http://localhost:3000
```

### Giriş

| Rol | E-posta | Şifre |
| --- | --- | --- |
| Sistem Yöneticisi | `bilgiislem@tezmedikal.com.tr` | `LunaDemo2026!` |
| İK Yöneticisi | `mehmet.kaya@tepe.com.tr` | `LunaDemo2026!` |
| İK Uzmanı | `selin.yilmaz@tepe.com.tr` | `LunaDemo2026!` |

İlk girişte **2FA kurulumu zorunlu**: ekrandaki QR'ı Google/Microsoft
Authenticator ile tarayın, 6 haneli kodu girin. (Taze seed sonrası tüm
hesaplarda 2FA sıfırdan kurulur.)

Telesekreter robotu demo API anahtarı: `luna_ing_demo_c8f2a91e4b7d36a5`
(kullanım örneği README'de ve /import ekranında).

---

## 2. Projenin mevcut durumu (ne bitti)

Tamamlanan ve test edilen işler:

- **Altyapı:** Next.js 16 (App Router) + TypeScript + Tailwind 4 + Prisma 6 +
  SQLite. `npm run build` temiz, `npm audit` 0 zafiyet.
- **Güvenlik:** AES-256-GCM alan şifreleme (telefon, doğum tarihi, e-posta,
  adres, notlar, 2FA anahtarları — veritabanında `enc:` önekiyle şifreli),
  Argon2id şifre, zorunlu TOTP 2FA (`src/lib/totp.ts`, RFC 6238, test
  vektörüyle doğrulandı), oturum token'ları hash'li, RBAC (4 rol), denetim
  kaydı, rate limit, CSP/HSTS başlıkları, `src/proxy.ts` rota koruması.
- **Ekranlar (hepsi çalışıyor):** Ana Ekran, Tüm/Olumlu/Olumsuz Adaylar,
  aday detay + düzenleme, Yeni Başvuru, Analiz & Raporlar, Projeler (+ yeni
  proje formu), Pozisyonlar, Kaynaklar, YZ Call Center, Norm Kadro,
  Karekod Oluşturma, Ayarlar (kullanıcı/pozisyon/kaynak/API anahtarı yönetimi,
  denetim kaydı), Toplu Aday Aktar (/import).
- **Veri girişi:** xlsx/csv/json toplu import (Türkçe başlık eşleme, satır
  bazlı hata raporu, telefon HMAC ile mükerrer kontrolü, şablon indirme),
  `POST /api/ingest` (robot, Bearer anahtar), elle form, QR başvuru formu
  (`/basvuru/<slug>`, KVKK onaylı, herkese açık).
- **Dışa aktarım:** Aday ve proje listeleri xlsx (denetim kaydına yazılır,
  İK Asistanı rolüne kapalı).
- **Demo verisi:** `prisma/seed.ts` — deterministik, tekrar çalıştırılabilir
  (`npx prisma db seed` her seferinde temiz veri üretir).
- **Telesekreter (IVR) modülü** (`/telesekreter`): İK'cının tanımladığı DTMF
  sorularıyla (TTS okunacak, "1/2'ye basın") günde 2 kez BEKLEMEDE adayları
  otomatik arayan kampanya kurgusu. Soru yönetimi (sıralama, eleyici kural,
  tarayıcıda sesli önizleme), kampanya ayarları (saatler, maks. deneme, olumlu
  eşiği), skorlama motoru, arama kuyruğu ve dakikada bir çalışan zamanlayıcı
  (`src/instrumentation.ts` → `src/lib/ivr/scheduler.ts`). Gerçek santral
  yokken akış SİMÜLATÖRLE test edilir ("Şimdi Çalıştır" butonu). Gerçek
  sağlayıcı sonuçları `POST /api/ivr/webhook` (API anahtarlı) ucuna gönderir;
  çekirdek mantık `src/lib/ivr/engine.ts` içinde sağlayıcıdan bağımsızdır.

Uçtan uca test edilenler: giriş + 2FA kurulumu (tarayıcıda), tüm sayfalar,
`/api/basvuru`, `/api/ingest` (geçersiz anahtar reddi dahil), import motoru,
şifrelemenin veritabanında gerçekten uygulandığı.

---

## 3. Açık işler / sonraki adımlar

1. **Dağıtım kararı** (henüz verilmedi): şirket içi Windows sunucu mu, Docker
   mı, bulut mu? Karar netleşince:
   - `prisma/schema.prisma` → `provider = "postgresql"` + `DATABASE_URL`
     değişikliği + `npx prisma migrate dev` (şema Postgres uyumlu yazıldı)
   - HTTPS zorunlu (ters vekil arkasında), `APP_URL` gerçek alan adı
   - Çok örnekli çalışacaksa `src/lib/rate-limit.ts` → Redis tabanlı sürüm
2. **Üretim öncesi:** demo şifreleri değiştir, seed'i üretimde ÇALIŞTIRMA
   (mevcut veriyi siler), gerçek kullanıcıları Ayarlar'dan aç,
   `FIELD_ENCRYPTION_KEY`'i kasada yedekle, veritabanı yedekleme planı kur.
3. **İsteğe bağlı geliştirmeler (ekranlarda placeholder olanlar):**
   - "Sütunları Özelleştir" butonu şu an görsel — kolon gizleme mantığı yok
   - Bildirim zili sabit sayı gösteriyor — gerçek bildirim sistemi yok
   - Kaynaklar ekranındaki bazı grafikler (kaynağa göre ön mülakat stacked
     bar, işe başlama oranı) tabloda var, grafik olarak eklenebilir
   - Aday silme/arşivleme akışı (KVKK saklama süresi politikasıyla birlikte)
   - E-posta/SMS bildirim entegrasyonları (Ayarlar'da anahtar altyapısı hazır)
4. **Telefoni sağlayıcısı seçimi ve IVR adaptörü (EN ÖNEMLİ AÇIK İŞ):**
   Şu an telefon altyapısı yok; aramalar simülatörle yürüyor. Karar
   seçenekleri: yerli bulut santral (Netgsm/Verimor — önerilen: yerli numara,
   KVKK, hızlı kurulum), kendi Asterisk/FreeSWITCH santrali + SIP trunk
   (en ucuz dakika, bakım ister) veya Twilio (yabancı numara görünür,
   önerilmez). Sağlayıcı seçilince yapılacaklar: (a) `src/lib/ivr/engine.ts`
   içindeki `simulateCall` çağrısının yerine sağlayıcının "arama başlat" API
   çağrısını koyan bir adaptör yaz, (b) sağlayıcının çağrı sonucu webhook'unu
   `POST /api/ivr/webhook` biçimine çevir (uç hazır, API anahtarıyla korunuyor),
   (c) TTS'i sağlayıcının Türkçe seslendirmesiyle test et. Karar: TTS + DTMF
   (tuşlama) onaylandı; sesli yanıt tanıma 2. faz.
5. **Telesekreter robotu gerçek entegrasyonu:** Ayarlar → Entegrasyon
   Yönetimi'nden gerçek anahtar üretilip robota tanımlanacak (demo anahtarı
   üretimde devre dışı bırakın).

---

## 4. Kod haritası (nerede ne var)

```
prisma/schema.prisma        Veri modeli (User, Candidate, Project, Position,
                            Source, CallRecord, QrCode, ImportBatch, ApiKey,
                            AuditLog, Session)
prisma/seed.ts              Demo verisi
src/proxy.ts                Rota koruması (oturum çerezi ilk bariyeri)
src/lib/
  auth.ts                   Giriş, oturum, 2FA, RBAC (requireUser/requireRole)
  totp.ts                   RFC 6238 TOTP uygulaması
  crypto-core.ts            AES-256-GCM, HMAC dizini, hash yardımcıları
  candidates.ts             Aday kişisel verilerinin şifrele/çöz katmanı
  queries.ts                Dashboard + aday listesi sorguları
  analytics.ts              Analiz, kaynak performansı, norm kadro
  callcenter.ts             Call center istatistikleri
  import.ts                 xlsx/csv/json ayrıştırma + toplu aktarım motoru
  rate-limit.ts             Bellek içi rate limiter (Redis'e geçilebilir)
  audit.ts                  Denetim kaydı
  domain.ts                 Sabitler + TR biçimleyiciler (telefon, tarih, sayı)
src/components/             Ortak UI (ui.tsx, charts.tsx, filter-bar.tsx,
                            pagination.tsx, stat-card.tsx, shell/)
src/app/(app)/              Korumalı ekranlar (adaylar, analiz, projeler, ...)
src/app/giris/              Giriş + 2FA kurulum/doğrulama
src/app/basvuru/[slug]/     Herkese açık QR başvuru formu
src/app/api/                ingest, basvuru, import, dışa aktarımlar, çıkış
```

Tasarım referansı ekran görüntüleri repoda değildir; ilk bilgisayarda
`C:\Users\berkb\Downloads\hr-app-images` klasöründedir.
