import type { Metadata } from "next";
import DeveloperCards from "@/components/landing/developer-cards";

export const metadata: Metadata = {
  title: "Our Developers | ProjectMate",
  description:
    "Meet the talented developers behind ProjectMate, our AI-powered collaboration platform for developers.",
};

export default function DevelopersPage() {
  return (
    <main className="pt-32 pb-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Meet Our <span className="rainbow-text">Developers</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            The talented team behind ProjectMate, building the future of
            AI-powered developer collaboration.
          </p>
        </div>

        <DeveloperCards />
      </div>
    </main>
  );
}
