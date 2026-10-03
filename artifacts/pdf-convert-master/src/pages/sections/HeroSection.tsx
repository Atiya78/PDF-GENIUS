import { ArrowRight, CheckCircle, ShieldIcon, SparklesIcon, ZapIcon } from "lucide-react";
import React, { lazy, Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { motion, type Variants } from "framer-motion";
import { Link, useSearch } from "wouter";
import { toolConfigs, isHeroTool } from "@/lib/toolConfig";
import { HeroUploadCard } from "@/components/HeroUploadCard";
import { TopToolsGrid } from "@/components/TopToolsGrid";

// Heavy converter code loads only when a ?tool= deep link is opened.
const HeroToolConverter = lazy(() =>
  import("@/components/HeroToolConverter").then((m) => ({ default: m.HeroToolConverter })),
);

const heroBenefits = [
  "Work directly in your browser",
  "Keep original formatting and quality",
  "Download your converted file in seconds",
  "Free web tools, no signup required",
];

export const HeroSection = (): JSX.Element => {
  const search = useSearch();
  const toolId = new URLSearchParams(search).get("tool");
  const activeTool = isHeroTool(toolId) ? toolConfigs[toolId as string] : null;

  // Trust indicators
  const trustIndicators = [
    {
      icon: <ShieldIcon className="h-4 w-4 mr-1.5 text-gray-500" />,
      text: "Encrypted in transit (HTTPS)",
      className: "whitespace-nowrap",
    },
    {
      icon: <ZapIcon className="h-4 w-4 mr-1.5 text-gray-500" />,
      text: "No signup needed",
      className: "whitespace-nowrap",
    },
    {
      icon: <SparklesIcon className="h-4 w-4 mr-1.5 text-gray-500" />,
      text: "Free web tools",
      className: "whitespace-nowrap",
    },
  ];

  return (
    <section className="flex flex-col w-full items-start relative bg-white overflow-hidden">
      <div className="flex flex-col w-full items-start relative">
        {/* Animated background */}

        <div className="flex w-full items-center relative z-10">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 w-full relative">
              <div className="flex flex-wrap w-full items-center gap-12 relative">
                {/* Left column - Text content */}
                <div className="flex flex-col w-full md:w-[584px] items-start relative order-1">
                  <div className="flex flex-col w-full items-start relative">
                    <div className="flex flex-col w-full items-start relative">
                      <Badge className="flex h-[38px] items-center px-[17px] py-[9px] bg-blue-50 text-blue-700 rounded-full border border-solid border-blue-200">
                        <img
                          className="mr-2"
                          alt=""
                          width={16}
                          height={16}
                          src="/figmaAssets/margin-wrap.svg"
                        />
                        <span className="font-medium text-sm">
                          Free tools. No signup required.
                        </span>
                      </Badge>

                      <div className="pt-4">
                        <h1
                          className="font-bold text-gray-900 text-3xl sm:text-4xl lg:text-5xl leading-tight max-w-[584px]"
                          data-testid="text-hero-title"
                        >
                          {activeTool
                            ? `Convert ${activeTool.title}`
                            : "Practical PDF tools, free to use"}
                        </h1>
                      </div>

                      <div className="pt-4">
                        <p
                          className="font-normal text-gray-600 text-lg leading-7 max-w-2xl"
                          data-testid="text-hero-description"
                        >
                          {activeTool
                            ? activeTool.description
                            : `Every tool you need to use PDFs, at your fingertips. Free to use, no signup required. Merge, split, compress, convert, rotate, unlock and watermark PDFs with just a few clicks.`}
                        </p>
                      </div>
                    </div>

                    {activeTool ? (
                      <div className="pt-8">
                        <ul className="flex flex-col gap-3">
                          {heroBenefits.map((benefit) => (
                            <li
                              key={benefit}
                              className="flex items-center text-gray-700 text-base"
                            >
                              <CheckCircle className="mr-3 h-5 w-5 shrink-0 text-blue-600" />
                              {benefit}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="pt-8 w-full">
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                          <Link
                            href="/tools"
                            className="inline-flex h-[56px] w-full sm:w-auto items-center justify-center rounded-full bg-[#d92f29] px-8 text-base font-semibold text-white shadow-md hover:opacity-90"
                            data-testid="link-hero-all-tools"
                          >
                            <ZapIcon className="mr-2 h-5 w-5" aria-hidden="true" />
                            Browse all tools
                          </Link>

                          <Link
                            href="/learn-more"
                            className="inline-flex h-[56px] w-full sm:w-auto items-center justify-center rounded-full border-2 border-gray-300 bg-white px-8 text-base font-semibold text-gray-700 hover:bg-gray-50"
                            data-testid="link-hero-learn-more"
                          >
                            <ArrowRight className="mr-2 h-5 w-5" aria-hidden="true" />
                            About PDF Genius
                          </Link>
                        </div>
                      </div>
                    )}

                    <div className="pt-8 w-full">
                      <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
                        {trustIndicators.map((indicator, index) => {
                          // Different animation timing for each element
                          const animationDelay = index * 0.8; // 0s, 0.8s, 1.6s delays
                          const floatingVariants: Variants = {
                            animate: {
                              y: [-4, 4, -4],
                              transition: {
                                duration: 3 + index * 0.5, // Different durations: 3s, 3.5s, 4s
                                repeat: Infinity,
                                ease: "easeInOut",
                                delay: animationDelay,
                              }
                            }
                          };

                          return (
                            <motion.div
                              key={`indicator-${index}`}
                              className={`flex h-5 items-center ${indicator.className}`}
                              variants={floatingVariants}
                              animate="animate"
                              initial={{ y: 0 }}
                            >
                              {indicator.icon}
                              <span className="font-normal text-gray-600 text-sm leading-5">
                                {indicator.text}
                              </span>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right column - File upload card */}
                {activeTool ? (
                  <Suspense fallback={<div className="w-full md:w-[584px] min-h-[405px] rounded-3xl bg-gray-100 animate-pulse" aria-hidden="true" />}>
                    <HeroToolConverter key={activeTool.id} tool={activeTool} />
                  </Suspense>
                ) : (
                <div className="order-3 md:order-2 w-full md:w-auto"><HeroUploadCard /></div>
                )}
                {!activeTool && <div className="order-2 md:order-3 w-full"><TopToolsGrid /></div>}
              </div>
          </div>
        </div>
      </div>
    </section>
  );
};
