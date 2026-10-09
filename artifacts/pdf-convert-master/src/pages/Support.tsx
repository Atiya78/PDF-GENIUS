import React from "react";
import { Link } from "wouter";
import { Mail, BookOpen, Wrench, CreditCard, Code, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SUPPORT_REPLY_COPY, FILE_RETENTION_COPY } from "@/config/siteCopy";
import { useSeo } from "@/lib/useSeo";

const topics = [
  { title: "Choose a tool", description: "Browse every PDF and image tool and open the one you need.", icon: BookOpen, href: "/tools", cta: "Open tools" },
  { title: "Conversion problems", description: "Check file type and size limits on the tool page, then contact support with the tool name and the message you saw.", icon: Wrench, href: "/contact", cta: "Contact support" },
  { title: "Plans and billing", description: "Compare plans, manage credits, and read the refund policy.", icon: CreditCard, href: "/pricing", cta: "See pricing" },
  { title: "API", description: "Endpoints, options and output formats for developers.", icon: Code, href: "/docs", cta: "Read the docs" },
  { title: "Features", description: "What each tool does and which ones run locally in your browser.", icon: FileText, href: "/features", cta: "View features" },
  { title: "Privacy and file safety", description: FILE_RETENTION_COPY, icon: Shield, href: "/data-safety", cta: "Data safety" },
];

export const Support = (): JSX.Element => {
  useSeo({
    title: "Support",
    description: "Get help with PDF Genius tools, plans and files. Email support@pdfgenius.app.",
    canonicalPath: "/support",
  });
  return (
    <div className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-br from-[#b9211c] via-[#f7433d] to-[#8f1a16] py-20">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">How can we help?</h1>
          <p className="text-lg text-white/90 mb-8">{SUPPORT_REPLY_COPY}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild variant="secondary" data-testid="button-support-email">
              <a href="mailto:support@pdfgenius.app"><Mail className="w-4 h-4 mr-2" />support@pdfgenius.app</a>
            </Button>
          </div>
        </div>
      </section>
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {topics.map((t) => (
            <Card key={t.title} className="flex flex-col">
              <CardHeader>
                <div className="w-11 h-11 rounded-lg bg-[#f7433d]/10 text-[#f7433d] flex items-center justify-center mb-3">
                  <t.icon className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg">{t.title}</CardTitle>
                <CardDescription>{t.description}</CardDescription>
              </CardHeader>
              <div className="px-6 pb-6 mt-auto">
                <Link href={t.href} className="text-sm font-medium text-[#c8312c] hover:underline" data-testid={`link-support-${t.href.slice(1)}`}>{t.cta}</Link>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Support;
