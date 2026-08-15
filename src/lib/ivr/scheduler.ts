import "server-only";
import { db } from "../db";
import { getSettings, nowIstanbul, runCampaignTick } from "./engine";

/**
 * Günde 2 kez otomatik kampanya tetikleyicisi.
 * Sunucu açıkken her dakika saat kontrolü yapar; ayarlanan saat geldiğinde
 * ve o slot bugün henüz koşmadıysa kampanya turunu başlatır.
 *
 * Not: Çok örnekli (multi-instance) üretim dağıtımında bu zamanlayıcı yerine
 * harici bir cron (ör. Windows Görev Zamanlayıcı → POST /api/ivr/tetikle)
 * kullanılmalıdır; sonSlot kontrolü mükerrer koşmayı yine de engeller.
 */

const globalIvr = globalThis as unknown as { __ivrTimer?: ReturnType<typeof setInterval> };

export function startIvrScheduler() {
  if (globalIvr.__ivrTimer) return;
  globalIvr.__ivrTimer = setInterval(() => {
    tick().catch((e) => console.error("ivr-scheduler-hata", e));
  }, 60_000);
  console.log("[ivr] zamanlayıcı başladı (60 sn kontrol aralığı)");
}

async function tick() {
  const settings = await getSettings();
  if (!settings.aktif) return;
  const { hhmm, dateKey } = nowIstanbul();
  const slot =
    hhmm === settings.saat1 ? "otomatik-1" : hhmm === settings.saat2 ? "otomatik-2" : null;
  if (!slot) return;
  const slotKey = `${dateKey} ${hhmm} ${slot}`;
  if (settings.sonSlot === slotKey) return; // bu slot bugün koştu

  // yarış koşulunu önle: önce slotu işaretle
  const updated = await db.ivrSettings.updateMany({
    where: { id: "main", NOT: { sonSlot: slotKey } },
    data: { sonSlot: slotKey },
  });
  if (updated.count === 0) return;

  console.log(`[ivr] otomatik kampanya turu: ${slotKey}`);
  await runCampaignTick(slot);
}
