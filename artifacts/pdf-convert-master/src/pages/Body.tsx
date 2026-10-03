import { HeroSection } from "./sections/HeroSection";
import { PrivacySection } from "./sections/PrivacySection";
import {
  HowItWorksSection,
  ToolCategoriesSection,
  DeveloperApiSection,
  FaqSection,
  FinalCtaSection,
} from "./sections/HomeSections";
import { homeFaqJsonLd } from "@/config/homeFaq";
import { usePublicSeo } from "@/lib/usePublicSeo";

// Home page order: hero (tool grid + upload) > how it works > categories >
// privacy > developer API > FAQ > final CTA. Organization, WebApplication and FAQPage schema are emitted here; no Review/AggregateRating markup is emitted anywhere.
export const Body = (): JSX.Element => {
  usePublicSeo("/", {
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "PDF Genius",
        url: "https://pdfgenius.app/",
      },
      {
        "@context": "https://schema.org",
        "@type": "WebApplication",
        name: "PDF Genius",
        url: "https://pdfgenius.app/",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any (web-based)",
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        description:
          "Free online PDF and image tools: convert, edit, merge, split, compress, sign and OCR PDFs. No signup required.",
      },
      homeFaqJsonLd,
    ],
  });
  return (
    <div className="flex flex-col w-full relative overflow-x-hidden bg-white">
      <HeroSection />
      <HowItWorksSection />
      <ToolCategoriesSection />
      <PrivacySection />
      <DeveloperApiSection />
      <FaqSection />
      <FinalCtaSection />
    </div>
  );
};
