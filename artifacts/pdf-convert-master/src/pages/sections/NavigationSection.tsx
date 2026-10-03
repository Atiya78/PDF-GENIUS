import React from "react";
import logoIcon from "@assets/IconOnly_Transparent_NoBuffer_1782108807761.png";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
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
    { name: "Pricing", href: "/pricing" },
    { name: "About", href: "/about" },
  ];

  const handleNavClick = (href: string) => {
    if (href.startsWith("/")) {
      setLocation(href);
    }
  };

  // Remove direct login functionality from navigation, redirect to sign-in page instead

  const handleGetStarted = () => {
    // Redirect to signup page
    setLocation('/signup');
  };

  return (
    <header className="sticky top-0 z-50 w-full h-[65px] bg-white/60 backdrop-blur-xl backdrop-saturate-150">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 h-[65px]">
        <div className="flex items-center justify-between h-full">
          {/* Logo */}
          <div
            className="flex items-center gap-2 h-9 cursor-pointer flex-shrink-0"
            onClick={() => handleNavClick("/")}
          >
            <img
              src={logoIcon}
              alt="PDF Genius"
              className="h-9 w-auto"
            />
            <h1 className="hidden 2xl:block font-['Poppins'] font-bold text-gray-900 text-xl leading-7 whitespace-nowrap">
              PDF Genius
            </h1>
          </div>

          {/* Navigation Menu */}
          <NavigationMenu className="hidden lg:flex justify-center">
            <NavigationMenuList className="flex items-center space-x-8">
              <NavigationMenuItem>
                <NavigationMenuLink
                  className="font-medium text-gray-600 text-base leading-6 whitespace-nowrap cursor-pointer hover:text-gray-900 transition-colors"
                  onClick={() => handleNavClick(leadingItem.href)}
                  data-testid="nav-home"
                >
                  {leadingItem.name}
                </NavigationMenuLink>
              </NavigationMenuItem>

              <ToolsNavDropdowns />

              {trailingItems.map((item, index) => (
                <NavigationMenuItem key={index}>
                  <NavigationMenuLink
                    className="font-medium text-gray-600 text-base leading-6 whitespace-nowrap cursor-pointer hover:text-gray-900 transition-colors"
                    onClick={() => handleNavClick(item.href)}
                    data-testid={`nav-${item.name.toLowerCase()}`}
                  >
                    {item.name}
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Auth Buttons (desktop) */}
          <div className="hidden lg:flex items-center space-x-3">
            <ToolSearch />
            <Button
              variant="outline"
              className="group h-[42px] pl-[12px] pr-[17px] py-[9px] gap-1.5 rounded-lg border border-gray-300/70 font-medium !text-gray-700 text-base hover:!text-gray-900 hover:bg-white/40 transition-colors bg-transparent"
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
              className="h-10 px-6 py-2 rounded-full font-medium text-base [text-shadow:0px_10px_15px_#0000001a]"
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
    </header>
  );
};
