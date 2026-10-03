import { useState } from "react";
import { ChevronDown, CloudIcon, LockIcon, PhoneIcon, ShieldIcon, Mail, Facebook, Instagram, Linkedin } from "lucide-react";
import logoFull from "@assets/FullLogo_Transparent_NoBuffer_1782108807761.png";
import { Link } from "wouter";
import { toolLandingPages } from "@/config/toolLandingPages";
import { SOCIAL_FACEBOOK_URL, SOCIAL_INSTAGRAM_URL, SOCIAL_LINKEDIN_URL } from "@/lib/socialLinks";

const linkClass =
  "text-gray-600 hover:text-[#f7433d] focus-visible:text-[#f7433d] focus-visible:outline-none focus-visible:underline transition-colors";

const productLinks = [
  { text: "All PDF Tools", path: "/tools" },
  { text: "Pricing", path: "/pricing" },
  { text: "About Us", path: "/about" },
];

const helpLinks = [
  { text: "Support", path: "/support" },
  { text: "Contact", path: "/contact" },
  { text: "Data Safety", path: "/data-safety" },
];

const legalLinks = [
  { text: "Privacy Policy", path: "/privacy-policy" },
  { text: "Terms of Service", path: "/terms-of-service" },
  { text: "Refund Policy", path: "/refund-policy" },
];

const socials = [
  { url: SOCIAL_FACEBOOK_URL, label: "Facebook", Icon: Facebook },
  { url: SOCIAL_INSTAGRAM_URL, label: "Instagram", Icon: Instagram },
  { url: SOCIAL_LINKEDIN_URL, label: "LinkedIn", Icon: Linkedin },
];

const payments = [
  { file: "visa.svg", alt: "Visa" },
  { file: "mastercard.svg", alt: "Mastercard" },
  { file: "upi.svg", alt: "UPI" },
  { file: "apple-pay.svg", alt: "Apple Pay" },
  { file: "google-pay.svg", alt: "Google Pay" },
];

const trustItems = [
  { Icon: LockIcon, text: "SSL Secured" },
  { Icon: CloudIcon, text: "Cloud Processing" },
  { Icon: ShieldIcon, text: "Privacy Protected" },
];

const LinkList = ({ title, links }: { title: string; links: { text: string; path: string }[] }) => (
  <nav aria-label={title}>
    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900 mb-3">{title}</h3>
    <ul className="space-y-2 text-sm">
      {links.map((l) => (
        <li key={l.path}>
          <Link href={l.path} className={linkClass}>{l.text}</Link>
        </li>
      ))}
    </ul>
  </nav>
);

const FooterAppLinks = () => (
  <div className="mt-6 border-t border-gray-100 pt-5">
    <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-900 mb-3">Get the App</h3>
    <div className="flex items-center gap-3">
      <img
        src={`${import.meta.env.BASE_URL}play-store-qr.svg`}
        alt="QR code: scan to download PDF Genius on Google Play"
        className="w-16 h-16 shrink-0 rounded-lg border border-gray-200 bg-white p-1"
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
        <p className="text-xs text-gray-500">iOS: available soon</p>
      </div>
    </div>
  </div>
);

export const FooterSection = (): JSX.Element => {
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const pdfTools = toolLandingPages.filter((page) => page.name.includes("PDF"));
  const activeSocials = socials.filter((s) => s.url);

  return (
    <footer id="site-footer" className="bg-white w-full border-t border-gray-200">
      <div className="max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand + contact */}
          <div className="md:col-span-4 min-w-0">
            <Link href="/" aria-label="PDF Genius home" className="inline-block">
              <img src={logoFull} alt="PDF Genius" width={1280} height={1157} className="h-14 w-auto" />
            </Link>
            <p className="mt-3 text-sm text-gray-600 leading-relaxed max-w-xs">
              Practical tools for converting and managing documents, on the web and on your phone.
            </p>
            <ul className="mt-5 space-y-2 text-sm">
              <li>
                <a href="mailto:support@pdfgenius.app" className="inline-flex items-center gap-2 font-medium text-gray-900 hover:text-[#f7433d] break-all">
                  <Mail className="w-4 h-4 shrink-0 text-[#f7433d]" />
                  support@pdfgenius.app
                </a>
              </li>
              <li>
                <a href="tel:+447429919748" className="inline-flex items-center gap-2 text-gray-700 hover:text-[#f7433d]">
                  <PhoneIcon className="w-4 h-4 shrink-0 text-[#f7433d]" />
                  +447429919748
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
                    className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center hover:bg-[#f7433d] hover:text-white transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            )}
            <FooterAppLinks />
          </div>

          {/* Tools + links */}
          <div className="md:col-span-8 min-w-0 space-y-8">
            <nav aria-label="PDF tools">
               <h3 className="hidden md:block text-xs font-semibold uppercase tracking-wider text-gray-900 mb-3">PDF Tools</h3>
               <button
                 type="button"
                 className="md:hidden flex min-h-11 w-full items-center justify-between gap-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f7433d] rounded"
                 onClick={() => setToolsExpanded(expanded => !expanded)}
                 aria-expanded={toolsExpanded}
                 aria-controls="footer-pdf-tools"
               >
                 PDF Tools
                 <span className="inline-flex items-center gap-2 text-gray-500 normal-case tracking-normal font-normal">
                   {pdfTools.length} tools
                   <ChevronDown className={`h-4 w-4 transition-transform ${toolsExpanded ? "rotate-180" : ""}`} aria-hidden="true" />
                 </span>
               </button>
               <ul id="footer-pdf-tools" className={`${toolsExpanded ? "block" : "hidden"} md:block columns-2 md:columns-3 gap-x-5 text-sm`}>
                {pdfTools.map((page) => (
                  <li key={page.path} className="break-inside-avoid py-1">
                    <Link href={page.path} className={linkClass}>{page.name}</Link>
                  </li>
                ))}
              </ul>
            </nav>

             <div className="grid grid-cols-3 gap-x-4 gap-y-6 pt-6 border-t border-gray-100">
              <LinkList title="Product" links={productLinks} />
              <LinkList title="Help" links={helpLinks} />
              <LinkList title="Legal" links={legalLinks} />
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-5 border-t border-gray-200 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-gray-600 order-last lg:order-none">
            © {new Date().getFullYear()} PDF Genius. All rights reserved.
          </p>
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {trustItems.map(({ Icon, text }) => (
              <li key={text} className="flex items-center gap-1.5 text-xs text-gray-600">
                <Icon className="w-4 h-4 text-[#f7433d]" />
                <span className="whitespace-nowrap">{text}</span>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-1.5">
            {payments.map((pm) => (
              <img
                key={pm.file}
                src={`${import.meta.env.BASE_URL}payments/${pm.file}`}
                alt={pm.alt}
                title={pm.alt}
                className="h-8 w-8"
                loading="lazy"
              />
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};
