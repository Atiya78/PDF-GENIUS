import React from "react";
import {
  Calendar,
  Clock,
  RefreshCw,
  ShieldCheck,
  CreditCard,
  RotateCcw,
  Repeat,
  Coins,
  Mail,
  XCircle,
  Scale,
  Building2,
} from "lucide-react";

export const RefundPolicy = (): JSX.Element => {
  const sections = [
    { icon: RefreshCw, text: "Overview", id: "overview" },
    { icon: Building2, text: "Who You Buy From", id: "merchant-of-record" },
    { icon: ShieldCheck, text: "14-Day Right to Cancel", id: "right-to-cancel" },
    { icon: Repeat, text: "Subscriptions & Renewals", id: "subscriptions" },
    { icon: Coins, text: "Credit Packs", id: "credit-packs" },
    { icon: RotateCcw, text: "How to Request a Refund", id: "how-to-request" },
    { icon: Clock, text: "Processing Time", id: "processing-time" },
    { icon: XCircle, text: "Non-Refundable Situations", id: "non-refundable" },
    { icon: Scale, text: "Your Statutory Rights", id: "statutory-rights" },
    { icon: Mail, text: "Contact Us", id: "contact" },
  ];

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetPosition = element.offsetTop - 100;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">Refund Policy</h1>

          <div className="max-w-4xl mx-auto mb-12">
            <p className="text-lg text-gray-600 leading-relaxed">
              This Refund Policy explains when you may cancel a purchase and
              request a refund for PDF Genius subscriptions and credit packs, and
              how to do it.
            </p>
          </div>

          {/* Date Information Card */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-600">
                    Last Updated: June 28, 2026
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-600">
                    Effective Date: June 28, 2026
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar - Table of Contents */}
          <aside className="hidden lg:block w-72 sticky top-20 self-start">
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Contents
              </h3>
              <nav className="space-y-2">
                {sections.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => scrollToSection(item.id)}
                    className="w-full flex items-center gap-3 px-3 py-3 text-left text-sm rounded-lg text-gray-600 hover:bg-gray-50 transition-all"
                  >
                    <item.icon className="w-[18px] h-[18px] text-gray-500 flex-shrink-0" />
                    <span className="font-medium">{item.text}</span>
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Main Content Area */}
          <main className="flex-1">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <div className="prose prose-gray max-w-none space-y-12">
                {/* Overview */}
                <section id="overview" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <RefreshCw className="w-6 h-6 text-blue-600" />
                    Overview
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    PDF Genius offers most of its tools free of charge. Paid
                    options include recurring subscription plans (Pro and
                    Business) and one-time credit packs for on-demand
                    conversions. This policy sets out your cancellation and
                    refund rights for those paid purchases.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Because our products are digital and delivered instantly,
                    purchases are generally non-refundable once the service has
                    been used, except where you have a statutory right to cancel
                    or where a refund is granted at our or our payment
                    provider's discretion, as described below. Nothing in this
                    policy limits your mandatory consumer rights.
                  </p>
                </section>

                {/* Merchant of Record */}
                <section id="merchant-of-record" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Building2 className="w-6 h-6 text-blue-600" />
                    Who You Buy From
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Payments for PDF Genius web purchases are processed by our
                    authorised reseller and Merchant of Record. Depending on
                    your purchase, the Merchant of Record is{" "}
                    <strong>Paddle.com Market Limited ("Paddle")</strong> or{" "}
                    <strong>Dodo Payments</strong>. This means the Merchant of
                    Record is the seller of record for your transaction and
                    handles billing, payment processing, sales tax/VAT, invoices,
                    and refunds on our behalf.
                  </p>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Your payment receipt and bank or card statement may therefore
                    show the name of the Merchant of Record (for example
                    "Paddle" or "Paddle.net") rather than "PDF Genius". Refunds
                    are issued through the same Merchant of Record that processed
                    your original payment, in line with this policy and the
                    Merchant of Record's own buyer terms.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Mobile in-app subscriptions and credit packs purchased
                    through the Apple App Store or Google Play are governed by the
                    refund rules of those stores. To request a refund for an
                    in-app purchase, please use the relevant store's refund
                    process.
                  </p>
                </section>

                {/* Right to Cancel */}
                <section id="right-to-cancel" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <ShieldCheck className="w-6 h-6 text-blue-600" />
                    14-Day Right to Cancel
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    If you are a consumer in the United Kingdom, European Union,
                    EEA, or Switzerland, you have a statutory right to withdraw
                    from your purchase within <strong>14 days</strong> and
                    receive a full refund. This applies to one-time purchases and
                    to the first payment of a new subscription.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Please note that for digital content and services, this right
                    may end once you begin using the service, where you have
                    asked us to start providing it immediately and acknowledged
                    that you will lose your right to cancel by doing so. Where
                    local consumer protection law gives you stronger rights, the
                    highest level of protection always applies.
                  </p>
                </section>

                {/* Subscriptions */}
                <section id="subscriptions" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Repeat className="w-6 h-6 text-blue-600" />
                    Subscriptions &amp; Renewals
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Subscription plans renew automatically at the end of each
                    billing period until cancelled. You can cancel your
                    subscription at any time from your account settings or the
                    billing portal. When you cancel, your plan remains active
                    until the end of the current paid period, and you will not be
                    charged again.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Renewal payments are generally non-refundable. If you were
                    charged for a renewal you did not intend and contact us
                    promptly, we will review your request and may grant a
                    discretionary refund, in addition to any statutory rights you
                    may have.
                  </p>
                </section>

                {/* Credit Packs */}
                <section id="credit-packs" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Coins className="w-6 h-6 text-blue-600" />
                    Credit Packs
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Credit packs are one-time purchases that add conversion
                    credits to your account. Unused credits may be eligible for a
                    refund within the 14-day cancellation period described above.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    Credits that have already been used are non-refundable. If
                    only part of a credit pack has been used, any refund will be
                    calculated based on the unused portion at our discretion.
                  </p>
                </section>

                {/* How to Request */}
                <section id="how-to-request" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <RotateCcw className="w-6 h-6 text-blue-600" />
                    How to Request a Refund
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    To request a refund, contact us with the details below and
                    include the email address used for your purchase, the order
                    or receipt number, and the reason for your request:
                  </p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                    <li>
                      Email or message us through the{" "}
                      <strong>Support</strong> page on pdfgenius.app
                    </li>
                    <li>Phone: +447429919748</li>
                    <li>
                      Alternatively, for purchases processed by Paddle, you can
                      request a refund directly via Paddle's buyer support at
                      paddle.net
                    </li>
                  </ul>
                  <p className="text-gray-700 leading-relaxed">
                    We aim to acknowledge every refund request within 2 business
                    days.
                  </p>
                </section>

                {/* Processing Time */}
                <section id="processing-time" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Clock className="w-6 h-6 text-blue-600" />
                    Processing Time
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
                    Once a refund is approved, it is processed by the Merchant of
                    Record back to your original payment method. Refunds
                    typically appear within 5–10 business days, depending on your
                    bank or card issuer. When a refund is issued, access to the
                    relevant paid features or unused credits will end.
                  </p>
                </section>

                {/* Non-Refundable */}
                <section id="non-refundable" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-blue-600" />
                    Non-Refundable Situations
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    Except where required by law, refunds will not be issued in
                    the following cases:
                  </p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-2">
                    <li>
                      The 14-day cancellation period has passed and the service
                      has been used
                    </li>
                    <li>Credits or features have already been consumed</li>
                    <li>
                      There is evidence of fraud, refund abuse, or other
                      manipulative behaviour
                    </li>
                    <li>
                      The request relates to a change of mind after substantial
                      use of a clearly described product
                    </li>
                  </ul>
                </section>

                {/* Statutory Rights */}
                <section id="statutory-rights" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Scale className="w-6 h-6 text-blue-600" />
                    Your Statutory Rights
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
                    This policy does not affect your statutory rights as a
                    consumer, including your rights in relation to products that
                    are faulty, not as described, or not fit for purpose. If a
                    product does not work as described, you may be entitled to a
                    repair, replacement, or refund under applicable consumer
                    protection law. Where any local law or the Merchant of
                    Record's own policy grants you stronger rights, those rights
                    will always apply.
                  </p>
                </section>

                {/* Contact */}
                <section id="contact" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Mail className="w-6 h-6 text-blue-600" />
                    Contact Us
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-2">
                    <p>
                      For any questions about this Refund Policy or to request a
                      refund, please contact us:
                    </p>
                    <p>
                      <strong>Company:</strong> PDF Genius
                    </p>
                    <p>
                      <strong>Phone:</strong> +447429919748
                    </p>
                    <p>
                      <strong>Location:</strong> London, United Kingdom
                    </p>
                    <p>
                      <strong>Website:</strong> pdfgenius.app
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default RefundPolicy;
