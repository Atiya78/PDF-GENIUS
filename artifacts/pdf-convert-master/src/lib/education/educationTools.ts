import type { LucideIcon } from "lucide-react";
import {
  FileQuestion,
  FileText,
  Languages,
  Layers,
  ListChecks,
  MessageSquare,
  Network,
  NotebookPen,
} from "lucide-react";

export type EducationCategory = "practice" | "revision" | "notes" | "translate";
export type EducationToolStatus = "live" | "coming-soon";

export interface Faq {
  q: string;
  a: string;
}

export interface EducationTool {
  id: string;
  name: string;
  slug: string;
  /** Route. Live tools only. */
  href: string;
  description: string;
  icon: LucideIcon;
  status: EducationToolStatus;
  category: EducationCategory;
  isNew: boolean;
  faqs: Faq[];
}

export const EDUCATION_CATEGORIES: { id: "all" | EducationCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "practice", label: "Practice" },
  { id: "revision", label: "Revision" },
  { id: "notes", label: "Notes" },
  { id: "translate", label: "Translate" },
];

export const EDUCATION_LIMITS = { maxMb: 20, maxPages: 50, maxPasteChars: 250000 } as const;

const QUIZ_FAQS: Faq[] = [
  { q: "How does the quiz generator work?", a: "It reads the text of your PDF (or the text you paste) and asks an AI model to write questions using only that material. Each question carries a short explanation and, for PDFs, the page it came from." },
  { q: "Can it read scanned PDFs?", a: "Yes. If a page has no selectable text, the server falls back to OCR for that page. OCR on blurry scans can be imperfect, so check the warnings shown after reading." },
  { q: "How are short answers marked?", a: "Short answer and fill-in-the-blank responses are compared with the model answer after ignoring case, spacing and punctuation. A correct answer worded differently may be marked wrong, so you can override the mark yourself." },
  { q: "Can I edit questions before exporting?", a: "Yes. Change the type, wording, options, correct answer and explanation, or delete a question. Exports always use your edited version." },
  { q: "What are the limits?", a: "Free use allows PDFs up to 20 MB and 50 pages, and 5 generations per day shared across both tools (resets at midnight UTC)." },
  { q: "Is my PDF stored?", a: "PDF Genius does not store the PDF or its extracted text, and your browser never saves them. The extracted text is sent to the configured AI provider to write the questions, and that provider\u2019s own retention policies apply." },
];

const CARD_FAQS: Faq[] = [
  { q: "What kinds of flashcards can I make?", a: "Term and definition, question and answer, or concept and explanation, in 10, 20, 40 or 60 cards." },
  { q: "Will my deck survive a refresh?", a: "Yes. The finished deck and your know / still-learning marks are saved in this browser only. Use the Clear saved deck button to remove them." },
  { q: "Does the PDF get saved in my browser?", a: "No. Only the generated cards and your study progress are stored here. During generation the extracted text is sent to the configured AI provider, whose own retention policies apply." },
  { q: "How do I print the cards?", a: "Export the PDF for 8 cut-out cards per page (2 by 4), fronts and backs included." },
  { q: "Can I use the cards in Anki?", a: "Export the Anki TXT file and import it as a tab-separated text file with front and back fields." },
  { q: "Can I change a card?", a: "Open the grid view to edit, delete or add cards. Changes are saved automatically." },
];

export const educationTools: EducationTool[] = [
  { id: "quiz-generator", name: "Quiz Generator", slug: "quiz-generator", href: "/education/quiz-generator", description: "Create MCQ, True/False and short-answer quizzes from your PDF.", icon: ListChecks, status: "live", category: "practice", isNew: true, faqs: QUIZ_FAQS },
  { id: "flashcards", name: "Flashcard Maker", slug: "flashcards", href: "/education/flashcards", description: "Auto-generate flip flashcards for fast revision.", icon: Layers, status: "live", category: "revision", isNew: true, faqs: CARD_FAQS },
  { id: "pdf-summarizer", name: "AI PDF Summarizer", slug: "pdf-summarizer", href: "/education/pdf-summarizer", description: "Boil a long chapter down to the points that matter.", icon: FileText, status: "coming-soon", category: "notes", isNew: false, faqs: [] },
  { id: "chat-with-pdf", name: "Chat with PDF", slug: "chat-with-pdf", href: "/education/chat-with-pdf", description: "Ask questions and get answers pointing to the page.", icon: MessageSquare, status: "coming-soon", category: "notes", isNew: false, faqs: [] },
  { id: "notes-maker", name: "Notes Maker", slug: "notes-maker", href: "/education/notes-maker", description: "Turn slides and lectures into tidy study notes.", icon: NotebookPen, status: "coming-soon", category: "notes", isNew: false, faqs: [] },
  { id: "pdf-translator", name: "Bangla \u2194 English PDF Translator", slug: "pdf-translator", href: "/education/pdf-translator", description: "Translate study material between Bangla and English.", icon: Languages, status: "coming-soon", category: "translate", isNew: false, faqs: [] },
  { id: "exam-paper-generator", name: "Exam Question Paper Generator", slug: "exam-paper-generator", href: "/education/exam-paper-generator", description: "Build a balanced exam paper from your course material.", icon: FileQuestion, status: "coming-soon", category: "practice", isNew: false, faqs: [] },
  { id: "mind-map", name: "Mind Map from PDF", slug: "mind-map", href: "/education/mind-map", description: "See how the ideas in a chapter connect.", icon: Network, status: "coming-soon", category: "revision", isNew: false, faqs: [] },
];

export const getEducationTool = (id: string) => educationTools.find((t) => t.id === id);

export const EDUCATION_HUB_FAQS: Faq[] = [
  { q: "What is the Education Zone?", a: "A set of study tools that turn your own lecture notes and textbook PDFs into practice material, such as quizzes and flashcards." },
  { q: "Is it free?", a: "Yes. Free use has 5 generations per day shared across both tools, a 20 MB file limit and a 50 page limit." },
  { q: "Are my files private?", a: "PDF Genius does not store PDFs or extracted text. The text is sent to the configured AI provider to generate results, and its own retention policies apply. Your browser only keeps flashcard decks and progress." },
  { q: "Does the AI make things up?", a: "The AI is told to use only your document. Language models can still make mistakes, so check answers against your source." },
  { q: "Does it work with Bangla?", a: "Yes. You can write the output in English, Bangla, or the language of your document." },
  { q: "What tools are coming next?", a: "A PDF summarizer, chat with PDF, notes maker, Bangla and English translator, exam paper generator and mind maps." },
];

export const faqJsonLd = (faqs: Faq[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
});
