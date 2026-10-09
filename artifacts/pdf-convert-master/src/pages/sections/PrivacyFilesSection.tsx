import { Link } from "wouter";
import { FILE_RETENTION_COPY, HTTPS_COPY, IMAGE_UPLOAD_RETENTION_COPY } from "@/config/siteCopy";
import { browserOnlyTools, localToolsWithOptionalUpload, serverUploadTools, unavailableTools } from "@/config/toolProcessing";

export function PrivacyFilesSection() {
  return (
    <section className="bg-gray-50 px-4 sm:px-6 py-12">
      <div className="mx-auto max-w-4xl space-y-4 text-gray-600">
        <h2 className="text-2xl font-bold text-gray-900">Privacy and your files</h2>
        <p>Some tools process files in your browser; others upload files to the server. {HTTPS_COPY}</p>
        <p>{FILE_RETENTION_COPY}</p>
        <p>{IMAGE_UPLOAD_RETENTION_COPY}</p>
        <details>
          <summary className="cursor-pointer font-medium text-gray-900">Where each tool processes your file</summary>
          <div className="mt-3 space-y-3 text-sm">
            <p><strong>Browser only — your file never leaves your device:</strong> {browserOnlyTools.join(", ")}.</p>
            <p><strong>Local processing with an optional server upload:</strong> {localToolsWithOptionalUpload.join(", ")}. Choosing Upload to Server sends the result to the server.</p>
            <p><strong>Uploads files for server processing:</strong> {serverUploadTools.join(", ")}.</p>
            <p><strong>Unavailable:</strong> {unavailableTools.join(", ")}.</p>
          </div>
        </details>
        <div className="flex flex-wrap gap-5">
          <Link href="/privacy-policy" className="text-primary underline">Privacy policy</Link>
          <Link href="/data-safety" className="text-primary underline">Data safety</Link>
        </div>
      </div>
    </section>
  );
}