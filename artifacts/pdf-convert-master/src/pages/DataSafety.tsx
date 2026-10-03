import React from "react";
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
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#f7433d]/10 mb-5">
            <Shield className="w-7 h-7 text-[#f7433d]" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Data Safety</h1>
          <p className="max-w-2xl mx-auto text-lg text-gray-600 leading-relaxed">
            A plain-language summary of the data PDF Genius collects, how it is used, and
            the protections in place. This mirrors the Data safety section shown on our
            Google Play store listing.
          </p>
          <p className="text-sm text-gray-500 mt-4">Last updated: June 25, 2026</p>
        </div>

        {/* Practices */}
        <div className="grid gap-4 sm:grid-cols-3 mb-10">
          {practices.map((p) => (
            <div
              key={p.title}
              className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm"
            >
              <p.icon className="w-6 h-6 text-[#f7433d] mb-3" />
              <h3 className="font-semibold text-gray-900 mb-1">{p.title}</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>

        {/* Data collected */}
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 sm:p-8 mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Database className="w-6 h-6 text-[#f7433d]" />
            <h2 className="text-2xl font-bold text-gray-900">Data this app collects</h2>
          </div>
          <p className="text-gray-600 mb-6">
            All data is collected, never shared. Files and photos are processed to deliver
            your conversion and are deleted automatically (typically within 24 hours).
          </p>

          <div className="space-y-4">
            {collectedData.map((row) => (
              <div
                key={`${row.category}-${row.type}`}
                className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 border-b border-gray-100 pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-3 sm:w-64 shrink-0">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gray-100 shrink-0">
                    <row.icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 leading-tight">{row.type}</p>
                    <p className="text-xs text-gray-500">{row.category}</p>
                  </div>
                </div>

                <div className="flex-1 flex flex-wrap items-center gap-2">
                  {row.purposes.map((purpose) => (
                    <span
                      key={purpose}
                      className="inline-flex items-center text-xs font-medium text-gray-700 bg-gray-100 rounded-full px-3 py-1"
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
        <section className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 sm:p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Data this app does <span className="text-[#f7433d]">not</span> collect
          </h2>
          <p className="text-gray-600 mb-6">
            We do not collect any of the following data types.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2">
            {notCollected.map((item) => (
              <li key={item} className="flex items-start gap-2 text-gray-700">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <span className="text-sm leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Footer note */}
        <div className="text-center text-sm text-gray-500">
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
