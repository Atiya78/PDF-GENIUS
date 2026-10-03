import React, { useState, useEffect, useMemo } from "react";
import { Calendar, Clock, Shield, Database, FileText, Lock, Cookie, Cloud, Timer, UserCheck, Globe, AlertTriangle, Mail, Edit, X, Eye, UserX, HardDrive, Trash2, FileCheck } from "lucide-react";
import { DocumentSearch, SearchableSection } from "@/components/DocumentSearch";
import { useDocumentSearch } from "@/hooks/useDocumentSearch";

export const PrivacyPolicy = (): JSX.Element => {
  // Define table of contents items first
  const tableOfContentsItems = [
    { icon: Database, text: "Information We Collect", id: "information-we-collect" },
    { icon: Eye, text: "How We Use Your Information", id: "how-we-use-your-information" },
    { icon: FileText, text: "File Processing and Storage", id: "file-processing-and-storage" },
    { icon: Shield, text: "Data Security Measures", id: "data-security-measures" },
    { icon: Cookie, text: "Cookies and Tracking", id: "cookies-and-tracking" },
    { icon: Cloud, text: "Third-Party Services", id: "third-party-services" },
    { icon: Timer, text: "Data Retention", id: "data-retention" },
    { icon: UserCheck, text: "Your Privacy Rights", id: "your-privacy-rights" },
    { icon: FileCheck, text: "GDPR Compliance", id: "gdpr-compliance" },
    { icon: UserX, text: "Children's Privacy", id: "childrens-privacy" },
    { icon: Globe, text: "International Transfers", id: "international-transfers" },
    { icon: AlertTriangle, text: "Data Breach Notification", id: "data-breach-notification" },
    { icon: Mail, text: "Contact for Privacy Concerns", id: "contact-for-privacy-concerns" },
    { icon: Edit, text: "Changes to Privacy Policy", id: "changes-to-privacy-policy" },
    { icon: Calendar, text: "Effective Date", id: "effective-date" }
  ];

  // Create searchable sections data
  const searchableSections: SearchableSection[] = useMemo(() => [
    {
      id: "information-we-collect",
      title: "Information We Collect",
      content: "Personal Information: We collect minimal personal information, including email addresses and an optional display name for account creation, user preferences, and customer support communications. File Information: When you upload files for conversion, we temporarily process file metadata and content solely for conversion purposes. We do not permanently store or analyze your file contents. Camera and Photos: When you use the document scanner, photos you capture with your camera or select from your device are uploaded solely to produce the requested document and are deleted on the same temporary schedule as other files. We never access your camera or photo library without your action. Usage Data: We collect anonymous usage statistics, including conversion types, file sizes, processing times, and general usage patterns to improve our services. Purchase Information: When you buy a subscription or credit pack through the app, we receive purchase history (the products you bought and their status) from the app store so we can activate your plan or credits. Payment card details are handled entirely by the app store (Google Play or Apple) and are never collected or stored by us. Technical Information: We automatically collect IP addresses, browser types, device identifiers, and referral URLs for security, fraud prevention, analytics, and service optimization. Account Information: For registered users, we store account credentials, preferences, subscription status, credit balance, and basic profile information.",
      category: "Data Collection"
    },
    {
      id: "how-we-use-your-information",
      title: "How We Use Your Information",
      content: "Service Provision: To provide PDF conversion and document processing services, including file format conversion, merging, splitting, and optimization. Account Management: To create and manage user accounts, authenticate users, and provide personalized service experiences. Communication: To send important service notifications, security alerts, and respond to customer support inquiries. Service Improvement: To analyze usage patterns, identify technical issues, and enhance our platform's performance and features. Security: To detect and prevent fraudulent activities, unauthorized access, and ensure platform security. Legal Compliance: To comply with applicable laws, regulations, and legal processes when required.",
      category: "Data Usage"
    },
    {
      id: "file-processing-and-storage",
      title: "File Processing and Storage",
      content: "Temporary Processing: All uploaded files are processed temporarily on secure servers. Files are automatically deleted after conversion completion, typically within 24 hours. No Permanent Storage: We do not permanently store your uploaded files or converted documents. Once processing is complete and files are downloaded or the session expires, all data is permanently deleted. Processing Purpose: Files are accessed only for the specific conversion or processing task requested and are not used for any other purpose. Server Security: Our processing servers are secured with encryption, access controls, and regular security monitoring. File Limitations: We may impose reasonable file size and processing time limits to ensure optimal service performance for all users.",
      category: "File Handling"
    },
    {
      id: "data-security-measures",
      title: "Data Security Measures",
      content: "Encryption in Transit: All data transmission between your device and our servers is encrypted using SSL/TLS protocols (HTTPS). Encryption at Rest: Files temporarily stored during processing are encrypted using industry-standard encryption algorithms. Access Controls: Strict access controls ensure only authorized personnel can access systems, with multi-factor authentication and regular access reviews. Server Security: Our servers are protected by firewalls, intrusion detection systems, and regular security updates. Automatic Deletion: Automated systems ensure uploaded files and processing data are permanently deleted after completion. Security Monitoring: Continuous monitoring for security threats, suspicious activities, and potential data breaches.",
      category: "Security"
    },
    {
      id: "cookies-and-tracking",
      title: "Cookies and Tracking",
      content: "Essential Cookies: We use necessary cookies for core site functionality, including user authentication, session management, and security features. Functional Cookies: Cookies that remember your preferences, settings, and improve your user experience on our platform. Analytics Cookies: We use our own first-party cookies to understand, in aggregate, how users interact with our service. We do not use third-party advertising or cross-app tracking cookies. Cookie Control: You can control cookie settings through your browser preferences, though disabling certain cookies may affect site functionality. Cookie Retention: Most cookies expire automatically, with session cookies deleted when you close your browser.",
      category: "Cookies"
    },
    {
      id: "third-party-services",
      title: "Third-Party Services",
      content: "Payment Processing (Web): Subscriptions and credit packs purchased on our website are sold and billed by our authorised reseller and Merchant of Record, Paddle.com Market Limited (Paddle) or Dodo Payments. As the seller of record, the Merchant of Record collects and processes your billing details (such as name, billing address, and payment card information) and handles taxes, invoicing, and refunds under its own privacy policy. We never receive or store your full payment card details; we only receive confirmation of your purchase and subscription status so we can activate your plan or credits. Payment Processing (Mobile): In-app subscriptions and credit packs are sold and billed through the official app stores (Google Play Billing and Apple App Store), which process all payment details under their own privacy policies. We use RevenueCat as our purchase-management provider to verify purchases and activate your plan or credits; it acts as our data processor and receives only purchase and device identifiers needed for that purpose. Analytics: We analyze anonymous, aggregated usage statistics using our own systems to improve performance. We do not use third-party advertising or analytics SDKs that track you across other apps or services. Customer Support: We may use third-party tools for customer support communications, subject to strict data protection agreements. Cloud Infrastructure: Our services are hosted on secure cloud infrastructure providers who comply with industry security standards. Data Sharing Limitations: We do not share your personal data or files with third parties for marketing or unrelated business purposes. Vendor Agreements: All third-party vendors are bound by data protection agreements and must comply with our privacy standards.",
      category: "Third Party"
    },
    {
      id: "data-retention",
      title: "Data Retention",
      content: "File Retention: Uploaded and converted files are automatically deleted within 24 hours of processing completion. No files are stored permanently. Account Information: Account data is retained while your account is active and for a reasonable period after account closure to comply with legal obligations. Usage Analytics: Anonymous usage statistics may be retained for service improvement purposes, with personal identifiers removed. Legal Requirements: We may retain certain data longer when required by law, legal processes, or legitimate business purposes. Data Deletion: Upon account deletion, personal information is removed within 30 days, except where retention is legally required. Backup Systems: Data in backup systems is subject to the same deletion schedules, though technical limitations may cause brief delays.",
      category: "Retention"
    },
    {
      id: "your-privacy-rights",
      title: "Your Privacy Rights",
      content: "Access Rights: You can request access to the personal information we hold about you and receive details about how it's processed. Correction Rights: You may request correction of inaccurate or incomplete personal information in your account settings or by contacting us. Deletion Rights: You can request deletion of your personal information, subject to legal retention requirements and legitimate business needs. Portability Rights: You may request your personal data in a portable format to transfer to another service provider. Objection Rights: You can object to certain types of data processing, including direct marketing communications. Withdrawal of Consent: Where processing is based on consent, you may withdraw consent at any time without affecting lawfulness of prior processing.",
      category: "Rights"
    },
    {
      id: "gdpr-compliance",
      title: "GDPR Compliance",
      content: "Legal Basis: We process personal data based on legitimate interests for service provision, contractual necessity for account management, and consent for marketing communications. Data Minimization: We collect only the minimum personal data necessary to provide our services effectively. Purpose Limitation: Personal data is used only for the specific purposes for which it was collected or compatible purposes. Data Protection Officer: We have designated data protection responsibilities to ensure GDPR compliance across all operations. Impact Assessments: We conduct privacy impact assessments for high-risk processing activities to protect individual rights. Breach Notification: We have procedures to detect, report, and investigate personal data breaches within required timeframes.",
      category: "GDPR"
    },
    {
      id: "childrens-privacy",
      title: "Children's Privacy",
      content: "Age Requirements: Our services are not intended for children under 16 years of age. We do not knowingly collect personal information from children under 16. Parental Consent: If we discover we have collected information from a child under 16 without parental consent, we will delete such information immediately. Educational Use: Educational institutions may use our services for students over 16 with appropriate permissions and supervision. Reporting: Parents or guardians who believe we have collected information from a child under 16 should contact us immediately. Account Restrictions: Users must confirm they are at least 16 years old during account creation.",
      category: "Children"
    },
    {
      id: "international-transfers",
      title: "International Transfers",
      content: "Data Location: Your data may be processed and stored in countries outside the UK/EU where our service providers operate. Transfer Safeguards: All international transfers are protected by appropriate safeguards, including adequacy decisions, standard contractual clauses, or other approved mechanisms. Security Standards: International service providers must meet equivalent data protection and security standards as required in the UK/EU. Legal Protections: Transfer agreements include strong data protection clauses and rights for data subjects. Minimized Transfers: We minimize international transfers and ensure they occur only when necessary for service provision.",
      category: "International"
    },
    {
      id: "data-breach-notification",
      title: "Data Breach Notification",
      content: "Detection Systems: We maintain monitoring systems to detect potential security incidents and data breaches promptly. Response Procedures: We have established incident response procedures to contain, assess, and resolve security breaches effectively. Regulatory Notification: We will notify relevant authorities within 72 hours of becoming aware of a breach that poses risks to individual rights and freedoms. User Notification: Affected users will be notified without undue delay if a breach is likely to result in high risk to their rights and freedoms. Documentation: All security incidents are documented with details of the breach, impact assessment, and remediation actions taken. Prevention Measures: We continuously improve security measures based on incident learnings and emerging threats.",
      category: "Security"
    },
    {
      id: "contact-for-privacy-concerns",
      title: "Contact for Privacy Concerns",
      content: "If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us: Company: PDF Genius, Service: PDF Genius, Phone: +447429919748, Location: London, United Kingdom, Privacy Inquiries: Please contact us through our website contact form. Response Time: We aim to respond to privacy inquiries within 30 days of receipt. Regulatory Contact: You also have the right to contact the Information Commissioner's Office (ICO) in the UK regarding privacy concerns.",
      category: "Contact"
    },
    {
      id: "changes-to-privacy-policy",
      title: "Changes to Privacy Policy",
      content: "Policy Updates: We may update this Privacy Policy to reflect changes in our practices, legal requirements, or service features. Notification Methods: Significant changes will be communicated through email notifications to registered users and prominent notices on our website. Advance Notice: Material changes will be announced at least 30 days before taking effect to allow you to review and understand the changes. Continued Use: Your continued use of our services after policy changes take effect constitutes acceptance of the updated Privacy Policy. Objection Rights: If you disagree with policy changes, you may close your account before the changes take effect. Version Control: We maintain version history of policy changes with effective dates for transparency.",
      category: "Updates"
    },
    {
      id: "effective-date",
      title: "Effective Date",
      content: "Current Version: This Privacy Policy is effective as of June 25, 2026, and applies to all information collected on or after this date. Previous Versions: This policy supersedes all previous versions of our privacy statements and policies. Retroactive Application: Changes to this policy apply only to information collected after the effective date, unless otherwise specified. Regular Reviews: We review and update this policy regularly to ensure it remains current with legal requirements and best practices. Contact for Clarification: If you have questions about when specific provisions became effective, please contact us for clarification.",
      category: "Effective"
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
            Privacy Policy
          </h1>

          {/* Subtitle */}
          <div className="max-w-4xl mx-auto mb-12">
            <p className="text-lg text-gray-600 leading-relaxed mb-1">
              Your privacy is important to us. This Privacy Policy explains how PDF Genius
            </p>
            <p className="text-lg text-gray-600 leading-relaxed">
              (operated by the PDF Genius team) collects, uses, and protects your personal information.
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

                {/* 1. Information We Collect */}
                <section id="information-we-collect" className={`scroll-mt-24 transition-all duration-300 ${
                  highlightedSection === "information-we-collect" ? "bg-blue-50 p-6 rounded-lg ring-4 ring-blue-500 ring-opacity-50" : ""
                }`}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Database className="w-6 h-6 text-blue-600" />
                    1. Information We Collect
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-4">
                    <p><strong>Personal Information:</strong> We collect minimal personal information, including email addresses and an optional display name for account creation, user preferences, and customer support communications.</p>
                    <p><strong>File Information:</strong> When you upload files for conversion, we temporarily process file metadata and content solely for conversion purposes. We do not permanently store or analyze your file contents.</p>
                    <p><strong>Camera and Photos:</strong> When you use the document scanner, photos you capture with your camera or select from your device are uploaded solely to produce the requested document and are deleted on the same temporary schedule as other files. We never access your camera or photo library without your action.</p>
                    <p><strong>Usage Data:</strong> We collect anonymous usage statistics, including conversion types, file sizes, processing times, and general usage patterns to improve our services.</p>
                    <p><strong>Purchase Information:</strong> When you buy a subscription or credit pack through the app, we receive purchase history (the products you bought and their status) from the app store so we can activate your plan or credits. Payment card details are handled entirely by the app store (Google Play or Apple) and are never collected or stored by us.</p>
                    <p><strong>Technical Information:</strong> We automatically collect IP addresses, browser types, device identifiers, and referral URLs for security, fraud prevention, analytics, and service optimization.</p>
                    <p><strong>Account Information:</strong> For registered users, we store account credentials, preferences, subscription status, credit balance, and basic profile information.</p>
                  </div>
                </section>

                {/* 2. How We Use Your Information */}
                <section id="how-we-use-your-information" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Eye className="w-6 h-6 text-blue-600" />
                    2. How We Use Your Information
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>Service Provision:</strong> To provide PDF conversion and document processing services, including file format conversion, merging, splitting, and optimization.</p>
                    <p><strong>Account Management:</strong> To create and manage user accounts, authenticate users, and provide personalized service experiences.</p>
                    <p><strong>Communication:</strong> To send important service notifications, security alerts, and respond to customer support inquiries.</p>
                    <p><strong>Service Improvement:</strong> To analyze usage patterns, identify technical issues, and enhance our platform's performance and features.</p>
                    <p><strong>Security:</strong> To detect and prevent fraudulent activities, unauthorized access, and ensure platform security.</p>
                    <p><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes when required.</p>
                  </div>
                </section>

                {/* 3. File Processing and Storage */}
                <section id="file-processing-and-storage" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <FileText className="w-6 h-6 text-blue-600" />
                    3. File Processing and Storage
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>Temporary Processing:</strong> All uploaded files are processed temporarily on secure servers. Files are automatically deleted after conversion completion, typically within 24 hours.</p>
                    <p><strong>No Permanent Storage:</strong> We do not permanently store your uploaded files or converted documents. Once processing is complete and files are downloaded or the session expires, all data is permanently deleted.</p>
                    <p><strong>Processing Purpose:</strong> Files are accessed only for the specific conversion or processing task requested and are not used for any other purpose.</p>
                    <p><strong>Server Security:</strong> Our processing servers are secured with encryption, access controls, and regular security monitoring.</p>
                    <p><strong>File Limitations:</strong> We may impose reasonable file size and processing time limits to ensure optimal service performance for all users.</p>
                  </div>
                </section>

                {/* 4. Data Security Measures */}
                <section id="data-security-measures" className={`scroll-mt-24 transition-all duration-300 ${
                  highlightedSection === "data-security-measures" ? "bg-blue-50 p-6 rounded-lg ring-4 ring-blue-500 ring-opacity-50" : ""
                }`}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Shield className="w-6 h-6 text-blue-600" />
                    4. Data Security Measures
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>Encryption in Transit:</strong> All data transmission between your device and our servers is encrypted using SSL/TLS protocols (HTTPS).</p>
                    <p><strong>Encryption at Rest:</strong> Files temporarily stored during processing are encrypted using industry-standard encryption algorithms.</p>
                    <p><strong>Access Controls:</strong> Strict access controls ensure only authorized personnel can access systems, with multi-factor authentication and regular access reviews.</p>
                    <p><strong>Server Security:</strong> Our servers are protected by firewalls, intrusion detection systems, and regular security updates.</p>
                    <p><strong>Automatic Deletion:</strong> Automated systems ensure uploaded files and processing data are permanently deleted after completion.</p>
                    <p><strong>Security Monitoring:</strong> Continuous monitoring for security threats, suspicious activities, and potential data breaches.</p>
                  </div>
                </section>

                {/* 5. Cookies and Tracking */}
                <section id="cookies-and-tracking" className={`scroll-mt-24 transition-all duration-300 ${
                  highlightedSection === "cookies-and-tracking" ? "bg-blue-50 p-6 rounded-lg ring-4 ring-blue-500 ring-opacity-50" : ""
                }`}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Cookie className="w-6 h-6 text-blue-600" />
                    5. Cookies and Tracking
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>Essential Cookies:</strong> We use necessary cookies for core site functionality, including user authentication, session management, and security features.</p>
                    <p><strong>Functional Cookies:</strong> Cookies that remember your preferences, settings, and improve your user experience on our platform.</p>
                    <p><strong>Analytics Cookies:</strong> We use our own first-party cookies to understand, in aggregate, how users interact with our service. We do not use third-party advertising or cross-app tracking cookies.</p>
                    <p><strong>Cookie Control:</strong> You can control cookie settings through your browser preferences, though disabling certain cookies may affect site functionality.</p>
                    <p><strong>Cookie Retention:</strong> Most cookies expire automatically, with session cookies deleted when you close your browser.</p>
                  </div>
                </section>

                {/* 6. Third-Party Services */}
                <section id="third-party-services" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Cloud className="w-6 h-6 text-blue-600" />
                    6. Third-Party Services
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>Payment Processing (Web):</strong> Subscriptions and credit packs purchased on our website are sold and billed by our authorised reseller and Merchant of Record, Paddle.com Market Limited ("Paddle") or Dodo Payments. As the seller of record, the Merchant of Record collects and processes your billing details (such as name, billing address, and payment card information) and handles taxes, invoicing, and refunds under its own privacy policy. We never receive or store your full payment card details; we only receive confirmation of your purchase and subscription status so we can activate your plan or credits.</p>
                    <p><strong>Payment Processing (Mobile):</strong> In-app subscriptions and credit packs are sold and billed through the official app stores (Google Play Billing and Apple App Store), which process all payment details under their own privacy policies. We use RevenueCat as our purchase-management provider to verify purchases and activate your plan or credits; it acts as our data processor and receives only the purchase and device identifiers needed for that purpose.</p>
                    <p><strong>Analytics:</strong> We analyze anonymous, aggregated usage statistics using our own systems to improve performance. We do not use third-party advertising or analytics SDKs that track you across other apps or services.</p>
                    <p><strong>Customer Support:</strong> We may use third-party tools for customer support communications, subject to strict data protection agreements.</p>
                    <p><strong>Cloud Infrastructure:</strong> Our services are hosted on secure cloud infrastructure providers who comply with industry security standards.</p>
                    <p><strong>Data Sharing Limitations:</strong> We do not share your personal data or files with third parties for marketing or unrelated business purposes.</p>
                    <p><strong>Vendor Agreements:</strong> All third-party vendors are bound by data protection agreements and must comply with our privacy standards.</p>
                  </div>
                </section>

                {/* 7. Data Retention */}
                <section id="data-retention" className={`scroll-mt-24 transition-all duration-300 ${
                  highlightedSection === "data-retention" ? "bg-blue-50 p-6 rounded-lg ring-4 ring-blue-500 ring-opacity-50" : ""
                }`}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Timer className="w-6 h-6 text-blue-600" />
                    7. Data Retention
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>File Retention:</strong> Uploaded and converted files are automatically deleted within 24 hours of processing completion. No files are stored permanently.</p>
                    <p><strong>Account Information:</strong> Account data is retained while your account is active and for a reasonable period after account closure to comply with legal obligations.</p>
                    <p><strong>Usage Analytics:</strong> Anonymous usage statistics may be retained for service improvement purposes, with personal identifiers removed.</p>
                    <p><strong>Legal Requirements:</strong> We may retain certain data longer when required by law, legal processes, or legitimate business purposes.</p>
                    <p><strong>Data Deletion:</strong> Upon account deletion, personal information is removed within 30 days, except where retention is legally required.</p>
                    <p><strong>Backup Systems:</strong> Data in backup systems is subject to the same deletion schedules, though technical limitations may cause brief delays.</p>
                  </div>
                </section>

                {/* 8. Your Privacy Rights */}
                <section id="your-privacy-rights" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <UserCheck className="w-6 h-6 text-blue-600" />
                    8. Your Privacy Rights
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>Access Rights:</strong> You can request access to the personal information we hold about you and receive details about how it's processed.</p>
                    <p><strong>Correction Rights:</strong> You may request correction of inaccurate or incomplete personal information in your account settings or by contacting us.</p>
                    <p><strong>Deletion Rights:</strong> You can request deletion of your personal information, subject to legal retention requirements and legitimate business needs.</p>
                    <p><strong>Portability Rights:</strong> You may request your personal data in a portable format to transfer to another service provider.</p>
                    <p><strong>Objection Rights:</strong> You can object to certain types of data processing, including direct marketing communications.</p>
                    <p><strong>Withdrawal of Consent:</strong> Where processing is based on consent, you may withdraw consent at any time without affecting lawfulness of prior processing.</p>
                  </div>
                </section>

                {/* 9. GDPR Compliance */}
                <section id="gdpr-compliance" className={`scroll-mt-24 transition-all duration-300 ${
                  highlightedSection === "gdpr-compliance" ? "bg-blue-50 p-6 rounded-lg ring-4 ring-blue-500 ring-opacity-50" : ""
                }`}>
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <FileCheck className="w-6 h-6 text-blue-600" />
                    9. GDPR Compliance
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>Legal Basis:</strong> We process personal data based on legitimate interests for service provision, contractual necessity for account management, and consent for marketing communications.</p>
                    <p><strong>Data Minimization:</strong> We collect only the minimum personal data necessary to provide our services effectively.</p>
                    <p><strong>Purpose Limitation:</strong> Personal data is used only for the specific purposes for which it was collected or compatible purposes.</p>
                    <p><strong>Data Protection Officer:</strong> We have designated data protection responsibilities to ensure GDPR compliance across all operations.</p>
                    <p><strong>Impact Assessments:</strong> We conduct privacy impact assessments for high-risk processing activities to protect individual rights.</p>
                    <p><strong>Breach Notification:</strong> We have procedures to detect, report, and investigate personal data breaches within required timeframes.</p>
                  </div>
                </section>

                {/* 10. Children's Privacy */}
                <section id="childrens-privacy" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <UserX className="w-6 h-6 text-blue-600" />
                    10. Children's Privacy
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>Age Requirements:</strong> Our services are not intended for children under 16 years of age. We do not knowingly collect personal information from children under 16.</p>
                    <p><strong>Parental Consent:</strong> If we discover we have collected information from a child under 16 without parental consent, we will delete such information immediately.</p>
                    <p><strong>Educational Use:</strong> Educational institutions may use our services for students over 16 with appropriate permissions and supervision.</p>
                    <p><strong>Reporting:</strong> Parents or guardians who believe we have collected information from a child under 16 should contact us immediately.</p>
                    <p><strong>Account Restrictions:</strong> Users must confirm they are at least 16 years old during account creation.</p>
                  </div>
                </section>

                {/* 11. International Transfers */}
                <section id="international-transfers" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Globe className="w-6 h-6 text-blue-600" />
                    11. International Transfers
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>Data Location:</strong> Your data may be processed and stored in countries outside the UK/EU where our service providers operate.</p>
                    <p><strong>Transfer Safeguards:</strong> All international transfers are protected by appropriate safeguards, including adequacy decisions, standard contractual clauses, or other approved mechanisms.</p>
                    <p><strong>Security Standards:</strong> International service providers must meet equivalent data protection and security standards as required in the UK/EU.</p>
                    <p><strong>Legal Protections:</strong> Transfer agreements include strong data protection clauses and rights for data subjects.</p>
                    <p><strong>Minimized Transfers:</strong> We minimize international transfers and ensure they occur only when necessary for service provision.</p>
                  </div>
                </section>

                {/* 12. Data Breach Notification */}
                <section id="data-breach-notification" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <AlertTriangle className="w-6 h-6 text-blue-600" />
                    12. Data Breach Notification
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>Detection Systems:</strong> We maintain monitoring systems to detect potential security incidents and data breaches promptly.</p>
                    <p><strong>Response Procedures:</strong> We have established incident response procedures to contain, assess, and resolve security breaches effectively.</p>
                    <p><strong>Regulatory Notification:</strong> We will notify relevant authorities within 72 hours of becoming aware of a breach that poses risks to individual rights and freedoms.</p>
                    <p><strong>User Notification:</strong> Affected users will be notified without undue delay if a breach is likely to result in high risk to their rights and freedoms.</p>
                    <p><strong>Documentation:</strong> All security incidents are documented with details of the breach, impact assessment, and remediation actions taken.</p>
                    <p><strong>Prevention Measures:</strong> We continuously improve security measures based on incident learnings and emerging threats.</p>
                  </div>
                </section>

                {/* 13. Contact for Privacy Concerns */}
                <section id="contact-for-privacy-concerns" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Mail className="w-6 h-6 text-blue-600" />
                    13. Contact for Privacy Concerns
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p>If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:</p>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <p><strong>Company:</strong> PDF Genius</p>
                      <p><strong>Service:</strong> PDF Genius</p>
                      <p><strong>Phone:</strong> +447429919748</p>
                      <p><strong>Location:</strong> London, United Kingdom</p>
                      <p><strong>Privacy Inquiries:</strong> Please contact us through our website contact form</p>
                    </div>
                    <p><strong>Response Time:</strong> We aim to respond to privacy inquiries within 30 days of receipt.</p>
                    <p><strong>Regulatory Contact:</strong> You also have the right to contact the Information Commissioner's Office (ICO) in the UK regarding privacy concerns.</p>
                  </div>
                </section>

                {/* 14. Changes to Privacy Policy */}
                <section id="changes-to-privacy-policy" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Edit className="w-6 h-6 text-blue-600" />
                    14. Changes to Privacy Policy
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>Policy Updates:</strong> We may update this Privacy Policy to reflect changes in our practices, legal requirements, or service features.</p>
                    <p><strong>Notification Methods:</strong> Significant changes will be communicated through email notifications to registered users and prominent notices on our website.</p>
                    <p><strong>Advance Notice:</strong> Material changes will be announced at least 30 days before taking effect to allow you to review and understand the changes.</p>
                    <p><strong>Continued Use:</strong> Your continued use of our services after policy changes take effect constitutes acceptance of the updated Privacy Policy.</p>
                    <p><strong>Objection Rights:</strong> If you disagree with policy changes, you may close your account before the changes take effect.</p>
                    <p><strong>Version Control:</strong> We maintain version history of policy changes with effective dates for transparency.</p>
                  </div>
                </section>

                {/* 15. Effective Date */}
                <section id="effective-date" className="scroll-mt-24">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                    <Calendar className="w-6 h-6 text-blue-600" />
                    15. Effective Date
                  </h2>
                  <div className="text-gray-700 leading-relaxed space-y-3">
                    <p><strong>Current Version:</strong> This Privacy Policy is effective as of June 25, 2026, and applies to all information collected on or after this date.</p>
                    <p><strong>Previous Versions:</strong> This policy supersedes all previous versions of our privacy statements and policies.</p>
                    <p><strong>Retroactive Application:</strong> Changes to this policy apply only to information collected after the effective date, unless otherwise specified.</p>
                    <p><strong>Regular Reviews:</strong> We review and update this policy regularly to ensure it remains current with legal requirements and best practices.</p>
                    <p><strong>Contact for Clarification:</strong> If you have questions about when specific provisions became effective, please contact us for clarification.</p>
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
