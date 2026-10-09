import { Link } from "wouter";

export function GenerationError({ error, retry, disabled }: { error: string | null; retry: () => void; disabled: boolean }) {
  if (!error) return null;
  return <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700" data-testid="text-generate-error">
    <p>{error}</p>
    <div className="mt-2 flex flex-wrap gap-3">
      {error.includes("Please use OCR first") && <Link href="/upload/ocr-pdf" className="font-semibold underline">Open OCR tool</Link>}
      <button type="button" disabled={disabled} onClick={retry} className="font-semibold underline disabled:opacity-50">Retry generation</button>
    </div>
  </div>;
}
