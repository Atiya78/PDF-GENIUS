import { useState } from "react";
import { ChevronDown, PhoneIcon, Mail, Facebook, Instagram, Linkedin } from "lucide-react";
import logoFull from "@assets/FullLogo_Transparent_NoBuffer_1782108807761.png";
import { Link } from "wouter";
import { COMPANY, LEGAL_PAGES } from "@/content/legal/company";
import { openCookieSettings } from "@/lib/consent";
import "@/styles/marketing.css";
import { toolLandingPages } from "@/config/toolLandingPages";
import { educationTools } from "@/lib/education/educationTools";
import { SOCIAL_FACEBOOK_URL, SOCIAL_INSTAGRAM_URL, SOCIAL_LINKEDIN_URL } from "@/lib/socialLinks";

const linkClass =
  "text-[#57534e] underline decoration-transparent decoration-1 underline-offset-4 transition-colors hover:text-[#1c1917] hover:decoration-[#f7433d] focus-visible:text-[#1c1917]";

const productLinks = [
  { text: "Pricing", path: "/pricing" },
  { text: "Education Pricing", path: "/education/pricing" },
  { text: "API Docs", path: "/docs" },
  { text: "About Us", path: "/about" },
];

const helpLinks = [
  { text: "Support", path: "/support" },
  { text: "Contact", path: "/contact" },
  { text: "Data Safety", path: "/data-safety" },
];

const bottomLinks = [
  { text: "Privacy", path: "/privacy" },
  { text: "Terms", path: "/terms" },
  { text: "Refunds", path: "/refund-policy" },
];

const legalLinks = LEGAL_PAGES.map((p) => ({ text: p.label, path: p.path }));

const socials = [
  { url: SOCIAL_FACEBOOK_URL, label: "Facebook", Icon: Facebook },
  { url: SOCIAL_INSTAGRAM_URL, label: "Instagram", Icon: Instagram },
  { url: SOCIAL_LINKEDIN_URL, label: "LinkedIn", Icon: Linkedin },
];

// Methods offered at checkout by our Merchants of Record (Paddle / Dodo Payments).
const payments = [
  { file: "visa.svg", alt: "Visa" },
  { file: "mastercard.svg", alt: "Mastercard" },
  { file: "amex.svg", alt: "American Express" },
  { file: "discover.svg", alt: "Discover" },
  { file: "paypal.svg", alt: "PayPal" },
  { file: "apple-pay.svg", alt: "Apple Pay" },
  { file: "google-pay.svg", alt: "Google Pay" },
  { file: "upi.svg", alt: "UPI" },
];


const LinkList = ({ title, links, className = "", listClassName = "" }: { title: string; links: { text: string; path: string }[]; className?: string; listClassName?: string }) => (
  <nav aria-label={title} className={className}>
    <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c8302a] mb-3">{title}</h3>
    <ul className={`text-sm ${listClassName || "space-y-2"}`}>
      {links.map((l) => (
        <li key={l.path} className="py-0.5">
          <Link href={l.path} className={linkClass}>{l.text}</Link>
        </li>
      ))}
    </ul>
  </nav>
);

const FooterAppLinks = () => (
  <div className="min-w-0">
    <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c8302a] mb-3">Get the App</h3>
    <div className="flex items-center gap-3">
      <img
        src={`${import.meta.env.BASE_URL}play-store-qr.svg`}
        alt="QR code: scan to download PDF Genius on Google Play"
        className="w-16 h-16 shrink-0 rounded-lg border border-[#e2d9cc] bg-white p-1"
        loading="lazy"
      />
      <div className="min-w-0">
        <a
          href="https://play.google.com/store/apps/details?id=com.pdfgenius.app"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Get it on Google Play"
          className="inline-block"
        >
          <img
            src="https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png"
            alt="Get it on Google Play"
            className="h-12 max-w-full w-auto -ml-1.5"
            loading="lazy"
          />
        </a>
        <p className="text-xs text-[#6b645c]">iOS: available soon</p>
      </div>
    </div>
  </div>
);

const ToolList = ({
  id,
  title,
  links,
  allHref,
  allLabel,
}: {
  id: string;
  title: string;
  links: { text: string; path: string }[];
  allHref: string;
  allLabel: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <nav aria-label={title} className="min-w-0">
      <div className="hidden md:flex items-baseline justify-between gap-4 mb-3">
        <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c8302a]">{title}</h3>
        <Link href={allHref} className="text-xs font-medium text-[#57534e] underline decoration-[#d9d0c3] underline-offset-4 hover:text-[#1c1917] hover:decoration-[#f7433d]">
          {allLabel}
        </Link>
      </div>
      <button
        type="button"
        className="md:hidden flex min-h-11 w-full items-center justify-between gap-3 text-left font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#c8302a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7433d] rounded"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={id}
      >
        {title}
        <span className="inline-flex items-center gap-2 text-[#6b645c] normal-case tracking-normal font-normal">
          {links.length} tools
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true" />
        </span>
      </button>
      <ul id={id} className={`${open ? "grid" : "hidden"} md:grid grid-cols-2 md:grid-cols-3 gap-x-6 text-sm`}>
        {links.map((l) => (
          <li key={l.path} className="py-1 min-w-0">
            <Link href={l.path} className={linkClass}>{l.text}</Link>
          </li>
        ))}
        <li className="py-1 md:hidden col-span-2">
          <Link href={allHref} className="font-medium text-[#1c1917] underline decoration-[#f7433d] underline-offset-4">{allLabel}</Link>
        </li>
      </ul>
    </nav>
  );
};

const pdfToolLinks = toolLandingPages
  .filter((page) => page.name.includes("PDF"))
  .map((page) => ({ text: page.name, path: page.path }));
const educationToolLinks = educationTools.map((t) => ({ text: t.name, path: t.href }));

export const FooterSection = (): JSX.Element => {
  const activeSocials = socials.filter((s) => s.url);

  return (
    <footer id="site-footer" className="w-full border-t border-[#e7e0d5] bg-[#f4efe7]">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          {/* Brand + contact + app */}
          <div className="lg:col-span-4 min-w-0 grid gap-8 sm:grid-cols-2 lg:grid-cols-1 lg:content-start">
            <div className="min-w-0">
              <Link href="/" aria-label="PDF Genius home" className="inline-block">
                <img src={logoFull} alt="PDF Genius" width={1280} height={1157} className="h-14 w-auto" />
              </Link>
              <p className="mt-3 text-sm text-[#57534e] leading-relaxed max-w-xs">
                Practical tools for converting and managing documents, and AI study tools for students, on the web and on your phone.
              </p>
              <ul className="mt-5 space-y-2 text-sm">
                <li>
                  <a href={`mailto:${COMPANY.supportEmail}`} className="inline-flex items-center gap-2 font-medium text-[#1c1917] hover:text-[#c8302a] break-all">
                    <Mail className="w-4 h-4 shrink-0 text-[#f7433d]" />
                    {COMPANY.supportEmail}
                  </a>
                </li>
                <li>
                  <a href="tel:+447429919748" className="inline-flex items-center gap-2 text-[#1c1917] hover:text-[#f7433d]">
                    <PhoneIcon className="w-4 h-4 shrink-0 text-[#f7433d]" />
                    +44 7429 919748
                  </a>
                </li>
              </ul>
              {activeSocials.length > 0 && (
                <div className="mt-5 flex gap-2">
                  {activeSocials.map(({ url, label, Icon }) => (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="w-11 h-11 rounded-full bg-[#fffdf9] ring-1 ring-[#e2d9cc] text-[#57534e] flex items-center justify-center hover:bg-[#1c1917] hover:text-[#fffdf9] transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              )}
            </div>
            <FooterAppLinks />
          </div>

          {/* Tools + links */}
          <div className="lg:col-span-8 min-w-0 space-y-8">
            <div className="grid gap-y-2 md:gap-y-8">
              <ToolList id="footer-pdf-tools" title="PDF Tools" links={pdfToolLinks} allHref="/tools" allLabel="All PDF tools" />
              <div className="md:border-t md:border-[#e2d9cc] md:pt-6">
                <ToolList id="footer-education-tools" title="Education Zone" links={educationToolLinks} allHref="/education" allLabel="All study tools" />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-6 pt-6 border-t border-[#e2d9cc]">
              <LinkList title="Product" links={productLinks} />
              <LinkList title="Help" links={helpLinks} />
              <LinkList title="Legal" links={legalLinks} className="col-span-2" listClassName="grid grid-cols-2 gap-x-6 gap-y-2" />
            </div>
          </div>
        </div>

        {/* Payment methods — slow right-to-left marquee */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#8a837b]">Secure payments</span>
          <div className="footer-pay-marquee w-full max-w-md overflow-hidden" aria-label="Accepted payment methods" role="list">
            <div className="footer-pay-track flex w-max">
              {[0, 1].map((copy) => (
                <div key={copy} className="flex shrink-0 items-center gap-2 pr-2" aria-hidden={copy === 1 ? true : undefined}>
                  {payments.map((pm) => (
                    <img
                      key={pm.file}
                      role={copy === 0 ? "listitem" : undefined}
                      src={`${import.meta.env.BASE_URL}payments/${pm.file}`}
                      alt={copy === 0 ? pm.alt : ""}
                      title={pm.alt}
                      width={38}
                      height={24}
                      className="h-6 w-[38px] shrink-0"
                      loading="lazy"
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright + legal fine print */}
        <div className="mt-5 pt-5 border-t border-[#e2d9cc]">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm font-medium text-[#1c1917]" data-testid="text-copyright">
              © {new Date().getFullYear()} {COMPANY.legalName}. All rights reserved.
            </p>
            <ul className="flex flex-wrap items-center gap-y-1 text-xs text-[#57534e]">
              {bottomLinks.map((l) => (
                <li key={l.path} className="flex items-center after:mx-2.5 after:h-3 after:w-px after:bg-[#d9d0c3] after:content-['']">
                  <Link href={l.path} className="hover:text-[#1c1917] underline decoration-transparent underline-offset-4 hover:decoration-[#f7433d]">{l.text}</Link>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={openCookieSettings}
                  className="hover:text-[#1c1917] underline decoration-transparent underline-offset-4 hover:decoration-[#f7433d]"
                  data-testid="button-cookie-settings"
                >
                  Cookie settings
                </button>
              </li>
            </ul>
          </div>
          <p className="mt-3 text-[11.5px] leading-5 text-[#8a837b]">
            PDF Genius is a trading name of {COMPANY.legalName}, a company registered in {COMPANY.jurisdiction} (No.&nbsp;{COMPANY.companyNumber}).
            <span className="block sm:inline"> Registered office: {COMPANY.address}.</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
