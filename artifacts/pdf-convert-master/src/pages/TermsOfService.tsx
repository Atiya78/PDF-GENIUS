import React, { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, CheckCircle, Book, Heart, User, Shield, FileText, Copyright, DollarSign, Lock, X, AlertCircle, Gavel, MessageSquare, Edit, Phone } from "lucide-react";
import { DocumentSearch, SearchableSection } from "@/components/DocumentSearch";
import { useDocumentSearch } from "@/hooks/useDocumentSearch";

export const TermsOfService = (): JSX.Element => {
  // Define table of contents items first
  const tableOfContentsItems = [
    { icon: CheckCircle, text: "Acceptance of Terms", id: "acceptance-of-terms" },
    { icon: Book, text: "Definitions", id: "definitions" },
    { icon: Heart, text: "Description of Services", id: "description-of-services" },
    { icon: User, text: "User Accounts", id: "user-accounts" },
    { icon: Shield, text: "Acceptable Use Policy", id: "acceptable-use-policy" },
    { icon: FileText, text: "User Content and Files", id: "user-content-and-files" },
    { icon: Copyright, text: "Intellectual Property", id: "intellectual-property" },
    { icon: DollarSign, text: "Payment Terms", id: "payment-terms" },
    { icon: Lock, text: "Privacy and Security", id: "privacy-and-security" },
    { icon: X, text: "Termination", id: "termination" },
    { icon: AlertCircle, text: "Warranty Disclaimer", id: "warranty-disclaimer" },
    { icon: Shield, text: "Limitation of Liability", id: "limitation-of-liability" },
    { icon: Gavel, text: "Indemnification", id: "indemnification" },
    { icon: Gavel, text: "Governing Law", id: "governing-law" },
    { icon: MessageSquare, text: "Dispute Resolution", id: "dispute-resolution" },
    { icon: Edit, text: "Modifications", id: "modifications" },
    { icon: Phone, text: "Contact Information", id: "contact-information" }
  ];

  // Create searchable sections data
  const searchableSections: SearchableSection[] = useMemo(() => [
    {
      id: "acceptance-of-terms",
      title: "Acceptance of Terms",
      content: "By accessing and using PDF Genius (the \"Service\"), a web-based PDF conversion platform operated by the PDF Genius team, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service (\"Terms\"). If you do not agree to these Terms, please do not use our Service. These Terms constitute a legally binding agreement between you and PDF Genius. Your continued use of the Service constitutes your acceptance of any modifications to these Terms.",
      category: "Legal"
    },
    {
      id: "definitions",
      title: "Definitions",
      content: "\"Service\" refers to PDF Genius, our web-based platform and all related tools and features. \"User,\" \"you,\" or \"your\" refers to any individual or entity using our Service. \"Company,\" \"we,\" \"us,\" or \"our\" refers to PDF Genius. \"Content\" refers to any files, documents, data, or information uploaded to or processed through our Service. \"Account\" refers to your registered user account on our platform. \"Personal Data\" has the meaning set out in the UK General Data Protection Regulation (UK GDPR).",
      category: "Legal"
    },
    {
      id: "description-of-services",
      title: "Description of Services",
      content: "PDF Genius provides online document conversion and processing services, including but not limited to PDF to various format conversions (Word, Excel, PowerPoint, images, etc.), Multiple format to PDF conversions, PDF merging, splitting, and editing tools, Document compression and optimization, Password protection and security features, Batch processing capabilities. We reserve the right to modify, suspend, or discontinue any aspect of our Service at any time with reasonable notice to users.",
      category: "Services"
    },
    {
      id: "user-accounts",
      title: "User Accounts",
      content: "While many features are available without registration, creating an account provides access to enhanced features and processing history. Account Security: You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account. Accurate Information: You must provide accurate, current, and complete information when creating your account. Age Requirement: You must be at least 16 years old to create an account and use our Service. Single Account: You may maintain only one account per individual or business entity.",
      category: "Account"
    },
    {
      id: "acceptable-use-policy",
      title: "Acceptable Use Policy",
      content: "You agree not to use our Service to upload, process, or distribute illegal, harmful, or copyrighted content without authorization, attempt to gain unauthorized access to our systems or other users' accounts, distribute malware, viruses, or other malicious code, engage in activities that could damage, disable, or impair our Service, use automated scripts or bots to abuse our Service, violate any applicable laws or regulations, infringe upon intellectual property rights of others. Violation of this policy may result in immediate termination of your access to our Service.",
      category: "Usage"
    },
    {
      id: "user-content-and-files",
      title: "User Content and Files",
      content: "File Processing: Files uploaded to our Service are processed temporarily and automatically deleted after completion. We do not permanently store your documents. Content Ownership: You retain full ownership of all content you upload. We do not claim any ownership rights to your files. Processing License: By uploading files, you grant us a limited, temporary license to process your content solely for providing our conversion services. File Limitations: We may impose reasonable limits on file size, processing time, and usage volume to ensure optimal service performance. Prohibited Content: You may not upload content that violates laws, infringes copyrights, or contains malicious code.",
      category: "Content"
    },
    {
      id: "intellectual-property",
      title: "Intellectual Property",
      content: "Our Rights: The Service, including all software, designs, text, graphics, and other content, is owned by PDF Genius and protected by copyright, trademark, and other intellectual property laws. Limited License: We grant you a limited, non-exclusive, non-transferable license to use our Service for its intended purpose. Restrictions: You may not copy, modify, distribute, sell, or lease any part of our Service or attempt to reverse engineer our software. Feedback: Any feedback, suggestions, or ideas you provide about our Service may be used by us without compensation or attribution.",
      category: "Legal"
    },
    {
      id: "payment-terms",
      title: "Payment Terms",
      content: "Free Services: Basic conversion services are provided free of charge with usage limitations. Premium Services: Enhanced features, higher processing limits, and priority support are available through paid subscriptions and one-time credit packs. Merchant of Record: Web payments are processed by our authorised reseller and Merchant of Record, Paddle.com Market Limited (Paddle) or Dodo Payments, who act as the seller of record and handle billing, payment processing, sales tax and VAT, invoicing, and refunds on our behalf. Your statement may show the name of the Merchant of Record rather than PDF Genius. Mobile in-app purchases are processed by the Apple App Store or Google Play under their terms. Billing: Subscription fees are billed in advance on a recurring basis and renew automatically until cancelled. You may cancel at any time, and your plan remains active until the end of the current paid period. Refunds: Cancellations and refunds are governed by our Refund Policy, including a 14-day statutory right to cancel for eligible consumers in the UK, EU, EEA, and Switzerland. Nothing in these Terms limits your mandatory consumer rights. Price Changes: We may modify subscription prices with 30 days' written notice to existing subscribers. Taxes: Applicable taxes, duties, or government charges are collected and remitted by the Merchant of Record where required.",
      category: "Billing"
    },
    {
      id: "privacy-and-security",
      title: "Privacy and Security",
      content: "Data Protection: We implement industry-standard security measures to protect your data and comply with UK GDPR requirements. File Security: All file uploads and downloads are encrypted in transit using SSL/TLS encryption. Automatic Deletion: Uploaded files are automatically deleted from our servers after processing, typically within 24 hours. Privacy Policy: Our collection and use of personal information is governed by our Privacy Policy, which forms part of these Terms. No Guarantee: While we implement robust security measures, no system is completely secure, and we cannot guarantee absolute security.",
      category: "Security"
    },
    {
      id: "termination",
      title: "Termination",
      content: "Your Right to Terminate: You may stop using our Service at any time and delete your account through your account settings. Our Right to Terminate: We may suspend or terminate your access immediately if you violate these Terms or engage in harmful activities. Effect of Termination: Upon termination, your right to use the Service ceases, and we may delete any data associated with your account. Survival: Provisions regarding intellectual property, limitation of liability, and indemnification survive termination.",
      category: "Legal"
    },
    {
      id: "warranty-disclaimer",
      title: "Warranty Disclaimer",
      content: "AS IS BASIS: The Service is provided \"as is\" without warranties of any kind, either express or implied. NO WARRANTIES: We disclaim all warranties, including but not limited to merchantability, fitness for a particular purpose, and non-infringement. NO GUARANTEE: We do not guarantee that the Service will be error-free, uninterrupted, or meet your specific requirements. RESULTS: We do not warrant the accuracy, completeness, or quality of conversion results.",
      category: "Legal"
    },
    {
      id: "limitation-of-liability",
      title: "Limitation of Liability",
      content: "LIMITED LIABILITY: To the maximum extent permitted by law, our total liability for any claims arising from your use of the Service shall not exceed the amount you paid us in the 12 months preceding the claim. EXCLUDED DAMAGES: We shall not be liable for indirect, incidental, special, consequential, or punitive damages, including lost profits or data. USER RESPONSIBILITY: You acknowledge that you use the Service at your own risk and are responsible for backing up important documents. STATUTORY RIGHTS: Nothing in these Terms excludes or limits liability that cannot be excluded or limited under applicable law.",
      category: "Legal"
    },
    {
      id: "indemnification",
      title: "Indemnification",
      content: "You agree to indemnify, defend, and hold harmless PDF Genius, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including reasonable attorney fees) arising from: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any third-party rights; or (d) any content you upload or process through our Service.",
      category: "Legal"
    },
    {
      id: "governing-law",
      title: "Governing Law",
      content: "These Terms shall be governed by and construed in accordance with the laws of England and Wales, without regard to conflict of law principles. Any legal action or proceeding arising under these Terms will be brought exclusively in the courts of England and Wales, and you consent to personal jurisdiction and venue in such courts.",
      category: "Legal"
    },
    {
      id: "dispute-resolution",
      title: "Dispute Resolution",
      content: "Informal Resolution: Before initiating formal legal proceedings, you agree to first contact us to attempt to resolve any disputes informally. Mediation: If informal resolution fails, disputes may be resolved through mediation by a mutually agreed mediator in London, UK. Court Proceedings: As a last resort, disputes may be brought before the competent courts of England and Wales. Consumer Rights: Nothing in this section affects your statutory rights as a consumer under UK law.",
      category: "Legal"
    },
    {
      id: "modifications",
      title: "Modifications",
      content: "Right to Modify: We reserve the right to modify these Terms at any time to reflect changes in our Service, legal requirements, or business practices. Notice: Significant changes will be communicated through email notification and prominent notice on our website at least 30 days before taking effect. Acceptance: Your continued use of the Service after changes take effect constitutes acceptance of the modified Terms. Disagreement: If you disagree with modifications, you may terminate your account before the changes take effect.",
      category: "Legal"
    },
    {
      id: "contact-information",
      title: "Contact Information",
      content: "For questions about these Terms of Service or our Service, please contact us: Company: PDF Genius, Service: PDF Genius, Phone: +447429919748, Location: London, United Kingdom, Website: pdfgenius.app",
      category: "Contact"
    }
  ], []);

  // State declarations
  const [activeSection, setActiveSection] = useState("");
  const [filteredItems, setFilteredItems] = useState(tableOfContentsItems);
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

  // Search functionality
  const {
    handleSearchChange,
    handleResultClick,
    clearSearch
  } = useDocumentSearch({
    sections: searchableSections,
    onSectionHighlight: setHighlightedSection,
    onNavigationFilter: (sectionIds) => {
      const filtered = tableOfContentsItems.filter(item => sectionIds.includes(item.id));
      setFilteredItems(filtered.length > 0 ? filtered : tableOfContentsItems);
    }
  });

  // Smooth scroll to section
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 100; // Account for sticky header
      const elementPosition = element.offsetTop;
      const offsetPosition = elementPosition - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }

  };



  // Track scroll position and active section
  useEffect(() => {
    const handleScroll = () => {
      // Find the active section
      const sections = tableOfContentsItems.map(item => item.id);
      let currentActiveSection = "";

      for (const sectionId of sections) {
        const element = document.getElementById(sectionId);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom >= 150) {
            currentActiveSection = sectionId;
            break;
          }
        }
      }

      if (currentActiveSection !== activeSection) {
        setActiveSection(currentActiveSection);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [activeSection, tableOfContentsItems]);

  return (
    <div className="min-h-screen bg-gray-50">



      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-6">
            Terms of Service
          </h1>

          {/* Subtitle */}
          <div className="max-w-4xl mx-auto mb-12">
            <p className="text-lg text-gray-600 leading-relaxed mb-1">
              Please read these Terms of Service carefully before using PDF Genius services provided
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              by the PDF Genius team.
            </p>
          </div>



          {/* Date Information Card */}
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/70 backdrop-blur-sm border border-gray-200 rounded-lg p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                {/* Last Updated */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6">
                    <Calendar className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-600">
                    Last Updated: June 25, 2026
                  </span>
                </div>

                {/* Effective Date */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-6 h-6">
                    <Clock className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm text-gray-600">
                    Effective Date: June 25, 2026
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>



        {/* Main Content Layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Sidebar - Table of Contents */}
          <aside className="hidden lg:block w-72 sticky top-20 self-start">
            <div className="bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Table of Contents
              </h3>

              <nav className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                {filteredItems.map((item, index) => (
                  <button
                    key={index}
                    onClick={() => scrollToSection(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-3 text-left text-sm rounded-lg transition-all ${
                      activeSection === item.id || highlightedSection === item.id
                        ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-600 shadow-sm'
                        : 'text-gray-600 hover:bg-gray-50'
                    } ${highlightedSection === item.id ? 'ring-2 ring-blue-300 ring-opacity-50' : ''}`}
                  >
                    <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                      <item.icon className={`w-[18.75px] h-[18px] ${
                        activeSection === item.id || highlightedSection === item.id ? 'text-blue-600' : 'text-gray-500'
                      }`} />
                    </div>
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

                {/* 1. Acceptance of Terms */}
                <section id="acceptance-of-terms" className={`scroll-mt-24 transition-all duration-300 ${
                  highlightedSection === "acceptance-of-terms" ? "bg-blue-50 p-6 rounded-lg ring-4 ring-blue-500 ring-opacity-50" : ""
                }`}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                    1. Acceptance of Terms
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    By accessing and using PDF Genius (the "Service"), a web-based PDF conversion platform operated by the PDF Genius team, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, please do not use our Service.
                  </p>
                  <p className="text-gray-700 leading-relaxed">
                    These Terms constitute a legally binding agreement between you and PDF Genius. Your continued use of the Service constitutes your acceptance of any modifications to these Terms.
                  </p>
                </section>

                {/* 2. Definitions */}
                <section id="definitions" className={`scroll-mt-24 transition-all duration-300 ${
                  highlightedSection === "definitions" ? "bg-blue-50 p-6 rounded-lg ring-4 ring-blue-500 ring-opacity-50" : ""
                }`}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Book className="w-6 h-6 text-blue-600" />
                    2. Definitions
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-2">
                    <p><strong>"Service"</strong> refers to PDF Genius, our web-based platform and all related tools and features.</p>
                    <p><strong>"User," "you," or "your"</strong> refers to any individual or entity using our Service.</p>
                    <p><strong>"Company," "we," "us," or "our"</strong> refers to PDF Genius.</p>
                    <p><strong>"Content"</strong> refers to any files, documents, data, or information uploaded to or processed through our Service.</p>
                    <p><strong>"Account"</strong> refers to your registered user account on our platform.</p>
                    <p><strong>"Personal Data"</strong> has the meaning set out in the UK General Data Protection Regulation (UK GDPR).</p>
                  </div>
                </section>

                {/* 3. Description of Services */}
                <section id="description-of-services" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Heart className="w-6 h-6 text-blue-600" />
                    3. Description of Services
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    PDF Genius provides online document conversion and processing services, including but not limited to:
                  </p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                    <li>PDF to various format conversions (Word, Excel, PowerPoint, images, etc.)</li>
                    <li>Multiple format to PDF conversions</li>
                    <li>PDF merging, splitting, and editing tools</li>
                    <li>Document compression and optimization</li>
                    <li>Password protection and security features</li>
                    <li>Batch processing capabilities</li>
                  </ul>
                  <p className="text-gray-700 leading-relaxed">
                    We reserve the right to modify, suspend, or discontinue any aspect of our Service at any time with reasonable notice to users.
                  </p>
                </section>

                {/* 4. User Accounts */}
                <section id="user-accounts" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <User className="w-6 h-6 text-blue-600" />
                    4. User Accounts
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-4">
                    While many features are available without registration, creating an account provides access to enhanced features and processing history.
                  </p>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>Account Security:</strong> You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.</p>
                    <p><strong>Accurate Information:</strong> You must provide accurate, current, and complete information when creating your account.</p>
                    <p><strong>Age Requirement:</strong> You must be at least 16 years old to create an account and use our Service.</p>
                    <p><strong>Single Account:</strong> You may maintain only one account per individual or business entity.</p>
                  </div>
                </section>

                {/* 5. Acceptable Use Policy */}
                <section id="acceptable-use-policy" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Shield className="w-6 h-6 text-blue-600" />
                    5. Acceptable Use Policy
                  </h2>
                  <p className="text-gray-700 leading-relaxed mb-4">You agree not to use our Service to:</p>
                  <ul className="list-disc pl-6 text-gray-700 space-y-2 mb-4">
                    <li>Upload, process, or distribute illegal, harmful, or copyrighted content without authorization</li>
                    <li>Attempt to gain unauthorized access to our systems or other users' accounts</li>
                    <li>Distribute malware, viruses, or other malicious code</li>
                    <li>Engage in activities that could damage, disable, or impair our Service</li>
                    <li>Use automated scripts or bots to abuse our Service</li>
                    <li>Violate any applicable laws or regulations</li>
                    <li>Infringe upon intellectual property rights of others</li>
                  </ul>
                  <p className="text-gray-700 leading-relaxed">
                    Violation of this policy may result in immediate termination of your access to our Service.
                  </p>
                </section>

                {/* 6. User Content and Files */}
                <section id="user-content-and-files" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <FileText className="w-6 h-6 text-blue-600" />
                    6. User Content and Files
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>File Processing:</strong> Files uploaded to our Service are processed temporarily and automatically deleted after completion. We do not permanently store your documents.</p>
                    <p><strong>Content Ownership:</strong> You retain full ownership of all content you upload. We do not claim any ownership rights to your files.</p>
                    <p><strong>Processing License:</strong> By uploading files, you grant us a limited, temporary license to process your content solely for providing our conversion services.</p>
                    <p><strong>File Limitations:</strong> We may impose reasonable limits on file size, processing time, and usage volume to ensure optimal service performance.</p>
                    <p><strong>Prohibited Content:</strong> You may not upload content that violates laws, infringes copyrights, or contains malicious code.</p>
                  </div>
                </section>

                {/* 7. Intellectual Property */}
                <section id="intellectual-property" className={`scroll-mt-24 transition-all duration-300 ${
                  highlightedSection === "intellectual-property" ? "bg-blue-50 p-6 rounded-lg ring-4 ring-blue-500 ring-opacity-50" : ""
                }`}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Copyright className="w-6 h-6 text-blue-600" />
                    7. Intellectual Property
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>Our Rights:</strong> The Service, including all software, designs, text, graphics, and other content, is owned by PDF Genius and protected by copyright, trademark, and other intellectual property laws.</p>
                    <p><strong>Limited License:</strong> We grant you a limited, non-exclusive, non-transferable license to use our Service for its intended purpose.</p>
                    <p><strong>Restrictions:</strong> You may not copy, modify, distribute, sell, or lease any part of our Service or attempt to reverse engineer our software.</p>
                    <p><strong>Feedback:</strong> Any feedback, suggestions, or ideas you provide about our Service may be used by us without compensation or attribution.</p>
                  </div>
                </section>

                {/* 8. Payment Terms */}
                <section id="payment-terms" className={`scroll-mt-24 transition-all duration-300 ${
                  highlightedSection === "payment-terms" ? "bg-blue-50 p-6 rounded-lg ring-4 ring-blue-500 ring-opacity-50" : ""
                }`}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                    8. Payment Terms
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>Free Services:</strong> Basic conversion services are provided free of charge with usage limitations.</p>
                    <p><strong>Premium Services:</strong> Enhanced features, higher processing limits, and priority support are available through paid subscriptions and one-time credit packs.</p>
                    <p><strong>Merchant of Record:</strong> Web payments are processed by our authorised reseller and Merchant of Record, Paddle.com Market Limited ("Paddle") or Dodo Payments, who act as the seller of record and handle billing, payment processing, sales tax/VAT, invoicing, and refunds on our behalf. Your statement may show the name of the Merchant of Record rather than "PDF Genius". Mobile in-app purchases are processed by the Apple App Store or Google Play under their terms.</p>
                    <p><strong>Billing:</strong> Subscription fees are billed in advance on a recurring basis and renew automatically until cancelled. You may cancel at any time, and your plan remains active until the end of the current paid period.</p>
                    <p><strong>Refunds:</strong> Cancellations and refunds are governed by our <a href="/refund-policy" className="text-blue-600 hover:underline">Refund Policy</a>, including a 14-day statutory right to cancel for eligible consumers in the UK, EU, EEA, and Switzerland. Nothing in these Terms limits your mandatory consumer rights.</p>
                    <p><strong>Price Changes:</strong> We may modify subscription prices with 30 days' written notice to existing subscribers.</p>
                    <p><strong>Taxes:</strong> Applicable taxes, duties, or government charges are collected and remitted by the Merchant of Record where required.</p>
                  </div>
                </section>

                {/* 9. Privacy and Security */}
                <section id="privacy-and-security" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Lock className="w-6 h-6 text-blue-600" />
                    9. Privacy and Security
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>Data Protection:</strong> We implement industry-standard security measures to protect your data and comply with UK GDPR requirements.</p>
                    <p><strong>File Security:</strong> All file uploads and downloads are encrypted in transit using SSL/TLS encryption.</p>
                    <p><strong>Automatic Deletion:</strong> Uploaded files are automatically deleted from our servers after processing, typically within 24 hours.</p>
                    <p><strong>Privacy Policy:</strong> Our collection and use of personal information is governed by our Privacy Policy, which forms part of these Terms.</p>
                    <p><strong>No Guarantee:</strong> While we implement robust security measures, no system is completely secure, and we cannot guarantee absolute security.</p>
                  </div>
                </section>

                {/* 10. Termination */}
                <section id="termination" className={`scroll-mt-24 transition-all duration-300 ${
                  highlightedSection === "termination" ? "bg-blue-50 p-6 rounded-lg ring-4 ring-blue-500 ring-opacity-50" : ""
                }`}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <X className="w-6 h-6 text-blue-600" />
                    10. Termination
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>Your Right to Terminate:</strong> You may stop using our Service at any time and delete your account through your account settings.</p>
                    <p><strong>Our Right to Terminate:</strong> We may suspend or terminate your access immediately if you violate these Terms or engage in harmful activities.</p>
                    <p><strong>Effect of Termination:</strong> Upon termination, your right to use the Service ceases, and we may delete any data associated with your account.</p>
                    <p><strong>Survival:</strong> Provisions regarding intellectual property, limitation of liability, and indemnification survive termination.</p>
                  </div>
                </section>

                {/* 11. Warranty Disclaimer */}
                <section id="warranty-disclaimer" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 text-blue-600" />
                    11. Warranty Disclaimer
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>AS IS BASIS:</strong> The Service is provided "as is" without warranties of any kind, either express or implied.</p>
                    <p><strong>NO WARRANTIES:</strong> We disclaim all warranties, including but not limited to merchantability, fitness for a particular purpose, and non-infringement.</p>
                    <p><strong>NO GUARANTEE:</strong> We do not guarantee that the Service will be error-free, uninterrupted, or meet your specific requirements.</p>
                    <p><strong>RESULTS:</strong> We do not warrant the accuracy, completeness, or quality of conversion results.</p>
                  </div>
                </section>

                {/* 12. Limitation of Liability */}
                <section id="limitation-of-liability" className={`scroll-mt-24 transition-all duration-300 ${
                  highlightedSection === "limitation-of-liability" ? "bg-blue-50 p-6 rounded-lg ring-4 ring-blue-500 ring-opacity-50" : ""
                }`}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Shield className="w-6 h-6 text-blue-600" />
                    12. Limitation of Liability
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>LIMITED LIABILITY:</strong> To the maximum extent permitted by law, our total liability for any claims arising from your use of the Service shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
                    <p><strong>EXCLUDED DAMAGES:</strong> We shall not be liable for indirect, incidental, special, consequential, or punitive damages, including lost profits or data.</p>
                    <p><strong>USER RESPONSIBILITY:</strong> You acknowledge that you use the Service at your own risk and are responsible for backing up important documents.</p>
                    <p><strong>STATUTORY RIGHTS:</strong> Nothing in these Terms excludes or limits liability that cannot be excluded or limited under applicable law.</p>
                  </div>
                </section>

                {/* 13. Indemnification */}
                <section id="indemnification" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Gavel className="w-6 h-6 text-blue-600" />
                    13. Indemnification
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
                    You agree to indemnify, defend, and hold harmless PDF Genius, its officers, directors, employees, and agents from any claims, damages, losses, liabilities, and expenses (including reasonable attorney fees) arising from: (a) your use of the Service; (b) your violation of these Terms; (c) your violation of any third-party rights; or (d) any content you upload or process through our Service.
                  </p>
                </section>

                {/* 14. Governing Law */}
                <section id="governing-law" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Gavel className="w-6 h-6 text-blue-600" />
                    14. Governing Law
                  </h2>
                  <p className="text-gray-700 leading-relaxed">
                    These Terms shall be governed by and construed in accordance with the laws of England and Wales, without regard to conflict of law principles. Any legal action or proceeding arising under these Terms will be brought exclusively in the courts of England and Wales, and you consent to personal jurisdiction and venue in such courts.
                  </p>
                </section>

                {/* 15. Dispute Resolution */}
                <section id="dispute-resolution" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <MessageSquare className="w-6 h-6 text-blue-600" />
                    15. Dispute Resolution
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>Informal Resolution:</strong> Before initiating formal legal proceedings, you agree to first contact us to attempt to resolve any disputes informally.</p>
                    <p><strong>Mediation:</strong> If informal resolution fails, disputes may be resolved through mediation by a mutually agreed mediator in London, UK.</p>
                    <p><strong>Court Proceedings:</strong> As a last resort, disputes may be brought before the competent courts of England and Wales.</p>
                    <p><strong>Consumer Rights:</strong> Nothing in this section affects your statutory rights as a consumer under UK law.</p>
                  </div>
                </section>

                {/* 16. Modifications */}
                <section id="modifications" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Edit className="w-6 h-6 text-blue-600" />
                    16. Modifications
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>Right to Modify:</strong> We reserve the right to modify these Terms at any time to reflect changes in our Service, legal requirements, or business practices.</p>
                    <p><strong>Notice:</strong> Significant changes will be communicated through email notification and prominent notice on our website at least 30 days before taking effect.</p>
                    <p><strong>Acceptance:</strong> Your continued use of the Service after changes take effect constitutes acceptance of the modified Terms.</p>
                    <p><strong>Disagreement:</strong> If you disagree with modifications, you may terminate your account before the changes take effect.</p>
                  </div>
                </section>

                {/* 17. Contact Information */}
                <section id="contact-information" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Phone className="w-6 h-6 text-blue-600" />
                    17. Contact Information
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p>For questions about these Terms of Service or our Service, please contact us:</p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p><strong>Company:</strong> PDF Genius</p>
                      <p><strong>Service:</strong> PDF Genius</p>
                      <p><strong>Phone:</strong> +447429919748</p>
                      <p><strong>Location:</strong> London, United Kingdom</p>
                      <p><strong>Website:</strong> pdfgenius.app</p>
                    </div>
                  </div>
                </section>

                {/* Document Information */}
                <div className="border-t pt-6 mt-8 text-sm text-gray-500">
                  <p className="mb-2"><strong>Document Version:</strong> 1.0</p>
                  <p className="mb-2"><strong>Last Updated:</strong> June 25, 2026</p>
                  <p><strong>Effective Date:</strong> June 25, 2026</p>
                </div>

              </div>
            </div>
          </main>
        </div>


      </div>
    </div>
  );
};
