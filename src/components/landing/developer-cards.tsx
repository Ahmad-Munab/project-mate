"use client";

import type React from "react";

import { useState } from "react";
import { motion } from "framer-motion";
import { Linkedin, Github, Twitter } from "lucide-react";
import Image from "next/image";

const developers = [
  {
    id: 1,
    name: "Ahmad Munab",
    role: "Software Engineer",
    image: "/placeholder.svg?height=300&width=300",
    bio: "Software Engineer with 3+ years of experience specializing in full-stack development and exploring AI & machine learning for fun!",
    linkedin: "https://linkedin.com/in/",
    github: "https://github.com/",
    twitter: "https://twitter.com/",
  },
  {
    id: 2,
    name: "Mahmud Hasan Amaan",
    role: "Full-Stack Engineer",
    image: "/placeholder.svg?height=300&width=300",
    bio: "Software Engineer with 3+ years of experience specializing in full-stack development and exploring AI & machine learning for fun!",
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
      className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 cursor-pointer transform transition-all duration-500 hover:scale-[1.01]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        boxShadow: isHovered
          ? "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 2px rgba(52, 211, 153, 0.2)"
          : "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      }}
    >
      <div className="p-8 relative z-10">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="relative">
            <div
              className={`absolute -inset-1 rounded-full bg-rainbow-gradient blur-md transition-all duration-500 ${
                isHovered ? "opacity-100 scale-105" : "opacity-0 scale-100"
              }`}
            ></div>
            <div
              className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-700 shadow-lg transition-all duration-500"
              style={{
                transform: isHovered ? "scale(1.05)" : "scale(1)",
                boxShadow: isHovered
                  ? "0 0 25px rgba(52, 211, 153, 0.4)"
                  : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
              }}
            >
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
            <p className="text-green-600 dark:text-green-400 font-medium mb-3">
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
                isHovered={isHovered}
              />
              <SocialLink
                href={developer.github}
                icon={<Github className="h-5 w-5" />}
                label="GitHub"
                isHovered={isHovered}
              />
              <SocialLink
                href={developer.twitter}
                icon={<Twitter className="h-5 w-5" />}
                label="Twitter"
                isHovered={isHovered}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SocialLink({
  href,
  icon,
  label,
  isHovered,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  isHovered: boolean;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="h-10 w-10 rounded-full flex items-center justify-center transition-all duration-500"
      style={{
        backgroundColor: isHovered
          ? "rgba(52, 211, 153, 0.1)"
          : "rgba(241, 245, 249, 1)",
        color: isHovered ? "rgb(22, 163, 74)" : "rgb(71, 85, 105)",
        boxShadow: isHovered ? "0 10px 15px -3px rgba(0, 0, 0, 0.1)" : "none",
      }}
      aria-label={label}
    >
      {icon}
    </a>
  );
}
