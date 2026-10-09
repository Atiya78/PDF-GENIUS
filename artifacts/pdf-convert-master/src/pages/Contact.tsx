import React, { useState } from "react";
import { contactFaqs } from "@/config/contactFaqs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Phone, Mail, MessageSquare, HeadphonesIcon, Clock, Shield, Cloud, Lock, CheckCircle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSeo } from "@/lib/useSeo";
import { SUPPORT_REPLY_COPY, FILE_RETENTION_COPY } from "@/config/siteCopy";

export const Contact = (): JSX.Element => {
  useSeo({
    title: "Contact & Support",
    description:
      "Get in touch with the PDF Genius team. Questions, feedback or support for our free online PDF and image tools — we're here to help.",
    canonicalPath: "/contact",
  });
  const [selectedPriority, setSelectedPriority] = useState("medium");
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(0); // First FAQ expanded by default
  const [selectedCategory, setSelectedCategory] = useState("technical");
  const { toast } = useToast();

  // Enhanced utility function to copy text with beautiful, contact-specific notifications
  const copyToClipboard = async (text: string, label: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback for non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      // Get contact-specific icon and styling
      const getContactIcon = () => {
        if (label.includes('Phone') || label.includes('WhatsApp')) return <Phone className="w-4 h-4 text-blue-600" />;
        if (label.includes('Email')) return <Mail className="w-4 h-4 text-blue-600" />;
        return <Copy className="w-4 h-4 text-blue-600" />;
      };

      const getContactStyling = () => {
        if (label.includes('Phone') || label.includes('WhatsApp')) return "border-blue-200 bg-gradient-to-r from-blue-50 to-blue-50";
        if (label.includes('Email')) return "border-blue-200 bg-gradient-to-r from-blue-50 to-blue-50";
        return "border-blue-200 bg-gradient-to-r from-blue-50 to-blue-50";
      };

      // Show beautiful success toast with contact-specific styling
      toast({
        title: (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm">
              {getContactIcon()}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{label} Copied!</div>
              <div className="text-xs text-gray-600">Ready to paste anywhere</div>
            </div>
          </div>
        ),
        description: (
          <div className="flex items-center gap-2 mt-2 p-2 bg-white/60 rounded-lg border">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <code className="text-xs bg-gray-900 text-blue-400 px-2 py-1 rounded font-mono tracking-wider">
              {text}
            </code>
          </div>
        ),
        className: `${getContactStyling()} shadow-lg border-2`,
        duration: 4000,
      });

    } catch (error) {
      // Final fallback with the same beautiful styling
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);

      // Show the same beautiful toast for fallback
      const getContactIcon = () => {
        if (label.includes('Phone') || label.includes('WhatsApp')) return <Phone className="w-4 h-4 text-blue-600" />;
        if (label.includes('Email')) return <Mail className="w-4 h-4 text-blue-600" />;
        return <Copy className="w-4 h-4 text-blue-600" />;
      };

      const getContactStyling = () => {
        if (label.includes('Phone') || label.includes('WhatsApp')) return "border-blue-200 bg-gradient-to-r from-blue-50 to-blue-50";
        if (label.includes('Email')) return "border-blue-200 bg-gradient-to-r from-blue-50 to-blue-50";
        return "border-blue-200 bg-gradient-to-r from-blue-50 to-blue-50";
      };

      toast({
        title: (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white shadow-sm">
              {getContactIcon()}
            </div>
            <div>
              <div className="font-semibold text-gray-900">{label} Copied!</div>
              <div className="text-xs text-gray-600">Ready to paste anywhere</div>
            </div>
          </div>
        ),
        description: (
          <div className="flex items-center gap-2 mt-2 p-2 bg-white/60 rounded-lg border">
            <CheckCircle className="w-3 h-3 text-green-500" />
            <code className="text-xs bg-gray-900 text-blue-400 px-2 py-1 rounded font-mono tracking-wider">
              {text}
            </code>
          </div>
        ),
        className: `${getContactStyling()} shadow-lg border-2`,
        duration: 4000,
      });
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#fff1f0] via-[#fff1f0] to-[#fff1f0]">


      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#b9211c] via-[#f7433d] to-[#8f1a16] py-24">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h1 className="text-5xl font-bold mb-6">Get Expert Help & Support</h1>
              <p className="text-xl text-blue-100 mb-8">
                Our dedicated team is here to assist you with any questions, technical issues, or business inquiries. Choose how you'd like to connect with us.
              </p>

               <div className="bg-white/10 rounded-lg p-4 mb-8">
                 <p>{SUPPORT_REPLY_COPY}</p>
               </div>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setSelectedCategory("technical")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 transition-all ${
                    selectedCategory === "technical"
                      ? "bg-white text-blue-600"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  <HeadphonesIcon className="w-4 h-4" />
                  Technical Support
                </button>
                <button
                  onClick={() => setSelectedCategory("business")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    selectedCategory === "business"
                      ? "bg-white text-blue-600"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  Business Inquiry
                </button>
                <button
                  onClick={() => setSelectedCategory("feedback")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    selectedCategory === "feedback"
                      ? "bg-white text-blue-600"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  Feedback
                </button>
                <button
                  onClick={() => setSelectedCategory("partnership")}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                    selectedCategory === "partnership"
                      ? "bg-white text-blue-600"
                      : "bg-white/20 text-white hover:bg-white/30"
                  }`}
                >
                  Partnership
                </button>
              </div>

              {selectedCategory === "technical" && (
                <div className="transition-all duration-300">
                  <h3 className="text-white text-lg font-semibold mb-3">Technical Support</h3>
                  <p className="text-gray-200 text-sm mb-3">Having trouble with our tools? Get instant help from our technical team.</p>
                  <div className="flex items-center text-blue-200 text-sm">
                    <Clock className="w-4 h-4 mr-2" />
                    {SUPPORT_REPLY_COPY}
                  </div>
                </div>
              )}

              {selectedCategory === "business" && (
                <div className="transition-all duration-300">
                  <h3 className="text-white text-lg font-semibold mb-3">Business Inquiry</h3>
                  <p className="text-gray-200 text-sm mb-3">Explore enterprise solutions, custom integrations, and volume pricing options for your organization.</p>
                  <div className="flex items-center text-blue-200 text-sm">
                    <Clock className="w-4 h-4 mr-2" />
                    {SUPPORT_REPLY_COPY}
                  </div>
                </div>
              )}

              {selectedCategory === "feedback" && (
                <div className="transition-all duration-300">
                  <h3 className="text-white text-lg font-semibold mb-3">Feedback</h3>
                  <p className="text-gray-200 text-sm mb-3">Share your experience, suggest improvements, or report issues to help us enhance our services.</p>
                  <div className="flex items-center text-blue-200 text-sm">
                    <Clock className="w-4 h-4 mr-2" />
                    {SUPPORT_REPLY_COPY}
                  </div>
                </div>
              )}

              {selectedCategory === "partnership" && (
                <div className="transition-all duration-300">
                  <h3 className="text-white text-lg font-semibold mb-3">Partnership</h3>
                  <p className="text-gray-200 text-sm mb-3">Join our partner network, explore collaboration opportunities, or discuss integration possibilities.</p>
                  <div className="flex items-center text-blue-200 text-sm">
                    <Clock className="w-4 h-4 mr-2" />
                    Email support@pdfgenius.app
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Contact Methods */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Preferred Contact Method</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              We offer multiple ways to reach our support team. Pick the method that works best for you.
            </p>
          </div>

          <div className="grid md:grid-cols-1 max-w-xl mx-auto gap-6">
            {/* Email Support */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full">
              <div className="bg-blue-600 bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">Email Support</h3>
                <p className="text-blue-100 text-sm">Send us an email for detailed inquiries</p>
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <div className="mb-4 flex-grow">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Contact Info:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 text-xs hover:bg-blue-50 transition-colors"
                      onClick={() => copyToClipboard('support@pdfgenius.app', 'Email Address')}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-sm font-medium">support@pdfgenius.app</p>
                </div>
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <Clock className="w-4 h-4 mr-2" />
                   {SUPPORT_REPLY_COPY}
                </div>
                <Button variant="blue" className="w-full mt-auto" onClick={() => window.open("mailto:support@pdfgenius.app", "_self", "noopener")}>
                  Send Email
                </Button>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* Contact Form */}
      <section id="contact-form" className="py-20 bg-gradient-to-br from-gray-50 to-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Send Us a Message</h2>
            <p className="text-lg text-gray-600">
              Fill out the form below and we'll get back to you as soon as possible
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <form className="space-y-6" onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const subject = `[${selectedCategory} / ${selectedPriority}] ${f.get("subject") ?? ""}`;
              const body = `${f.get("message") ?? ""}\n\nFrom: ${f.get("name") ?? ""} <${f.get("email") ?? ""}>`;
              window.location.href = `mailto:support@pdfgenius.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
              toast({ title: "Opening your email app", description: "Send the drafted message to reach support." });
            }}>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700">Full Name *</Label>
                  <Input id="fullName" name="name" placeholder="Enter your full name" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address *</Label>
                  <Input id="email" name="email" type="email" required placeholder="your@email.com" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">Phone Number</Label>
                  <Input id="phone" placeholder="+1 (555) 123-4567" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="company" className="text-sm font-semibold text-gray-700">Company/Organization</Label>
                  <Input id="company" placeholder="Your company name" className="mt-2" />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="category" className="text-sm font-semibold text-gray-700">Category *</Label>
                  <Select defaultValue="technical">
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="technical">Technical Support</SelectItem>
                      <SelectItem value="business">Business Inquiry</SelectItem>
                      <SelectItem value="feedback">Feedback</SelectItem>
                      <SelectItem value="partnership">Partnership</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Priority Level</Label>
                  <div className="flex gap-2 mt-2">
                    {["low", "medium", "high", "urgent"].map((priority) => (
                      <button
                        key={priority}
                        type="button"
                        onClick={() => setSelectedPriority(priority)}
                        className={`px-3 py-1 rounded-full text-sm capitalize ${
                          selectedPriority === priority
                            ? priority === "low"
                              ? "bg-green-100 text-green-800"
                              : priority === "medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : priority === "high"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-red-100 text-red-800"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {priority}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="subject" className="text-sm font-semibold text-gray-700">Subject *</Label>
                <Input id="subject" name="subject" required placeholder="Brief description of your inquiry" className="mt-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="message" className="text-sm font-semibold text-gray-700">Message *</Label>
                  <span className="text-sm text-gray-500">Max 500 characters</span>
                </div>
                <Textarea
                  id="message"
                  name="message"
                  required
                  maxLength={500}
                  placeholder="Please provide detailed information about your inquiry..."
                  className="min-h-[120px]"
                />
              </div>

              <div>
                <Label className="text-sm font-semibold text-gray-700">
                  Attachments <span className="text-gray-500">(Optional - Max 5MB per file)</span>
                </Label>
                <div className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <div className="w-8 h-8 mx-auto mb-2 text-gray-400">
                    <svg fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                  </div>
                  <p className="text-gray-600">Click to upload files or drag and drop</p>
                  <p className="text-sm text-gray-500 mt-1">Supported formats: PDF, DOC, DOCX, TXT, JPG, PNG</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6">
                <div className="flex items-center text-sm text-gray-600">
                  <Shield className="w-4 h-4 mr-2 text-blue-600" />
                  Sending opens your email app with the message drafted. Attach files there if needed.
                </div>
                <Button type="submit" className="px-8">
                  Send Message
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-gray-600">
              Quick answers to common questions about our PDF tools and services
            </p>
          </div>

          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-lg">
              <button
                className="w-full px-6 py-4 text-left flex justify-between items-center"
                onClick={() => setExpandedFAQ(expandedFAQ === 0 ? null : 0)}
              >
                <span className="text-lg font-semibold text-gray-900">What file formats do you support for conversion?</span>
                <svg
                  className={`w-5 h-5 text-blue-600 transition-transform duration-200 ${
                    expandedFAQ === 0 ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedFAQ === 0 && (
                <div className="px-6 pb-4">
                  <div className="border-l-4 border-blue-600 pl-4">
                    <p className="text-gray-700">
                      We support a wide range of file formats including PDF, Word (DOC/DOCX), Excel (XLS/XLSX), PowerPoint (PPT/PPTX), JPG, PNG, HTML, and many more. Our tools can handle most common document and image formats.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {contactFaqs.slice(1).map((faq, index) => {
              const faqIndex = index + 1; // +1 because first FAQ is index 0
              return (
                <div key={index} className="bg-white rounded-xl shadow-lg">
                  <button
                    className="w-full px-6 py-4 text-left flex justify-between items-center"
                    onClick={() => setExpandedFAQ(expandedFAQ === faqIndex ? null : faqIndex)}
                  >
                    <span className="text-lg font-semibold text-gray-900">{faq.question}</span>
                    <svg
                      className={`w-5 h-5 text-blue-600 transition-transform duration-200 ${
                        expandedFAQ === faqIndex ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                    <div className="px-6 pb-4" hidden={expandedFAQ !== faqIndex}>
                      <div className="border-l-4 border-blue-600 pl-4">
                        <p className="text-gray-700">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
            <h3 className="text-xl font-bold text-blue-800 mb-2">Still Have Questions?</h3>
            <p className="text-blue-700 mb-4">Can't find the answer you're looking for? Our support team is here to help!</p>
            <Button
              className=""
              onClick={() => {
                const contactForm = document.getElementById('contact-form');
                if (contactForm) {
                  contactForm.scrollIntoView({ behavior: 'smooth' });
                }
              }}
            >
              Contact Support
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Reach us directly</h2>
          <p className="text-gray-600 mb-2">General: info@pdfgenius.app</p>
          <p className="text-gray-600 mb-2">Support: support@pdfgenius.app</p>
          <p className="text-gray-600">Based in London, United Kingdom.</p>
        </div>
      </section>

    </div>
  );
};
