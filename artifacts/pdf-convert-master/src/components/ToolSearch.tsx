import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { Search, X } from "lucide-react";
import { PausedBadge } from "@/components/PausedBadge";
import { Command as CommandPrimitive } from "cmdk";
import { toolConfigs, isHeroTool, getServerToolType, type ToolConfig } from "@/lib/toolConfig";
import { usePausedTools } from "@/lib/usePausedTools";
import { cn } from "@/lib/utils";

// Display order for the category groups inside the search dropdown.
const CATEGORY_ORDER = ["Convert", "Image Tools", "Edit", "Organize"];

const groupedTools = (): { category: string; tools: ToolConfig[] }[] => {
  const tools = Object.values(toolConfigs);
  const byCategory = new Map<string, ToolConfig[]>();
  for (const tool of tools) {
    const list = byCategory.get(tool.category) ?? [];
    list.push(tool);
    byCategory.set(tool.category, list);
  }
  const ordered = [
    ...CATEGORY_ORDER.filter((c) => byCategory.has(c)),
    ...Array.from(byCategory.keys()).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];
  return ordered.map((category) => ({
    category,
    tools: byCategory.get(category) ?? [],
  }));
};

interface ToolSearchProps {
  variant?: "full" | "icon";
  className?: string;
}

export const ToolSearch = ({
  variant = "full",
  className = "",
}: ToolSearchProps): JSX.Element => {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const groups = groupedTools();
  const pausedTools = usePausedTools();

  // ⌘K / Ctrl+K toggles the inline search and focuses it.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Drop the blinking text cursor into the box the moment results open.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  // Close the dropdown when clicking anywhere outside the search.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const handleSelect = (tool: ToolConfig) => {
    const target = isHeroTool(tool.id) ? `/?tool=${tool.id}` : tool.route;
    setOpen(false);
    setQuery("");
    if (target) setLocation(target);
  };

  const results = (
    <CommandPrimitive.List className="max-h-[320px] overflow-y-auto overflow-x-hidden p-1">
      <CommandPrimitive.Empty className="py-6 text-center text-sm text-gray-500">
        No tools found.
      </CommandPrimitive.Empty>
      {groups.map(({ category, tools }) => (
        <CommandPrimitive.Group
          key={category}
          heading={category}
          className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-gray-400"
        >
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isPaused = pausedTools.has(getServerToolType(tool));
            return (
              <CommandPrimitive.Item
                key={tool.id}
                value={`${tool.title} ${tool.description} ${tool.id}`}
                onSelect={() => handleSelect(tool)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md px-2 py-2.5 text-sm outline-none data-[selected=true]:bg-gray-100",
                  isPaused && "opacity-70",
                )}
                data-testid={`search-tool-${tool.id}`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${tool.iconBgColor}`}
                >
                  <Icon className={`h-4 w-4 ${tool.iconColor}`} />
                </span>
                <div className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium text-gray-800">
                    {tool.title}
                  </span>
                  <span className="truncate text-xs text-gray-500">
                    {tool.description}
                  </span>
                </div>
                {isPaused && (
                  <PausedBadge
                    className="ml-auto shrink-0"
                    testId={`search-tool-paused-${tool.id}`}
                  />
                )}
              </CommandPrimitive.Item>
            );
          })}
        </CommandPrimitive.Group>
      ))}
    </CommandPrimitive.List>
  );

  return (
    <div
      ref={containerRef}
      className={cn("relative", variant === "full" ? "w-56 xl:w-64" : "")}
    >
      <CommandPrimitive
        shouldFilter
        className="overflow-visible bg-transparent"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            inputRef.current?.blur();
          }
        }}
      >
        {variant === "full" ? (
          <div
            onClick={() => {
              setOpen(true);
              inputRef.current?.focus();
            }}
            className={cn(
              "flex h-[42px] cursor-text items-center gap-2 rounded-lg border bg-white/80 px-3 transition-colors",
              open ? "border-gray-400" : "border-gray-300",
              className,
            )}
          >
            <Search className="h-4 w-4 shrink-0 text-gray-500" />
            <CommandPrimitive.Input
              ref={inputRef}
              value={query}
              onValueChange={setQuery}
              onFocus={() => setOpen(true)}
              placeholder="Search tools…"
              className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
              data-testid="input-tool-search"
            />
            {!open && (
              <kbd className="hidden xl:inline rounded border border-gray-200 bg-gray-50 px-1.5 font-mono text-[10px] text-gray-400">
                ⌘K
              </kbd>
            )}
          </div>
        ) : (
          <button
            type="button"
            aria-label="Search tools"
            onClick={() => setOpen((prev) => !prev)}
            className={cn(
              "inline-flex h-10 w-10 items-center justify-center rounded-lg border text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900",
              open ? "border-gray-400 bg-gray-50" : "border-gray-300",
              className,
            )}
            data-testid="button-tool-search"
          >
            <Search className="h-5 w-5" />
          </button>
        )}

        {open && (
          <div
            className={cn(
              "absolute z-50 mt-2 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl",
              variant === "full"
                ? "left-0 w-[min(380px,90vw)]"
                : "right-0 w-[min(320px,90vw)]",
            )}
          >
            {variant === "icon" && (
              <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2.5">
                <Search className="h-4 w-4 shrink-0 text-gray-500" />
                <CommandPrimitive.Input
                  ref={inputRef}
                  value={query}
                  onValueChange={setQuery}
                  placeholder="Search tools…"
                  className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
                  data-testid="input-tool-search"
                />
                <button
                  type="button"
                  aria-label="Close search"
                  onClick={() => setOpen(false)}
                  className="text-gray-400 transition-colors hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {results}
          </div>
        )}
      </CommandPrimitive>
    </div>
  );
};
