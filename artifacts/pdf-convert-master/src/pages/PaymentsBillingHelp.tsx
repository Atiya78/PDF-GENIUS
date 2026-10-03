import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  CreditCard,
  Wallet,
  FileText,
  Repeat,
  RotateCcw,
  Scale,
  AlertTriangle,
  ShieldCheck,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { SearchableSection } from "@/components/DocumentSearch";
import { useDocumentSearch } from "@/hooks/useDocumentSearch";
import { useSeo } from "@/lib/useSeo";

// ── Real values pulled from the repo ────────────────────────────────────────
// Support email: Contact page / footer / api-server email service.
// Refund window + wording: pages/RefundPolicy.tsx (14-day right to cancel).
// Phone / location: RefundPolicy.tsx + TermsOfService.tsx.
const SUPPORT_EMAIL = "info@pdfgenius.app";
const SUPPORT_PHONE = "+447429919748";
const SUPPORT_LOCATION = "London, United Kingdom";

// Paddle buyer-facing URLs (factual, from the brief).
const PADDLE_LOOKUP_URL = "https://paddle.net";
const PADDLE_WHY_CHARGED_URL =
  "https://www.paddle.com/about/why-has-paddle-charged-me";
const DODO_CONTACT_URL = "https://dodopayments.com/contact";

type MerchantKey = "dodo" | "paddle";

interface Merchant {
  key: MerchantKey;
  name: string;
  statement: string;
  subtitle: string;
}

const MERCHANTS: Record<MerchantKey, Merchant> = {
  dodo: {
    key: "dodo",
    name: "Dodo Payments",
    statement: "Dodo Payments",
    subtitle: "If your charge shows as Dodo Payments",
  },
  paddle: {
    key: "paddle",
    name: "Paddle",
    statement: "Paddle / Paddle.net",
    subtitle: "If your charge shows as Paddle",
  },
};

interface SectionDef {
  id: string;
  text: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SECTIONS: SectionDef[] = [
  { id: "overview", text: "Overview & Merchant of Record", icon: Building2 },
  { id: "statement", text: "What appears on your statement", icon: CreditCard },
  { id: "payment-methods", text: "Accepted payment methods", icon: Wallet },
  { id: "receipts", text: "Receipts & invoices", icon: FileText },
  { id: "manage-cancel", text: "Manage or cancel subscription", icon: Repeat },
  { id: "refunds", text: "Refunds", icon: RotateCcw },
  { id: "update-payment", text: "Update payment method", icon: CreditCard },
  { id: "taxes", text: "Taxes (VAT / GST / sales tax)", icon: Scale },
  { id: "failed-payments", text: "Failed & declined payments", icon: AlertTriangle },
  { id: "security-contact", text: "Security & contact", icon: ShieldCheck },
];

const linkClass = "text-blue-600 hover:underline font-medium";

const mailLink = (
  <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
    {SUPPORT_EMAIL}
  </a>
);

const extLink = (href: string, label: string) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className={`${linkClass} inline-flex items-center gap-1`}
  >
    {label}
    <ExternalLink className="w-3.5 h-3.5" />
  </a>
);

// ── Per-merchant section content ─────────────────────────────────────────────
function sectionContent(m: MerchantKey): Record<string, React.ReactNode> {
  const isDodo = m === "dodo";
  return {
    overview: (
      <>
        <p className="text-gray-700 leading-relaxed mb-4">
          When you buy a PDF Genius subscription or credit pack on the web,{" "}
          <strong>{MERCHANTS[m].name}</strong> acts as our authorised reseller
          and <strong>Merchant of Record</strong>. That means {MERCHANTS[m].name}{" "}
          is the legal seller for your transaction and handles payment
          processing, billing, invoicing, and tax on PDF Genius's behalf.
        </p>
        <p className="text-gray-700 leading-relaxed">
          Because {MERCHANTS[m].name} is the seller of record, their name — not
          "PDF Genius" — may appear on your receipt and bank or card statement.
          This is normal and the charge is still for your PDF Genius purchase.
        </p>
      </>
    ),
    statement: (
      <>
        <p className="text-gray-700 leading-relaxed mb-4">
          Your charge appears under the{" "}
          <strong>"{MERCHANTS[m].statement}"</strong> name rather than "PDF
          Genius". This is a legitimate PDF Genius charge — {MERCHANTS[m].name}{" "}
          is our Merchant of Record and bills you on our behalf.
        </p>
        {isDodo ? (
          <p className="text-gray-700 leading-relaxed">
            If you don't recognise a charge, check the receipt emailed to you at
            the time of purchase, or contact us at {mailLink} and we'll help you
            identify it.
          </p>
        ) : (
          <p className="text-gray-700 leading-relaxed">
            You can look up and manage any Paddle charge at{" "}
            {extLink(PADDLE_LOOKUP_URL, "paddle.net")}, and read more about why
            Paddle appears on your statement here:{" "}
            {extLink(PADDLE_WHY_CHARGED_URL, "Why has Paddle charged me?")}.
          </p>
        )}
      </>
    ),
    "payment-methods": (
      <p className="text-gray-700 leading-relaxed">
        {MERCHANTS[m].name} supports major credit and debit cards and common
        digital wallets such as Apple Pay and Google Pay, along with regional
        and local payment methods depending on your location. The options shown
        at checkout are tailored to the country you're paying from.
      </p>
    ),
    receipts: (
      <>
        <p className="text-gray-700 leading-relaxed mb-4">
          A receipt is emailed to you automatically after every payment. Check
          the inbox (and spam folder) of the email address used for your
          purchase.
        </p>
        {isDodo ? (
          <p className="text-gray-700 leading-relaxed">
            To view or download an invoice, or to request another copy, open the
            customer billing portal linked in your Dodo Payments receipt email.
            You can also contact us at {mailLink} and we'll resend it.
          </p>
        ) : (
          <p className="text-gray-700 leading-relaxed">
            You can retrieve receipts and invoices at any time at{" "}
            {extLink(PADDLE_LOOKUP_URL, "paddle.net")} using the email address
            you paid with.
          </p>
        )}
      </>
    ),
    "manage-cancel": (
      <>
        <p className="text-gray-700 leading-relaxed mb-4">
          Subscriptions renew automatically until you cancel. When you cancel,
          your plan stays active until the end of the current paid period and
          you won't be charged again.
        </p>
        {isDodo ? (
          <p className="text-gray-700 leading-relaxed">
            To manage or cancel, open the customer portal linked in your Dodo
            Payments receipt email, or contact PDF Genius support at {mailLink}{" "}
            and we'll take care of it.
          </p>
        ) : (
          <p className="text-gray-700 leading-relaxed">
            You can manage or cancel your subscription yourself at any time at{" "}
            {extLink(PADDLE_LOOKUP_URL, "paddle.net")} using your purchase email,
            or contact PDF Genius support at {mailLink}.
          </p>
        )}
      </>
    ),
    refunds: (
      <>
        <p className="text-gray-700 leading-relaxed mb-4">
          If you are a consumer in the UK, EU, EEA, or Switzerland, you have a
          statutory right to cancel your purchase within{" "}
          <strong>14 days</strong> and receive a full refund. This applies to
          one-time purchases and to the first payment of a new subscription.
          Renewal payments are generally non-refundable, and credits that have
          already been used are non-refundable, except where required by law or
          granted at our discretion.
        </p>
        {isDodo ? (
          <p className="text-gray-700 leading-relaxed mb-4">
            To request a refund, contact PDF Genius support at {mailLink} with
            the email used for your purchase and your order or receipt number.
            You can also request a refund through Dodo Payments' support.
          </p>
        ) : (
          <p className="text-gray-700 leading-relaxed mb-4">
            You can request a refund directly via Paddle at{" "}
            {extLink(PADDLE_LOOKUP_URL, "paddle.net")}, or contact PDF Genius
            support at {mailLink} with the email used for your purchase and your
            order or receipt number.
          </p>
        )}
        <p className="text-gray-700 leading-relaxed">
          We aim to acknowledge every refund request within 2 business days.
          Once approved, refunds are processed by {MERCHANTS[m].name} back to
          your original payment method and typically appear within 5–10 business
          days, depending on your bank or card issuer. For full details, see our{" "}
          <a href="/refund-policy" className={linkClass}>
            Refund Policy
          </a>
          .
        </p>
      </>
    ),
    "update-payment": (
      <>
        <p className="text-gray-700 leading-relaxed mb-4">
          If your card has expired or a renewal failed, updating your payment
          method keeps your subscription active.
        </p>
        {isDodo ? (
          <p className="text-gray-700 leading-relaxed">
            Open the customer portal linked in your Dodo Payments receipt email
            to update your card details. If you need a hand, contact us at{" "}
            {mailLink}.
          </p>
        ) : (
          <p className="text-gray-700 leading-relaxed">
            Update your card details at{" "}
            {extLink(PADDLE_LOOKUP_URL, "paddle.net")} using your purchase email.
            If you need a hand, contact us at {mailLink}.
          </p>
        )}
      </>
    ),
    taxes: (
      <p className="text-gray-700 leading-relaxed">
        As Merchant of Record, {MERCHANTS[m].name} automatically calculates and
        adds any applicable tax (such as VAT, GST, or sales tax) based on your
        location. Any tax is shown as a separate line on your receipt, so the
        total you pay already includes what's required for your country or
        region.
      </p>
    ),
    "failed-payments": (
      <>
        <p className="text-gray-700 leading-relaxed mb-4">
          If a renewal payment is declined, {MERCHANTS[m].name} automatically
          retries the charge over several days and emails you so you can fix the
          issue. Common causes are an expired card, insufficient funds, or a
          bank security block.
        </p>
        {isDodo ? (
          <p className="text-gray-700 leading-relaxed">
            To resolve a failed renewal, update your card in the customer portal
            linked in your Dodo Payments receipt email. If it still fails,
            contact us at {mailLink}.
          </p>
        ) : (
          <p className="text-gray-700 leading-relaxed">
            To resolve a failed renewal, update your card at{" "}
            {extLink(PADDLE_LOOKUP_URL, "paddle.net")}. If it still fails,
            contact us at {mailLink}.
          </p>
        )}
      </>
    ),
    "security-contact": (
      <>
        <p className="text-gray-700 leading-relaxed mb-4">
          {MERCHANTS[m].name} is PCI-DSS compliant, and PDF Genius never stores
          your card details — payment information is handled securely by the
          Merchant of Record.
        </p>
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-2">
          <p className="text-gray-700">
            <strong>PDF Genius support:</strong> {mailLink}
          </p>
          <p className="text-gray-700">
            <strong>Phone:</strong> {SUPPORT_PHONE}
          </p>
          <p className="text-gray-700">
            <strong>Location:</strong> {SUPPORT_LOCATION}
          </p>
          {isDodo ? (
            <p className="text-gray-700">
              <strong>Dodo Payments:</strong>{" "}
              {extLink(DODO_CONTACT_URL, "dodopayments.com/contact")}
            </p>
          ) : (
            <p className="text-gray-700">
              <strong>Paddle:</strong> {extLink(PADDLE_LOOKUP_URL, "paddle.net")}
            </p>
          )}
        </div>
      </>
    ),
  };
}

// ── Per-merchant FAQ ─────────────────────────────────────────────────────────
function faqItems(m: MerchantKey): { q: string; a: React.ReactNode }[] {
  const isDodo = m === "dodo";
  return [
    {
      q: "Why does this name appear on my statement?",
      a: (
        <>
          {MERCHANTS[m].name} is our Merchant of Record and processes the payment
          on PDF Genius's behalf, so their name may appear on your statement
          instead of ours. It's still a genuine PDF Genius charge.
        </>
      ),
    },
    {
      q: "How do I cancel?",
      a: isDodo ? (
        <>
          Use the customer portal linked in your Dodo Payments receipt email, or
          contact us at {mailLink} and we'll cancel it for you.
        </>
      ) : (
        <>
          Cancel anytime at {extLink(PADDLE_LOOKUP_URL, "paddle.net")} using your
          purchase email, or contact us at {mailLink}.
        </>
      ),
    },
    {
      q: "How do I get a refund?",
      a: isDodo ? (
        <>
          Contact PDF Genius support at {mailLink} (or Dodo Payments' support)
          within the 14-day cancellation period. See our{" "}
          <a href="/refund-policy" className={linkClass}>
            Refund Policy
          </a>{" "}
          for details.
        </>
      ) : (
        <>
          Request one at {extLink(PADDLE_LOOKUP_URL, "paddle.net")} or via {mailLink}{" "}
          within the 14-day cancellation period. See our{" "}
          <a href="/refund-policy" className={linkClass}>
            Refund Policy
          </a>{" "}
          for details.
        </>
      ),
    },
    {
      q: "Was I charged tax?",
      a: (
        <>
          If tax (VAT, GST, or sales tax) applied to your location,{" "}
          {MERCHANTS[m].name} added it automatically and it appears as a separate
          line on your receipt.
        </>
      ),
    },
    {
      q: "I don't recognise this charge.",
      a: isDodo ? (
        <>
          Look for a charge from "{MERCHANTS[m].statement}" — that's PDF Genius
          billed through our Merchant of Record. Still unsure? Email {mailLink}{" "}
          and we'll help.
        </>
      ) : (
        <>
          Look up the charge at {extLink(PADDLE_LOOKUP_URL, "paddle.net")} or read{" "}
          {extLink(PADDLE_WHY_CHARGED_URL, "Why has Paddle charged me?")}. Still
          unsure? Email {mailLink}.
        </>
      ),
    },
  ];
}

function buildSearchable(m: MerchantKey): SearchableSection[] {
  const name = MERCHANTS[m].name;
  const statement = MERCHANTS[m].statement;
  return [
    {
      id: "overview",
      title: "Overview & Merchant of Record",
      content: `${name} is the Merchant of Record and legal seller for your transaction, handling payment processing, tax and compliance on PDF Genius's behalf, which is why their name may appear instead of ours.`,
      category: "Overview",
    },
    {
      id: "statement",
      title: "What appears on your statement",
      content: `Your charge appears under the ${statement} name. It is a legitimate PDF Genius charge billed through ${name}.`,
      category: "Statement",
    },
    {
      id: "payment-methods",
      title: "Accepted payment methods",
      content: `${name} supports major cards and wallets like Apple Pay and Google Pay plus regional and local payment methods.`,
      category: "Payments",
    },
    {
      id: "receipts",
      title: "Receipts & invoices",
      content: `A receipt is emailed after every payment. Find or request a copy through ${name}.`,
      category: "Receipts",
    },
    {
      id: "manage-cancel",
      title: "Manage or cancel subscription",
      content: `Manage or cancel your subscription through ${name} or by contacting PDF Genius support at ${SUPPORT_EMAIL}.`,
      category: "Subscription",
    },
    {
      id: "refunds",
      title: "Refunds",
      content: `14-day right to cancel for eligible consumers. Request a refund via ${name} or PDF Genius support at ${SUPPORT_EMAIL}. Refunds processed in 5-10 business days.`,
      category: "Refunds",
    },
    {
      id: "update-payment",
      title: "Update payment method",
      content: `Update an expired or failed card through the ${name} customer portal so subscriptions keep renewing.`,
      category: "Payments",
    },
    {
      id: "taxes",
      title: "Taxes VAT GST sales tax",
      content: `As Merchant of Record, ${name} calculates and adds applicable VAT, GST, or sales tax based on your location, shown as a separate line on the receipt.`,
      category: "Taxes",
    },
    {
      id: "failed-payments",
      title: "Failed & declined payments",
      content: `${name} automatically retries failed payments over several days with email notifications. Update your card to fix a failed renewal.`,
      category: "Payments",
    },
    {
      id: "security-contact",
      title: "Security & contact",
      content: `${name} is PCI-DSS compliant and PDF Genius never stores card details. Contact support at ${SUPPORT_EMAIL} or ${SUPPORT_PHONE}.`,
      category: "Security",
    },
  ];
}

function parseHashMerchant(): MerchantKey {
  const hash = window.location.hash.replace("#", "").toLowerCase();
  return hash === "paddle" ? "paddle" : "dodo";
}

export const PaymentsBillingHelp = (): JSX.Element => {
  useSeo({
    title: "Payments & Billing Help",
    description:
      "Understand PDF Genius payments — Merchant of Record, statement names, receipts, refunds, taxes and how to manage or cancel your subscription with Dodo Payments or Paddle.",
    canonicalPath: "/dashboard/billing-help",
    noindex: true,
  });

  const [merchant, setMerchant] = useState<MerchantKey>(() =>
    typeof window !== "undefined" ? parseHashMerchant() : "dodo",
  );
  const [activeSection, setActiveSection] = useState("");
  const [filteredItems, setFilteredItems] = useState(SECTIONS);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(
    null,
  );

  const searchableSections = useMemo(() => buildSearchable(merchant), [merchant]);
  const content = useMemo(() => sectionContent(merchant), [merchant]);
  const faqs = useMemo(() => faqItems(merchant), [merchant]);

  const { handleSearchChange, handleResultClick } = useDocumentSearch({
    sections: searchableSections,
    onSectionHighlight: setHighlightedSection,
    onNavigationFilter: (sectionIds) => {
      const filtered = SECTIONS.filter((item) => sectionIds.includes(item.id));
      setFilteredItems(filtered.length > 0 ? filtered : SECTIONS);
    },
  });

  // Keep merchant selection in the URL hash so links are shareable.
  const selectMerchant = (key: MerchantKey) => {
    setMerchant(key);
    if (typeof window !== "undefined") {
      window.location.hash = key;
    }
  };

  useEffect(() => {
    const onHashChange = () => setMerchant(parseHashMerchant());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetPosition = element.offsetTop - 100;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  // Scrollspy — highlight the active section in the sticky nav.
  useEffect(() => {
    const handleScroll = () => {
      let current = "";
      for (const item of SECTIONS) {
        const el = document.getElementById(item.id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom >= 150) {
            current = item.id;
            break;
          }
        }
      }
      setActiveSection((prev) => (prev !== current ? current : prev));
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Payments &amp; Billing Help
          </h1>
          <div className="max-w-3xl mx-auto">
            <p className="text-lg text-gray-600 leading-relaxed">
              Everything about PDF Genius payments in one place. We use two
              Merchant-of-Record providers at checkout — pick the one shown on
              your receipt or statement to see the right guidance.
            </p>
          </div>
        </div>

        {/* Merchant toggle */}
        <div className="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 mb-12">
          {(Object.keys(MERCHANTS) as MerchantKey[]).map((key) => {
            const active = merchant === key;
            return (
              <button
                key={key}
                onClick={() => selectMerchant(key)}
                aria-pressed={active}
                className={`text-left rounded-xl border-2 p-5 transition-all ${
                  active
                    ? "border-blue-600 bg-blue-50 shadow-sm ring-2 ring-blue-200"
                    : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-lg ${
                      active ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <div
                      className={`text-lg font-semibold ${
                        active ? "text-blue-700" : "text-gray-900"
                      }`}
                    >
                      {MERCHANTS[key].name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {MERCHANTS[key].subtitle}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sticky in-page nav */}
          <aside className="hidden lg:block w-72 sticky top-24 self-start">
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                On this page
              </h3>
              <nav className="space-y-2 max-h-[calc(100vh-220px)] overflow-y-auto">
                {filteredItems.map((item) => {
                  const isActive =
                    activeSection === item.id || highlightedSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className={`w-full flex items-center gap-3 px-3 py-3 text-left text-sm rounded-lg transition-all ${
                        isActive
                          ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600 shadow-sm"
                          : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <item.icon
                        className={`w-[18px] h-[18px] flex-shrink-0 ${
                          isActive ? "text-blue-600" : "text-gray-500"
                        }`}
                      />
                      <span className="font-medium">{item.text}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 text-sm font-medium text-blue-700">
                Showing help for {MERCHANTS[merchant].name}
              </div>

              <div className="space-y-12">
                {SECTIONS.map((s) => {
                  const highlighted = highlightedSection === s.id;
                  return (
                    <section
                      key={s.id}
                      id={s.id}
                      className={`scroll-mt-24 transition-all duration-300 ${
                        highlighted
                          ? "bg-blue-50 p-6 rounded-lg ring-2 ring-blue-300"
                          : ""
                      }`}
                    >
                      <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                        <s.icon className="w-6 h-6 text-blue-600" />
                        {s.text}
                      </h2>
                      {content[s.id]}
                    </section>
                  );
                })}

                {/* FAQ */}
                <section id="faq" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <HelpCircle className="w-6 h-6 text-blue-600" />
                    Frequently asked questions
                  </h2>
                  <Accordion type="single" collapsible className="w-full">
                    {faqs.map((item, i) => (
                      <AccordionItem key={i} value={`faq-${i}`}>
                        <AccordionTrigger className="text-left text-gray-900">
                          {item.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-gray-700 leading-relaxed">
                          {item.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </section>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default PaymentsBillingHelp;
