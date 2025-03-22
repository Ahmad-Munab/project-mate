"use client";

import type React from "react";

import { motion } from "framer-motion";
import {
  Github,
  Twitter,
  Linkedin,
  Mail,
  MessageCircle,
  Instagram,
} from "lucide-react";

export default function SocialLinks() {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8"
    >
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
        Connect with us
      </h2>

      <div className="space-y-6">
        <p className="text-slate-600 dark:text-slate-300 mb-8">
          Prefer to reach out directly? Connect with us on any of these
          platforms:
        </p>

        <div className="space-y-5">
          <SocialLink
            icon={<Mail className="h-5 w-5" />}
            platform="Email"
            handle="hello@ProjectMate.io"
            href="mailto:hello@ProjectMate.io"
          />
          <SocialLink
            icon={<Twitter className="h-5 w-5" />}
            platform="Twitter"
            handle="@ProjectMateHQ"
            href="https://twitter.com/"
          />
          <SocialLink
            icon={<Linkedin className="h-5 w-5" />}
            platform="LinkedIn"
            handle="ProjectMate"
            href="https://linkedin.com/company/"
          />
          <SocialLink
            icon={<Github className="h-5 w-5" />}
            platform="GitHub"
            handle="ProjectMateHQ"
            href="https://github.com/"
          />
          <SocialLink
            icon={<MessageCircle className="h-5 w-5" />}
            platform="Discord"
            handle="Join our community"
            href="https://discord.gg/"
          />
          <SocialLink
            icon={<Instagram className="h-5 w-5" />}
            platform="Instagram"
            handle="@ProjectMate"
            href="https://instagram.com/"
          />
        </div>

        <div className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-700">
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
              Need immediate assistance?
            </h3>
            <p className="text-slate-600 dark:text-slate-300 mb-4">
              Our support team is available Monday through Friday, 9am-5pm EST.
            </p>
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
              <Mail className="h-4 w-4" />
              <span>support@ProjectMate.io</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SocialLink({
  icon,
  platform,
  handle,
  href,
}: {
  icon: React.ReactNode;
  platform: string;
  handle: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 p-4 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
    >
      <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 group-hover:bg-green-100 dark:group-hover:bg-green-900/30 group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {platform}
        </div>
        <div className="text-slate-900 dark:text-white font-medium group-hover:text-green-600 dark:group-hover:text-green-400 transition-colors">
          {handle}
        </div>
      </div>
    </a>
  );
}
