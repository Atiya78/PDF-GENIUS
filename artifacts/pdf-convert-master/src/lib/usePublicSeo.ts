import { useSeo, type SeoOptions } from "@/lib/useSeo";
import { publicPageByPath } from "@/config/publicPages";

/** Applies title/description/canonical from config/publicPages.ts for a public route. */
export function usePublicSeo(path: string, extra: Pick<SeoOptions, "jsonLd"> = {}) {
  const page = publicPageByPath(path);
  useSeo({
    title: page?.title,
    description: page?.description,
    canonicalPath: path,
    jsonLd: extra.jsonLd,
  });
}
