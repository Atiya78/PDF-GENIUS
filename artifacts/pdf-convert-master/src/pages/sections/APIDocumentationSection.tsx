import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Code2,
  Zap,
  Shield,
  Globe,
  ArrowRight,
  BookOpen,
  Copy,
  Check
} from "lucide-react";
import { useLocation } from "wouter";
import { AnimatedBackground } from "@/components/ui/animated-background";

export const APIDocumentationSection = (): JSX.Element => {
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);
  // Public API lives on the custom domain, so the example always shows it.
  const apiDomain = "https://pdfgenius.app";

  const curlExample = `curl -X POST "${apiDomain}/api/v1/word_to_pdf" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -F "file=@document.docx" \\
  -o converted.pdf`;

  const copyCurl = async () => {
    try {
      await navigator.clipboard.writeText(curlExample);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — leave the text selectable.
    }
  };

  const apiFeatures = [
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Fast Conversions",
      description: "Synchronous processing returns your file in the response"
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: "Secure by Design",
      description: "API-key auth over HTTPS"
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: "20+ Tools, One API",
      description: "PDF & image conversion endpoints"
    }
  ];

  return (
    <section className="relative bg-white py-16 sm:py-20 lg:py-24 overflow-hidden">
      {/* Animated background */}
      <AnimatedBackground particleCount={22} />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <Badge className="mb-4 px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200">
            <Code2 className="w-4 h-4 mr-2" />
            Developer API
          </Badge>
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Powerful PDF API for Developers
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Integrate PDF and image conversion directly into your applications
            with a simple REST API.
          </p>
        </div>

        {/* API Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {apiFeatures.map((feature, index) => (
            <Card key={index} className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Code Example */}
        <div className="mb-16">
          <div className="text-center mb-8">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Simple Integration</h3>
            <p className="text-gray-600">Get started with just a few lines of code</p>
          </div>

          <Card className="bg-gray-50 border border-gray-200 shadow-sm max-w-3xl mx-auto">
            <CardContent className="p-4 sm:p-6">
              <div className="flex justify-end mb-3">
              <button
                type="button"
                onClick={copyCurl}
                aria-label="Copy curl example to clipboard"
                data-testid="button-copy-curl"
                className={`flex items-center gap-1.5 text-xs rounded-md border px-3 py-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  copied
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-white border-gray-200 text-gray-500 hover:text-gray-700"
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span aria-live="polite">{copied ? "Copied!" : "Copy"}</span>
              </button>
              </div>
              <pre className="text-sm text-gray-700 overflow-x-auto">
                <code>{curlExample}</code>
              </pre>
            </CardContent>
          </Card>
        </div>

        {/* Stats Section */}
        <div className="mb-16 pt-16 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">20+</div>
              <div className="text-gray-600">Conversion Tools</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">1,000</div>
              <div className="text-gray-600">Free Calls / Month</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">REST</div>
              <div className="text-gray-600">Simple HTTP API</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-900 mb-2">No Card</div>
              <div className="text-gray-600">Required to Start</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center">
          <div className="max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">
              Ready to integrate PDF processing into your app?
            </h3>
            <p className="text-gray-600 mb-8">
              Get started with our free tier - 1,000 API calls per month, no credit card required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                className="px-8 py-4"
                onClick={() => setLocation('/dashboard/api-setup')}
              >
                <Code2 className="w-5 h-5 mr-2" />
                Get API Key
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-8 py-4"
                onClick={() => setLocation('/docs')}
              >
                <BookOpen className="w-5 h-5 mr-2" />
                View Documentation
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
