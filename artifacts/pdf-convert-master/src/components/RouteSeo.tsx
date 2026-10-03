import { useLocation } from "wouter";
import { useSeo } from "@/lib/useSeo";
import { toolLandingPages } from "@/config/toolLandingPages";
import { contactFaqs } from "@/config/contactFaqs";
const contactSchema = {
  "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: contactFaqs.map(faq => ({
    "@type": "Question", name: faq.question,
    acceptedAnswer: { "@type": "Answer", text: faq.answer },
  })),
};

// Covers legal/private routes that do not call useSeo themselves. Landing pages
// own their complete metadata and schema through ToolLandingPage instead.
export function RouteSeo() {
  const [path] = useLocation();
  useSeo({ enabled: !toolLandingPages.some((page) => page.path === path), jsonLd: path === "/contact" ? contactSchema : undefined });
  return null;
}