/** Home-page FAQ. Used by the FAQ UI and the FAQPage JSON-LD so they never drift. */
export interface FaqItem {
  question: string;
  answer: string;
}

export const homeFaq: FaqItem[] = [
  {
    question: "Do I need an account to use the tools?",
    answer:
      "No. The web tools are free to use without signing up. An account is only needed for the separate paid developer API and the dashboard.",
  },
  {
    question: "Are my files uploaded to your servers?",
    answer:
      "It depends on the tool. Edit PDF, Sign PDF, Crop PDF and Delete Pages run in your browser, so the file is read on your device and not uploaded. The other tools, such as the converters, merge, split and compress, upload your file to our servers to process it.",
  },
  {
    question: "How long are my files kept?",
    answer:
      "We don't promise an automatic deletion time. For tools that run on our servers, the result is stored so you can download it later, and you can delete saved results yourself. Files in the four browser-based tools never leave your device. See the Privacy Policy and Data Safety pages for details.",
  },
  {
    question: "Which tools and file types are available?",
    answer:
      "Converters (PDF to Word, Excel, PowerPoint and images, and Word, Excel, PowerPoint, HTML and images to PDF), organize tools (merge, split, rotate, delete pages), security tools (lock and unlock PDF), editing tools (edit, sign, crop, watermark, add image, compress, OCR) and image tools (resize, crop, rotate, convert, compress, upscale, remove background). There is also a video compressor.",
  },
  {
    question: "Is there a file size limit?",
    answer:
      "Each tool shows its own maximum file size on its page before you upload. Files that are too large are rejected with a message.",
  },
  {
    question: "What is the developer API and how is it priced?",
    answer:
      "The API lets you run conversions from your own software with an API key. It is a separate paid product with its own plans, shown on the Pricing page. Every web tool stays free; you only pay if you need API volume.",
  },
  {
    question: "Do I need to install anything?",
    answer:
      "No. The tools work in a modern web browser. There is also an Android app on Google Play, and iOS is not available yet.",
  },
  {
    question: "How do I contact support?",
    answer:
      "Use the Support page, or email support@pdfgenius.app. We don't publish a guaranteed reply time.",
  },
];

export const homeFaqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: homeFaq.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
};
