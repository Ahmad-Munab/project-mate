"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Menu, X, Code2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300",
        scrolled
          ? "bg-white/80 dark:bg-slate-900/80 backdrop-blur-md shadow-md py-3"
          : "bg-transparent py-5"
      )}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400 transition-transform hover:scale-105"
        >
          <Code2 className="h-8 w-8" />
          <span>ProjectMate</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <NavLinks />
          <div className="flex items-center gap-4">
            <Link
              href="/signin"
              className="text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
            >
              Sign In
            </Link>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl hover:shadow-green-200/20 dark:hover:shadow-green-900/20 transition-all duration-300 hover:-translate-y-1">
              Get Started Free
            </Button>
          </div>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-slate-700 dark:text-slate-200"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      <div
        className={cn(
          "md:hidden absolute w-full bg-white dark:bg-slate-900 shadow-lg transition-all duration-300 ease-in-out overflow-hidden",
          isOpen ? "max-h-[500px] py-4" : "max-h-0"
        )}
      >
        <div className="container mx-auto px-4 flex flex-col gap-4">
          <MobileNavLinks />
          <div className="flex flex-col gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <Link
              href="/signin"
              className="text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors py-2"
            >
              Sign In
            </Link>
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white w-full">
              Get Started Free
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}

function NavLinks() {
  return (
    <>
      <Link
        href="#features"
        className="text-slate-700 dark:text-slate-200 hover:text-green-600 dark:hover:text-green-400 transition-colors"
      >
        Features
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-1 text-slate-700 dark:text-slate-200 hover:text-green-600 dark:hover:text-green-400 transition-colors">
          Solutions <ChevronDown size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>
            <Link href="#" className="w-full">
              For Teams
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="#" className="w-full">
              For Startups
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Link href="#" className="w-full">
              For Enterprises
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Link
        href="/developers"
        className="text-slate-700 dark:text-slate-200 hover:text-green-600 dark:hover:text-green-400 transition-colors"
      >
        Developers
      </Link>
      <Link
        href="/contact"
        className="text-slate-700 dark:text-slate-200 hover:text-green-600 dark:hover:text-green-400 transition-colors"
      >
        Contact
      </Link>
      <Link
        href="#pricing"
        className="text-slate-700 dark:text-slate-200 hover:text-green-600 dark:hover:text-green-400 transition-colors"
      >
        Pricing
      </Link>
      <Link
        href="#faq"
        className="text-slate-700 dark:text-slate-200 hover:text-green-600 dark:hover:text-green-400 transition-colors"
      >
        FAQ
      </Link>
    </>
  );
}

function MobileNavLinks() {
  return (
    <>
      <Link
        href="#features"
        className="text-slate-700 dark:text-slate-200 hover:text-green-600 dark:hover:text-green-400 transition-colors py-2"
      >
        Features
      </Link>
      <div className="py-2">
        <div className="text-slate-700 dark:text-slate-200 mb-2">Solutions</div>
        <div className="pl-4 flex flex-col gap-2">
          <Link
            href="#"
            className="text-slate-600 dark:text-slate-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
          >
            For Teams
          </Link>
          <Link
            href="#"
            className="text-slate-600 dark:text-slate-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
          >
            For Startups
          </Link>
          <Link
            href="#"
            className="text-slate-600 dark:text-slate-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
          >
            For Enterprises
          </Link>
        </div>
      </div>
      <Link
        href="/developers"
        className="text-slate-700 dark:text-slate-200 hover:text-green-600 dark:hover:text-green-400 transition-colors py-2"
      >
        Developers
      </Link>
      <Link
        href="/contact"
        className="text-slate-700 dark:text-slate-200 hover:text-green-600 dark:hover:text-green-400 transition-colors py-2"
      >
        Contact
      </Link>
      <Link
        href="#pricing"
        className="text-slate-700 dark:text-slate-200 hover:text-green-600 dark:hover:text-green-400 transition-colors py-2"
      >
        Pricing
      </Link>
      <Link
        href="#faq"
        className="text-slate-700 dark:text-slate-200 hover:text-green-600 dark:hover:text-green-400 transition-colors py-2"
      >
        FAQ
      </Link>
    </>
  );
}
