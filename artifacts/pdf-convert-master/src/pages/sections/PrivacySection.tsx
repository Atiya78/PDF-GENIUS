import { Link } from "wouter";
import { LOCAL_PDF_TOOLS } from "@/config/siteStats";

export const PrivacySection = (): JSX.Element => (
  <section className="w-full bg-gray-50 py-14 sm:py-16" aria-labelledby="privacy-files-heading">
    <div className="max-w-screen-lg mx-auto px-4 sm:px-6 lg:px-8">
      <h2 id="privacy-files-heading" className="text-2xl sm:text-3xl font-bold text-gray-900">
        Privacy and your files
      </h2>
      <div className="mt-4 space-y-3 text-gray-600 leading-7 max-w-3xl">
        <p>
          {LOCAL_PDF_TOOLS.join(", ")} run in your browser, so the file is read on your device and is not uploaded.
        </p>
        <p>
          Other tools upload your file to our servers to process it. Results are stored so you can download them
          later, and you can delete saved results yourself. Transfers use HTTPS.
        </p>
      </div>
      <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium">
        <Link href="/privacy-policy" className="text-[#c62d27] hover:underline inline-flex min-h-[44px] items-center" data-testid="link-home-privacy-policy">
          Privacy Policy
        </Link>
        <Link href="/data-safety" className="text-[#c62d27] hover:underline inline-flex min-h-[44px] items-center" data-testid="link-home-data-safety">
          Data Safety
        </Link>
      </div>
    </div>
  </section>
);
