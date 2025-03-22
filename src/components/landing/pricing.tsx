"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Check, ArrowRight } from "lucide-react"

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-slate-50 dark:bg-slate-900/50">
      <div className="container mx-auto px-4">
        <SectionHeader
          title="Simple, Transparent Pricing"
          description="Choose the plan that's right for your team. All plans include a 14-day free trial."
        />

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <PricingCard
            title="Team"
            price="$12"
            description="Perfect for small teams getting started with collaboration."
            features={[
              "Up to 10 team members",
              "Unlimited projects",
              "Basic AI assistance",
              "Real-time collaboration",
              "Standard integrations",
              "Email support",
            ]}
            buttonText="Start Free Trial"
            delay={0.1}
            popular={false}
          />

          <PricingCard
            title="Business"
            price="$29"
            description="Advanced features for growing teams with complex needs."
            features={[
              "Unlimited team members",
              "Unlimited projects",
              "Advanced AI capabilities",
              "Custom workflows & automation",
              "Priority support",
              "Advanced analytics",
              "SSO & advanced security",
            ]}
            buttonText="Start Free Trial"
            delay={0.3}
            popular={true}
          />
        </div>

        <div className="mt-12 text-center">
          <p className="text-slate-600 dark:text-slate-300">
            Need a custom plan for your enterprise?{" "}
            <a href="#" className="text-teal-600 dark:text-teal-400 hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px 0px" })

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
  )
}

function PricingCard({
  title,
  price,
  description,
  features,
  buttonText,
  delay,
  popular,
}: {
  title: string
  price: string
  description: string
  features: string[]
  buttonText: string
  delay: number
  popular: boolean
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px 0px" })

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay }}
      className={`relative rounded-xl overflow-hidden ${
        popular
          ? "bg-gradient-to-b from-green-500 to-emerald-600 shadow-xl shadow-green-500/20"
          : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-lg"
      }`}
    >
      {popular && (
        <div className="absolute top-0 right-0">
          <div className="bg-amber-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg shadow-sm">POPULAR</div>
        </div>
      )}

      <div className={`p-8 ${popular ? "bg-white/10 backdrop-blur-sm" : ""}`}>
        <h3 className={`text-2xl font-bold mb-2 ${popular ? "text-white" : "text-slate-900 dark:text-white"}`}>
          {title}
        </h3>
        <div className="flex items-baseline mb-5">
          <span className={`text-4xl font-bold ${popular ? "text-white" : "text-slate-900 dark:text-white"}`}>
            {price}
          </span>
          <span className={`ml-2 ${popular ? "text-white/80" : "text-slate-500 dark:text-slate-400"}`}>
            per user/month
          </span>
        </div>
        <p className={`mb-6 ${popular ? "text-white/90" : "text-slate-600 dark:text-slate-300"}`}>{description}</p>

        <Button
          className={`w-full ${
            popular
              ? "bg-white text-green-600 hover:bg-slate-100 shadow-lg"
              : "bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl hover:shadow-green-500/20"
          } transition-all duration-300 hover:-translate-y-1`}
        >
          {buttonText} <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>

      <div className={`p-8 ${popular ? "bg-white/5" : "bg-slate-50 dark:bg-slate-800/50"}`}>
        <p className={`font-medium mb-4 ${popular ? "text-white" : "text-slate-900 dark:text-white"}`}>
          What&apos;s included:
        </p>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className={`mt-1 ${popular ? "text-green-300" : "text-green-500 dark:text-green-400"}`}>
                <Check className="h-5 w-5" />
              </div>
              <span className={`${popular ? "text-white/90" : "text-slate-600 dark:text-slate-300"}`}>{feature}</span>
            </li>
          ))}
        </ul>
      </div>
    </motion.div>
  )
}

