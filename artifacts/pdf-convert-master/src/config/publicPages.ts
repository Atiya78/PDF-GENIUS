// PURE data module (no imports). Metadata for public, indexable, non-tool routes.
export interface PublicPage {
  path: string;
  title: string;
  description: string;
}

export const publicPages: PublicPage[] = [
  { path: "/", title: "PDF Genius | Free Online PDF Tools, No Signup", description: "Merge, split, compress, convert and edit PDFs with free web tools. No signup required. A separate developer API is available for higher volume." },
  { path: "/pricing", title: "Pricing: Free PDF Tools and Developer API | PDF Genius", description: "Every web tool is free. Pay only if you need higher API volume. See the developer API plans for programmatic PDF conversion." },
  { path: "/about", title: "About PDF Genius | Free PDF and Image Tools", description: "Learn about PDF Genius, a set of free web PDF and image tools, plus a separate paid developer API for higher volume." },
  { path: "/contact", title: "Contact PDF Genius | Questions and Feedback", description: "Get in touch with the PDF Genius team about the web tools, the developer API, billing or feedback, and read answers to common questions." },
  { path: "/support", title: "PDF Genius Support | Help and Contact", description: "Find help articles, troubleshooting steps and contact options for PDF Genius web tools, the developer API and billing." },
  { path: "/tools", title: "All PDF and Image Tools | PDF Genius", description: "Browse every PDF Genius web tool: convert, merge, split, compress, rotate, sign and OCR PDFs, plus resize, crop and convert images." },
  { path: "/features", title: "Features: PDF and Image Tools | PDF Genius", description: "See what PDF Genius offers: convert, edit, merge, split, compress, sign and OCR PDFs, with browser-based and server-based tools." },
  { path: "/learn-more", title: "Learn More About PDF Genius | Guides and Help", description: "Guides for getting started with PDF Genius web tools, the developer API, accounts and billing." },
  { path: "/terms-of-service", title: "Terms of Service | PDF Genius", description: "Read the terms that apply when you use the PDF Genius website, web tools and developer API." },
  { path: "/privacy-policy", title: "Privacy Policy | PDF Genius", description: "How PDF Genius collects, uses and protects personal information when you use the website, web tools and developer API." },
  { path: "/refund-policy", title: "Refund Policy | PDF Genius", description: "When refunds are available for PDF Genius developer API plans and how to request one from support." },
  { path: "/data-safety", title: "Data Safety | PDF Genius", description: "How PDF Genius handles your files and data, including which tools run in your browser and which are processed on servers." },
];

export const publicPageByPath = (path: string): PublicPage | undefined =>
  publicPages.find((p) => p.path === path);
