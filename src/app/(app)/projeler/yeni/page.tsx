import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { Card, PageTitle } from "@/components/ui";
import { ProjeForm } from "./proje-form";

export const metadata = { title: "Yeni Proje" };

export default async function YeniProje() {
  await requireRole("IK_YONETICISI");
  const [users, positions] = await Promise.all([
    db.user.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    db.position.findMany({ where: { aktif: true }, orderBy: { ad: "asc" } }),
  ]);
  return (
    <div className="space-y-5">
      <PageTitle title="Yeni Proje Ekle" subtitle="Proje bilgilerini ve norm kadroyu tanımlayın." />
      <Card className="p-5 sm:p-6">
        <ProjeForm
          users={users}
          positions={positions.map((p) => ({ id: p.id, ad: p.ad }))}
        />
      </Card>
    </div>
  );
}
