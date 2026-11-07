import { useState } from "react";
import { contactFaqs } from "@/config/contactFaqs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ChevronDown, Copy, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSeo } from "@/lib/useSeo";
import { SUPPORT_REPLY_COPY } from "@/config/siteCopy";
import { Reveal } from "@/components/education/Reveal";
import { cn } from "@/lib/utils";
import "@/styles/marketing.css";

const CATEGORIES = [
  { id: "technical", label: "Technical Support", text: "Having trouble with a tool? Tell us the tool name and the message you saw." },
  { id: "business", label: "Business Inquiry", text: "Custom integrations and volume pricing for your organization." },
  { id: "feedback", label: "Feedback", text: "Share your experience, suggest improvements, or report issues." },
  { id: "partnership", label: "Partnership", text: "Collaboration opportunities and integration possibilities." },
];
const PRIORITIES = ["low", "medium", "high", "urgent"];

const fieldClass = "mt-2 h-11 rounded-[9px] border-[#e7e0d5] bg-white focus-visible:ring-[#f7433d]/30 focus-visible:border-[#1c1917]";

export const Contact = (): JSX.Element => {
  useSeo({
    title: "Contact & Support",
    description:
      "Get in touch with the PDF Genius team. Questions, feedback or support for our free online PDF and image tools — we're here to help.",
    canonicalPath: "/contact",
  });
  const [selectedPriority, setSelectedPriority] = useState("medium");
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(0);
  const [selectedCategory, setSelectedCategory] = useState("technical");
  const { toast } = useToast();

  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error("insecure");
      }
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
    }
    toast({ title: `${label} copied`, description: text, duration: 4000 });
  };

  const firstFaq = {
    question: "What file formats do you support for conversion?",
    answer: "We support a wide range of file formats including PDF, Word (DOC/DOCX), Excel (XLS/XLSX), PowerPoint (PPT/PPTX), JPG, PNG, HTML, and many more. Our tools can handle most common document and image formats.",
  };
  const faqs = [firstFaq, ...contactFaqs.slice(1)];
  const active = CATEGORIES.find((c) => c.id === selectedCategory) ?? CATEGORIES[0];

  return (
    <div className="mkt-root pb-24">
      <section className="border-b border-[#e7e0d5]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-14 pt-10 sm:px-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-14 lg:pt-16">
          <div>
            <p className="edu-eyebrow">Contact</p>
            <h1 className="mkt-display mt-4 text-[2.4rem] sm:text-[3.2rem]">Write to a person, not a ticket queue.</h1>
            <p className="mkt-lede mt-6 max-w-lg">Questions about a tool, your account, billing or a file-processing issue. {SUPPORT_REPLY_COPY}.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href="mailto:support@pdfgenius.app" className="edu-btn-primary" data-testid="link-contact-email">
                <Mail className="h-4 w-4" aria-hidden="true" /> support@pdfgenius.app
              </a>
              <button type="button" className="edu-btn-ghost h-12 px-4" onClick={() => copyToClipboard("support@pdfgenius.app", "Email address")} data-testid="button-copy-email">
                <Copy className="h-4 w-4" aria-hidden="true" /> Copy address
              </button>
            </div>
          </div>
          <div className="mkt-sheet p-5 sm:p-6">
            <p className="edu-eyebrow !text-[#8a837b]">What is it about?</p>
            <div role="tablist" aria-label="Inquiry type" className="edu-tabs mt-3 !gap-5">
              {CATEGORIES.map((c) => (
                <button key={c.id} type="button" role="tab" aria-selected={selectedCategory === c.id} onClick={() => setSelectedCategory(c.id)} className={cn("edu-tab", selectedCategory === c.id && "edu-tab-on")} data-testid={`tab-contact-${c.id}`}>
                  {c.label}
                </button>
              ))}
            </div>
            <div role="tabpanel" className="pt-5">
              <h2 className="font-['Poppins'] text-lg font-semibold text-[#1c1917]">{active.label}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-[#57534e]">{active.text}</p>
              <p className="mt-4 text-sm text-[#8a837b]">{active.id === "partnership" ? "Email support@pdfgenius.app" : SUPPORT_REPLY_COPY}</p>
              <a href="#contact-form" className="mkt-link mt-5 text-sm">Draft a message <ArrowRight className="mkt-arrow h-4 w-4" aria-hidden="true" /></a>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <section id="contact-form" className="scroll-mt-24 pt-20" aria-labelledby="form-heading">
          <Reveal>
            <div className="mkt-section">
              <div>
                <p className="edu-eyebrow">Message</p>
                <h2 id="form-heading" className="mkt-h2 mt-2">Send us a message</h2>
                <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-[#57534e]">Sending opens your email app with the message drafted. Attach files there if needed.</p>
              </div>
              <form
                className="space-y-6 border-t border-[#1c1917] pt-6"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const subject = `[${selectedCategory} / ${selectedPriority}] ${f.get("subject") ?? ""}`;
                  const body = `${f.get("message") ?? ""}\n\nFrom: ${f.get("name") ?? ""} <${f.get("email") ?? ""}>`;
                  window.location.href = `mailto:support@pdfgenius.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                  toast({ title: "Opening your email app", description: "Send the drafted message to reach support." });
                }}
              >
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor="fullName" className="edu-label">Full name</Label>
                    <Input id="fullName" name="name" placeholder="Your name" className={fieldClass} data-testid="input-contact-name" />
                  </div>
                  <div>
                    <Label htmlFor="email" className="edu-label">Email address <span className="text-[#c8302a]">*</span></Label>
                    <Input id="email" name="email" type="email" required placeholder="you@example.com" className={fieldClass} data-testid="input-contact-email" />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="edu-label">Phone number</Label>
                    <Input id="phone" placeholder="Optional" className={fieldClass} />
                  </div>
                  <div>
                    <Label htmlFor="company" className="edu-label">Company or organization</Label>
                    <Input id="company" placeholder="Optional" className={fieldClass} />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor="category" className="edu-label">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger id="category" className={fieldClass}>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <fieldset>
                    <legend className="edu-label">Priority</legend>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {PRIORITIES.map((priority) => (
                        <label key={priority} className={cn("edu-choice capitalize", selectedPriority === priority && "edu-choice-on")}>
                          <input type="radio" name="priority" value={priority} checked={selectedPriority === priority} onChange={() => setSelectedPriority(priority)} className="edu-choice-input" />
                          <span className="edu-mark" aria-hidden="true" />
                          {priority}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </div>

                <div>
                  <Label htmlFor="subject" className="edu-label">Subject <span className="text-[#c8302a]">*</span></Label>
                  <Input id="subject" name="subject" required placeholder="A short summary" className={fieldClass} data-testid="input-contact-subject" />
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="message" className="edu-label">Message <span className="text-[#c8302a]">*</span></Label>
                    <span className="edu-mono text-xs text-[#8a837b]">max 500</span>
                  </div>
                  <Textarea id="message" name="message" required maxLength={500} placeholder="What happened, which tool, and what you expected." className="mt-2 min-h-[140px] rounded-[9px] border-[#e7e0d5] bg-white" data-testid="input-contact-message" />
                </div>

                <div className="flex flex-col gap-4 border-t border-[#e7e0d5] pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[#57534e]">Supported attachments in your email: PDF, DOC, DOCX, TXT, JPG, PNG (max 5 MB each).</p>
                  <button type="submit" className="edu-btn-primary shrink-0" data-testid="button-contact-submit">Send message</button>
                </div>
              </form>
            </div>
          </Reveal>
        </section>

        <section className="pt-24" aria-labelledby="contact-faq-heading">
          <Reveal>
            <div className="mkt-section">
              <div className="lg:sticky lg:top-24 lg:self-start">
                <p className="edu-eyebrow">Fine print</p>
                <h2 id="contact-faq-heading" className="mkt-h2 mt-2">Frequently asked questions</h2>
                <button
                  type="button"
                  className="mkt-link mt-4 text-sm"
                  onClick={() => document.getElementById("contact-form")?.scrollIntoView({ behavior: "smooth" })}
                >
                  Still stuck? Contact support <ArrowRight className="mkt-arrow h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <ul className="border-t border-[#1c1917]">
                {faqs.map((faq, i) => {
                  const open = expandedFAQ === i;
                  return (
                    <li key={faq.question} className="border-b border-[#e7e0d5]">
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={`faq-panel-${i}`}
                        className="flex min-h-[56px] w-full items-center justify-between gap-4 py-4 text-left text-[16px] font-semibold text-[#1c1917] transition-colors hover:text-[#c8302a]"
                        onClick={() => setExpandedFAQ(open ? null : i)}
                      >
                        {faq.question}
                        <ChevronDown className={cn("h-4 w-4 shrink-0 text-[#8a837b] transition-transform duration-200", open && "rotate-180")} aria-hidden="true" />
                      </button>
                      <div id={`faq-panel-${i}`} hidden={!open} className="max-w-2xl pb-5 text-[15px] leading-relaxed text-[#57534e]">
                        {faq.answer}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Reveal>
        </section>

        <section className="pt-24" aria-labelledby="direct-heading">
          <Reveal>
            <div className="mkt-section">
              <div>
                <p className="edu-eyebrow">Directory</p>
                <h2 id="direct-heading" className="mkt-h2 mt-2">Reach us directly</h2>
              </div>
              <dl className="border-t border-[#1c1917] text-[15px]">
                {[
                  ["General", "info@pdfgenius.app"],
                  ["Support", "support@pdfgenius.app"],
                  ["Based in", "London, United Kingdom."],
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-6 border-b border-[#e7e0d5] py-3">
                    <dt className="edu-mono w-24 shrink-0 text-xs uppercase tracking-wider text-[#8a837b]">{k}</dt>
                    <dd className="text-[#1c1917]">{v.includes("@") ? <a href={`mailto:${v}`} className="mkt-link font-medium">{v}</a> : v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </Reveal>
        </section>
      </div>
    </div>
  );
};
