"use client";

import type React from "react";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Users, Braces } from "lucide-react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const { left, top, width, height } =
        containerRef.current.getBoundingClientRect();
      const x = (e.clientX - left) / width;
      const y = (e.clientY - top) / height;

      containerRef.current.style.setProperty("--mouse-x", `${x}`);
      containerRef.current.style.setProperty("--mouse-y", `${y}`);
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
    }

    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
      }
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative pt-32 pb-20 overflow-hidden"
      style={
        {
          "--mouse-x": "0.5",
          "--mouse-y": "0.5",
        } as React.CSSProperties
      }
    >
      <div className="absolute inset-0 bg-gradient-to-br from-green-50/50 via-emerald-50/30 to-teal-50/50 dark:from-green-950/50 dark:via-emerald-950/30 dark:to-teal-950/50" />

      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {[
          ...Array(
            typeof window !== "undefined" && window.innerWidth > 1024 ? 2 : 1
          ),
        ].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-gradient-to-br from-green-200/20 to-emerald-200/20 dark:from-green-200/10 dark:to-emerald-200/10 blur-3xl"
            style={{
              width: `${Math.random() * 30 + 20}rem`,
              height: `${Math.random() * 30 + 20}rem`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              transform: `translate(-50%, -50%) translate(calc(var(--mouse-x) * 20px - 10px), calc(var(--mouse-y) * 20px - 10px))`,
              transition: "transform 0.2s ease-out",
              opacity: 0.7,
            }}
          />
        ))}
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-4xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 px-4 py-1.5 rounded-full mb-6 font-medium text-sm">
            <Sparkles size={16} className="text-teal-600 dark:text-teal-400" />
            <span>AI-Powered Developer Collaboration</span>
          </div>

          <motion.h1
            className="text-4xl md:text-6xl font-bold text-slate-900 dark:text-white mb-6 leading-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            Collaborate Smarter with{" "}
            <span className="rainbow-text font-bold">AI-Powered</span> Project
            Boards
          </motion.h1>

          <motion.p
            className="text-xl text-slate-600 dark:text-slate-300 mb-8 max-w-3xl mx-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            Transform how your team builds software with intelligent planning,
            task management, and AI assistance that understands your codebase
            and helps you ship faster.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl hover:shadow-green-200/20 dark:hover:shadow-green-900/20 transition-all duration-300">
              <Link
                href="/signin"
                className="flex justify-center items-center gap-2"
              >
                Get Started Free <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300 hover:-translate-y-1 text-lg"
            >
              See Demo
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          className="mt-16 relative"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-xl shadow-2xl shadow-teal-500/10 border border-slate-200 dark:border-slate-800">
            <Image
              src="/images/hero-dashboard.png"
              alt="ProjectMate Platform"
              width={1200}
              height={600}
              className="w-full h-auto"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent from-55% to-slate-900/90 " />
            <div className="absolute bottom-0 left-0 p-6 text-white">
              <div className="flex items-center gap-3 mb-2">
                <Users className="h-5 w-5 text-teal-400" />
                <span className="text-sm font-medium">Team Collaboration</span>
              </div>
              <div className="flex items-center gap-3">
                <Braces className="h-5 w-5 text-teal-400" />
                <span className="text-sm font-medium">AI-Powered Planning</span>
              </div>
            </div>
          </div>

          {/* Floating elements */}
          <div className="absolute -top-8 -right-4 md:right-10 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 rotate-3 animate-float">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  AI Suggestion
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Split this task into 3 subtasks
                </div>
              </div>
            </div>
          </div>

          <div className="absolute -bottom-6 -left-4 md:left-10 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-4 -rotate-2 animate-float-delayed">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-cyan-100 dark:bg-cyan-900 flex items-center justify-center">
                <Users className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div>
                <div className="text-sm font-medium text-slate-900 dark:text-white">
                  Team Update
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  Sarah completed the API integration
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
