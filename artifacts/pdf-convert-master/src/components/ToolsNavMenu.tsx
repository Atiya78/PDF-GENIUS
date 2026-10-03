import { useState } from "react";
import {
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toolConfigs, isHeroTool, getServerToolType } from "@/lib/toolConfig";
import { useToolPaused } from "@/lib/usePausedTools";
import { Menu } from "lucide-react";
import { useLocation } from "wouter";
import { PausedBadge } from "@/components/PausedBadge";

// Tools grouped for the navbar dropdowns
const PDF_FROM = ["pdf-to-word", "pdf-to-excel", "pdf-to-powerpoint", "pdf-to-images"];
const PDF_TO = ["word-to-pdf", "excel-to-pdf", "powerpoint-to-pdf", "images-to-pdf", "html-to-pdf"];
const PDF_EDITOR_COL1 = ["edit-pdf", "sign-pdf", "rotate-pdf", "merge-pdfs", "split-pdf", "crop-pdf"];
const PDF_EDITOR_COL2 = [
  "restore-document",
  "lock-pdf",
  "unlock-pdf",
  "watermark-pdf",
  "add-image-pdf",
  "compress-images",
  "compress-pdf",
  "delete-pages-pdf",
  "ocr-pdf",
];
const IMAGE_TOOLS = [
  "resize-images",
  "crop-images",
  "rotate-images",
  "convert-image-format",
  "compress-images",
  "upscale-images",
  "remove-background",
];

const triggerClass =
  "font-medium text-gray-600 text-base leading-6 bg-transparent hover:bg-transparent hover:text-gray-900 focus:bg-transparent data-[state=open]:bg-transparent data-[state=open]:text-gray-900 px-0 h-auto";


const ToolLink = ({ id }: { id: string }): JSX.Element | null => {
  const [, setLocation] = useLocation();
  const tool = toolConfigs[id];
  const isPaused = useToolPaused(tool ? getServerToolType(tool) : undefined);
  if (!tool) return null;
  const Icon = tool.icon;
  const target = isHeroTool(id) ? `/?tool=${id}` : tool.route;
  return (
    <NavigationMenuLink asChild>
      <button
        type="button"
        onClick={() => target && setLocation(target)}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-blue-50 ${isPaused ? "opacity-70" : ""}`}
        data-testid={`nav-tool-${tool.id}`}
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tool.iconBgColor}`}
        >
          <Icon className={`h-4 w-4 ${tool.iconColor}`} />
        </span>
        <span className="whitespace-nowrap text-sm font-medium text-gray-700">
          {tool.title}
        </span>
        {isPaused && (
          <PausedBadge className="ml-auto shrink-0" testId={`nav-tool-paused-${tool.id}`} />
        )}
      </button>
    </NavigationMenuLink>
  );
};

const ColumnHeading = ({ children }: { children: React.ReactNode }): JSX.Element => (
  <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
    {children}
  </p>
);

export const ToolsNavDropdowns = (): JSX.Element => {
  const [, setLocation] = useLocation();

  return (
    <>
      {/* PDF Converter */}
      <NavigationMenuItem>
        <NavigationMenuTrigger className={triggerClass} data-testid="nav-pdf-converter">
          PDF Converter
        </NavigationMenuTrigger>
        <NavigationMenuContent>
          <div className="grid w-[520px] grid-cols-2 gap-x-6 gap-y-0.5 p-4">
            <div>
              <ColumnHeading>Convert from PDF</ColumnHeading>
              {PDF_FROM.map((id) => (
                <ToolLink key={id} id={id} />
              ))}
            </div>
            <div>
              <ColumnHeading>Convert to PDF</ColumnHeading>
              {PDF_TO.map((id) => (
                <ToolLink key={id} id={id} />
              ))}
            </div>
          </div>
          <div className="border-t border-gray-100 px-4 pt-3 pb-1">
            <ColumnHeading>Edit</ColumnHeading>
            <ToolLink id="edit-pdf" />
          </div>
          <div className="border-t border-gray-100 px-4 py-3">
            <NavigationMenuLink asChild>
              <button
                type="button"
                onClick={() => setLocation("/tools")}
                className="text-sm font-semibold text-blue-600 transition-colors hover:text-blue-700"
                data-testid="nav-view-all-tools"
              >
                View all tools →
              </button>
            </NavigationMenuLink>
          </div>
        </NavigationMenuContent>
      </NavigationMenuItem>

      {/* PDF Editor */}
      <NavigationMenuItem>
        <NavigationMenuTrigger className={triggerClass} data-testid="nav-pdf-editor">
          PDF Editor
        </NavigationMenuTrigger>
        <NavigationMenuContent>
          <div className="grid w-[520px] grid-cols-2 gap-x-6 gap-y-0.5 p-4">
            <div>
              {PDF_EDITOR_COL1.map((id) => (
                <ToolLink key={id} id={id} />
              ))}
            </div>
            <div>
              {PDF_EDITOR_COL2.map((id) => (
                <ToolLink key={id} id={id} />
              ))}
            </div>
          </div>
        </NavigationMenuContent>
      </NavigationMenuItem>

      {/* Image Tools */}
      <NavigationMenuItem>
        <NavigationMenuTrigger className={triggerClass} data-testid="nav-image-tools">
          Image Tools
        </NavigationMenuTrigger>
        <NavigationMenuContent>
          <div className="grid w-[520px] grid-cols-2 gap-x-6 gap-y-0.5 p-4">
            {IMAGE_TOOLS.map((id) => (
              <ToolLink key={id} id={id} />
            ))}
          </div>
        </NavigationMenuContent>
      </NavigationMenuItem>
    </>
  );
};

// Single tool row used inside the mobile sheet menu
const MobileToolButton = ({
  id,
  onNavigate,
}: {
  id: string;
  onNavigate: () => void;
}): JSX.Element | null => {
  const [, setLocation] = useLocation();
  const tool = toolConfigs[id];
  const isPaused = useToolPaused(tool ? getServerToolType(tool) : undefined);
  if (!tool) return null;
  const Icon = tool.icon;
  const target = isHeroTool(id) ? `/?tool=${id}` : tool.route;
  return (
    <button
      type="button"
      onClick={() => {
        if (target) setLocation(target);
        onNavigate();
      }}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-blue-50 ${isPaused ? "opacity-70" : ""}`}
      data-testid={`mobile-nav-tool-${tool.id}`}
    >
      <span
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tool.iconBgColor}`}
      >
        <Icon className={`h-4 w-4 ${tool.iconColor}`} />
      </span>
      <span className="text-sm font-medium text-gray-700">{tool.title}</span>
      {isPaused && (
        <PausedBadge className="ml-auto shrink-0" testId={`mobile-nav-tool-paused-${tool.id}`} />
      )}
    </button>
  );
};

interface MobileNavProps {
  homeItem: { name: string; href: string };
  trailingItems: { name: string; href: string }[];
  footer?: (close: () => void) => React.ReactNode;
}

// Hamburger + slide-over menu shown on small screens (replaces the hover dropdowns)
export const MobileNav = ({
  homeItem,
  trailingItems,
  footer,
}: MobileNavProps): JSX.Element => {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);

  const close = () => setOpen(false);
  const go = (href: string) => {
    if (href.startsWith("/")) setLocation(href);
    close();
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition-colors hover:bg-gray-50"
          data-testid="button-mobile-menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-[300px] flex-col p-0 sm:w-[340px]"
      >
        <SheetHeader className="border-b border-gray-100 px-5 py-4 text-left">
          <SheetTitle className="font-['Poppins'] text-lg font-bold text-gray-900">
            Menu
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <button
            type="button"
            onClick={() => go(homeItem.href)}
            className="w-full rounded-lg px-3 py-2.5 text-left text-base font-medium text-gray-700 hover:bg-gray-50"
            data-testid="mobile-nav-home"
          >
            {homeItem.name}
          </button>

          <Accordion type="multiple" className="w-full">
            <AccordionItem value="pdf" className="border-none">
              <AccordionTrigger className="px-3 py-2.5 text-base font-medium text-gray-700 hover:no-underline">
                PDF Converter
              </AccordionTrigger>
              <AccordionContent className="pb-1">
                <p className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Convert from PDF
                </p>
                {PDF_FROM.map((id) => (
                  <MobileToolButton key={id} id={id} onNavigate={close} />
                ))}
                <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Convert to PDF
                </p>
                {PDF_TO.map((id) => (
                  <MobileToolButton key={id} id={id} onNavigate={close} />
                ))}
                <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Edit
                </p>
                <MobileToolButton id="edit-pdf" onNavigate={close} />
                <button
                  type="button"
                  onClick={() => go("/tools")}
                  className="mt-1 px-3 py-2 text-left text-sm font-semibold text-blue-600 hover:text-blue-700"
                  data-testid="mobile-nav-view-all-tools"
                >
                  View all tools →
                </button>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="pdf-editor" className="border-none">
              <AccordionTrigger className="px-3 py-2.5 text-base font-medium text-gray-700 hover:no-underline">
                PDF Editor
              </AccordionTrigger>
              <AccordionContent className="pb-1">
                {[...PDF_EDITOR_COL1, ...PDF_EDITOR_COL2].map((id) => (
                  <MobileToolButton key={id} id={id} onNavigate={close} />
                ))}
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="image" className="border-none">
              <AccordionTrigger className="px-3 py-2.5 text-base font-medium text-gray-700 hover:no-underline">
                Image Tools
              </AccordionTrigger>
              <AccordionContent className="pb-1">
                {IMAGE_TOOLS.map((id) => (
                  <MobileToolButton key={id} id={id} onNavigate={close} />
                ))}
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {trailingItems.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => go(item.href)}
              className="w-full rounded-lg px-3 py-2.5 text-left text-base font-medium text-gray-700 hover:bg-gray-50"
              data-testid={`mobile-nav-${item.name.toLowerCase()}`}
            >
              {item.name}
            </button>
          ))}
        </div>

        {footer ? (
          <div className="border-t border-gray-100 px-5 py-4">{footer(close)}</div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};
