"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Send, CheckCircle } from "lucide-react";
import type React from "react";
import { motion } from "framer-motion";

export default function ContactForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

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
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 p-8"
    >
      <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
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
                Send Message <Send className="ml-2 h-4 w-5" />
              </span>
            )}
          </Button>
        </form>
      )}
    </motion.div>
  );
}
