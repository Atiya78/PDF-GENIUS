import { CloudIcon, LockIcon, PhoneIcon, ShieldIcon, Mail, Facebook, Instagram, Linkedin } from "lucide-react";
import React from "react";
import logoFull from "@assets/FullLogo_Transparent_NoBuffer_1782108807761.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";

export const FooterSection = (): JSX.Element => {
  const [, setLocation] = useLocation();

  // Enhanced navigation handler with better error handling
  const handleNavigation = (path: string | null, linkText: string) => {
    console.log(`🔗 Footer link clicked: ${linkText}`, { path });

    if (!path) {
      console.log(`❌ No path defined for: ${linkText}`);
      return;
    }

    try {
      console.log(`🚀 Navigating to: ${path}`);
      setLocation(path);

      // Scroll to top after a short delay to ensure page loads
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });

      console.log(`✅ Navigation to ${path} initiated successfully`);
    } catch (error) {
      console.error(`❌ Navigation error for ${path}:`, error);
      // Fallback: try direct window navigation
      try {
        window.location.href = path;
      } catch (fallbackError) {
        console.error(`❌ Fallback navigation failed:`, fallbackError);
      }
    }
  };

  // Footer links data
  const quickLinks = [
    { text: "PDF Tools", path: "/tools" },
    { text: "Pricing", path: "/pricing" },
    { text: "About Us", path: "/about" },
    { text: "Support", path: "/support" },
    { text: "Contact", path: "/contact" },
  ];

  const companyLinks = [
    { text: "Privacy Policy", path: "/privacy-policy" },
    { text: "Terms of Service", path: "/terms-of-service" },
    { text: "Refund Policy", path: "/refund-policy" },
    { text: "Data Safety", path: "/data-safety" },
    { text: "Support", path: "/support" },
    { text: "Report Bug", path: null },
  ];

  // Footer bottom info items
  const footerInfoItems = [
    { icon: <PhoneIcon className="w-[14.59px] h-5" />, text: "+447429919748" },
    { icon: <LockIcon className="w-[14.59px] h-5" />, text: "SSL Secured" },
    {
      icon: <CloudIcon className="w-[14.59px] h-5" />,
      text: "CloudIcon Processing",
    },
    {
      icon: <ShieldIcon className="w-[14.59px] h-5" />,
      text: "Privacy Protected",
    },
  ];

  return (
    <footer className="bg-white w-full border-t border-gray-200">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">

          {/* Company Info Column */}
          <div className="space-y-6">
            <div>
              <img
                src={logoFull}
                alt="PDF Genius"
                className="h-20 w-auto mb-4"
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
                <span className="text-gray-600 text-sm">info@pdfgenius.app</span>
              </div>
            </div>
          </div>

          {/* Quick Links Column */}
          <div>
            <h4 className="text-gray-900 font-semibold text-base mb-6">Quick Links</h4>
            <div className="space-y-3">
              {quickLinks.map((link, index) => (
                <button
                  key={`quick-link-${index}`}
                  className="block text-gray-600 text-sm hover:text-blue-600 transition-colors duration-200 text-left"
                  onClick={() => handleNavigation(link.path, link.text)}
                  type="button"
                >
                  {link.text}
                </button>
              ))}
            </div>
          </div>

          {/* Legal Column */}
          <div>
            <h4 className="text-gray-900 font-semibold text-base mb-6">Legal & Support</h4>
            <div className="space-y-3">
              {companyLinks.map((link, index) => (
                <button
                  key={`company-link-${index}`}
                  className={`block text-gray-600 text-sm transition-colors duration-200 text-left ${
                    link.path ? 'hover:text-blue-600 cursor-pointer' : 'opacity-50 cursor-default'
                  }`}
                  onClick={() => handleNavigation(link.path, link.text)}
                  disabled={!link.path}
                  type="button"
                >
                  {link.text}
                </button>
              ))}
            </div>
          </div>

          {/* Newsletter & Social Column */}
          <div>
            <h4 className="text-gray-900 font-semibold text-base mb-6">Stay Connected</h4>

            <div className="mb-6">
              <p className="text-gray-600 text-sm mb-4">
                Subscribe to our newsletter for updates and news.
              </p>
              <div className="space-y-3">
                <Input
                  className="bg-white text-gray-900 border-gray-300 placeholder:text-gray-400 text-sm"
                  placeholder="Enter your email"
                />
                <Button className="w-full text-sm">
                  Subscribe
                </Button>
              </div>
            </div>

            {/* Social Media Links */}
            <div>
              <h5 className="text-gray-900 font-medium text-sm mb-3">Follow Us</h5>
              <div className="flex space-x-4">
                <a
                  href="https://facebook.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-blue-600 hover:text-white transition-all duration-200"
                  aria-label="Facebook"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-blue-600 hover:text-white transition-all duration-200"
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-blue-700 hover:text-white transition-all duration-200"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Get the App */}
        <div className="mt-12 pt-8">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 sm:gap-8">
            <div className="flex-1 text-center sm:text-left">
              <h4 className="text-gray-900 font-semibold text-base mb-2">Get the App</h4>
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
