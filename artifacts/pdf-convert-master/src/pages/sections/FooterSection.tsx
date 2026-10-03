import { CloudIcon, LockIcon, PhoneIcon, ShieldIcon, Mail, Facebook, Instagram, Linkedin } from "lucide-react";
import React from "react";
import logoFull from "@assets/FullLogo_Transparent_NoBuffer_1782108807761.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "wouter";
import { toolConfigs } from "@/lib/toolConfig";
import { SOCIAL_FACEBOOK_URL, SOCIAL_INSTAGRAM_URL, SOCIAL_LINKEDIN_URL } from "@/config/social";

export const FooterSection = (): JSX.Element => {
  // Footer links data
  const quickLinks = [
    { text: "PDF Tools", path: "/tools" },
    { text: "Pricing", path: "/pricing" },
    { text: "About Us", path: "/about" },
    { text: "Support", path: "/support" },
  ];

  const companyLinks = [
    { text: "Privacy Policy", path: "/privacy-policy" },
    { text: "Terms of Service", path: "/terms-of-service" },
    { text: "Refund Policy", path: "/refund-policy" },
    { text: "Data Safety", path: "/data-safety" },
    { text: "Report Bug", path: null },
  ];

  const socialLinks = [
    { label: "Facebook", url: SOCIAL_FACEBOOK_URL, Icon: Facebook },
    { label: "Instagram", url: SOCIAL_INSTAGRAM_URL, Icon: Instagram },
    { label: "LinkedIn", url: SOCIAL_LINKEDIN_URL, Icon: Linkedin },
  ].filter((l) => l.url);

  // Footer bottom info items
  const footerInfoItems = [
    { icon: <LockIcon className="w-[14.59px] h-5" />, text: "HTTPS in transit" },
    {
      icon: <CloudIcon className="w-[14.59px] h-5" />,
      text: "Server processing for some tools",
    },
    {
      icon: <ShieldIcon className="w-[14.59px] h-5" />,
      text: "Browser and server tools",
    },
  ];

  return (
    <footer className="bg-white w-full border-t border-gray-200">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">

          {/* Company Info Column */}
          <div className="space-y-6">
            <div>
              <img
                src={logoFull}
                alt="PDF Genius"
                width={88}
                height={80}
                className="h-20 w-auto mb-4"
                loading="lazy"
                decoding="async"
              />
              <p className="text-gray-600 text-sm leading-relaxed">
                Your trusted partner for professional PDF conversion and document management solutions.
              </p>
            </div>

            {/* Contact Details */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <PhoneIcon className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <span className="text-gray-600 text-sm">+447429919748</span>
              </div>

              <div className="flex items-center space-x-3">
                <Mail className="w-4 h-4 text-gray-600 flex-shrink-0" />
                <Link href="/support" onClick={(event) => { event.preventDefault(); void import("@/lib/supportChat").then(chat => chat.openSupportChat()); }} className="inline-flex min-h-[44px] items-center text-gray-600 text-sm hover:text-[#c62d27]" data-testid="link-footer-contact-support">Contact Support</Link>
              </div>
            </div>
          </div>

          {/* PDF Tools Column */}
          <div>
            <h2 className="text-gray-900 font-semibold text-base mb-4">PDF Tools</h2>
            <ul>
              {["merge-pdfs", "compress-pdf", "pdf-to-word", "word-to-pdf", "split-pdf", "edit-pdf", "sign-pdf", "images-to-pdf", "unlock-pdf"].map((id) => {
                const t = toolConfigs[id];
                if (!t?.route) return null;
                return (
                  <li key={id}>
                    <Link
                      href={t.route}
                      className="inline-flex min-h-[44px] items-center text-gray-600 text-sm hover:text-[#c62d27] transition-colors"
                      data-testid={`link-footer-tool-${id}`}
                    >
                      {t.title}
                    </Link>
                  </li>
                );
              })}
              <li>
                <Link href="/tools" className="inline-flex min-h-[44px] items-center text-sm font-medium text-[#c62d27] hover:underline" data-testid="link-footer-all-tools">
                  All tools
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links Column */}
          <div>
            <h2 className="text-gray-900 font-semibold text-base mb-6">Quick Links</h2>
            <div className="space-y-0">
              {quickLinks.map((link, index) => (
                <Link
                  key={`quick-link-${index}`}
                  href={link.path}
                  className="flex min-h-[44px] items-center text-gray-600 text-sm hover:text-[#c62d27] transition-colors duration-200"
                  onClick={() => window.scrollTo({ top: 0 })}
                >
                  {link.text}
                </Link>
              ))}
            </div>
          </div>

          {/* Legal Column */}
          <div>
            <h2 className="text-gray-900 font-semibold text-base mb-6">Legal & Support</h2>
            <div className="space-y-0">
              {companyLinks.map((link, index) => (
                link.path ? (
                  <Link
                    key={`company-link-${index}`}
                    href={link.path}
                    className="flex min-h-[44px] items-center text-gray-600 text-sm hover:text-[#c62d27] transition-colors duration-200"
                    onClick={() => window.scrollTo({ top: 0 })}
                  >
                    {link.text}
                  </Link>
                ) : (
                  <span key={`company-link-${index}`} className="flex min-h-[44px] items-center text-gray-500 text-sm">
                    {link.text}
                  </span>
                )
              ))}
            </div>
          </div>

          {/* Newsletter & Social Column */}
          <div>
            <h2 className="text-gray-900 font-semibold text-base mb-6">Stay Connected</h2>

            <div className="mb-6">
              <p className="text-gray-600 text-sm mb-4">
                Subscribe to our newsletter for updates and news.
              </p>
              <div className="space-y-3">
                <Input
                  className="bg-white text-gray-900 border-gray-300 placeholder:text-gray-400 text-sm"
                  placeholder="Enter your email"
                />
                <Button className="w-full text-sm bg-[#c62d27] hover:bg-[#a9221d]">
                  Subscribe
                </Button>
              </div>
            </div>

            {/* Social Media Links (hidden when URL constants are empty) */}
            {socialLinks.length > 0 && (
              <div>
                <h5 className="text-gray-900 font-medium text-sm mb-3">Follow Us</h5>
                <div className="flex space-x-4">
                  {socialLinks.map(({ label, url, Icon }) => (
                    <a
                      key={label}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-[#f7433d] hover:text-white transition-all duration-200"
                      aria-label={label}
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Get the App */}
        <div className="mt-12 pt-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-gray-900 font-semibold text-base mb-2">Get the App</h2>
              <p className="text-gray-600 text-sm mb-4 max-w-md">
                Convert files on the go — download PDF Genius from Google Play, or scan the QR code with your phone.
              </p>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3">
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
                    width={180}
                    height={56}
                    className="h-14 w-auto"
                    loading="lazy"
                  />
                </a>
                <span className="inline-flex items-center h-10 sm:h-14 px-4 rounded-lg border border-gray-200 bg-gray-50 text-gray-500 text-xs font-medium whitespace-nowrap">
                  iOS — available soon
                </span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <img
                src={`${import.meta.env.BASE_URL}play-store-qr.svg`}
                alt="QR code — scan to download PDF Genius on Google Play"
                width={112}
                height={112}
                className="w-28 h-28 rounded-lg border border-gray-200 bg-white p-1"
                loading="lazy"
              />
              <span className="text-gray-500 text-xs">Scan to download</span>
            </div>
          </div>
        </div>

        {/* Footer Bottom */}
        <div className="mt-12 pt-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">

            {/* Payment Methods */}
            <div className="flex items-center gap-2">
              {[
                { file: "visa.svg", alt: "Visa" },
                { file: "mastercard.svg", alt: "Mastercard" },
                { file: "upi.svg", alt: "UPI" },
                { file: "apple-pay.svg", alt: "Apple Pay" },
                { file: "google-pay.svg", alt: "Google Pay" },
              ].map((pm) => (
                <img
                  key={pm.file}
                  src={`${import.meta.env.BASE_URL}payments/${pm.file}`}
                  alt={pm.alt}
                  title={pm.alt}
                  width={40}
                  height={40}
                  className="h-10 w-10"
                  loading="lazy"
                />
              ))}
            </div>

            {/* Security Features */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              {footerInfoItems.map((item, index) => (
                <div
                  key={`info-item-${index}`}
                  className="flex items-center space-x-2"
                >
                  {item.icon}
                  <span className="text-gray-600 text-sm whitespace-nowrap">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-8 text-center text-gray-600 text-sm">
            © {new Date().getFullYear()} PDF Genius. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
};
