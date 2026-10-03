import React, { lazy, Suspense } from "react";
import { ToolDirectory } from "@/components/ToolDirectory";
import { FeaturesSection } from "./sections/FeaturesSection";
import { HeroSection } from "./sections/HeroSection";
import { TestimonialsSection } from "./sections/TestimonialsSection";
import { APIDocumentationSection } from "./sections/APIDocumentationSection";
import { useSeo } from "@/lib/useSeo";
import { SITE_DESCRIPTION } from "@/config/siteCopy";
import { PrivacyFilesSection } from "./sections/PrivacyFilesSection";

const EducationZoneSection = lazy(() =>
  import("@/components/education/EducationZoneSection").then((m) => ({ default: m.EducationZoneSection })),
);

export const Body = (): JSX.Element => {
  useSeo({
    title: "PDF Genius — Free Online PDF Converter & Editor, No Signup",
    description:
      SITE_DESCRIPTION,
    canonicalPath: "/",
    jsonLd: [{
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "PDF Genius",
      url: "https://pdfgenius.app/",
      logo: "https://pdfgenius.app/genius-logo.png",
    }, {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "PDF Genius",
      url: "https://pdfgenius.app/",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any (web-based)",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description:
        SITE_DESCRIPTION,
    }],
  });
  return (
    <div className="flex flex-col w-full relative overflow-x-hidden bg-white">
      {/* Main content sections — each renders its own animated background */}
      <HeroSection />
      <FeaturesSection />
      <Suspense fallback={<div className="min-h-[420px]" aria-hidden="true" />}>
        <EducationZoneSection />
      </Suspense>
      <PrivacyFilesSection />
      <ToolDirectory />
      <APIDocumentationSection />
      <TestimonialsSection />
    </div>
  );
};
