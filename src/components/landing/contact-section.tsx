"use client";

import type React from "react";

import { useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Send,
  CheckCircle,
  Mail,
  MessageCircle,
  Github,
  Twitter,
  Linkedin,
  Instagram,
} from "lucide-react";

export default function ContactSection() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2">
          <ContactInfo />
        </div>
        <div className="lg:col-span-3">
          <ContactForm />
        </div>
      </div>
    </div>
  );
}

function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px 0px" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    setTimeout(() => {
      setIsSubmitting(false);
      setIsSubmitted(true);

      // Reset form after showing success message
      setTimeout(() => {
        setIsSubmitted(false);
      }, 5000);
    }, 1500);
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl blur-lg opacity-20"></div>
      <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 p-8">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
          <Send className="h-5 w-5 text-green-500" />
          Send us a message
        </h2>

        {isSubmitted ? (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800/30 rounded-lg p-6 text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500 dark:text-green-400" />
            </div>
            <h3 className="text-xl font-semibold text-green-800 dark:text-green-300 mb-2">
              Message Sent!
            </h3>
            <p className="text-green-700 dark:text-green-400">
              Thank you for reaching out. We&apos;ll get back to you as soon as
              possible.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Your Name
                </label>
                <Input
                  id="name"
                  name="name"
                  placeholder="John Doe"
                  required
                  className="border-slate-300 dark:border-slate-600 focus:border-green-500 dark:focus:border-green-500 focus:ring-green-500 dark:focus:ring-green-500"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Email Address
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="john@example.com"
                  required
                  className="border-slate-300 dark:border-slate-600 focus:border-green-500 dark:focus:border-green-500 focus:ring-green-500 dark:focus:ring-green-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="subject"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Subject
              </label>
              <Input
                id="subject"
                name="subject"
                placeholder="How can we help you?"
                required
                className="border-slate-300 dark:border-slate-600 focus:border-green-500 dark:focus:border-green-500 focus:ring-green-500 dark:focus:ring-green-500"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="message"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Message
              </label>
              <Textarea
                id="message"
                name="message"
                placeholder="Tell us more about your inquiry..."
                rows={5}
                required
                className="border-slate-300 dark:border-slate-600 focus:border-green-500 dark:focus:border-green-500 focus:ring-green-500 dark:focus:ring-green-500 resize-none"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl hover:shadow-green-500/20 transition-all duration-300 hover:-translate-y-1"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                <span className="flex items-center">
                  Send Message <Send className="ml-2 h-4 w-4" />
                </span>
              )}
            </Button>
          </form>
        )}
      </div>
    </motion.div>
  );
}

function ContactInfo() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="space-y-6"
    >
      <div className="relative">
        <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl blur-lg opacity-20"></div>
        <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 p-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Mail className="h-5 w-5 text-green-500" />
            Contact Information
          </h3>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Email
                </div>
                <a
                  href="mailto:hello@devcollab.io"
                  className="text-slate-900 dark:text-white font-medium hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  hello@devcollab.io
                </a>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  Support
                </div>
                <a
                  href="mailto:support@devcollab.io"
                  className="text-slate-900 dark:text-white font-medium hover:text-green-600 dark:hover:text-green-400 transition-colors"
                >
                  support@devcollab.io
                </a>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <h4 className="font-medium text-slate-900 dark:text-white mb-3">
              Follow us
            </h4>
            <div className="flex items-center gap-3">
              <SocialButton
                icon={<Twitter className="h-5 w-5" />}
                href="https://twitter.com/"
                label="Twitter"
              />
              <SocialButton
                icon={<Linkedin className="h-5 w-5" />}
                href="https://linkedin.com/"
                label="LinkedIn"
              />
              <SocialButton
                icon={<Github className="h-5 w-5" />}
                href="https://github.com/"
                label="GitHub"
              />
              <SocialButton
                icon={<Instagram className="h-5 w-5" />}
                href="https://instagram.com/"
                label="Instagram"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function SocialButton({
  icon,
  href,
  label,
}: {
  icon: React.ReactNode;
  href: string;
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
