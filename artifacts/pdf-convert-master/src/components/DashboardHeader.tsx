import React, { useState } from "react";
import logoIcon from "@assets/IconOnly_Transparent_NoBuffer_1782108807761.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { ToolsNavDropdowns, MobileNav } from "@/components/ToolsNavMenu";
import { ToolSearch } from "@/components/ToolSearch";
import { NotificationsBell } from "@/components/NotificationsBell";
import {
  User,
  Settings,
  LogOut,
  Home,
  Wrench,
  BookOpen,
  BarChart3
} from "lucide-react";

export const DashboardHeader = (): JSX.Element => {
  const [location, setLocation] = useLocation();
  const { user, signout } = useAuth();

  // Simple (non-dropdown) navigation links; the tool categories render as dropdowns
  const leadingItem = { name: "Home", href: "/dashboard" };
  const trailingItems = [{ name: "About", href: "/about" }];

  const handleManagePlan = () => {
    setLocation("/dashboard/manage-plans");
  };

  const handleLogout = () => {
    signout();
    setLocation("/");
  };

  return (
    <header className="sticky top-0 z-50 bg-white/60 backdrop-blur-xl backdrop-saturate-150 px-4 sm:px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Left - Logo */}
        <div className="flex items-center">
          <Link
            href="/dashboard"
            aria-label="PDF Genius dashboard"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src={logoIcon} alt="PDF Genius" width={1280} height={1239} className="h-9 w-auto" />
          </Link>
        </div>

        {/* Center - Navigation Menu */}
        <NavigationMenu className="hidden lg:flex justify-center">
          <NavigationMenuList className="flex items-center space-x-0 gap-3 xl:gap-4">
            <NavigationMenuItem>
              <NavigationMenuLink
                asChild
              >
                <Link href={leadingItem.href} aria-current={location === leadingItem.href ? "page" : undefined} className="site-nav-action font-medium text-gray-600 text-sm xl:text-base leading-6 whitespace-nowrap px-3 py-2 rounded-lg" data-testid="nav-home">
                {leadingItem.name}
                </Link>
              </NavigationMenuLink>
            </NavigationMenuItem>

            <ToolsNavDropdowns />

            {trailingItems.map((item, index) => (
              <NavigationMenuItem key={index}>
                <NavigationMenuLink
                  asChild
                >
                  <Link href={item.href} aria-current={location === item.href ? "page" : undefined} className="site-nav-action font-medium text-gray-600 text-sm xl:text-base leading-6 whitespace-nowrap px-3 py-2 rounded-lg" data-testid={`nav-${item.name.toLowerCase()}`}>
                  {item.name}
                  </Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

        {/* Right - Plan Status, Notifications and Profile */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Plan Status */}
          <div className="hidden xl:flex items-center px-3 py-2 rounded-lg border border-[#f7433d]/30 bg-[#f7433d]/10">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
            <span className="text-sm font-medium text-[#f7433d] capitalize">{user?.plan || 'Free Plan'}</span>
          </div>

          {/* Manage Plan Button */}
          <Button variant="outline" className="hidden xl:inline-flex text-sm" onClick={handleManagePlan}>
            <Settings className="w-4 h-4 mr-2" />
            Manage Plan
          </Button>

          {/* Tool Search */}
          <ToolSearch variant="icon" />

          {/* Notifications */}
          <NotificationsBell />

          {/* User Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full overflow-hidden p-0"
                aria-label="Account menu"
              >
                {user?.profilePictureUrl ? (
                  <img src={user.profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem onClick={() => setLocation("/dashboard")}>
                <Home className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/dashboard/profile")}>
                <User className="mr-2 h-4 w-4" />
                <span>Account Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/dashboard/usage")}>
                <BarChart3 className="mr-2 h-4 w-4" />
                <span>Usage Statistics</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleManagePlan}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Manage Plan</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile menu */}
          <div className="lg:hidden">
            <MobileNav
              homeItem={leadingItem}
              trailingItems={trailingItems}
              footer={(close) => (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    handleManagePlan();
                    close();
                  }}
                  data-testid="mobile-button-manage-plan"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Manage Plan
                </Button>
              )}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
