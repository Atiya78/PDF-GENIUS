import { ArrowRight, CheckCircle, ShieldIcon, SparklesIcon, UploadIcon, ZapIcon } from "lucide-react";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { motion, type Variants } from "framer-motion";
import { AnimatedSelectButton } from "@/components/ui/animated-select-button";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { ConverterStatusIcon } from "@/components/converter-status-icon";
import { useLocation, useSearch } from "wouter";
import { toolConfigs, isHeroTool } from "@/lib/toolConfig";
import { HeroToolConverter } from "@/components/HeroToolConverter";

const heroBenefits = [
  "Work directly in your browser",
  "Keep original formatting and quality",
  "Download your converted file in seconds",
  "100% free, secure & private",
];

export const HeroSection = (): JSX.Element => {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const toolId = new URLSearchParams(search).get("tool");
  const activeTool = isHeroTool(toolId) ? toolConfigs[toolId as string] : null;

  // File format options
  const fileFormats = [
    { format: "PDF", className: "w-[38.58px]" },
    { format: "DOC", className: "w-[40.44px]" },
    { format: "XLS", className: "w-[37.61px]" },
    { format: "JPG", className: "w-[38.88px]" },
  ];

  // Trust indicators
  const trustIndicators = [
    {
      icon: <ShieldIcon className="h-4 w-4 mr-1.5 text-gray-500" />,
      text: "100% Secure",
      className: "whitespace-nowrap",
    },
    {
      icon: <ZapIcon className="h-4 w-4 mr-1.5 text-gray-500" />,
      text: "Instant Processing",
      className: "whitespace-nowrap",
    },
    {
      icon: <SparklesIcon className="h-4 w-4 mr-1.5 text-gray-500" />,
      text: "Always Free",
      className: "whitespace-nowrap",
    },
  ];

  return (
    <section className="flex flex-col w-full items-start relative bg-white overflow-hidden">
      <div className="flex flex-col w-full items-start relative">
        {/* Animated background */}
        <AnimatedBackground particleCount={35} />

        <div className="flex w-full items-center relative z-10">
          <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 w-full relative">
              <div className="flex flex-wrap w-full items-center gap-12 relative">
                {/* Left column - Text content */}
                <div className="flex flex-col w-full md:w-[584px] items-start relative">
                  <div className="flex flex-col w-full items-start relative">
                    <div className="flex flex-col w-full items-start relative">
                      <Badge className="flex h-[38px] items-center px-[17px] py-[9px] bg-blue-50 text-blue-700 rounded-full border border-solid border-blue-200">
                        <img
                          className="mr-2"
                          alt="Margin wrap"
                          src="/figmaAssets/margin-wrap.svg"
                        />
                        <span className="font-medium text-sm">
                          Trusted by 10M+ users worldwide
                        </span>
                      </Badge>

                      <div className="pt-4">
                        <h1
                          className="font-bold text-gray-900 text-3xl sm:text-4xl lg:text-5xl leading-tight max-w-[584px]"
                          data-testid="text-hero-title"
                        >
                          {activeTool
                            ? `Convert ${activeTool.title}`
                            : "Professional PDF tools trusted by millions"}
                        </h1>
                      </div>

                      <div className="pt-4">
                        <p
                          className="font-normal text-gray-600 text-lg leading-7 max-w-2xl"
                          data-testid="text-hero-description"
                        >
                          {activeTool
                            ? activeTool.description
                            : `Every tool you need to use PDFs, at your fingertips. All are 100% FREE and easy to use! Merge, split, compress, convert, rotate, unlock and watermark PDFs with just a few clicks.`}
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
                          <AnimatedSelectButton
                            className="h-[61px] px-8 py-4 rounded-full justify-center w-full sm:w-auto shadow-[0px_10px_15px_-3px_#0000001a,0px_4px_6px_-4px_#0000001a]"
                            onClick={() => {
                              console.log('Start Converting Now button clicked');
                              setLocation('/tools');
                            }}
                          >
                            <ZapIcon className="mr-2 h-5 w-5" />
                            <span className="font-semibold text-base">
                              Start Converting Now
                            </span>
                          </AnimatedSelectButton>

                          <Button
                            variant="outline"
                            className="h-[61px] px-[34px] py-[18px] justify-center w-full sm:w-auto bg-white text-gray-700 rounded-lg border-2 border-solid border-gray-300 hover:bg-gray-50"
                            onClick={() => {
                              console.log('Learn More button clicked from hero');
                              setLocation('/learn-more');
                            }}
                          >
                            <ArrowRight className="mr-2 w-5 h-5 text-gray-700" />
                            <span className="font-semibold text-base">
                              Learn More
                            </span>
                          </Button>
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
                  <HeroToolConverter key={activeTool.id} tool={activeTool} />
                ) : (
                <Card className="flex flex-col w-full md:w-[584px] h-[405px] items-start p-[50px] bg-card rounded-3xl border-2 border-dashed border-blue-300 shadow-sm">
                  <div className="flex flex-col items-center justify-center w-full p-0">
                    <ConverterStatusIcon status="upload" size={80} className="mb-3" />

                    <h2 className="font-bold text-gray-900 text-xl text-center mb-3">
                      Drop your PDF here
                    </h2>

                    <p className="font-normal text-gray-600 text-base text-center mb-8">
                      or click to browse files
                    </p>

                    <AnimatedSelectButton
                      onClick={() => setLocation('/?tool=pdf-to-word')}
                      className="h-[57px] px-12 py-4 mb-8 rounded-full shadow-[0px_10px_15px_-3px_#0000001a,0px_4px_6px_-4px_#0000001a]"
                    >
                      <UploadIcon className="mr-2 h-5 w-5" />
                      <span className="text-base">
                        Select PDF File
                      </span>
                    </AnimatedSelectButton>

                    <div className="flex flex-wrap justify-center gap-x-4 gap-y-2">
                      {fileFormats.map((format, index) => (
                        <div
                          key={`format-${index}`}
                          className={`flex h-4 items-center ${format.className}`}
                        >
                          <img
                            className="mr-1"
                            alt={`${format.format} icon`}
                            src={`/figmaAssets/margin-wrap-${index === 0 ? "26" : index === 1 ? "4" : index === 2 ? "9" : "6"}.svg`}
                          />
                          <span className="font-normal text-gray-500 text-xs text-center">
                            {format.format}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
                )}
              </div>
          </div>
        </div>
      </div>
    </section>
  );
};
