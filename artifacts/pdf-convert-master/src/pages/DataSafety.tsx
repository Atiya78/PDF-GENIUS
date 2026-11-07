import React from "react";
import "@/styles/marketing.css";
import { FILE_RETENTION_COPY, IMAGE_UPLOAD_RETENTION_COPY } from "@/config/siteCopy";
import {
  Shield,
  Lock,
  Trash2,
  CheckCircle2,
  Database,
  FileText,
  Image,
  CreditCard,
  User,
  Activity,
  Fingerprint,
} from "lucide-react";

type DataRow = {
  icon: React.ComponentType<{ className?: string }>;
  category: string;
  type: string;
  required: "Required" | "Optional";
  purposes: string[];
};

const collectedData: DataRow[] = [
  {
    icon: User,
    category: "Personal info",
    type: "Name",
    required: "Optional",
    purposes: ["App functionality", "Account management"],
  },
  {
    icon: User,
    category: "Personal info",
    type: "Email address",
    required: "Optional",
    purposes: ["App functionality", "Account management", "Developer communications"],
  },
  {
    icon: User,
    category: "Personal info",
    type: "User IDs",
    required: "Optional",
    purposes: ["App functionality", "Account management"],
  },
  {
    icon: CreditCard,
    category: "Financial info",
    type: "Purchase history",
    required: "Optional",
    purposes: ["App functionality", "Account management"],
  },
  {
    icon: FileText,
    category: "Files and docs",
    type: "Files and docs",
    required: "Required",
    purposes: ["App functionality"],
  },
  {
    icon: Image,
    category: "Photos and videos",
    type: "Photos",
    required: "Optional",
    purposes: ["App functionality"],
  },
  {
    icon: Activity,
    category: "App activity",
    type: "App interactions",
    required: "Required",
    purposes: ["App functionality", "Analytics"],
  },
  {
    icon: Fingerprint,
    category: "Device or other IDs",
    type: "Device or other IDs",
    required: "Required",
    purposes: ["Fraud prevention, security, and compliance", "Analytics"],
  },
];

const notCollected: string[] = [
  "Location (approximate or precise)",
  "Payment info, credit score (handled by the app store)",
  "Address, phone number, race, political or religious beliefs, sexual orientation",
  "Health and fitness",
  "Messages (emails, SMS, in-app)",
  "Audio (voice, music, sound recordings)",
  "Calendar and contacts",
  "Web browsing history",
  "Installed apps and in-app search history",
];

const practices = [
  {
    icon: Lock,
    title: "Encrypted in transit",
    desc: "All data is sent over a secure HTTPS/TLS connection.",
  },
  {
    icon: Trash2,
    title: "You can request deletion",
    desc: "Request account and data deletion any time via our contact page.",
  },
  {
    icon: Shield,
    title: "No data sold or shared",
    desc: "We never sell your data or share it with third parties for their own use. Trusted providers (the app stores and RevenueCat) only process purchases on our behalf.",
  },
];

export const DataSafety = (): JSX.Element => {
  return (
    <div className="mkt-root min-h-[100dvh]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#f7433d]/10 mb-5">
            <Shield className="w-7 h-7 text-[#f7433d]" />
          </div>
          <h1 className="mkt-display text-[2.2rem] sm:text-[2.9rem] mb-4">Data Safety</h1>
          <p className="max-w-2xl mx-auto text-lg text-[#57534e] leading-relaxed">
            A plain-language summary of the data PDF Genius collects, how it is used, and
            the protections in place. This mirrors the Data safety section shown on our
            Google Play store listing.
          </p>
          <p className="text-sm text-[#6b645c] mt-4">Last updated: June 25, 2026</p>
        </div>

        {/* Practices */}
        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          {practices.map((p) => (
            <div
              key={p.title}
              className="bg-[#fffdf9] border border-[#e7e0d5] rounded-xl p-6 shadow-sm"
            >
              <p.icon className="w-6 h-6 text-[#f7433d] mb-3" />
              <h3 className="font-semibold text-[#1c1917] mb-1">{p.title}</h3>
              <p className="text-sm text-[#57534e] leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Data collected */}
        <section className="border-t border-[#1c1917] p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-6 h-6 text-[#f7433d]" />
            <h2 className="font-['Poppins'] text-[1.45rem] font-semibold tracking-[-0.015em] text-[#1c1917]">Data this app collects</h2>
          </div>
          <p className="text-[#57534e] mb-6">
            Some tools process files locally; others upload files for processing.
            {" "}{FILE_RETENTION_COPY} {IMAGE_UPLOAD_RETENTION_COPY}
          </p>

          <div className="space-y-4">
            {collectedData.map((row) => (
              <div
                key={`${row.category}-${row.type}`}
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 border-b border-[#e7e0d5] pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3 sm:w-64 shrink-0">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#f1ece4] shrink-0">
                    <row.icon className="w-5 h-5 text-[#57534e]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1c1917] leading-tight">{row.type}</p>
                    <p className="text-xs text-[#6b645c]">{row.category}</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-wrap items-center gap-2">
                  {row.purposes.map((purpose) => (
                    <span
                      key={purpose}
                      className="inline-flex items-center text-xs font-medium text-[#3a3530] bg-[#f1ece4] rounded-full px-3 py-1"
                    >
                      {purpose}
                    </span>
                  ))}
                </div>

                <span
                  className={`shrink-0 inline-flex items-center text-xs font-semibold rounded-full px-3 py-1 ${
                    row.required === "Required"
                      ? "bg-[#f7433d]/10 text-[#f7433d]"
                      : "bg-emerald-50 text-emerald-700"
                  }`}
                >
                  {row.required}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Not collected */}
        <section className="border-t border-[#1c1917] p-6 sm:p-8 mb-8">
          <h2 className="font-['Poppins'] text-[1.45rem] font-semibold tracking-[-0.015em] text-[#1c1917] mb-2">
            Data this app does <span className="text-[#f7433d]">not</span> collect
          </h2>
          <p className="text-[#57534e] mb-6">
            We do not collect any of the following data types.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {notCollected.map((item) => (
              <li key={item} className="flex items-start gap-2 text-[#3a3530]">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-sm leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Footer note */}
        <div className="text-center text-sm text-[#6b645c]">
          For full details on how we handle your information, see our{" "}
          <a href="/privacy-policy" className="text-[#f7433d] font-medium hover:underline">
            Privacy Policy
          </a>
          . To request deletion of your account and data, visit our{" "}
          <a href="/contact" className="text-[#f7433d] font-medium hover:underline">
            Contact page
          </a>
          .
        </div>
      </div>
    </div>
  );
};

export default DataSafety;
