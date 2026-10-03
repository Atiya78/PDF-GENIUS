import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { Phone, Mail, MessageSquare, HeadphonesIcon, MapPin, Clock, Car, Train, Shield, Cloud, Lock, CheckCircle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useSeo } from "@/lib/useSeo";

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

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-200 mb-1">24/7</div>
                  <div className="text-sm text-gray-200">Support Available</div>
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
                  <div className="text-3xl font-bold text-blue-200 mb-1">&lt;1hr</div>
                  <div className="text-sm text-gray-200">Response Time</div>
                </div>
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
                    Average response: 15 minutes
                  </div>
                </div>
              )}

              {selectedCategory === "business" && (
                <div className="transition-all duration-300">
                  <h3 className="text-white text-lg font-semibold mb-3">Business Inquiry</h3>
                  <p className="text-gray-200 text-sm mb-3">Explore enterprise solutions, custom integrations, and volume pricing options for your organization.</p>
                  <div className="flex items-center text-blue-200 text-sm">
                    <Clock className="w-4 h-4 mr-2" />
                    Response within: 2 hours
                  </div>
                </div>
              )}

              {selectedCategory === "feedback" && (
                <div className="transition-all duration-300">
                  <h3 className="text-white text-lg font-semibold mb-3">Feedback</h3>
                  <p className="text-gray-200 text-sm mb-3">Share your experience, suggest improvements, or report issues to help us enhance our services.</p>
                  <div className="flex items-center text-blue-200 text-sm">
                    <Clock className="w-4 h-4 mr-2" />
                    Response within: 24 hours
                  </div>
                </div>
              )}

              {selectedCategory === "partnership" && (
                <div className="transition-all duration-300">
                  <h3 className="text-white text-lg font-semibold mb-3">Partnership</h3>
                  <p className="text-gray-200 text-sm mb-3">Join our partner network, explore collaboration opportunities, or discuss integration possibilities.</p>
                  <div className="flex items-center text-blue-200 text-sm">
                    <Clock className="w-4 h-4 mr-2" />
                    Response within: 3 business days
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

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {/* Phone Support */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full">
              <div className="bg-blue-600 bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <Phone className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">Phone Support</h3>
                <p className="text-blue-100 text-sm">Call us directly for immediate assistance</p>
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <div className="mb-4 flex-grow">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Contact Info:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 text-xs hover:bg-blue-50 transition-colors"
                      onClick={() => copyToClipboard('+447429919748', 'Phone Number')}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-sm font-medium">+447429919748</p>
                </div>
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <Clock className="w-4 h-4 mr-2" />
                  24/7 Available
                </div>
                <Button variant="blue" className="w-full mt-auto">
                  Call Now
                </Button>
              </div>
            </div>

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
                  Response within 1 hour
                </div>
                <Button variant="blue" className="w-full mt-auto">
                  Send Email
                </Button>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col h-full">
              <div className="bg-blue-600 bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center mb-4">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">WhatsApp</h3>
                <p className="text-blue-100 text-sm">Quick support via WhatsApp messaging</p>
              </div>
              <div className="p-6 flex-grow flex flex-col">
                <div className="mb-4 flex-grow">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600">Contact Info:</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-600 text-xs hover:bg-blue-50 transition-colors"
                      onClick={() => copyToClipboard('+447429919748', 'WhatsApp Number')}
                    >
                      Copy
                    </Button>
                  </div>
                  <p className="text-sm font-medium">+447429919748</p>
                </div>
                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <Clock className="w-4 h-4 mr-2" />
                  Quick response
                </div>
                <Button variant="blue" className="w-full mt-auto">
                  Message Us
                </Button>
              </div>
            </div>
          </div>

          {/* Social Media */}
          <div className="text-center mb-16">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Follow Us on Social Media</h3>
            <div className="flex justify-center space-x-4">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.174-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.402.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.357-.629-2.746-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24.009 12.017 24c6.624 0 11.99-5.367 11.99-11.987C24.007 5.367 18.641.001 12.017.001z"/></svg>
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
            <form className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700">Full Name *</Label>
                  <Input id="fullName" placeholder="Enter your full name" className="mt-2" />
                </div>
                <div>
                  <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email Address *</Label>
                  <Input id="email" type="email" placeholder="your@email.com" className="mt-2" />
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
                <Input id="subject" placeholder="Brief description of your inquiry" className="mt-2" />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <Label htmlFor="message" className="text-sm font-semibold text-gray-700">Message *</Label>
                  <span className="text-sm text-gray-500">(0/500)</span>
                </div>
                <Textarea
                  id="message"
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
                  Your information is secure and confidential
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

            {[
              {
                question: "Is there a file size limit for uploads?",
                answer: "Yes, we have different file size limits based on your plan. Free users can upload files up to 10MB, Basic plan users up to 50MB, Pro plan users up to 200MB, and Enterprise users up to 1GB per file. For larger files, please contact our support team for assistance."
              },
              {
                question: "How secure is my data during conversion?",
                answer: "Your data security is our top priority. We use industry-standard 256-bit SSL encryption for all file transfers. All uploaded files are automatically deleted from our servers within 24 hours after conversion. We never store, share, or access your personal documents."
              },
              {
                question: "Can I use your tools offline?",
                answer: "Our PDF tools are web-based and require an internet connection to function. However, we're developing a desktop application that will allow offline conversions for Pro and Enterprise users. This feature will be available in Q2 2024."
              },
              {
                question: "Do you offer API access for developers?",
                answer: "Yes! We provide robust REST API access for Pro and Enterprise plan users. Our API supports all conversion tools, batch processing, and webhooks. Comprehensive documentation, SDKs for popular languages, and 24/7 developer support are included."
              },
              {
                question: "What payment methods do you accept?",
                answer: "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, Apple Pay, Google Pay, and bank transfers for Enterprise accounts. All payments are processed securely through our PCI-compliant payment partners."
              },
              {
                question: "Can I cancel my subscription anytime?",
                answer: "Absolutely! You can cancel your subscription at any time from your account settings. There are no cancellation fees or long-term commitments. Your subscription will remain active until the end of your current billing period."
              },
              {
                question: "Do you provide technical support?",
                answer: "Yes, we offer comprehensive technical support. Free users get community support, Basic users get email support within 24 hours, Pro users get priority email and chat support within 1 hour, and Enterprise users get 24/7 dedicated support with phone access."
              },
              {
                question: "Are there any usage limits?",
                answer: "Usage limits vary by plan. Basic plan includes 100 conversions/month, Pro plan includes 10,000 conversions/month, and Enterprise plan offers unlimited conversions. API calls, storage, and processing speed also increase with higher tier plans."
              },
              {
                question: "How can I get a refund?",
                answer: "We offer a 30-day money-back guarantee for all paid plans. If you're not satisfied with our service, contact our support team within 30 days of your purchase for a full refund. Refunds are processed within 5-7 business days to your original payment method."
              }
            ].map((faq, index) => {
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
                  {expandedFAQ === faqIndex && (
                    <div className="px-6 pb-4">
                      <div className="border-l-4 border-blue-600 pl-4">
                        <p className="text-gray-700">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  )}
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

      {/* Location & Office Hours */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Location & Office Hours</h2>
            <p className="text-lg text-gray-600">
              Find us in London, UK with global support coverage
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Office Information</h3>
              
              <div className="space-y-6">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                      <MapPin className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Headquarters</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                          <span>PDF Genius</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                          <span>London, United Kingdom</span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-blue-500" />
                          <span>+447429919748</span>
                        </div>
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-blue-500" />
                          <span>info@pdfgenius.app</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                      <HeadphonesIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">Technical Support</h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                          <span>PDF Genius</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-2 text-blue-500" />
                          <span>Technical Operations Center</span>
                        </div>
                        <div className="flex items-center">
                          <Phone className="w-4 h-4 mr-2 text-blue-500" />
                          <span>+447429919748</span>
                        </div>
                        <div className="flex items-center">
                          <Mail className="w-4 h-4 mr-2 text-blue-500" />
                          <span>support@pdfgenius.app</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                  <h4 className="text-lg font-semibold text-blue-900 mb-4">Office Hours</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-blue-800">Monday - Friday</span>
                      <span className="text-blue-600">9:00 AM - 6:00 PM GMT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-800">Saturday</span>
                      <span className="text-blue-600">10:00 AM - 4:00 PM GMT</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-800">Sunday</span>
                      <span className="text-blue-600">Emergency Support Only</span>
                    </div>
                  </div>
                  <div className="border-t border-blue-200 mt-4 pt-4">
                    <div className="flex items-center text-sm text-blue-800">
                      <Phone className="w-4 h-4 mr-2 text-blue-600" />
                      24/7 Emergency Support: +447429919748
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-6">Find Us on Map</h3>
              
              <div className="bg-gray-200 rounded-xl h-96 mb-6 flex items-center justify-center">
                <p className="text-gray-600">Interactive Map Placeholder</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Car className="w-4 h-4 mr-2 text-blue-600" />
                    <span className="font-semibold text-blue-800">Parking</span>
                  </div>
                  <p className="text-sm text-blue-700">Free parking available for visitors</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <Train className="w-4 h-4 mr-2 text-blue-600" />
                    <span className="font-semibold text-blue-800">Transit</span>
                  </div>
                  <p className="text-sm text-blue-700">Central London location, easily accessible</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>


    </div>
  );
};
