"use client"

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from "framer-motion"
import { 
  Sparkles, 
  Calendar, 
  Code, 
  Settings, 
  Star, 
  Users, 
  Menu, 
  X, 
  Home,
  ChevronRight
} from "lucide-react"
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useParams, usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'

export default function Sidebar() {
  // Get the current project ID from the URL
  const params = useParams();
  const pathname = usePathname();

  // Extract projectId from params
  const projectId = params?.projectId as string;

  // State for mobile menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on a project page
  const isProjectPage = pathname?.includes('/projects/') && projectId;

  // Check if we're on the members page
  const isMembersPage = pathname?.includes('/members');

  // Check if we're on the main dashboard page
  const isDashboardPage = pathname === '/dashboard' || pathname === '/dashboard/projects';

  // Check if we're on the settings page
  const isSettingsPage = pathname?.includes('/settings');

  // Check screen size on mount and when window resizes
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Close mobile menu when navigating
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  // Navigation items
  const navItems = [
    {
      name: "Projects",
      href: "/dashboard",
      icon: <Code className="h-4 w-4 text-primary" />,
      isActive: isDashboardPage,
      color: "primary",
      showAlways: true
    },
    {
      name: "Calendar",
      href: "#",
      icon: <Calendar className="h-4 w-4 text-green-500" />,
      isActive: false,
      color: "green-500",
      showAlways: true
    },
    {
      name: "Members",
      href: `/dashboard/projects/${projectId}/members`,
      icon: <Users className="h-4 w-4 text-green-500" />,
      isActive: isMembersPage,
      color: "green-500",
      showAlways: false,
      showWhen: isProjectPage
    },
    {
      name: "Settings",
      href: "/settings",
      icon: <Settings className="h-4 w-4 text-muted-foreground" />,
      isActive: isSettingsPage,
      color: "muted-foreground",
      showAlways: true,
      isBottom: true
    }
  ];

  // Sidebar content component to avoid duplication
  const SidebarContent = ({ isMobile = false }) => (
    <div className="flex flex-col h-full">
      {!isMobile && (
        <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center space-x-2">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 180 }}
              transition={{ duration: 0.3 }}
              className="p-2 rounded-xl bg-primary/20"
            >
              <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            </motion.div>
            <Link href={'/'}>
              <h1 className="text-xl font-bold rainbow-text hover:pointer">
                ProjectMate
              </h1>
            </Link>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto py-4 px-2">
        <nav className="space-y-2">
          {navItems
            .filter(item => (item.showAlways || item.showWhen) && !item.isBottom)
            .map((item, index) => (
              <Button
                key={index}
                variant={item.isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start transition-all duration-300",
                  item.isActive
                    ? `bg-gradient-to-r from-${item.color}/10 via-${item.color}/5 to-transparent hover:from-${item.color}/20 hover:to-${item.color}/5`
                    : `hover:bg-gradient-to-r hover:from-${item.color}/10 hover:to-transparent`
                )}
                asChild
              >
                <Link href={item.href} className="font-medium">
                  <span className="mr-2">{item.icon}</span>
                  {item.name}
                  {item.isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="absolute right-2 w-1 h-5 bg-primary rounded-full"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              </Button>
            ))}
        </nav>
      </div>

      <div className="p-4 border-t space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start bg-gradient-to-r from-amber-500/10 to-transparent hover:from-amber-500/20 hover:to-amber-500/10 border-amber-500/20 transition-all duration-300"
        >
          <Star className="mr-2 h-4 w-4 text-amber-500" />
          <span className="flex-1 text-left">Upgrade to Pro</span>
          <Badge variant="outline" className="ml-2 bg-amber-500/10 text-amber-500 border-amber-500/20">
            New
          </Badge>
        </Button>
        
        {navItems
          .filter(item => item.isBottom && (item.showAlways || item.showWhen))
          .map((item, index) => (
            <Button
              key={index}
              variant={item.isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start transition-all duration-300",
                item.isActive
                  ? `bg-gradient-to-r from-${item.color}/10 via-${item.color}/5 to-transparent hover:from-${item.color}/20 hover:to-${item.color}/5`
                  : `hover:bg-gradient-to-r hover:from-${item.color}/10 hover:to-transparent`
              )}
              asChild
            >
              <Link href={item.href} className="font-medium">
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </Link>
            </Button>
          ))}
      </div>
    </div>
  );

  // Mobile hamburger menu
  const MobileMenu = () => (
    <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm border"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64 border-r">
        <div className="p-4 border-b bg-gradient-to-r from-primary/10 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <motion.div
                whileHover={{ scale: 1.1, rotate: 180 }}
                transition={{ duration: 0.3 }}
                className="p-2 rounded-xl bg-primary/20"
              >
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
              </motion.div>
              <Link href={'/'}>
                <h1 className="text-xl font-bold rainbow-text hover:pointer">
                  ProjectMate
                </h1>
              </Link>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <SidebarContent isMobile={true} />
      </SheetContent>
    </Sheet>
  );

  // Render
  return (
    <>
      {/* Mobile Hamburger Menu */}
      {isMobile && <MobileMenu />}

      {/* Desktop Sidebar */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="hidden md:flex w-64 flex-col border-r bg-card/50 backdrop-blur-sm h-full"
      >
        <SidebarContent />
      </motion.div>
    </>
  )
}
