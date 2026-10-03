import React from "react";
import { FeaturesSection } from "./sections/FeaturesSection";
import { HeroSection } from "./sections/HeroSection";
import { TestimonialsSection } from "./sections/TestimonialsSection";
import { APIDocumentationSection } from "./sections/APIDocumentationSection";
import { useSeo } from "@/lib/useSeo";

export const Body = (): JSX.Element => {
  useSeo({
    title: "PDF Genius — Free Online PDF Converter & Editor, No Signup",
    description:
      "Convert, edit, merge, split & compress PDFs free in your browser. 100% free — no signup, no email, no credit card. Fast, secure, unlimited PDF tools.",
    canonicalPath: "/",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "PDF Genius",
      url: "https://pdfgenius.app/",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any (web-based)",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description:
        "Free online PDF and image tools: convert, edit, merge, split, compress, sign and OCR PDFs right in your browser.",
    },
  });
  return (
    <div className="flex flex-col w-full relative overflow-x-hidden bg-white">
      {/* Main content sections — each renders its own animated background */}
      <HeroSection />
      <FeaturesSection />
      <APIDocumentationSection />
      <TestimonialsSection />
    </div>
  );
};
