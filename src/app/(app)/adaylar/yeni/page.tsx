import { requireUser } from "@/lib/auth";
import { filterOptions } from "@/lib/queries";
import { Card, PageTitle } from "@/components/ui";
import { AdayForm } from "../aday-form";
import { createCandidateAction } from "../actions";

export const metadata = { title: "Yeni Başvuru" };

export default async function YeniAday() {
  await requireUser();
  const opts = await filterOptions();
  return (
    <div className="space-y-5">
      <PageTitle
        title="Yeni Başvuru"
        subtitle="Adayın başvuru bilgilerini girin. Kişisel veriler şifreli olarak saklanır."
      />
      <Card className="p-5 sm:p-6">
        <AdayForm
          action={createCandidateAction}
          positions={opts.positions}
          projects={opts.projects.map((p) => ({ id: p.id, ad: p.ad }))}
          sources={opts.sources}
          submitLabel="Başvuruyu Kaydet"
          kvkkAlani
        />
      </Card>
    </div>
  );
}
