import { useState } from "react";
import { contactFaqs } from "@/config/contactFaqs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, ChevronDown, Copy, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { COMPANY } from "@/content/legal/company";
import { useSeo } from "@/lib/useSeo";
import { SUPPORT_REPLY_COPY } from "@/config/siteCopy";
import { Reveal } from "@/components/education/Reveal";
import { cn } from "@/lib/utils";
import "@/styles/marketing.css";

const CATEGORIES = [
  { id: "technical", label: "Technical Support", text: "Having trouble with a tool? Tell us the tool name and the message you saw." },
  { id: "billing", label: "Billing & Refunds", text: "Questions about a charge, a refund or cancelling. Include the receipt number from Dodo Payments or Paddle." },
  { id: "privacy", label: "Privacy & Data", text: "Access, correction or deletion requests and privacy questions. You can also write to privacy@pdfgenius.app." },
  { id: "business", label: "Business Inquiry", text: "Custom integrations, the API and volume use for your organization." },
  { id: "feedback", label: "Feedback", text: "Share your experience, suggest improvements, or report issues." },
];

const fieldClass = "mt-2 h-11 rounded-[9px] border-[#e7e0d5] bg-white focus-visible:ring-[#f7433d]/30 focus-visible:border-[#1c1917]";

export const Contact = (): JSX.Element => {
  useSeo({
    title: "Contact & Support",
    description:
      "Contact PDF Genius support or our privacy and legal team. Send a message, find our emails and expected response time.",
    canonicalPath: "/contact",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { token } = useAuth();
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
            <p className="mkt-lede mt-6 max-w-lg">Questions about a tool, your account, billing or a file-processing issue. We aim to reply {COMPANY.supportResponse}.</p>
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
              <p className="mt-4 text-sm text-[#8a837b]">{active.id === "privacy" ? `Email ${COMPANY.privacyEmail}` : SUPPORT_REPLY_COPY}</p>
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
                <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-[#57534e]">Your message goes straight to our support inbox and we reply to the email you enter. Need to send a file? Email {COMPANY.supportEmail} after we reply.</p>
              </div>
              {sent ? (
                <div role="status" className="border-t border-[#1c1917] pt-6" data-testid="status-contact-sent">
                  <p className="font-['Poppins'] text-lg font-semibold text-[#1c1917]">Message sent.</p>
                  <p className="mt-2 text-[15px] text-[#57534e]">We'll reply to your email {COMPANY.supportResponse}.</p>
                  <button type="button" className="mkt-link mt-4 text-sm" onClick={() => setSent(false)}>Send another message</button>
                </div>
              ) : (
              <form
                className="space-y-6 border-t border-[#1c1917] pt-6"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const f = new FormData(form);
                  setSending(true);
                  setFormError(null);
                  try {
                    const res = await fetch(`${import.meta.env.BASE_URL}api/contact`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                      body: JSON.stringify({
                        name: f.get("name"),
                        email: f.get("email"),
                        topic: `${active.label}: ${f.get("subject") ?? ""}`,
                        message: f.get("message"),
                        website: f.get("website"),
                      }),
                    });
                    const body = await res.json().catch(() => ({}));
                    if (!res.ok || !body.success) throw new Error(body.error || "We couldn't send your message.");
                    form.reset();
                    setSent(true);
                    toast({ title: "Message sent", description: "We'll reply by email." });
                  } catch (err) {
                    setFormError(err instanceof Error ? err.message : "We couldn't send your message.");
                  } finally {
                    setSending(false);
                  }
                }}
              >
                {/* Honeypot: hidden from people, filled by bots. */}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="absolute left-[-9999px] h-px w-px opacity-0" />
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor="fullName" className="edu-label">Full name <span className="text-[#c8302a]">*</span></Label>
                    <Input id="fullName" name="name" required maxLength={120} placeholder="Your name" className={fieldClass} data-testid="input-contact-name" />
                  </div>
                  <div>
                    <Label htmlFor="email" className="edu-label">Email address <span className="text-[#c8302a]">*</span></Label>
                    <Input id="email" name="email" type="email" required maxLength={200} placeholder="you@example.com" className={fieldClass} data-testid="input-contact-email" />
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <Label htmlFor="category" className="edu-label">Category</Label>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger id="category" className={fieldClass} data-testid="select-contact-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="subject" className="edu-label">Subject <span className="text-[#c8302a]">*</span></Label>
                    <Input id="subject" name="subject" required maxLength={60} placeholder="A short summary" className={fieldClass} data-testid="input-contact-subject" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="message" className="edu-label">Message <span className="text-[#c8302a]">*</span></Label>
                    <span className="edu-mono text-xs text-[#8a837b]">10–5000 characters</span>
                  </div>
                  <Textarea id="message" name="message" required minLength={10} maxLength={5000} placeholder="What happened, which tool, and what you expected." className="mt-2 min-h-[140px] rounded-[9px] border-[#e7e0d5] bg-white" data-testid="input-contact-message" />
                </div>

                {formError && <p role="alert" className="rounded-[9px] border border-[#f3c4c0] bg-[#fdf1ef] p-3 text-sm text-[#8f1f1a]" data-testid="text-contact-error">{formError}</p>}

                <div className="flex flex-col gap-4 border-t border-[#e7e0d5] pt-6 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-[#57534e]">We use your details only to answer you. See our <a href="/privacy" className="mkt-link">Privacy Policy</a>.</p>
                  <button type="submit" disabled={sending} className="edu-btn-primary shrink-0 disabled:opacity-60" data-testid="button-contact-submit">{sending ? "Sending…" : "Send message"}</button>
                </div>
              </form>
              )}
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
                  ["Support", COMPANY.supportEmail],
                  ["Privacy & legal", COMPANY.privacyEmail],
                  ["Response", `We aim to reply ${COMPANY.supportResponse}.`],
                  ["Company", `${COMPANY.legalName}, ${COMPANY.state}, ${COMPANY.country}`],
                  ...(COMPANY.address ? [["Address", COMPANY.address]] : []),
                ].map(([k, v]) => (
                  <div key={k} className="flex gap-6 border-b border-[#e7e0d5] py-3">
                    <dt className="edu-mono w-28 shrink-0 text-xs uppercase tracking-wider text-[#8a837b]">{k}</dt>
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
