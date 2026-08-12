import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageTitle } from "@/components/ui";
import { QrBuilder } from "./qr-builder";

export const metadata = { title: "Karekod Oluşturma" };
export const dynamic = "force-dynamic";

export default async function KarekodPage() {
  const user = await requireUser();
  const [sources, projects, positions] = await Promise.all([
    db.source.findMany({ where: { aktif: true }, orderBy: { ad: "asc" } }),
    db.project.findMany({ where: { aktif: true }, orderBy: { ad: "asc" } }),
    db.position.findMany({ where: { aktif: true }, orderBy: { ad: "asc" } }),
  ]);
  return (
    <div className="space-y-5">
      <PageTitle
        title="Karekod Oluşturma"
        subtitle="Başvuru alınacak kaynak, kurum ve pozisyona özel karekod oluşturun."
      />
      <QrBuilder
        sources={sources.map((s) => ({ id: s.id, ad: s.ad }))}
        projects={projects.map((p) => ({ id: p.id, ad: p.ad }))}
        positions={positions.map((p) => ({ id: p.id, ad: p.ad }))}
        user={{ name: user.name, email: user.email }}
      />
    </div>
  );
}
