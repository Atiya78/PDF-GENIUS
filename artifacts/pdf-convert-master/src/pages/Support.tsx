import { usePublicSeo } from "@/lib/usePublicSeo";
import React, { useState, useMemo } from "react";
import { siteStats } from "@/config/siteStats";
import { Search, Mail, Phone, CheckCircle, BookOpen, Settings, CreditCard, Code, FileText, Wrench, Clock, Target, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DocumentSearch, SearchableSection } from "@/components/DocumentSearch";
import { useDocumentSearch } from "@/hooks/useDocumentSearch";

export const Support = (): JSX.Element => {
  usePublicSeo("/support");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [highlightedSection, setHighlightedSection] = useState<string | null>(null);

  // Knowledge base categories
  const knowledgeBaseCategories = [
    {
      title: "Getting Started",
      description: "Basic setup and first steps",
      icon: BookOpen,
      color: "bg-blue-500",
      articles: 12,
      id: "getting-started"
    },
    {
      title: "Troubleshooting",
      description: "Common issues and solutions",
      icon: Wrench,
      color: "bg-blue-500",
      articles: 18,
      id: "troubleshooting"
    },
    {
      title: "Account & Billing",
      description: "Manage your account and payments",
      icon: CreditCard,
      color: "bg-blue-500",
      articles: 8,
      id: "billing"
    },
    {
      title: "API Documentation",
      description: "Developer resources and guides",
      icon: Code,
      color: "bg-blue-500",
      articles: 15,
      id: "api"
    },
    {
      title: "File Conversion",
      description: "Converting between formats",
      icon: FileText,
      color: "bg-blue-500",
      articles: 22,
      id: "conversion"
    },
    {
      title: "Advanced Features",
      description: "Pro tips and advanced usage",
      icon: Settings,
      color: "bg-blue-500",
      articles: 9,
      id: "advanced"
    }
  ];

  // Getting started topics
  const gettingStartedTopics = [
    "How to convert your first PDF",
    "Understanding file formats",
    "Creating your account",
    "Navigating the interface",
    "Setting up preferences",
    "Managing your files",
    "Understanding conversion limits",
    "Using batch conversion"
  ];

  // Help options
  const helpOptions = [
    {
      title: "Email Support",
      description: "Send us detailed questions via email",
      icon: Mail,
      color: "bg-blue-500",
      action: "Send Email",
      availability: "< 2h response"
    },
    {
      title: "Phone Support",
      description: "Speak directly with our experts",
      icon: Phone,
      color: "bg-blue-500",
      action: "Call Now",
      availability: "+447429919748"
    },
  ];

  // Support statistics
  const supportStats = siteStats
    .filter((stat) => ["support-response", "satisfaction", "resolution", "tutorial-count"].includes(stat.id))
    .map((stat) => ({
      title: stat.label, verified: stat.verified, value: stat.value,
      description: stat.label, icon: BookOpen, color: "text-blue-600",
    }));


  // Popular help topics
  const popularTopics = [
    "How to convert PDF to Word",
    "Troubleshooting upload issues",
    "Account verification process",
    "API rate limits",
    "File size limitations"
  ];

  // Create searchable sections data
  const searchableSections: SearchableSection[] = useMemo(() => [
    {
      id: "getting-started",
      title: "Getting Started",
      content: "Basic setup and first steps. How to convert your first PDF. Understanding file formats. Creating your account. Navigating the interface. Setting up preferences. Managing your files. Understanding conversion limits. Using batch conversion. Step-by-step tutorials for new users.",
      category: "Getting Started"
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      content: "Common issues and solutions. File upload problems. Conversion errors. Login issues. Payment failures. Performance problems. Browser compatibility. Error codes. Network connectivity. File format issues. Quality problems. Timeout errors.",
      category: "Troubleshooting"
    },
    {
      id: "account-billing",
      title: "Account & Billing",
      content: "Manage your account and payments. Subscription plans. Payment methods. Billing history. Account settings. Profile management. Password reset. Email verification. Plan upgrades. Cancellation process. Refund policy. Invoice downloads.",
      category: "Account"
    },
    {
      id: "api-documentation",
      title: "API Documentation",
      content: "Developer resources and guides. API endpoints. Authentication methods. Rate limits. Error handling. Code examples. SDKs and libraries. Webhooks. API keys. Request formats. Response formats. Testing tools.",
      category: "API"
    },
    {
      id: "file-conversion",
      title: "File Conversion",
      content: "Converting between formats. PDF to Word conversion. PDF to Excel conversion. PDF to PowerPoint. Image to PDF. Word to PDF. Excel to PDF. Batch conversion. File compression. Quality settings. Format limitations.",
      category: "Conversion"
    },
    {
      id: "advanced-features",
      title: "Advanced Features",
      content: "Pro tips and advanced usage. Batch processing. OCR text recognition. Password protection. Digital signatures. Form filling. Page manipulation. Bookmarks and annotations. Custom workflows. Integration options.",
      category: "Advanced"
    },
    {
      id: "video-tutorials",
      title: "Video Tutorials",
      content: "Watch step-by-step video guides. Getting started videos. Advanced technique tutorials. Feature demonstrations. Best practices. Common workflows. Tips and tricks. Video library access.",
      category: "Tutorials"
    },
    {
      id: "system-status",
      title: "System Status",
      content: "Service status information. Maintenance schedules. Known issues. Status updates. Service interruptions.",
      category: "Status"
    }
  ], []);

  // Search functionality
  const {
    handleSearchChange,
    handleResultClick,
    clearSearch
  } = useDocumentSearch({
    sections: searchableSections,
    onSectionHighlight: setHighlightedSection,
    onNavigationFilter: (sectionIds) => {
      // Filter categories based on search results
      if (sectionIds.length > 0) {
        setSelectedCategory("search-results");
      } else {
        setSelectedCategory("all");
      }
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section with Purple Gradient */}
      <section className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 py-20 overflow-hidden">
        <div className={"absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.1\"%3E%3Ccircle cx=\"30\" cy=\"30\" r=\"1\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"}></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-white mb-6">
            How Can We Help You?
          </h1>
          <p className="text-xl text-blue-100 mb-12 max-w-3xl mx-auto">
            Get help with PDF Genius services with comprehensive support for all your PDF conversion needs
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                type="text"
                placeholder="Search for help topics..."
                className="pl-12 pr-4 py-4 text-lg bg-white/95 border-0 shadow-lg rounded-xl focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>

          {/* Popular Topics */}
          <div className="flex flex-wrap justify-center gap-3">
            {popularTopics.map((topic, index) => (
              <Button
                key={index}
                variant="outline"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20 rounded-full"
              >
                {topic}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* File Conversion Section */}
      <section id="file-conversion" className={`py-16 bg-blue-50 transition-all duration-300 ${
        highlightedSection === "file-conversion" ? "ring-4 ring-blue-500 ring-opacity-50 bg-blue-100" : ""
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">File Conversion Guide</h2>
            <p className="text-lg text-gray-600">Learn how to convert between different file formats with ease</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">PDF to Word</h3>
              <p className="text-gray-600 mb-4">Convert PDF documents to editable Word files while preserving formatting and layout.</p>
              <Button variant="outline" size="sm">Learn More</Button>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">PDF to Excel</h3>
              <p className="text-gray-600 mb-4">Extract tables and data from PDFs into Excel spreadsheets for analysis.</p>
              <Button variant="outline" size="sm">Learn More</Button>
            </div>
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Batch Conversion</h3>
              <p className="text-gray-600 mb-4">Process multiple files simultaneously to save time and improve efficiency.</p>
              <Button variant="outline" size="sm">Learn More</Button>
            </div>
          </div>
        </div>
      </section>

      {/* Knowledge Base Section */}
      <section id="troubleshooting" className={`py-16 bg-white transition-all duration-300 ${
        highlightedSection === "troubleshooting" ? "ring-4 ring-blue-500 ring-opacity-50 bg-blue-50" : ""
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Knowledge Base</h2>
            <p className="text-lg text-gray-600">Find answers to common questions and learn how to use our features</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {knowledgeBaseCategories.map((category, index) => (
              <Card key={index} className="cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg ${category.color} flex items-center justify-center text-white`}>
                      <category.icon className="w-6 h-6" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <div>
                  <CardDescription className="text-gray-600">
                    {category.description}
                  </CardDescription>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Getting Started Section */}
      <section id="getting-started" className={`py-16 bg-gray-50 transition-all duration-300 ${
        highlightedSection === "getting-started" ? "ring-4 ring-blue-500 ring-opacity-50 bg-blue-100" : ""
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Getting Started</h2>
              <p className="text-lg text-gray-600 mb-8">
                New to PDF Genius? Start here with our most popular getting started topics.
              </p>
              <div className="space-y-4">
                {gettingStartedTopics.map((topic, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/60 transition-colors cursor-pointer">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 font-medium">{topic}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl p-8 shadow-lg">
              <h3 className="text-xl font-semibold mb-2">Need a hand?</h3>
              <p className="text-gray-600">Pick a tool from the Tools page, add your file and follow the on-screen steps. For anything else, contact us through this page.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Multiple Ways to Get Help */}
      <section id="api-documentation" className={`py-16 bg-white transition-all duration-300 ${
        highlightedSection === "api-documentation" ? "ring-4 ring-blue-500 ring-opacity-50 bg-blue-50" : ""
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Multiple Ways to Get Help</h2>
            <p className="text-lg text-gray-600">Choose the support option that works best for you</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {helpOptions.map((option, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className={`w-16 h-16 rounded-full ${option.color} flex items-center justify-center text-white mx-auto mb-4`}>
                    <option.icon className="w-8 h-8" />
                  </div>
                  <CardTitle className="text-lg">{option.title}</CardTitle>
                  <CardDescription>{option.description}</CardDescription>
                </CardHeader>
                <div className="pt-0">
                  <Button className="w-full mb-2">{option.action}</Button>
                  <p className="text-sm text-gray-500">{option.availability}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section id="account-billing" className={`py-16 bg-gray-900 text-white transition-all duration-300 ${
        highlightedSection === "account-billing" ? "ring-4 ring-blue-500 ring-opacity-50" : ""
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Support Performance</h2>
            <p className="text-lg text-gray-300">Our commitment to excellent customer service</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {supportStats.filter((st) => st.verified).map((stat, index) => (
              <Card key={index} className="bg-gray-800 border-gray-700 text-center">
                <CardHeader className="pb-2">
                  <stat.icon className={`w-8 h-8 mx-auto mb-2 ${stat.color}`} />
                  <CardTitle className="text-3xl font-bold text-white">{stat.value}</CardTitle>
                </CardHeader>
                <div>
                  <p className="text-gray-300 font-medium">{stat.title}</p>
                  <p className="text-sm text-gray-400">{stat.description}</p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>


    </div>
  );
};
