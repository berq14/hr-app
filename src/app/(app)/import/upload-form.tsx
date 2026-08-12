"use client";

import { useRef, useState } from "react";
import { CloudUpload, FileCheck2, LoaderCircle, TriangleAlert } from "lucide-react";
import { useRouter } from "next/navigation";
import { btnPrimary, cx } from "@/components/ui";

type Sonuc = {
  toplam: number;
  basarili: number;
  hatalar: { satir: number; hata: string }[];
};

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<Sonuc | null>(null);

  async function upload() {
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    setSonuc(null);
    try {
      const fd = new FormData();
      fd.append("dosya", file);
      const res = await fetch("/api/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Aktarım başarısız oldu.");
      } else {
        setSonuc(data);
        router.refresh();
      }
    } catch {
      setError("Sunucuya ulaşılamadı. Tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) setFile(f);
        }}
        className={cx(
          "flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-10 text-center transition",
          drag ? "border-primary bg-blue-50" : "border-line bg-slate-50/50 hover:bg-slate-50"
        )}
      >
        <CloudUpload className="h-10 w-10 text-primary" strokeWidth={1.5} />
        <p className="text-sm font-medium">
          Dosyayı buraya sürükleyin veya <span className="text-primary">seçmek için tıklayın</span>
        </p>
        <p className="text-xs text-muted">xlsx, csv veya json • en fazla 8 MB / 5.000 satır</p>
        {file ? (
          <p className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-[13px] font-medium text-primary">
            <FileCheck2 className="h-4 w-4" /> {file.name} ({(file.size / 1024).toFixed(0)} KB)
          </p>
        ) : null}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv,.txt,.json"
        className="hidden"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      {error ? (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
          <TriangleAlert className="h-4 w-4 shrink-0" /> {error}
        </p>
      ) : null}

      {sonuc ? (
        <div className="rounded-xl border border-line p-4">
          <p className="text-sm">
            <span className="font-semibold text-emerald-600">{sonuc.basarili}</span> kayıt
            aktarıldı, <span className="font-semibold text-red-500">{sonuc.hatalar.length}</span>{" "}
            satır hatalı ({sonuc.toplam} satır işlendi).
          </p>
          {sonuc.hatalar.length > 0 ? (
            <ul className="mt-2 max-h-44 space-y-1 overflow-y-auto text-xs text-slate-600">
              {sonuc.hatalar.map((h, i) => (
                <li key={i}>
                  <span className="font-medium">Satır {h.satir}:</span> {h.hata}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      <button onClick={upload} disabled={!file || busy} className={btnPrimary}>
        {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
        Aktarımı Başlat
      </button>
    </div>
  );
}
