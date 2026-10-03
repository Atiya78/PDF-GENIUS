import React from "react";
import { ShieldCheck } from "lucide-react";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { useSeo } from "@/lib/useSeo";

export interface ToolPageShellProps {
  /** Page heading. */
  title: string;
  /** Sub-heading shown under the title. */
  description: string;
  /** The icon element (already colored) rendered inside the rounded box. */
  icon: React.ReactNode;
  /** Tailwind border + background classes for the rounded icon box. */
  iconBoxClassName?: string;
  /** Optional assurance line under the description (hidden when omitted). */
  trustText?: React.ReactNode;
  /** Container max-width class. Defaults to max-w-5xl. */
  maxWidth?: string;
  /** Particle density for the animated background. */
  particleCount?: number;
  /**
   * Show the centered icon + title + description header. Defaults to true.
   * The upload (empty) state of every tool hides it so all upload pages share
   * the same clean dropzone-only design.
   */
  showHeader?: boolean;
  children: React.ReactNode;
}

/**
 * Shared page chrome for every tool page (PDF editor, image tools, conversion
 * workflow). Puts the homepage animated background behind a centered icon +
 * title + description header, with the tool's content sitting on top at z-10.
 * Content should stay on a solid white card for contrast against the background.
 */
export const ToolPageShell: React.FC<ToolPageShellProps> = ({
  title,
  description,
  icon,
  iconBoxClassName = "border-blue-100 bg-blue-50",
  trustText,
  maxWidth = "max-w-5xl",
  particleCount = 14,
  showHeader = true,
  children,
}) => {
  const jsonLd = React.useMemo(
    () => ({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: `${title} | PDF Genius`,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any (web-based)",
      browserRequirements: "Requires JavaScript. Runs in any modern browser.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description,
    }),
    [title, description],
  );

  useSeo({ title, description, jsonLd });

  return (
    <div className="relative min-h-screen overflow-hidden bg-white">
      <AnimatedBackground particleCount={particleCount} className="opacity-60" />
      <div className={`relative z-10 w-full ${maxWidth} mx-auto px-4 sm:px-6 py-10`}>
        {showHeader ? (
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div
                className={`w-16 h-16 flex items-center justify-center rounded-2xl border-2 shadow-sm ${iconBoxClassName}`}
              >
                {icon}
              </div>
            </div>
            <h1
              className="text-3xl font-bold text-gray-900 mb-2"
              data-testid="text-tool-title"
            >
              {title}
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto">{description}</p>
            {trustText && (
              <p className="inline-flex items-center gap-1.5 text-xs text-gray-400 mt-3">
                <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                {trustText}
              </p>
            )}
          </div>
        ) : (
          // Upload (empty) state: show only the tool name as a headline above
          // the bare dropzone, so every upload page is clearly labelled.
          <div className="text-center mb-8">
            <h1
              className="text-3xl font-bold text-gray-900"
              data-testid="text-tool-title"
            >
              {title}
            </h1>
          </div>
        )}
        {children}
      </div>
    </div>
  );
};

export default ToolPageShell;
