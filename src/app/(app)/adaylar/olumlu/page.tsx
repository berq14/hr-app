import { requireUser } from "@/lib/auth";
import { AdayListesi } from "../liste";

export const metadata = { title: "Olumlu Adaylar" };
export const dynamic = "force-dynamic";

export default async function OlumluAdaylar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  return (
    <AdayListesi
      base="/adaylar/olumlu"
      searchParams={await searchParams}
      fixedDurum="OLUMLU"
      ilceFiltre
    />
  );
}
