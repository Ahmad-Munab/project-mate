"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Settings, Star, Users, Menu, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import { cva } from "class-variance-authority";

// Custom Sheet components to avoid double close button
const Sheet = SheetPrimitive.Root;
const SheetTrigger = SheetPrimitive.Trigger;
const SheetClose = SheetPrimitive.Close;
const SheetPortal = SheetPrimitive.Portal;
const SheetOverlay = React.forwardRef<
    React.ElementRef<typeof SheetPrimitive.Overlay>,
    React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
    <SheetPrimitive.Overlay
        className={cn(
            "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            className
        )}
        {...props}
        ref={ref}
    />
));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;

const sheetVariants = cva(
    "fixed z-50 gap-4 bg-background p-0 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out",
    {
        variants: {
            side: {
                top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
                bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
                left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
                right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
            },
        },
        defaultVariants: {
            side: "right",
        },
    }
);

interface SheetContentProps
    extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content> {
    side?: "top" | "right" | "bottom" | "left";
}

const SheetContent = React.forwardRef<
    React.ElementRef<typeof SheetPrimitive.Content>,
    SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
    <SheetPortal>
        <SheetOverlay />
        <SheetPrimitive.Content
            ref={ref}
            className={cn(sheetVariants({ side }), className)}
            {...props}
        >
            {children}
        </SheetPrimitive.Content>
    </SheetPortal>
));
SheetContent.displayName = SheetPrimitive.Content.displayName;

const SheetTitle = React.forwardRef<
    React.ElementRef<typeof SheetPrimitive.Title>,
    React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
    <SheetPrimitive.Title
        ref={ref}
        className={cn("text-foreground text-lg font-semibold", className)}
        {...props}
    />
));
SheetTitle.displayName = SheetPrimitive.Title.displayName;

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
    const isProjectPage = pathname?.includes("/projects/") && projectId;

    // Check if we're on the members page
    const isMembersPage = pathname?.includes("/members");

    // Check if we're on the settings page
    const isSettingsPage = pathname?.includes("/settings");

    // Check screen size on mount and when window resizes
    useEffect(() => {
        const checkScreenSize = () => {
            setIsMobile(window.innerWidth < 768);
        };

        // Initial check
        checkScreenSize();

        // Add event listener
        window.addEventListener("resize", checkScreenSize);

        // Cleanup
        return () => window.removeEventListener("resize", checkScreenSize);
    }, []);

    // Close mobile menu when navigating
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    // Navigation items
    const navItems = [
        {
            name: "Members",
            href: `/dashboard/projects/${projectId}/members`,
            icon: <Users className="h-4 w-4 text-green-500" />,
            isActive: isMembersPage,
            showAlways: false,
            showWhen: isProjectPage,
        },
        {
            name: "Settings",
            href: "/settings",
            icon: <Settings className="h-4 w-4 text-muted-foreground" />,
            isActive: isSettingsPage,
            showAlways: true,
            isBottom: true,
        },
    ];

    // Sidebar content component to avoid duplication
    const SidebarContent = ({ isMobile = false }) => (
        <div className="flex flex-col h-full">
            {!isMobile && (
                <div className="flex items-center space-x-2 p-4">
                    <Link href={"/dashboard"}>
                        <h1 className="text-xl font-bold hover:pointer">
                            ProjectMate
                        </h1>
                    </Link>
                </div>
            )}

            <div className="flex-1 overflow-y-auto py-4 px-2">
                <nav className="space-y-2">
                    {navItems
                        .filter(
                            (item) =>
                                (item.showAlways || item.showWhen) &&
                                !item.isBottom
                        )
                        .map((item, index) => (
                            <Button
                                key={index}
                                variant={item.isActive ? "secondary" : "ghost"}
                                className={cn(
                                    "w-full justify-start transition-all duration-300",
                                    item.isActive
                                        ? "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent hover:from-primary/20 hover:to-primary/5"
                                        : "hover:bg-gradient-to-r hover:from-primary/10 hover:to-transparent"
                                )}
                                asChild
                            >
                                <Link href={item.href} className="font-medium">
                                    <span className="mr-2 flex-shrink-0">
                                        {item.icon}
                                    </span>
                                    <span className="truncate">
                                        {item.name}
                                    </span>
                                    {item.isActive && (
                                        <motion.div
                                            layoutId="activeIndicator"
                                            className="absolute right-2 w-1 h-5 bg-primary rounded-full"
                                            transition={{
                                                type: "spring",
                                                stiffness: 300,
                                                damping: 30,
                                            }}
                                        />
                                    )}
                                </Link>
                            </Button>
                        ))}
                </nav>
            </div>

            <div className="p-2 border-t mt-auto">
                {/* Upgrade to Pro Button */}
                <Button
                    variant="outline"
                    className="w-full justify-start bg-gradient-to-r from-amber-500/10 to-transparent hover:from-amber-500/20 hover:to-amber-500/10 border-amber-500/20 transition-all duration-300 mb-2 h-auto py-2"
                >
                    <div className="flex items-center w-full">
                        <Star className="mr-2 h-4 w-4 text-amber-500 flex-shrink-0" />
                        <span className="truncate">Upgrade to Pro</span>
                        <Badge
                            variant="outline"
                            className="ml-auto bg-amber-500/10 text-amber-500 border-amber-500/20 flex-shrink-0 text-xs px-1.5"
                        >
                            New
                        </Badge>
                    </div>
                </Button>

                {/* Settings Button */}
                {navItems
                    .filter(
                        (item) =>
                            item.isBottom && (item.showAlways || item.showWhen)
                    )
                    .map((item, index) => (
                        <Button
                            key={index}
                            variant={item.isActive ? "secondary" : "ghost"}
                            className={cn(
                                "w-full justify-start transition-all duration-300",
                                item.isActive
                                    ? "bg-gradient-to-r from-primary/10 via-primary/5 to-transparent hover:from-primary/20 hover:to-primary/5"
                                    : "hover:bg-gradient-to-r hover:from-primary/10 hover:to-transparent"
                            )}
                            asChild
                        >
                            <Link href={item.href} className="font-medium">
                                <span className="mr-2 flex-shrink-0">
                                    {item.icon}
                                </span>
                                <span className="truncate">{item.name}</span>
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
                    className="md:hidden fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm border rounded-full h-10 w-10 shadow-md"
                >
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 border-r">
                <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                <div className="flex items-center justify-between p-4">
                    <div className="flex items-center space-x-2">
                        <Link
                            href={"/dashboard"}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            <h1 className="text-xl font-bold hover:pointer">
                                ProjectMate
                            </h1>
                        </Link>
                    </div>
                    <SheetClose asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full h-8 w-8"
                        >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Close menu</span>
                        </Button>
                    </SheetClose>
                </div>
                <div className="flex flex-col h-[calc(100vh-73px)]">
                    <SidebarContent isMobile={true} />
                </div>
            </SheetContent>
        </Sheet>
    );

    // Only render the appropriate sidebar based on screen size
    return (
        <>
            {/* Mobile Hamburger Menu - Only show when mobile */}
            {isMobile ? (
                <MobileMenu />
            ) : (
                <div className="w-64 flex-col border-r bg-card/50 backdrop-blur-sm h-full">
                    <SidebarContent />
                </div>
            )}
        </>
    );
}
