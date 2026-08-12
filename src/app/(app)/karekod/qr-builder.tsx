"use client";

import { useState, useTransition } from "react";
import {
  QrCode,
  Copy,
  Download,
  ExternalLink,
  LoaderCircle,
  RefreshCw,
  Check,
  X,
  Info,
} from "lucide-react";
import { Card, Field, inputCls, btnPrimary, btnSecondary, cx } from "@/components/ui";
import { createQrAction, type QrResult } from "./actions";
import { LunaMark } from "@/components/logo";

type Opt = { id: string; ad: string };

const CERCEVELER = [
  { key: "cerceveli", label: "Çerçeveli" },
  { key: "cercevesiz", label: "Çerçevesiz" },
  { key: "koseli", label: "Köşeli Çerçeve" },
  { key: "renkli", label: "Renkli Çerçeve" },
] as const;

const RENKLER = ["#4F39F6", "#2563EB", "#16A34A", "#F59E0B", "#EF4444", "#1E293B"];

export function QrBuilder({
  sources,
  projects,
  positions,
  user,
}: {
  sources: Opt[];
  projects: Opt[];
  positions: Opt[];
  user: { name: string; email: string };
}) {
  const [sourceId, setSourceId] = useState("");
  const [kurum, setKurum] = useState("");
  const [projectId, setProjectId] = useState("");
  const [secilenPoz, setSecilenPoz] = useState<string[]>([]);
  const [cerceve, setCerceve] = useState<(typeof CERCEVELER)[number]["key"]>("cerceveli");
  const [renk, setRenk] = useState(RENKLER[0]);
  const [ekBilgi, setEkBilgi] = useState("");
  const [telefon, setTelefon] = useState("");
  const [sonuc, setSonuc] = useState<QrResult | null>(null);
  const [kopyalandi, setKopyalandi] = useState(false);
  const [pending, startTransition] = useTransition();

  function olustur() {
    startTransition(async () => {
      const r = await createQrAction({
        sourceId,
        kurum,
        pozisyonlar: secilenPoz,
        projectId,
        cerceve,
        renk,
        ekBilgi,
      });
      setSonuc(r);
    });
  }

  const ok = sonuc?.ok ? sonuc : null;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
      {/* 1. bilgiler */}
      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-[15px] font-semibold">1. Karekod Bilgilerini Girin</h2>
        <div className="space-y-4">
          <Field label="Kullanılacak Kaynak" hint="Bu karekod hangi kaynaktan gelecek başvurular için kullanılacak?">
            <select value={sourceId} onChange={(e) => setSourceId(e.target.value)} className={inputCls}>
              <option value="">Seçiniz</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>{s.ad}</option>
              ))}
            </select>
          </Field>
          <Field label="Kurum Bilgisi" hint="Başvurular bu kurum için mi alınacak?">
            <input value={kurum} onChange={(e) => setKurum(e.target.value)} className={inputCls} placeholder="Tepe Tesis Yönetimi" />
          </Field>
          <Field label="Pozisyon Bilgisi" hint="Hangi pozisyon(lar) için başvuru alınacak?">
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-line bg-white p-2">
              {secilenPoz.map((p) => (
                <span key={p} className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-brand">
                  {p}
                  <button onClick={() => setSecilenPoz((l) => l.filter((x) => x !== p))} aria-label={`${p} kaldır`}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <select
                value=""
                onChange={(e) => {
                  const v = e.target.value;
                  if (v && !secilenPoz.includes(v)) setSecilenPoz((l) => [...l, v]);
                }}
                className="min-w-32 flex-1 border-0 bg-transparent text-sm focus:outline-none"
              >
                <option value="">Pozisyon ekle...</option>
                {positions.filter((p) => !secilenPoz.includes(p.ad)).map((p) => (
                  <option key={p.id} value={p.ad}>{p.ad}</option>
                ))}
              </select>
            </div>
          </Field>
          <Field label="Proje (isteğe bağlı)">
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={inputCls}>
              <option value="">Seçiniz</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.ad}</option>
              ))}
            </select>
          </Field>

          <div>
            <p className="mb-1.5 text-[13px] font-medium">İşlemi Yapan İK&apos;cı Bilgisi</p>
            <div className="grid grid-cols-2 gap-3">
              <input value={user.name} disabled className={inputCls} aria-label="Ad Soyad" />
              <input value={user.email} disabled className={inputCls} aria-label="E-posta" />
            </div>
            <input
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              className={cx(inputCls, "mt-3")}
              placeholder="Telefon (isteğe bağlı)"
              aria-label="Telefon"
            />
          </div>

          <Field label="Ek Bilgiler (İsteğe Bağlı)" hint="Bu bilgi QR kod ile birlikte raporlamalarda görünecektir.">
            <textarea value={ekBilgi} onChange={(e) => setEkBilgi(e.target.value)} rows={3} className={inputCls} placeholder="Not veya açıklama ekleyebilirsiniz..." />
          </Field>

          <button onClick={olustur} disabled={pending || !sourceId || !kurum || secilenPoz.length === 0} className={btnPrimary + " w-full"}>
            {pending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
            QR Oluştur
          </button>
          {sonuc && !sonuc.ok ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{sonuc.error}</p>
          ) : null}
          <p className="flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-xs leading-relaxed text-slate-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            Oluşturulan her karekod benzersizdir ve taranan verileri detaylı rapor
            olarak Analiz &amp; Raporlar bölümünde görüntüleyebilirsiniz.
          </p>
        </div>
      </Card>

      {/* 2. tasarım + önizleme */}
      <div className="space-y-5">
        <Card className="p-5 sm:p-6">
          <h2 className="text-[15px] font-semibold">2. QR Kod Tasarımı</h2>
          <p className="mt-0.5 text-[13px] text-muted">QR kodunuzun görünümünü özelleştirin.</p>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {CERCEVELER.map((c) => (
              <button
                key={c.key}
                onClick={() => setCerceve(c.key)}
                className={cx(
                  "flex flex-col items-center gap-2 rounded-xl border-2 p-3 text-xs font-medium transition",
                  cerceve === c.key ? "border-primary bg-blue-50/50 text-primary" : "border-line text-slate-600 hover:border-slate-300"
                )}
              >
                <QrCode className="h-7 w-7" strokeWidth={1.5} />
                {c.label}
              </button>
            ))}
          </div>
          <p className="mt-4 mb-1.5 text-[13px] font-medium">Renk Teması</p>
          <div className="flex gap-2">
            {RENKLER.map((r) => (
              <button
                key={r}
                onClick={() => setRenk(r)}
                className={cx(
                  "h-9 w-9 rounded-lg border-2 transition",
                  renk === r ? "border-foreground scale-110" : "border-transparent"
                )}
                style={{ background: r }}
                aria-label={`Renk ${r}`}
              />
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <h2 className="mb-4 text-[15px] font-semibold">3. Önizleme</h2>
          {ok ? (
            <div className="flex flex-col gap-5 sm:flex-row">
              <div
                className={cx(
                  "mx-auto flex w-fit shrink-0 flex-col items-center overflow-hidden rounded-2xl",
                  cerceve === "cercevesiz" ? "" : "p-3",
                  cerceve === "koseli" ? "rounded-none" : ""
                )}
                style={cerceve !== "cercevesiz" ? { background: renk } : undefined}
              >
                <div className="rounded-xl bg-white p-2.5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ok.dataUrl} alt="Oluşturulan QR kod" className="h-44 w-44" />
                </div>
                {cerceve !== "cercevesiz" ? (
                  <p className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-sm font-semibold text-white">
                    Luna ile Başvur <QrCode className="h-4 w-4" />
                  </p>
                ) : null}
              </div>
              <dl className="flex-1 space-y-2.5 text-[13px]">
                {[
                  ["Kaynak", sources.find((s) => s.id === sourceId)?.ad ?? "—"],
                  ["Kurum", kurum],
                  ["Pozisyon(lar)", secilenPoz.join(", ")],
                  ["Oluşturan", ok.olusturan],
                  ["Oluşturulma Tarihi", ok.tarih],
                  ["QR Kod ID", ok.kod],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="w-32 shrink-0 text-muted">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line py-12 text-center">
              <LunaMark className="h-10 w-10 opacity-30" />
              <p className="text-sm text-muted">
                Bilgileri doldurup <span className="font-medium">QR Oluştur</span>&apos;a basın.
              </p>
            </div>
          )}
        </Card>

        {ok ? (
          <Card className="p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold">4. Paylaşım Linki</h2>
            <p className="mt-0.5 text-[13px] text-muted">
              Bu link, karekod ile aynı başvuru formuna yönlendirir.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <input readOnly value={ok.url} className={inputCls + " font-mono text-xs"} />
              <button
                onClick={async () => {
                  await navigator.clipboard.writeText(ok.url);
                  setKopyalandi(true);
                  setTimeout(() => setKopyalandi(false), 1500);
                }}
                className={btnSecondary + " shrink-0"}
              >
                {kopyalandi ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                {kopyalandi ? "Kopyalandı" : "Kopyala"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <a href={ok.url} target="_blank" rel="noopener noreferrer" className={btnSecondary}>
                <ExternalLink className="h-4 w-4" /> Linki Aç
              </a>
              <a href={ok.dataUrl} download={`${ok.kod}.png`} className={btnSecondary}>
                <Download className="h-4 w-4" /> İndir
              </a>
              <button onClick={() => setSonuc(null)} className={btnSecondary + " ml-auto text-emerald-600"}>
                <RefreshCw className="h-4 w-4" /> Yeni QR Oluştur
              </button>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
