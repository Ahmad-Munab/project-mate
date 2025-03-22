"use client";

import type React from "react";

import { useState } from "react";
import { motion } from "framer-motion";
import { Linkedin, Github, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";

const developers = [
  {
    id: 1,
    name: "Alex Johnson",
    role: "Lead Developer & AI Specialist",
    image: "/placeholder.svg?height=300&width=300",
    bio: "Full-stack developer with 8+ years of experience specializing in AI and machine learning integration for developer tools.",
    linkedin: "https://linkedin.com/in/",
    github: "https://github.com/",
    twitter: "https://twitter.com/",
  },
  {
    id: 2,
    name: "Sarah Chen",
    role: "Frontend Architect & UX Designer",
    image: "/placeholder.svg?height=300&width=300",
    bio: "Creative developer focused on building beautiful, accessible, and performant user interfaces with modern web technologies.",
    linkedin: "https://linkedin.com/in/",
    github: "https://github.com/",
    twitter: "https://twitter.com/",
  },
];

export default function DeveloperCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-5xl mx-auto">
      {developers.map((developer) => (
        <DeveloperCard key={developer.id} developer={developer} />
      ))}
    </div>
  );
}

function DeveloperCard({ developer }: { developer: (typeof developers)[0] }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="card-hover-effect relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute inset-0 card-gradient rounded-2xl"></div>

      <div className="p-8 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative">
            <div
              className={`absolute inset-0 rounded-full bg-rainbow-gradient blur-md transition-opacity duration-300 ${
                isHovered ? "opacity-100" : "opacity-0"
              }`}
            ></div>
            <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-700 shadow-md">
              <Image
                src={developer.image || "/placeholder.svg"}
                alt={developer.name}
                className="h-full w-full object-cover"
                width={128}
                height={128}
              />
            </div>
          </div>

          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
              {developer.name}
            </h2>
            <p className="text-emerald-600 dark:text-emerald-400 font-medium mb-3">
              {developer.role}
            </p>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              {developer.bio}
            </p>

            <div className="flex items-center justify-center md:justify-start gap-3">
              <SocialLink
                href={developer.linkedin}
                icon={<Linkedin className="h-5 w-5" />}
                label="LinkedIn"
              />
              <SocialLink
                href={developer.github}
                icon={<Github className="h-5 w-5" />}
                label="GitHub"
              />
              <SocialLink
                href={developer.twitter}
                icon={<Twitter className="h-5 w-5" />}
                label="Twitter"
              />
            </div>
          </div>
        </div>

        <div
          className={`mt-6 overflow-hidden transition-all duration-500 ${
            isHovered ? "max-h-20 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <Button
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white"
            onClick={() => window.open(developer.linkedin, "_blank")}
          >
            Connect on LinkedIn
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

function SocialLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400 transition-colors"
      aria-label={label}
    >
      {icon}
    </a>
  );
}
