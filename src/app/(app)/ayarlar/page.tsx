import fs from "fs";
import path from "path";
import { requireUser, hasRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageTitle, Badge, durumBadgeColor } from "@/components/ui";
import { ROL_ETIKETLERI, formatDateTime, formatNumber } from "@/lib/domain";
import {
  ApiAnahtarDurumButonu,
  KullaniciDurumButonu,
  YeniApiAnahtariForm,
  YeniKaynakForm,
  YeniKullaniciForm,
  YeniPozisyonForm,
} from "./forms";

export const metadata = { title: "Ayarlar" };
export const dynamic = "force-dynamic";

function dbBoyutu(): string {
  try {
    const p = path.join(process.cwd(), "prisma", "dev.db");
    const st = fs.statSync(p);
    return `${(st.size / 1024 / 1024).toFixed(1)} MB`;
  } catch {
    return "—";
  }
}

export default async function AyarlarPage() {
  const me = await requireUser();
  const yonetici = hasRole(me, "IK_YONETICISI");
  const sistemYoneticisi = hasRole(me, "SISTEM_YONETICISI");

  const [users, positions, sources, apiKeys, auditLogs, adaySayisi, aktifOturum] =
    await Promise.all([
      db.user.findMany({ orderBy: { createdAt: "asc" } }),
      db.position.findMany({ orderBy: { ad: "asc" } }),
      db.source.findMany({ orderBy: { ad: "asc" } }),
      sistemYoneticisi ? db.apiKey.findMany({ orderBy: { createdAt: "desc" } }) : [],
      yonetici
        ? db.auditLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 30,
            include: { user: { select: { name: true } } },
          })
        : [],
      db.candidate.count(),
      db.session.count({ where: { expiresAt: { gt: new Date() } } }),
    ]);

  return (
    <div className="space-y-5">
      <PageTitle title="Ayarlar" subtitle="Luna İK Platformu sistem ayarlarını yönetin." />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* kullanıcı yönetimi */}
        {yonetici ? (
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Sisteme Yeni Kullanıcı Ekle</h2>
            <p className="mt-0.5 mb-4 text-[13px] text-muted">
              Platforma yeni kullanıcı ekleyin ve yetkilerini belirleyin. 2FA tüm
              kullanıcılar için zorunludur.
            </p>
            <YeniKullaniciForm sistemYoneticisi={sistemYoneticisi} />
            <div className="table-scroll mt-4">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    {["Ad Soyad", "E-posta", "Rol", "2FA", "Durum", ""].map((h, i) => (
                      <th key={i} className="px-2.5 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-line/60">
                      <td className="px-2.5 py-2 font-medium whitespace-nowrap">{u.name}</td>
                      <td className="px-2.5 py-2 text-slate-600">{u.email}</td>
                      <td className="px-2.5 py-2 whitespace-nowrap">{ROL_ETIKETLERI[u.role]}</td>
                      <td className="px-2.5 py-2">
                        <Badge color={u.totpEnabled ? "green" : "orange"}>
                          {u.totpEnabled ? "Kurulu" : "Bekliyor"}
                        </Badge>
                      </td>
                      <td className="px-2.5 py-2">
                        <Badge color={u.isActive ? "green" : "gray"}>
                          {u.isActive ? "Aktif" : "Pasif"}
                        </Badge>
                      </td>
                      <td className="px-2.5 py-2">
                        <KullaniciDurumButonu userId={u.id} aktif={u.isActive} kendisi={u.id === me.id} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}

        {/* pozisyon + kaynak */}
        <div className="space-y-5">
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Pozisyon Ekle / Düzenle</h2>
            <p className="mt-0.5 mb-4 text-[13px] text-muted">
              Pozisyonları ekleyin ve kategorilere ayırın.
            </p>
            <YeniPozisyonForm />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {positions.map((p) => (
                <span key={p.id} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {p.ad}
                </span>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Kaynak Ekle / Düzenle</h2>
            <p className="mt-0.5 mb-4 text-[13px] text-muted">
              Başvuru kaynaklarını ve aday başı maliyetlerini yönetin.
            </p>
            <YeniKaynakForm />
            <div className="mt-3 flex flex-wrap gap-1.5">
              {sources.map((s) => (
                <span key={s.id} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {s.ad} <span className="text-muted">· {s.maliyet.toLocaleString("tr-TR")} ₺</span>
                </span>
              ))}
            </div>
          </Card>
        </div>

        {/* entegrasyonlar */}
        {sistemYoneticisi ? (
          <Card className="p-5">
            <h2 className="text-[15px] font-semibold">Entegrasyon Yönetimi (API Anahtarları)</h2>
            <p className="mt-0.5 mb-4 text-[13px] text-muted">
              Telesekreter robotu gibi üçüncü parti sistemlerin{" "}
              <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11px]">/api/ingest</code>{" "}
              ucuna erişimi için anahtar oluşturun. Anahtarlar yalnızca özet
              (hash) olarak saklanır ve bir kez gösterilir.
            </p>
            <YeniApiAnahtariForm />
            <div className="table-scroll mt-4">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    {["Ad", "Anahtar", "Son Kullanım", "Durum", ""].map((h, i) => (
                      <th key={i} className="px-2.5 py-2 font-medium">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((k) => (
                    <tr key={k.id} className="border-b border-line/60">
                      <td className="px-2.5 py-2 font-medium whitespace-nowrap">{k.ad}</td>
                      <td className="px-2.5 py-2 font-mono text-xs text-slate-500">{k.prefix}•••</td>
                      <td className="px-2.5 py-2 whitespace-nowrap text-slate-600">
                        {k.lastUsedAt ? formatDateTime(k.lastUsedAt) : "Hiç kullanılmadı"}
                      </td>
                      <td className="px-2.5 py-2">
                        <Badge color={k.aktif ? "green" : "gray"}>
                          {k.aktif ? "Entegrasyon aktif" : "Pasif"}
                        </Badge>
                      </td>
                      <td className="px-2.5 py-2">
                        <ApiAnahtarDurumButonu id={k.id} aktif={k.aktif} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}

        {/* sistem bilgileri */}
        <Card className="p-5">
          <h2 className="mb-4 text-[15px] font-semibold">Sistem Bilgileri</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              ["Sistem Versiyonu", "v1.0.0"],
              ["Veritabanı Durumu", "Sağlıklı"],
              ["Veritabanı Boyutu", dbBoyutu()],
              ["Toplam Aday Kaydı", formatNumber(adaySayisi)],
              ["Aktif Oturum", formatNumber(aktifOturum)],
              ["Aktif Kullanıcı", `${users.filter((u) => u.isActive).length} / ${users.length}`],
            ].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-line p-3">
                <p className="text-xs text-muted">{k}</p>
                <p className="mt-1 text-[15px] font-semibold">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-xl bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-600">
            <p className="font-semibold text-foreground">Güvenlik özeti</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-4">
              <li>Kişisel veriler (telefon, doğum tarihi, e-posta, adres, notlar) AES-256-GCM ile şifreli saklanır.</li>
              <li>Şifreler Argon2id ile özetlenir; tüm hesaplarda TOTP 2FA zorunludur.</li>
              <li>Kişisel veri erişimi ve dışa aktarımlar denetim kaydına yazılır.</li>
              <li>5 hatalı girişte hesap 15 dakika kilitlenir; oturumlar 8 saat sonra düşer.</li>
            </ul>
          </div>
        </Card>
      </div>

      {/* denetim kaydı */}
      {yonetici ? (
        <Card>
          <h2 className="border-b border-line px-5 py-4 text-[15px] font-semibold">
            Denetim Kaydı <span className="font-normal text-muted">(son 30 işlem)</span>
          </h2>
          <div className="table-scroll">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line text-xs text-muted">
                  {["Tarih", "Kullanıcı", "Eylem", "Varlık", "IP"].map((h) => (
                    <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((l) => (
                  <tr key={l.id} className="border-b border-line/60">
                    <td className="px-4 py-2 whitespace-nowrap text-slate-600">{formatDateTime(l.createdAt)}</td>
                    <td className="px-4 py-2 whitespace-nowrap font-medium">{l.user?.name ?? "Sistem"}</td>
                    <td className="px-4 py-2">
                      <Badge color={l.eylem.includes("basarisiz") ? "red" : durumBadgeColor(l.eylem)}>
                        {l.eylem}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{l.varlik ?? "—"}</td>
                    <td className="px-4 py-2 font-mono text-xs text-slate-500">{l.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
