import { listObjects, deleteObject } from "./s3Storage";
import { logger } from "./logger";

export const RESULT_RETENTION_MS = 24 * 60 * 60 * 1000;
export function isExpiredResult(date: Date | string | null | undefined, now = Date.now()) {
  if (!date) return false;
  const stamp = new Date(date).getTime();
  return Number.isFinite(stamp) && now - stamp >= RESULT_RETENTION_MS;
}
export function expiredCompletedJob(job: { status: string; updatedAt?: Date | string | null }, now = Date.now()) {
  return job.status === "completed" && isExpiredResult(job.updatedAt, now);
}
export function isConversionResultKey(key: string) {
  return /^conversions\/\d+(?:-ocr-text\.json)?$/.test(key);
}
type Entry = { key: string; lastModified?: Date };
type Page = { objects: Entry[]; continuationToken?: string };
/** Deliberately leaves database/job/billing records and non-conversion assets alone. */
export async function cleanupExpiredConversionResults(
  now = Date.now(),
  storage: { list: (prefix: string, token?: string) => Promise<Page>; remove: (key: string) => Promise<void> } =
    { list: listObjects, remove: deleteObject },
) {
  let token: string | undefined, removed = 0, failed = 0;
  do {
    const page = await storage.list("conversions/", token);
    for (const object of page.objects) {
      if (!isConversionResultKey(object.key) || !isExpiredResult(object.lastModified, now)) continue;
      try { await storage.remove(object.key); removed++; }
      catch { failed++; }
    }
    token = page.continuationToken;
  } while (token);
  if (failed) throw new Error(`Conversion cleanup could not delete ${failed} expired objects; they will be retried.`);
  return removed;
}
export function startConversionCleanup() {
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      const removed = await cleanupExpiredConversionResults();
      if (removed) logger.info({ removed }, "Expired conversion results deleted");
    } catch (error) { logger.error({ error: String(error) }, "Conversion cleanup failed; next scheduled run will retry"); }
    finally { running = false; }
  };
  const timer = setInterval(() => void run(), 5 * 60 * 1000);
  timer.unref();
  void run();
  return () => clearInterval(timer);
}
