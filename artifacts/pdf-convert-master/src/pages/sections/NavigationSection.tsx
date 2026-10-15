import React from "react";
import logoIcon from "@assets/IconOnly_Transparent_NoBuffer_1782108807761.png";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuContent,
} from "@/components/ui/navigation-menu";
import { Link, useLocation } from "wouter";
import { ToolsNavDropdowns, MobileNav } from "@/components/ToolsNavMenu";
import { ToolSearch } from "@/components/ToolSearch";
import { LottieIcon } from "@/components/ui/lottie-icon";
import userAnim from "@/assets/lottie/user.json";
import { cn } from "@/lib/utils";

const ring =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5483B] focus-visible:ring-offset-2";
const linkClass = "site-nav-action whitespace-nowrap";

export const NavigationSection = (): JSX.Element => {
  const [location, setLocation] = useLocation();
  const [loginHover, setLoginHover] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const leadingItem = { name: "Home", href: "/" };
  const trailingItems = [
    { name: "Pricing", href: "/pricing" },
    { name: "About", href: "/about" },
  ];

  const handleGetStarted = () => setLocation("/signup");

  return (
    <header
      className={cn(
        "site-header sticky top-0 z-50 h-[72px] w-full border-b border-[#E5E7EB] bg-white/80 backdrop-blur-[12px] transition-shadow duration-200",
        scrolled && "shadow-[0_4px_16px_-8px_rgba(17,24,39,0.12)]",
      )}
    >
      <div className="mx-auto flex h-full w-full max-w-[1280px] items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          aria-label="PDF Genius home"
          className={cn("flex shrink-0 items-center gap-[10px] rounded-lg", ring)}
          data-testid="link-logo"
        >
          <img src={logoIcon} alt="" width={40} height={40} className="h-10 w-10 object-contain" />
          <span className="whitespace-nowrap font-['Inter',system-ui,sans-serif] text-xl font-bold leading-7 text-[#111827]">
            PDF Genius
          </span>
        </Link>

        <div className="hidden min-w-0 flex-1 justify-center xl:flex">
          <NavigationMenu aria-label="Primary" className="flex-none">
            <NavigationMenuList className="gap-1 space-x-0">
              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href={leadingItem.href} aria-current={location === leadingItem.href ? "page" : undefined} className={linkClass} data-testid="nav-home">
                    {leadingItem.name}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <ToolsNavDropdowns />

              <NavigationMenuItem>
                <NavigationMenuLink asChild>
                  <Link href="/pricing" aria-current={location === "/pricing" ? "page" : undefined} className={linkClass} data-testid="nav-pricing">
                    Pricing
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <NavigationMenuItem>
                <NavigationMenuTrigger className={cn(linkClass, "bg-transparent px-0 h-auto")} aria-current={location === "/about" ? "page" : undefined} data-testid="nav-more">
                  More
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-48 p-2">
                    <NavigationMenuLink asChild>
                      <Link href="/about" aria-current={location === "/about" ? "page" : undefined} className="site-nav-row block rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700" data-testid="nav-about">
                        About
                      </Link>
                    </NavigationMenuLink>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex shrink-0 items-center gap-2 xl:gap-3">
          <ToolSearch variant="icon" />
          <div className="hidden items-center gap-3 xl:flex">
            <button
              type="button"
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[15px] font-medium text-[#4B5563] transition-colors duration-150 hover:bg-[#F3F4F6] hover:text-[#111827]",
                ring,
              )}
              onClick={() => setLocation("/signin")}
              onMouseEnter={() => setLoginHover(true)}
              onMouseLeave={() => setLoginHover(false)}
              data-testid="button-nav-login"
            >
              <LottieIcon animationData={userAnim} size={20} play={loginHover} ariaLabel="User account" />
              Log In
            </button>
            <button
              type="button"
              className={cn(
                "inline-flex h-10 items-center rounded-[10px] bg-[#E5483B] px-5 text-[15px] font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition-[background-color,transform] duration-150 hover:-translate-y-px hover:bg-[#D13A2D]",
                ring,
              )}
              onClick={handleGetStarted}
              data-testid="button-nav-api-access"
            >
              API Access
            </button>
          </div>

          <div className="xl:hidden">
            <MobileNav
              modern
              homeItem={leadingItem}
              trailingItems={trailingItems}
              footer={(close) => (
                <div className="flex flex-col gap-3">
                  <button
                    type="button"
                    className={cn(
                      "inline-flex h-12 w-full items-center justify-center gap-2 rounded-[10px] border border-[#E5E7EB] bg-white text-base font-medium text-[#111827] transition-colors hover:bg-[#F3F4F6]",
                      ring,
                    )}
                    onClick={() => { setLocation("/signin"); close(); }}
                    data-testid="mobile-button-login"
                  >
                    <LottieIcon animationData={userAnim} size={20} ariaLabel="User account" />
                    Log In
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex h-12 w-full items-center justify-center rounded-[10px] bg-[#E5483B] text-base font-semibold text-white shadow-[0_1px_2px_rgba(0,0,0,0.1)] transition-colors hover:bg-[#D13A2D]",
                      ring,
                    )}
                    onClick={() => { handleGetStarted(); close(); }}
                    data-testid="mobile-button-get-started"
                  >
                    API Access
                  </button>
                </div>
              )}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
