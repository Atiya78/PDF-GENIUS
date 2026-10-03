import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AnimatedBackground } from "@/components/ui/animated-background";
import { useLocation } from "wouter";
import { ArrowRightLeft, Layers, Play, Shield } from "lucide-react";
import { LottieIcon } from "@/components/ui/lottie-icon";
import featureConvert from "@/assets/lottie/feature-convert.json";
import featureOrganize from "@/assets/lottie/feature-organize.json";
import featureSecure from "@/assets/lottie/feature-secure.json";

export const FeaturesSection = (): JSX.Element => {
  // Add CSS keyframes for the rotating border animation
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes rotateBorder {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const [location, setLocation] = useLocation();

  // Stats data for the metrics section
  const stats = [
    { value: "10M+", label: "Active Users" },
    { value: "100M+", label: "Files Processed" },
    { value: "99.9%", label: "Uptime" },
    { value: "24/7", label: "Support" },
  ];

  // Feature cards data
  const featureCards = [
    {
      title: "Convert",
      IconComponent: ArrowRightLeft,
      lottie: featureConvert,
      description:
        "Transform your documents between different formats with perfect quality preservation.",
      features: ["PDF to Word", "Word to PDF", "Excel to PDF", "Image to PDF"],
      borderColor: "border-blue-500/30",
      iconColor: "#f7433d",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Organize",
      IconComponent: Layers,
      lottie: featureOrganize,
      description:
        "Merge, split, and reorganize your PDF documents with powerful editing tools.",
      features: ["Merge PDFs", "Split PDFs", "Compress Files", "Rotate Pages"],
      borderColor: "border-blue-500/30",
      iconColor: "#f7433d",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Secure",
      IconComponent: Shield,
      lottie: featureSecure,
      description:
        "Protect your documents with advanced security features and encryption.",
      features: [
        "Password Protect",
        "Remove Password",
        "Add Watermark",
        "Digital Signature",
      ],
      borderColor: "border-blue-500/30",
      iconColor: "#f7433d",
      bgColor: "bg-blue-500/10",
    },
  ];

  // Key features with icons
  const keyFeatures = [
    {
      title: "Lightning Fast Processing",
      description: "Convert and process documents in seconds, not minutes",
      icon: "/figmaAssets/margin-wrap-11.svg",
    },
    {
      title: "Enterprise-Grade Security",
      description: "Your documents are encrypted and processed securely",
      icon: "/figmaAssets/margin-wrap-11.svg",
    },
    {
      title: "Cross-Platform Compatibility",
      description: "Works seamlessly across all devices and operating systems",
      icon: "/figmaAssets/margin-wrap-11.svg",
    },
  ];

  // Format options for the converter UI
  const formatOptions = [
    {
      name: "Word",
      icon: "/figmaAssets/inline-center-wrap.svg",
    },
    {
      name: "Excel",
      icon: "/figmaAssets/inline-center-wrap-1.svg",
    },
    {
      name: "Image",
      icon: "/figmaAssets/inline-center-wrap-2.svg",
    },
  ];

  return (
    <section className="relative w-full py-16 sm:py-20 lg:py-24 bg-white overflow-hidden">
      {/* Animated background */}
      <AnimatedBackground particleCount={25} />

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="mb-20 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Transform Your PDF Workflow
          </h2>
          <p className="text-xl text-gray-600 max-w-screen-md mx-auto leading-[32.5px]">
            Discover how millions of users worldwide are revolutionizing their
            document management with our powerful PDF tools
          </p>
        </div>

        {/* Main Content - Two Column Layout */}
        <div className="flex flex-wrap gap-16 mb-20 items-center">
          {/* Left Column - Features */}
          <div className="flex-1 min-w-[300px]">
            {/* Performance Badge */}
            <Badge className="px-[17px] py-[9px] text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-full mb-6 h-[38px]">
              Industry Leading Performance
            </Badge>

            {/* Main Heading */}
            <h3 className="text-4xl font-bold text-gray-900 mb-6 leading-[45px]">
              Professional PDF Tools Built for Modern Workflows
            </h3>

            {/* Description */}
            <p className="text-lg text-gray-600 mb-8 leading-[29.2px]">
              From converting documents to merging files, our comprehensive
              suite of PDF tools handles every aspect of your document workflow
              with precision and speed.
            </p>

            {/* Key Features List */}
            <div className="mb-8">
              {keyFeatures.map((feature, index) => (
                <div key={index} className="flex items-start mb-4">
                  <img src={feature.icon} alt="" className="flex-shrink-0" />
                  <div className="ml-4">
                    <h4 className="text-base font-semibold text-gray-900 mb-1">
                      {feature.title}
                    </h4>
                    <p className="text-base text-gray-600">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-4">
              <Button
                className="font-semibold px-8 py-4 h-[59px] rounded-full shadow-[0px_10px_15px_-3px_#0000001a,0px_4px_6px_-4px_#0000001a]"
                onClick={() => {
                  console.log('Learn More button clicked');
                  setLocation('/learn-more');
                }}
              >
                <img
                  src="/figmaAssets/margin-wrap-8.svg"
                  alt=""
                  className="mr-2"
                />
                Learn More...
              </Button>
              <Button
                variant="outline"
                className="font-semibold px-8 py-4 h-[59px] rounded-lg"
                onClick={() => setLocation('/tools')}
              >
                <Play className="mr-2 w-5 h-5 text-gray-700" />
                Try It Now
              </Button>
            </div>
          </div>

          {/* Right Column - UI Preview */}
          <div className="flex-1 min-w-[300px]">
            <div className="rounded-3xl border border-gray-200 p-[33px] bg-card shadow-sm">
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                {/* Browser Controls */}
                <div className="flex items-center mb-6">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div className="w-3 h-3 bg-blue-400 rounded-full ml-3"></div>
                  <div className="w-3 h-3 bg-[#f7433d] rounded-full ml-3"></div>
                  <div className="flex-1 ml-3 bg-[#f2f4f5] rounded-full px-4 py-2">
                    <span className="text-sm text-gray-600">
                      PDF Converter Pro
                    </span>
                  </div>
                </div>

                {/* File Drop Area */}
                <div className="border-2 border-dashed border-blue-200 rounded-xl p-[26px] flex flex-col items-center mb-4">
                  <img
                    src="/figmaAssets/margin-wrap-30.svg"
                    alt=""
                    className="mb-2"
                  />
                  <p className="text-sm text-gray-600 text-center mb-2">
                    Drop your files here
                  </p>
                  <Button className="text-sm px-4 py-2 rounded-lg">
                    Browse Files
                  </Button>
                </div>

                {/* Format Options */}
                <div className="flex flex-wrap gap-3">
                  {formatOptions.map((format, index) => (
                    <div
                      key={index}
                      className="flex-1 min-w-[120px] bg-[#f9fafa] rounded-lg p-3 flex flex-col items-center"
                    >
                      <img
                        src={format.icon}
                        alt={format.name}
                        className="w-full mb-2"
                      />
                      <span className="text-xs text-gray-500 text-center">
                        {format.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mb-20 bg-gray-50 rounded-3xl border border-gray-200 shadow-sm p-12">
          <div className="flex flex-wrap justify-between">
            {stats.map((stat, index) => (
              <div
                key={index}
                className="text-center w-full sm:w-1/2 md:w-1/4 mb-4 md:mb-0"
              >
                <p className="text-4xl font-bold text-blue-600 mb-2">
                  {stat.value}
                </p>
                <p className="text-base text-gray-600">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {featureCards.map((card, index) => {
            const { IconComponent } = card;
            return (
              <div key={index} className="relative group h-full">
                {/* Animated border container */}
                <div className="absolute inset-0 rounded-2xl opacity-60 group-hover:opacity-90 transition-opacity duration-300">
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: `conic-gradient(from 0deg, transparent 340deg, ${card.iconColor}80 360deg)`,
                      animation: 'rotateBorder 3.5s linear infinite',
                      padding: '2px'
                    }}
                  >
                    <div className="w-full h-full bg-white rounded-2xl" />
                  </div>
                  <div
                    className="absolute inset-0 rounded-2xl"
                    style={{
                      background: `conic-gradient(from 120deg, transparent 340deg, ${card.iconColor}60 360deg)`,
                      animation: 'rotateBorder 3.5s linear infinite reverse',
                      padding: '2px'
                    }}
                  >
                    <div className="w-full h-full bg-transparent rounded-2xl" />
                  </div>
                </div>

                <Card
                  className={`relative bg-card rounded-2xl border ${card.borderColor} hover:${card.borderColor.replace('/30', '/50')} transition-all duration-300 z-10 h-full flex flex-col`}
                >
                  <div className="p-6 lg:p-8 flex flex-col h-full">
                    {/* Icon Container */}
                    <div className="flex justify-center mb-6">
                      <div className={`w-20 h-20 ${card.bgColor} rounded-2xl flex items-center justify-center`}>
                        {card.lottie ? (
                          <LottieIcon animationData={card.lottie} size={56} />
                        ) : (
                          <IconComponent
                            size={40}
                            style={{ color: card.iconColor }}
                            strokeWidth={1.5}
                          />
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex flex-col flex-grow">
                      <h3 className="text-2xl font-bold text-gray-900 mb-4 text-center">
                        {card.title}
                      </h3>
                      <p className="text-base text-gray-600 mb-6 text-center leading-relaxed flex-grow">
                        {card.description}
                      </p>

                      {/* Features List */}
                      <ul className="space-y-3">
                        {card.features.map((feature, featureIndex) => (
                          <li
                            key={featureIndex}
                            className="flex items-center text-sm text-gray-600"
                          >
                            <div
                              className="w-1.5 h-1.5 rounded-full mr-3 flex-shrink-0"
                              style={{ backgroundColor: card.iconColor }}
                            />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
