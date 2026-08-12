import { requireUser } from "@/lib/auth";
import { AdayListesi } from "../liste";

export const metadata = { title: "Olumsuz Adaylar" };
export const dynamic = "force-dynamic";

export default async function OlumsuzAdaylar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  return (
    <AdayListesi
      base="/adaylar/olumsuz"
      searchParams={await searchParams}
      fixedDurum="OLUMSUZ"
      ilceFiltre
      onMulakatFiltre
    />
  );
}
