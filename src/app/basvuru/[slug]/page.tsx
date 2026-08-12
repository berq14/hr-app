import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { LunaLogo } from "@/components/logo";
import { BasvuruFormu } from "./basvuru-formu";

export const metadata = {
  title: "İş Başvuru Formu",
  robots: { index: false, follow: false },
};
export const dynamic = "force-dynamic";

export default async function BasvuruPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  // slug biçim kontrolü (enumerasyona karşı ilk bariyer)
  if (!/^[A-Za-z0-9_-]{6,80}$/.test(slug)) notFound();

  const qr = await db.qrCode.findUnique({
    where: { slug },
    include: { source: true, createdBy: { select: { name: true } } },
  });
  if (!qr || !qr.aktif) notFound();

  // tarama sayacı
  await db.qrCode.update({
    where: { id: qr.id },
    data: { taramaSayisi: { increment: 1 } },
  });

  const pozisyonlar: string[] = JSON.parse(qr.pozisyonlar);

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <LunaLogo size="sm" />
          <span className="text-xs text-muted">Güvenli Başvuru Formu</span>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-8">
        <div className="rounded-2xl border border-line bg-card p-5 shadow-[0_4px_24px_rgba(16,24,40,0.05)] sm:p-7">
          <h1 className="text-xl font-bold">{qr.kurum ?? "İş Başvurusu"}</h1>
          <p className="mt-1 text-sm text-slate-600">
            Aşağıdaki pozisyon{pozisyonlar.length > 1 ? "lar" : ""} için başvuru
            yapıyorsunuz:
          </p>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {pozisyonlar.map((p) => (
              <span
                key={p}
                className="rounded-lg bg-indigo-50 px-2.5 py-1 text-[13px] font-medium text-brand"
              >
                {p}
              </span>
            ))}
          </div>
          {qr.ekBilgi ? (
            <p className="mt-3 rounded-xl bg-slate-50 p-3 text-[13px] text-slate-600">
              {qr.ekBilgi}
            </p>
          ) : null}
          <div className="mt-6">
            <BasvuruFormu slug={slug} pozisyonlar={pozisyonlar} />
          </div>
        </div>
        <p className="mt-6 text-center text-xs leading-relaxed text-muted">
          Bu form üzerinden ilettiğiniz kişisel veriler, 6698 sayılı KVKK
          kapsamında yalnızca işe alım süreçlerinin yürütülmesi amacıyla işlenir
          ve şifreli olarak saklanır.
        </p>
      </main>
    </div>
  );
}
