/**
 * Demo verisi — gerçekçi Türkçe içerik. Tüm kişisel veriler uygulamayla aynı
 * şekilde AES-256-GCM ile şifrelenerek yazılır.
 * Çalıştırma: npx prisma db seed
 */
import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import { encryptField, hmacIndex, sha256 } from "../src/lib/crypto-core";

const db = new PrismaClient();

// ─── yardımcılar ───────────────────────────────────────────────────
let seedState = 42;
function rnd(): number {
  // deterministik LCG — her seed çalışmasında aynı veri
  seedState = (seedState * 1664525 + 1013904223) >>> 0;
  return seedState / 0xffffffff;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}
function weighted<T>(items: readonly [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [item, w] of items) {
    r -= w;
    if (r <= 0) return item;
  }
  return items[items.length - 1][0];
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(8 + Math.floor(rnd() * 10), Math.floor(rnd() * 60), 0, 0);
  return d;
}

const ERKEK_AD = ["Mehmet", "Ahmet", "Mustafa", "Ali", "Hasan", "Hüseyin", "İbrahim", "Osman", "Yusuf", "Murat", "Ömer", "Ramazan", "Halil", "Süleyman", "Salih", "Emre", "Burak", "Serkan", "Uğur", "Volkan", "Erkan", "Tolga", "Kadir", "Yaşar", "Adem", "Selim", "Ferhat", "Şahin", "Cem", "Onur"];
const KADIN_AD = ["Fatma", "Ayşe", "Emine", "Hatice", "Zeynep", "Elif", "Meryem", "Şerife", "Sultan", "Hanife", "Merve", "Esra", "Derya", "Seda", "Gül", "Songül", "Filiz", "Yasemin", "Tuğba", "Büşra", "Kübra", "Sevgi", "Nurcan", "Gamze", "Melek"];
const SOYAD = ["Yılmaz", "Kaya", "Demir", "Şahin", "Çelik", "Yıldız", "Yıldırım", "Öztürk", "Aydın", "Özdemir", "Arslan", "Doğan", "Kılıç", "Aslan", "Çetin", "Kara", "Koç", "Kurt", "Özkan", "Şimşek", "Polat", "Korkmaz", "Erdoğan", "Güneş", "Aktaş", "Bulut", "Tekin", "Can", "Gündüz", "Baltacı", "Demirtaş", "Tetik", "Gündoğan"];

const ILLER: Record<string, string[]> = {
  "İstanbul": ["Pendik", "Tuzla", "Eyüp", "Arnavutköy", "Esenyurt", "Sultangazi", "Ümraniye"],
  "Kocaeli": ["Gebze", "İzmit", "Darıca", "Çayırova"],
  "Ankara": ["Sincan", "Etimesgut", "Çankaya", "Yenimahalle", "Mamak", "Keçiören"],
  "İzmir": ["Buca", "Bornova", "Karşıyaka", "Torbalı", "Menemen", "Konak"],
  "Bursa": ["Nilüfer", "Osmangazi", "Yıldırım", "İnegöl"],
  "Antalya": ["Kepez", "Muratpaşa", "Konyaaltı"],
  "Samsun": ["İlkadım", "Atakum", "Canik"],
  "Gaziantep": ["Şahinbey", "Şehitkamil"],
  "Erzurum": ["Yakutiye", "Palandöken"],
  "Manisa": ["Yunusemre", "Şehzadeler"],
};

async function main() {
  console.log("Seed başlıyor...");

  // temiz başlangıç
  await db.callRecord.deleteMany();
  await db.candidate.deleteMany();
  await db.qrCode.deleteMany();
  await db.importBatch.deleteMany();
  await db.projectPosition.deleteMany();
  await db.project.deleteMany();
  await db.position.deleteMany();
  await db.source.deleteMany();
  await db.auditLog.deleteMany();
  await db.session.deleteMany();
  await db.apiKey.deleteMany();
  await db.user.deleteMany();

  // ── kullanıcılar ──
  const demoPass = await argon2.hash("LunaDemo2026!", { type: argon2.argon2id });
  const [admin, selin, mehmetK, ayseD, canerA, zeynepA] = await Promise.all(
    [
      { email: "bilgiislem@tezmedikal.com.tr", name: "Berk Bilgi", role: "SISTEM_YONETICISI" },
      { email: "selin.yilmaz@tepe.com.tr", name: "Selin Yılmaz", role: "IK_UZMANI" },
      { email: "mehmet.kaya@tepe.com.tr", name: "Mehmet Kaya", role: "IK_YONETICISI" },
      { email: "ayse.demir@tepe.com.tr", name: "Ayşe Demir", role: "IK_UZMANI" },
      { email: "caner.aydin@tepe.com.tr", name: "Caner Aydın", role: "SISTEM_YONETICISI" },
      { email: "zeynep.arslan@tepe.com.tr", name: "Zeynep Arslan", role: "IK_ASISTANI" },
    ].map((u) =>
      db.user.create({
        data: {
          email: u.email,
          name: u.name,
          role: u.role as never,
          passwordHash: demoPass,
        },
      })
    )
  );
  const ikUzmanlari = [selin, mehmetK, ayseD, canerA, zeynepA];

  // ── kaynaklar ──
  const kaynakTanim: [string, string, number][] = [
    ["kariyer.net", "dijital", 7.8],
    ["işkur.gov.tr", "kurumsal", 3.1],
    ["sahibinden.com", "dijital", 6.2],
    ["sosyal medya", "dijital", 5.6],
    ["çalışkan.com", "dijital", 4.4],
    ["Eleman.net", "dijital", 6.2],
    ["BİO", "fiziksel", 2.8],
    ["Muhtarlıklar", "fiziksel", 1.5],
    ["Üniversite Etkinliği", "fiziksel", 2.2],
    ["Karekod Yenikapı", "fiziksel", 1.2],
  ];
  const sources = await Promise.all(
    kaynakTanim.map(([ad, tip, maliyet]) =>
      db.source.create({ data: { ad, tip, maliyet } })
    )
  );
  const srcByName = Object.fromEntries(sources.map((s) => [s.ad, s]));

  // ── pozisyonlar ──
  const pozisyonAdlari = [
    "Temizlik Personeli", "Güvenlik Personeli", "Kaynakçı", "Betonarme Demircisi",
    "İnşaat İşçisi", "Kalıp Ustası", "Elektrikçi", "Forklift Operatörü",
    "Paketleme Elemanı", "Montaj Elemanı", "Depo Personeli", "Aşçı", "Aşçıbaşı",
    "Bahçıvan", "Bulaşıkçı", "Çay İkram Personeli", "Elektrik Teknisyeni",
    "Tesisat Teknisyeni", "Makine Bakım Teknisyeni", "PVC Doğrama Ustası",
    "Temizlik Görevlisi", "Güvenlik Görevlisi", "Garson", "Servis Elemanı",
  ];
  const positions = await Promise.all(
    pozisyonAdlari.map((ad) => db.position.create({ data: { ad } }))
  );

  // ── projeler ──
  const projeTanim = [
    { ad: "İstanbul Havalimanı Temizlik", kod: "IST-TRM-001", bolge: "Marmara", kurum: "Tepe Tesis Yönetimi", segment: "Temizlik Hizmetleri", il: "İstanbul", ilce: "Arnavutköy", mm: "MM-001", ik: selin, my: [1250, 1050], by: [350, 320] },
    { ad: "İzmir Metro Güvenlik", kod: "IZM-GVN-002", bolge: "Ege", kurum: "Tepe Tesis Yönetimi", segment: "Güvenlik Hizmetleri", il: "İzmir", ilce: "Konak", mm: "MM-002", ik: mehmetK, my: [800, 650], by: [200, 180] },
    { ad: "Ankara Üniversitesi Yemekhane", kod: "ANK-TRM-003", bolge: "İç Anadolu", kurum: "Tepe Tesis Yönetimi", segment: "Destek Hizmetleri", il: "Ankara", ilce: "Çankaya", mm: "MM-003", ik: ayseD, my: [600, 480], by: [150, 120] },
    { ad: "Antalya Şehir Hastanesi", kod: "ANT-YMK-004", bolge: "Akdeniz", kurum: "Tepe Gurme", segment: "Yemekhane Hizmetleri", il: "Antalya", ilce: "Kepez", mm: "MM-004", ik: canerA, my: [700, 560], by: [170, 150] },
    { ad: "Samsun Peyzaj Bakım", kod: "SAM-PEY-005", bolge: "Karadeniz", kurum: "Tepe Tesis Yönetimi", segment: "Peyzaj Hizmetleri", il: "Samsun", ilce: "İlkadım", mm: "MM-005", ik: zeynepA, my: [400, 320], by: [80, 70] },
    { ad: "Gaziantep AVM Güvenlik", kod: "GZT-GVN-006", bolge: "G.Doğu Anadolu", kurum: "Tepe Tesis Yönetimi", segment: "Güvenlik Hizmetleri", il: "Gaziantep", ilce: "Şahinbey", mm: "MM-006", ik: selin, my: [500, 420], by: [120, 100] },
    { ad: "Bursa OSB Yemekhane", kod: "BUR-YMK-007", bolge: "Marmara", kurum: "Tepe Gurme", segment: "Yemekhane Hizmetleri", il: "Bursa", ilce: "Nilüfer", mm: "MM-007", ik: mehmetK, my: [550, 430], by: [130, 110] },
    { ad: "Erzurum Üniversitesi Teknik", kod: "ERZ-TKN-008", bolge: "Doğu Anadolu", kurum: "Tepe Pro", segment: "Teknik Hizmetler", il: "Erzurum", ilce: "Yakutiye", mm: "MM-008", ik: ayseD, my: [300, 240], by: [60, 50] },
    { ad: "Gebze Tesis Güvenlik", kod: "GBZ-GVN-009", bolge: "Marmara", kurum: "Tepe Savunma", segment: "Güvenlik Hizmetleri", il: "Kocaeli", ilce: "Gebze", mm: "MM-009", ik: canerA, my: [450, 360], by: [100, 90] },
    { ad: "Manisa OSB Temizlik", kod: "MAN-TRM-010", bolge: "Ege", kurum: "Tepe Tesis Yönetimi", segment: "Temizlik Hizmetleri", il: "Manisa", ilce: "Yunusemre", mm: "MM-010", ik: ayseD, my: [350, 280], by: [80, 70] },
  ];
  const projects = [];
  for (const p of projeTanim) {
    const proj = await db.project.create({
      data: {
        ad: p.ad, kod: p.kod, bolge: p.bolge, kurum: p.kurum, segment: p.segment,
        il: p.il, ilce: p.ilce, masrafMerkezi: p.mm, ikSorumlusuId: p.ik.id,
        yonetici1: pick(["Ahmet Demir", "Mehmet Kaya", "Ayşe Demir", "Caner Aydın", "Zeynep Arslan"]),
        yonetici2: pick(["Mehmet Kaya", "Zeynep Çelik", "Hasan Bulut", "Selin Yılmaz"]),
        yonetici3: pick(["Zeynep Arslan", "Hasan Bulut", "Caner Aydın", "Ahmet Demir"]),
      },
    });
    projects.push(proj);
    // norm kadro dağılımı: projenin MY/BY toplamını 2-4 pozisyona böl
    const projPoz = [...positions].sort(() => rnd() - 0.5).slice(0, 3);
    let kalanNorm = p.my[0], kalanAktif = p.my[1];
    for (let i = 0; i < projPoz.length; i++) {
      const son = i === projPoz.length - 1;
      const norm = son ? kalanNorm : Math.round(kalanNorm * (0.3 + rnd() * 0.3));
      const aktif = son ? kalanAktif : Math.min(norm, Math.round(kalanAktif * (0.3 + rnd() * 0.3)));
      kalanNorm -= norm; kalanAktif -= aktif;
      await db.projectPosition.create({
        data: { projectId: proj.id, positionId: projPoz[i].id, tip: "MY", normKadro: norm, aktifKadro: aktif },
      });
    }
    await db.projectPosition.create({
      data: { projectId: proj.id, positionId: pick(positions).id, tip: "BY", normKadro: p.by[0], aktifKadro: p.by[1] },
    });
  }

  // ── karekodlar ──
  const qr1 = await db.qrCode.create({
    data: {
      kod: "QR-2026-07-20-1435-001",
      slug: "yenikapi-etkinlik-a7f3k9",
      sourceId: srcByName["Karekod Yenikapı"].id,
      kurum: "Tepe Tesis Yönetimi",
      pozisyonlar: JSON.stringify(["Temizlik Görevlisi", "Güvenlik Görevlisi"]),
      projectId: projects[0].id,
      renk: "#4F39F6",
      createdById: selin.id,
      taramaSayisi: 342,
    },
  });
  await db.qrCode.create({
    data: {
      kod: "QR-2026-08-01-0910-002",
      slug: "universite-istanbul-m2x8p1",
      sourceId: srcByName["Üniversite Etkinliği"].id,
      kurum: "Tepe Gurme",
      pozisyonlar: JSON.stringify(["Garson", "Servis Elemanı", "Bulaşıkçı"]),
      projectId: projects[3].id,
      renk: "#2563EB",
      createdById: ayseD.id,
      taramaSayisi: 128,
    },
  });

  // ── import batch örneği ──
  const batch = await db.importBatch.create({
    data: {
      dosyaAdi: "telesekreter-2026-08-10.csv",
      tip: "csv",
      toplamKayit: 214,
      basarili: 209,
      hatali: 5,
      durum: "tamamlandi",
      createdById: selin.id,
      hatalar: JSON.stringify([
        { satir: 12, hata: "Telefon numarası geçersiz" },
        { satir: 47, hata: "Ad Soyad boş" },
        { satir: 88, hata: "Telefon numarası geçersiz" },
        { satir: 132, hata: "Mükerrer kayıt (aynı telefon, son 30 gün)" },
        { satir: 199, hata: "Doğum tarihi biçimi hatalı" },
      ]),
    },
  });

  // ── API anahtarı (telesekreter robotu) ──
  const demoApiKey = "luna_ing_demo_c8f2a91e4b7d36a5";
  await db.apiKey.create({
    data: {
      ad: "Telesekreter Robotu",
      keyHash: sha256(demoApiKey),
      prefix: demoApiKey.slice(0, 12),
      scopes: "ingest",
    },
  });

  // ── adaylar ──
  const kaynakAgirlik: [string, number][] = [
    ["kariyer.net", 23], ["işkur.gov.tr", 21], ["sahibinden.com", 11],
    ["sosyal medya", 10], ["çalışkan.com", 5], ["Eleman.net", 12],
    ["BİO", 7], ["Muhtarlıklar", 4], ["Üniversite Etkinliği", 3],
    ["Karekod Yenikapı", 4],
  ];
  const N = 1250;
  const candidateRows = [];
  for (let i = 0; i < N; i++) {
    const kadin = rnd() < 0.22;
    const ad = kadin ? pick(KADIN_AD) : pick(ERKEK_AD);
    const adSoyad = `${ad} ${pick(SOYAD)}`;
    const il = pick(Object.keys(ILLER));
    const ilce = pick(ILLER[il]);
    const gunOnce = Math.floor(Math.pow(rnd(), 1.4) * 60); // son günlere yoğun
    const basvuruTarihi = daysAgo(gunOnce);
    const kaynak = srcByName[weighted(kaynakAgirlik)];
    const durum = weighted<string>([
      ["OLUMLU", 35], ["OLUMSUZ", 27], ["BEKLEMEDE", 15], ["ULASILAMADI", 23],
    ]);
    const onMulakat =
      durum === "OLUMLU" ? "Olumlu"
      : durum === "OLUMSUZ" ? "Olumsuz"
      : durum === "BEKLEMEDE" ? (rnd() < 0.6 ? "Beklemede" : null)
      : "Ulaşılamadı";
    const tel = `05${Math.floor(30 + rnd() * 20)}${String(Math.floor(rnd() * 10000000)).padStart(7, "0")}`;
    const dogumYil = 1975 + Math.floor(rnd() * 30);
    const dogum = `${String(1 + Math.floor(rnd() * 28)).padStart(2, "0")}.${String(1 + Math.floor(rnd() * 12)).padStart(2, "0")}.${dogumYil}`;
    const proje = pick(projects);
    const iseBasladi = durum === "OLUMLU" && rnd() < 0.45;
    const yonlendirildi = durum === "OLUMLU" && rnd() < 0.75;

    candidateRows.push({
      adSoyad,
      adSoyadIndex: adSoyad.toLocaleLowerCase("tr-TR"),
      dogumTarihi: encryptField(dogum),
      cinsiyet: kadin ? "Kadın" : "Erkek",
      telefon: encryptField(tel),
      telefonIndex: hmacIndex(tel),
      email: rnd() < 0.4 ? encryptField(`${ad.toLocaleLowerCase("tr-TR").replace(/[^a-z]/g, "")}${Math.floor(rnd() * 99)}@gmail.com`) : null,
      il, ilce,
      positionId: pick(positions).id,
      projectId: proje.id,
      sourceId: kaynak.id,
      basvuruTarihi,
      ogrenimDurumu: weighted<string>([["Lise", 45], ["Ortaöğretim", 25], ["İlköğretim", 12], ["Ön Lisans", 10], ["Lisans", 7], ["Yüksek Lisans", 1]]),
      engellilikDurumu: rnd() < 0.04,
      emeklilikDurumu: rnd() < 0.06,
      askerlikDurumu: kadin ? "Muaf" : weighted<string>([["Yapıldı", 70], ["Yapılmadı", 25], ["Muaf", 5]]),
      durum: durum as never,
      onMulakatSonucu: onMulakat,
      onMulakatTarihi: onMulakat ? daysAgo(Math.max(0, gunOnce - 1)) : null,
      iseBaslama: iseBasladi,
      iseBaslamaTarihi: iseBasladi ? daysAgo(Math.max(0, gunOnce - 7)) : null,
      projeYonlendirildi: yonlendirildi,
      kvkkOnay: true,
      kvkkOnayTarihi: basvuruTarihi,
      girisYontemi: weighted<string>([["import", 45], ["manuel", 20], ["api", 25], ["qr-form", 10]]),
      importBatchId: rnd() < 0.15 ? batch.id : null,
      qrCodeId: kaynak.ad === "Karekod Yenikapı" ? qr1.id : null,
      uploadedById: pick(ikUzmanlari).id,
    });
  }
  // SQLite parametre limiti için parça parça yaz
  for (let i = 0; i < candidateRows.length; i += 100) {
    await db.candidate.createMany({ data: candidateRows.slice(i, i + 100) });
  }
  console.log(`${N} aday oluşturuldu.`);

  // ── arama kayıtları (YZ call center) ──
  const adaylar = await db.candidate.findMany({ select: { id: true, durum: true, basvuruTarihi: true } });
  const callRows = [];
  for (const aday of adaylar) {
    if (rnd() < 0.25) continue; // %75'i arandı
    const aramaSayisi = 1 + Math.floor(Math.pow(rnd(), 2) * 5);
    for (let k = 1; k <= aramaSayisi; k++) {
      const son = k === aramaSayisi;
      const sonuc = son
        ? aday.durum === "OLUMLU" ? "Olumlu"
        : aday.durum === "OLUMSUZ" ? "Olumsuz"
        : aday.durum === "BEKLEMEDE" ? "Beklemede"
        : rnd() < 0.2 ? "Hatalı Numara" : "Ulaşılamadı"
        : rnd() < 0.7 ? "Ulaşılamadı" : "Beklemede";
      const ulasti = sonuc === "Olumlu" || sonuc === "Olumsuz" || sonuc === "Beklemede";
      const t = new Date(aday.basvuruTarihi);
      t.setDate(t.getDate() + k - 1);
      t.setHours(9 + Math.floor(rnd() * 9), Math.floor(rnd() * 60), 0, 0);
      const smsGitti = rnd() < 0.85;
      callRows.push({
        candidateId: aday.id,
        aramaTarihi: t,
        kacinciArama: k,
        gorusmeSuresiSn: ulasti ? 30 + Math.floor(rnd() * 240) : null,
        sonuc,
        smsDurumu: sonuc === "Hatalı Numara" ? "Gönderilemedi" : smsGitti ? "Gönderildi" : null,
        smsOkundu: smsGitti && rnd() < 0.55,
        linkTiklandi: smsGitti && rnd() < 0.25,
        basvuruYapti: smsGitti && rnd() < 0.16,
        notlar: ulasti
          ? encryptField(pick(["İşe başlamak istiyor.", "Detaylar paylaşıldı.", "Çalışmak istemiyor.", "Dönüş yapacak.", "Maaş bilgisi sordu.", "Vardiya uygun değil."]))
          : null,
      });
    }
  }
  for (let i = 0; i < callRows.length; i += 100) {
    await db.callRecord.createMany({ data: callRows.slice(i, i + 100) });
  }
  console.log(`${callRows.length} arama kaydı oluşturuldu.`);

  console.log("\n─── Demo hesaplar ───");
  console.log("Yönetici : bilgiislem@tezmedikal.com.tr / LunaDemo2026!");
  console.log("İK Uzmanı: selin.yilmaz@tepe.com.tr / LunaDemo2026!");
  console.log("API anahtarı (telesekreter):", demoApiKey);
  console.log("İlk girişte 2FA kurulumu zorunludur.");
}

main()
  .then(() => db.$disconnect())
  .catch((e) => {
    console.error(e);
    db.$disconnect();
    process.exit(1);
  });
