import "server-only";

/**
 * Bellek içi kayan pencere rate limiter.
 * Tek örnekli dağıtımlar için yeterlidir; çoklu örnekte Redis tabanlı
 * bir çözüme geçilmelidir (arayüz aynı kalacak şekilde tasarlandı).
 */

type Bucket = { hits: number[]; };
const buckets = new Map<string, Bucket>();

const MAX_BUCKETS = 10_000;

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSn: number } {
  const now = Date.now();
  let bucket = buckets.get(key);
  if (!bucket) {
    if (buckets.size >= MAX_BUCKETS) {
      // en eski kayıtları temizle (bellek taşması koruması)
      const cutoff = now - windowMs;
      for (const [k, b] of buckets) {
        b.hits = b.hits.filter((t) => t > cutoff);
        if (b.hits.length === 0) buckets.delete(k);
        if (buckets.size < MAX_BUCKETS / 2) break;
      }
    }
    bucket = { hits: [] };
    buckets.set(key, bucket);
  }
  const cutoff = now - windowMs;
  bucket.hits = bucket.hits.filter((t) => t > cutoff);
  if (bucket.hits.length >= limit) {
    const oldest = bucket.hits[0];
    return { ok: false, retryAfterSn: Math.ceil((oldest + windowMs - now) / 1000) };
  }
  bucket.hits.push(now);
  return { ok: true, retryAfterSn: 0 };
}
