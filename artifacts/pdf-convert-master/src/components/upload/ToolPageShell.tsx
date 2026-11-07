import React from "react";
import { ShieldCheck } from "lucide-react";
import "@/styles/tools.css";
import { useSeo } from "@/lib/useSeo";
import { ToolLandingContext } from "@/contexts/ToolLandingContext";

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
    trustText,
  maxWidth = "max-w-5xl",
  showHeader = true,
  children,
}) => {
  const embedded = React.useContext(ToolLandingContext);
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
    <div className="tl-root relative min-h-[100dvh]">
      <div className={`relative w-full ${maxWidth} mx-auto px-4 sm:px-6 py-8 sm:py-10`}>
        {embedded ? null : showHeader ? (
          <div className="mb-8 flex items-start gap-4 border-b border-[#e7e0d5] pb-6">
            <div className="tl-icon !h-14 !w-14 shrink-0">{icon}</div>
            <div className="min-w-0">
              <h1
                className="font-['Poppins'] text-[1.75rem] font-semibold leading-tight tracking-[-0.02em] text-[#1c1917] sm:text-[2rem]"
                data-testid="text-tool-title"
              >
                {title}
              </h1>
              <p className="mt-1.5 max-w-2xl text-[15px] leading-relaxed text-[#57534e]">{description}</p>
              {trustText && (
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#57534e]">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#2f5d50]" aria-hidden="true" />
                  {trustText}
                </p>
              )}
            </div>
          </div>
        ) : (
          // Upload (empty) state: only the tool name above the bare dropzone.
          <div className="mb-6">
            <h1
              className="font-['Poppins'] text-[1.9rem] font-semibold leading-tight tracking-[-0.02em] text-[#1c1917] sm:text-[2.3rem]"
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
