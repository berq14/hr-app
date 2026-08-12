import "server-only";
import { db } from "./db";

/** Denetim kaydı — kişisel veri erişimi ve kritik işlemler izlenir (KVKK). */
export async function audit(params: {
  userId?: string | null;
  eylem: string;
  varlik?: string;
  varlikId?: string;
  detay?: unknown;
  ip?: string | null;
}) {
  try {
    await db.auditLog.create({
      data: {
        userId: params.userId ?? null,
        eylem: params.eylem,
        varlik: params.varlik,
        varlikId: params.varlikId,
        detay: params.detay ? JSON.stringify(params.detay) : null,
        ip: params.ip ?? null,
      },
    });
  } catch (e) {
    // denetim kaydı hatası ana akışı bozmamalı ama loglanmalı
    console.error("audit-log-hatasi", e);
  }
}
