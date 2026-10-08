import React from "react";
import logoIcon from "@assets/IconOnly_Transparent_NoBuffer_1782108807761.png";
import { Button } from "@/components/ui/button";
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

export const NavigationSection = (): JSX.Element => {
  const [location, setLocation] = useLocation();
  const [loginHover, setLoginHover] = React.useState(false);

  // Simple (non-dropdown) navigation links; the tool categories render as dropdowns
  const leadingItem = { name: "Home", href: "/" };
  const trailingItems = [
    { name: "Education Zone", href: "/education" },
    { name: "Pricing", href: "/pricing" },
    { name: "About", href: "/about" },
  ];

  // Remove direct login functionality from navigation, redirect to sign-in page instead

  const handleGetStarted = () => {
    // Redirect to signup page
    setLocation('/signup');
  };

  return (
    <header className="sticky top-0 z-50 w-full h-[65px] bg-white/60 backdrop-blur-xl backdrop-saturate-150">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-[65px]">
        <div className="flex items-center justify-between gap-3 xl:gap-4 2xl:gap-6 h-full">
          {/* Logo */}
          <Link
            href="/"
            aria-label="PDF Genius home"
            className="flex items-center gap-2 h-9 flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            <img
              src={logoIcon}
              alt="PDF Genius"
              width={1280}
              height={1239}
              className="h-9 w-auto"
            />
            <span className="hidden 2xl:block font-['Poppins'] font-bold text-gray-900 text-xl leading-7 whitespace-nowrap">
              PDF Genius
            </span>
          </Link>

          {/* Navigation Menu */}
          <NavigationMenu className="hidden lg:flex justify-center">
            <NavigationMenuList className="flex items-center space-x-0 gap-3 xl:gap-4 2xl:gap-6">
              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                >
                  <Link href={leadingItem.href} aria-current={location === leadingItem.href ? "page" : undefined} className="site-nav-action font-medium text-gray-600 text-sm xl:text-base leading-6 whitespace-nowrap" data-testid="nav-home">
                  {leadingItem.name}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>

              <ToolsNavDropdowns />

              {trailingItems.map((item, index) => (
                <NavigationMenuItem key={index} className={item.name === "Pricing" ? "" : "hidden xl:block"}>
                  <NavigationMenuLink
                    asChild
                  >
                    <Link href={item.href} aria-current={location === item.href ? "page" : undefined} className="site-nav-action font-medium text-gray-600 text-sm xl:text-base leading-6 whitespace-nowrap" data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, "-")}`}>
                    {item.name}
                    </Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
              <NavigationMenuItem className="xl:hidden">
                <NavigationMenuTrigger hideChevron className="site-nav-action bg-transparent px-0 text-sm text-gray-600" aria-current={trailingItems.some(item => item.name !== "Pricing" && item.href === location) ? "page" : undefined} data-testid="nav-more">More</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-48 p-2">
                    {trailingItems.filter(item => item.name !== "Pricing").map(item => (
                      <NavigationMenuLink key={item.href} asChild>
                        <Link href={item.href} aria-current={location === item.href ? "page" : undefined} className="site-nav-row block rounded-md px-3 py-2 text-sm">{item.name}</Link>
                      </NavigationMenuLink>
                    ))}
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          {/* Auth Buttons (desktop) */}
          <div className="flex shrink-0 items-center gap-2 xl:gap-3">
            <ToolSearch variant="responsive" />
            <div className="hidden lg:flex items-center gap-2 xl:gap-3">
            <Button
              variant="outline"
              className="group h-[42px] px-3 py-[9px] gap-1.5 rounded-lg border border-gray-300/70 font-medium !text-gray-700 text-sm xl:text-base hover:!text-gray-900 hover:bg-white/40 transition-colors bg-transparent"
              onClick={() => setLocation('/signin')}
              onMouseEnter={() => setLoginHover(true)}
              onMouseLeave={() => setLoginHover(false)}
            >
              <LottieIcon
                animationData={userAnim}
                size={24}
                play={loginHover}
                ariaLabel="User account"
              />
              Log In
            </Button>
            <Button
              className="h-10 px-3 xl:px-4 py-2 rounded-full font-medium text-sm xl:text-base [text-shadow:0px_10px_15px_#0000001a]"
              onClick={handleGetStarted}
              data-testid="button-nav-api-access"
            >
              API Access
            </Button>
            </div>

          {/* Mobile menu */}
          <div className="lg:hidden">
            <MobileNav
              homeItem={leadingItem}
              trailingItems={trailingItems}
              footer={(close) => (
                <div className="flex flex-col gap-3">
                  <Button
                    variant="outline"
                    className="w-full h-[42px] gap-1.5 rounded-lg border border-gray-300 font-medium !text-gray-700 text-base hover:!text-gray-900 hover:bg-gray-50 transition-colors bg-white"
                    onClick={() => {
                      setLocation('/signin');
                      close();
                    }}
                    data-testid="mobile-button-login"
                  >
                    <LottieIcon
                      animationData={userAnim}
                      size={24}
                      ariaLabel="User account"
                    />
                    Log In
                  </Button>
                  <Button
                    className="w-full h-10 rounded-full font-medium text-base"
                    onClick={() => {
                      handleGetStarted();
                      close();
                    }}
                    data-testid="mobile-button-get-started"
                  >
                    Get API Access
                  </Button>
                </div>
              )}
            />
          </div>
          </div>
        </div>
      </div>
    </header>
  );
};
