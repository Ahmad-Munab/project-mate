"use client";

import type React from "react";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import {
  Sparkles,
  Users,
  Braces,
  LineChart,
  Zap,
  MessageSquare,
  Lightbulb,
  GitBranch,
  Bot,
} from "lucide-react";

export default function Features() {
  return (
    <section id="features" className="py-20 bg-white dark:bg-slate-900">
      <div className="container mx-auto px-4">
        <SectionHeader
          title="Supercharge Your Development Workflow"
          description="Our AI-powered collaboration platform helps teams plan, execute, and ship faster with intelligent assistance at every step."
        />

        <div className="mt-16">
          <MainFeature />
        </div>

        <div className="mt-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <FeatureCard
            icon={<Sparkles className="h-6 w-6 text-green-500" />}
            title="AI-Powered Planning"
            description="Let AI help break down complex projects into manageable tasks, estimate timelines, and identify potential blockers before they happen."
            delay={0.1}
          />
          <FeatureCard
            icon={<Users className="h-6 w-6 text-green-500" />}
            title="Real-time Collaboration"
            description="Work together seamlessly with your team in real-time on shared boards, with smart presence indicators and conflict resolution."
            delay={0.2}
          />
          <FeatureCard
            icon={<Braces className="h-6 w-6 text-green-500" />}
            title="Code-Aware Assistance"
            description="Our AI understands your codebase, providing context-aware suggestions and automating repetitive development tasks."
            delay={0.3}
          />
          <FeatureCard
            icon={<LineChart className="h-6 w-6 text-green-500" />}
            title="Progress Analytics"
            description="Get insights into team velocity, bottlenecks, and project health with AI-generated reports and recommendations."
            delay={0.4}
          />
          <FeatureCard
            icon={<Zap className="h-6 w-6 text-green-500" />}
            title="Automated Workflows"
            description="Create custom automation rules to handle routine tasks, notifications, and status updates without manual intervention."
            delay={0.5}
          />
          <FeatureCard
            icon={<MessageSquare className="h-6 w-6 text-green-500" />}
            title="Contextual Discussions"
            description="Have discussions right where they matter - attached to tasks, code snippets, or documents for better context and traceability."
            delay={0.6}
          />
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

function MainFeature() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px 0px" });

  return (
    <div
      ref={ref}
      className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center"
    >
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
        transition={{ duration: 0.8 }}
      >
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-teal-500 to-cyan-500 rounded-xl blur-lg opacity-20"></div>
          <div className="relative bg-white dark:bg-slate-800 rounded-xl shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-1 bg-gradient-to-r from-teal-500/10 to-cyan-500/10">
              <div className="flex gap-1.5 px-3 py-1">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="h-12 w-12 rounded-full bg-emerald-600 dark:bg-emerald-800/50 flex items-center justify-center">
                  <div className="bg-rainbow-gradient p-1.5 rounded-full">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                    AI Project Assistant
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Analyzing your project...
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="bg-rainbow-gradient p-1 rounded-full">
                      <Lightbulb className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-700 dark:text-slate-200">
                        Based on your team&apos;s velocity, I recommend
                        splitting the authentication feature into 3 smaller
                        tasks:
                      </p>
                      <ul className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                          <span>Implement OAuth providers</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                          <span>Create user session management</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <div className="h-1.5 w-1.5 rounded-full bg-green-500"></div>
                          <span>Add role-based permissions</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <GitBranch className="h-5 w-5 text-purple-500 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-700 dark:text-slate-200">
                        I noticed potential conflicts in the API integration
                        branch. Would you like me to suggest a resolution
                        strategy?
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-teal-50 dark:bg-teal-900/30 rounded-lg border border-teal-100 dark:border-teal-800/50">
                  <div className="flex items-start gap-3">
                    <Zap className="h-5 w-5 text-emerald-800 dark:text-emerald-900 mt-0.5" />
                    <div>
                      <p className="text-sm text-slate-700 dark:text-slate-200">
                        I&apos;ve generated test cases for the new API endpoints
                        based on your documentation. Would you like to review
                        them?
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={isInView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="space-y-6"
      >
        <div>
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Bot className="h-6 w-6 text-green-500" />
            Intelligent Project Assistant
          </h3>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Our AI assistant understands your project context, team dynamics,
            and development patterns to provide personalized recommendations
            that actually help.
          </p>
        </div>

        <div className="space-y-4 mt-6">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center shrink-0 mt-1">
              <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                Smart Task Breakdown
              </h4>
              <p className="text-slate-600 dark:text-slate-300">
                The AI analyzes your project requirements and automatically
                suggests optimal task divisions based on complexity and team
                capacity.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center shrink-0 mt-1">
              <Braces className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                Code-Aware Suggestions
              </h4>
              <p className="text-slate-600 dark:text-slate-300">
                Get contextual recommendations based on your actual codebase,
                not generic advice that doesn&apos;t apply to your project.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center shrink-0 mt-1">
              <LineChart className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                Predictive Analytics
              </h4>
              <p className="text-slate-600 dark:text-slate-300">
                Forecast project timelines, identify potential bottlenecks, and
                get early warnings about risks before they impact your delivery
                schedule.
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay }}
      className="group p-6 bg-slate-50 dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 border border-slate-200 dark:border-slate-700 hover:border-teal-200 dark:hover:border-teal-800"
    >
      <div className="h-12 w-12 rounded-lg bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center mb-5 group-hover:bg-teal-50 dark:group-hover:bg-teal-900/30 transition-colors duration-300">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-3">
        {title}
      </h3>
      <p className="text-slate-600 dark:text-slate-300">{description}</p>
    </motion.div>
  );
}
