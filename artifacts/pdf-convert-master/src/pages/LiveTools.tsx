import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Search, Star, Info } from "lucide-react";
import { toolConfigs, type ToolConfig } from "@/lib/toolConfig";

const CORAL = "#f7433d";

// Display order for the category filter tabs. Any category present in the
// registry but missing here is appended automatically so nothing is hidden.
const CATEGORY_ORDER = ["Convert", "Image Tools", "Edit", "Organize"];

// A handful of headline tools surfaced in the "Popular tools" strip + flagged
// with a filled star on their card. Purely presentational.
const FEATURED = new Set(["pdf-to-word", "merge-pdfs", "compress-pdf", "edit-pdf"]);

// Lightweight popularity figures used only for the progress bar on each card.
const POPULARITY: Record<string, number> = {
  "pdf-to-word": 95,
  "word-to-pdf": 92,
  "merge-pdfs": 90,
  "pdf-to-excel": 88,
  "compress-pdf": 85,
  "edit-pdf": 83,
  "remove-background": 80,
  "pdf-to-images": 80,
  "split-pdf": 78,
  "sign-pdf": 77,
  "images-to-pdf": 76,
  "pdf-to-powerpoint": 75,
  "compress-images": 74,
  "ocr-pdf": 73,
  "excel-to-pdf": 72,
  "resize-images": 70,
  "powerpoint-to-pdf": 70,
  "lock-pdf": 70,
  "convert-image-format": 68,
  "unlock-pdf": 68,
  "delete-pages-pdf": 66,
  "upscale-images": 66,
  "watermark-pdf": 65,
  "rotate-pdf": 64,
  "crop-pdf": 62,
  "html-to-pdf": 60,
  "crop-images": 60,
  "rotate-images": 58,
  "add-image-pdf": 58,
  "restore-document": 55,
};

interface ToolEntry extends ToolConfig {
  popularity: number;
  featured: boolean;
}

interface ToolCardProps {
  tool: ToolEntry;
  onUse: (tool: ToolEntry) => void;
}

const ToolCard: React.FC<ToolCardProps> = ({ tool, onUse }) => {
  const Icon = tool.icon;
  return (
    <Card className="relative flex flex-col h-full">
      <div className="p-5 sm:p-6 flex flex-col h-full">
        {/* Featured indicator */}
        <span
          className={`absolute top-4 right-4 inline-flex items-center justify-center w-8 h-8 rounded-full ${
            tool.featured
              ? "bg-[#f7433d] text-white shadow-sm"
              : "bg-gray-100 text-gray-400"
          }`}
          aria-hidden="true"
        >
          <Star className={`w-4 h-4 ${tool.featured ? "fill-white" : ""}`} />
        </span>

        <div className="pr-12 flex flex-col h-full">
          {/* Icon */}
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 bg-[#f7433d]/10">
            <Icon className="w-5 h-5 text-[#f7433d]" />
          </div>

          {/* Title */}
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <span>{tool.title}</span>
            {tool.comingSoon && (
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[#f7433d] bg-[#f7433d]/10 rounded px-1.5 py-0.5">
                Soon
              </span>
            )}
          </h3>

          {/* Description */}
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">{tool.description}</p>

          {/* Popularity */}
          <div className="mb-4 mt-auto">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Popularity</span>
              <span className="text-xs text-gray-500">{tool.popularity}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-[#f7433d]"
                style={{ width: `${tool.popularity}%` }}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="space-y-2">
            <Button
              className="w-full bg-[#f7433d] hover:bg-[#f7433d]/90 text-white"
              onClick={() => onUse(tool)}
            >
              Use Tool
            </Button>
            <Button variant="outline" className="w-full" onClick={() => onUse(tool)}>
              <Info className="w-4 h-4 mr-2" />
              Learn More
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
};

export const LiveTools: React.FC = () => {
  const [, setLocation] = useLocation();
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  const tools: ToolEntry[] = React.useMemo(
    () =>
      Object.values(toolConfigs).map((cfg) => ({
        ...cfg,
        popularity: POPULARITY[cfg.id] ?? 60,
        featured: FEATURED.has(cfg.id),
      })),
    [],
  );

  // Build the category list in the preferred order, appending any extras.
  const categories = React.useMemo(() => {
    const present = Array.from(new Set(tools.map((t) => t.category)));
    const ordered = CATEGORY_ORDER.filter((c) => present.includes(c));
    const extras = present.filter((c) => !ordered.includes(c));
    return ["All", ...ordered, ...extras];
  }, [tools]);

  const handleUse = (tool: ToolEntry) => {
    if (tool.route) setLocation(tool.route);
  };

  const getToolCount = (category: string) =>
    tools.filter((t) => category === "All" || t.category === category).length;

  const featuredTools = tools.filter((t) => t.featured);

  const query = searchQuery.trim().toLowerCase();
  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      !query ||
      tool.title.toLowerCase().includes(query) ||
      tool.description.toLowerCase().includes(query);
    const matchesFilter = activeFilter === "All" || tool.category === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="bg-gray-50 min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Live PDF Tools</h1>
            <p className="text-gray-600">Professional PDF conversion and manipulation tools</p>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search tools..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map((category) => (
            <Button
              key={category}
              variant={activeFilter === category ? "default" : "outline"}
              className={
                activeFilter === category
                  ? "bg-[#f7433d] hover:bg-[#f7433d]/90 text-white"
                  : ""
              }
              onClick={() => setActiveFilter(category)}
            >
              {category} ({getToolCount(category)})
            </Button>
          ))}
        </div>

        {/* Popular Tools strip */}
        {featuredTools.length > 0 && (
          <Card className="mb-6 border-[#f7433d]/20 bg-[#f7433d]/5">
            <div className="p-5">
              <h2 className="flex items-center text-lg font-semibold text-gray-900 mb-4">
                <Star className="w-5 h-5 text-[#f7433d] mr-2 fill-[#f7433d]" />
                Popular Tools
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {featuredTools.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => handleUse(tool)}
                      className="p-4 bg-white rounded-lg border border-[#f7433d]/20 text-center hover:border-[#f7433d]/50 hover:shadow-sm transition-all"
                    >
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-3 bg-[#f7433d]/10">
                        <Icon className="w-5 h-5 text-[#f7433d]" />
                      </div>
                      <h3 className="text-sm font-medium text-gray-900">{tool.title}</h3>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
        )}

        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredTools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} onUse={handleUse} />
          ))}
        </div>

        {filteredTools.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No tools found matching your search criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};
