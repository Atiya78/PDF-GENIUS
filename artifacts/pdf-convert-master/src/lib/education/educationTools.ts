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

export const EDUCATION_LIMITS = { maxMb: 20, maxPages: 500, maxPasteChars: 250000 } as const;

const QUIZ_FAQS: Faq[] = [
  { q: "How does the quiz generator work?", a: "It reads the text of your PDF (or the text you paste) and asks an AI model to write questions using only that material. Each question carries a short explanation and, for PDFs, the page it came from." },
  { q: "Can it read scanned PDFs?", a: "A scan needs OCR first. If no readable text is found, the tool links to our OCR tool. OCR results can be imperfect, so review the text before generating study material." },
  { q: "How are short answers marked?", a: "Short answer and fill-in-the-blank responses are compared with the model answer after ignoring case, spacing and punctuation. A correct answer worded differently may be marked wrong, so you can override the mark yourself." },
  { q: "Can I edit questions before exporting?", a: "Yes. Change the type, wording, options, correct answer and explanation, or delete a question. Exports always use your edited version." },
  { q: "What are the limits?", a: "Upload up to 20 MB, select up to 500 pages, and use up to 250,000 source characters. Generate 5–50 questions. Five successful generations per day are free across Education tools, resetting at midnight UTC; signed-in users can spend one credit for each additional successful generation." },
  { q: "Is my PDF stored?", a: "PDF Genius does not store the PDF or its extracted text, and your browser never saves them. The extracted text is sent to the configured AI provider to write the questions, and that provider\u2019s own retention policies apply." },
];

const CARD_FAQS: Faq[] = [
  { q: "What kinds of flashcards can I make?", a: "Choose Basic (term and definition), Q&A, or Cloze (fill in the blank), with any count from 10 to 100." },
  { q: "Will my deck survive a refresh?", a: "Your deck, local edits, and study progress are saved in this browser. Signed-in users also have the original generated result in account history for 24 hours. Export edited decks to keep them elsewhere." },
  { q: "Does the PDF get saved in my browser?", a: "No. Only the generated cards and your study progress are stored here. During generation the extracted text is sent to the configured AI provider, whose own retention policies apply." },
  { q: "How do I print the cards?", a: "Export the PDF or choose Print. Each set has an eight-card front sheet and a mirrored back sheet, with matching cut lines. Use A4 duplex printing, flipped on the long edge." },
  { q: "Can I use the cards in Anki?", a: "Export UTF-8 CSV with front and back columns, or Anki TXT as a tab-separated file. Import the two fields as front and back in Anki." },
  { q: "Can I change a card?", a: "Open the grid view to edit, delete or add cards. Changes are saved automatically." },
];

const CHAT_FAQS: Faq[] = [
  { q: "How are answers grounded?", a: "Relevant passages from your PDF are retrieved for each question. Answers carry page citations with a short quote, and you can open the cited page from your own file." },
  { q: "What if the PDF does not contain the answer?", a: "The answer is marked as not found in the document instead of guessing." },
  { q: "Is the PDF kept?", a: "Your PDF and its extracted pages stay in this tab's memory for the session only. They are never written to browser storage, and closing or resetting the chat discards them." },
  { q: "What does each question cost?", a: "Each answered question counts as one successful generation: five are free per day across the education tools, then signed-in users spend one credit. Failed questions are not charged, and a retry never charges twice." },
  { q: "Why does a saved answer have no page preview?", a: "History stores only the answer, never your PDF. Upload the original PDF and start a session to preview pages for new questions." },
  { q: "How long can a chat be?", a: "Up to 100 questions per session. The last six exchanges are sent as context for follow-ups." },
];

const NOTES_FAQS: Faq[] = [
  { q: "Which note styles are available?", a: "Detailed, summary, bullet points, Cornell and mind-map outline." },
  { q: "Can I edit the notes?", a: "Yes. Edit the title, headings, section text with bold, italic and bullet controls, and the key takeaways. Exports always use your latest edits." },
  { q: "Are my edits saved?", a: "Edits live in this page only and are not saved automatically. Account history keeps the original generated notes for 24 hours. Export to keep your edited version." },
  { q: "What can I export?", a: "PDF, Word (DOCX), Markdown, or print directly." },
  { q: "Are source pages shown?", a: "Each section lists the PDF pages it was built from when you upload a PDF." },
  { q: "What are the limits?", a: "Up to 20 MB, 500 selected pages and 250,000 source characters. Each successful generation uses the shared daily allowance." },
];

export const educationTools: EducationTool[] = [
  { id: "quiz-generator", name: "Quiz Generator", slug: "quiz-generator", href: "/education/quiz-generator", description: "Create MCQ, True/False and short-answer quizzes from your PDF.", icon: ListChecks, status: "live", category: "practice", isNew: true, faqs: QUIZ_FAQS },
  { id: "flashcards", name: "Flashcard Maker", slug: "flashcards", href: "/education/flashcards", description: "Auto-generate flip flashcards for fast revision.", icon: Layers, status: "live", category: "revision", isNew: true, faqs: CARD_FAQS },
  { id: "pdf-summarizer", name: "AI PDF Summarizer", slug: "pdf-summarizer", href: "/education/pdf-summarizer", description: "Boil a long chapter down to the points that matter.", icon: FileText, status: "coming-soon", category: "notes", isNew: false, faqs: [] },
  { id: "chat-with-pdf", name: "Ask your PDF", slug: "ask-pdf", href: "/education/ask-pdf", description: "Ask questions and get answers pointing to the page.", icon: MessageSquare, status: "live", category: "notes", isNew: true, faqs: CHAT_FAQS },
  { id: "notes-maker", name: "Notes Maker", slug: "notes-maker", href: "/education/notes-maker", description: "Turn slides and lectures into tidy study notes.", icon: NotebookPen, status: "live", category: "notes", isNew: true, faqs: NOTES_FAQS },
  { id: "pdf-translator", name: "Bangla \u2194 English PDF Translator", slug: "pdf-translator", href: "/education/pdf-translator", description: "Translate study material between Bangla and English.", icon: Languages, status: "coming-soon", category: "translate", isNew: false, faqs: [] },
  { id: "exam-paper-generator", name: "Exam Question Paper Generator", slug: "exam-paper-generator", href: "/education/exam-paper-generator", description: "Build a balanced exam paper from your course material.", icon: FileQuestion, status: "coming-soon", category: "practice", isNew: false, faqs: [] },
  { id: "mind-map", name: "Mind Map from PDF", slug: "mind-map", href: "/education/mind-map", description: "See how the ideas in a chapter connect.", icon: Network, status: "coming-soon", category: "revision", isNew: false, faqs: [] },
];

export const getEducationTool = (id: string) => educationTools.find((t) => t.id === id);

export const EDUCATION_HUB_FAQS: Faq[] = [
  { q: "What is the Education Zone?", a: "A set of study tools that turn your own lecture notes and textbook PDFs into practice material, such as quizzes and flashcards." },
  { q: "Is it free?", a: "Five successful generations per day are free across Education tools. Signed-in users may spend one credit for each additional successful generation or answered study question. Failed generations and unsupported Q&A answers do not spend credits. Uploads are limited to 20 MB, 500 selected pages and 250,000 source characters." },
  { q: "Are my files private?", a: "PDF Genius does not save PDFs or extracted text. Text is sent to the configured AI provider, whose retention policies apply. Signed-in accounts save generated results for 24 hours; flashcard progress and local edits are saved in this browser." },
  { q: "Does the AI make things up?", a: "The AI is told to use only your document. Language models can still make mistakes, so check answers against your source." },
  { q: "Does it work with Bangla?", a: "Yes. You can write the output in English, Bangla, or the language of your document." },
  { q: "Which tools are available?", a: "Quiz Generator, Flashcards, Ask your PDF and Notes Maker are available. Study Q&A provides quoted page citations. Notes Maker creates editable notes in five styles. Each tool has exports and account history." },
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
