"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Faq() {
  return (
    <section id="faq" className="py-20 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4">
        <SectionHeader
          title="Frequently Asked Questions"
          description="Find answers to common questions about our platform and how it can help your team."
        />

        <div className="mt-16 max-w-3xl mx-auto">
          <FaqAccordion />
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-600 dark:text-slate-300">
            Still have questions?{" "}
            <a
              href="#"
              className="text-teal-600 dark:text-teal-400 hover:underline font-medium"
            >
              Contact our support team
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px 0px" });

  return (
    <div ref={ref} className="text-center max-w-3xl mx-auto">
      <motion.h2
        className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6 }}
      >
        {title}
      </motion.h2>
      <motion.p
        className="text-xl text-slate-600 dark:text-slate-300"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        {description}
      </motion.p>
    </div>
  );
}

function FaqAccordion() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px 0px" });

  const faqItems = [
    {
      question: "How does the AI-powered planning work?",
      answer:
        "Our AI analyzes your project requirements, team capacity, and historical data to suggest optimal task breakdowns, estimate timelines, and identify potential risks. It learns from your team's patterns and improves its recommendations over time.",
    },
    {
      question: "Can I integrate with my existing tools?",
      answer:
        "Yes! ProjectMate integrates with popular development tools like GitHub, GitLab, Jira, Slack, and more. Our API also allows for custom integrations with your internal tools and workflows.",
    },
    {
      question: "Is my code and data secure?",
      answer:
        "Absolutely. We implement industry-leading security practices including end-to-end encryption, SOC 2 compliance, and regular security audits. Your code and data remain yours, and we never use it to train our AI models without explicit permission.",
    },
    {
      question: "How does the pricing work for larger teams?",
      answer:
        "Our Team and Business plans are priced per user per month. For larger organizations with 50+ users, we offer custom Enterprise plans with volume discounts. Contact our sales team for a tailored quote.",
    },
    {
      question: "Do you offer a free trial?",
      answer:
        "Yes, all plans include a 14-day free trial with full access to all features. No credit card is required to start your trial, and you can cancel anytime.",
    },
    {
      question: "How is this different from other project management tools?",
      answer:
        "Unlike traditional project management tools, ProjectMate is built specifically for development teams with AI at its core. Our platform understands code, development workflows, and technical dependencies to provide intelligent assistance rather than just tracking tasks.",
    },
  ];

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6 }}
    >
      <Accordion type="single" collapsible className="w-full">
        {faqItems.map((item, index) => (
          <AccordionItem
            key={index}
            value={`item-${index}`}
            className="border-b border-slate-200 dark:border-slate-700"
          >
            <AccordionTrigger className="text-left text-lg font-medium text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400 py-5">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-slate-600 dark:text-slate-300 pb-5">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </motion.div>
  );
}
