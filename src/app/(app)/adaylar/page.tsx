import { requireUser } from "@/lib/auth";
import { AdayListesi } from "./liste";

export const metadata = { title: "Tüm Adaylar" };
export const dynamic = "force-dynamic";

export default async function TumAdaylar({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireUser();
  return (
    <AdayListesi base="/adaylar" searchParams={await searchParams} onMulakatFiltre />
  );
}
