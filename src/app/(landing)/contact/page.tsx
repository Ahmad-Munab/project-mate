import ContactSection from "@/components/landing/contact-section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | DevCollab",
  description:
    "Get in touch with the DevCollab team. We'd love to hear from you!",
};

export default function ContactPage() {
  return (
    <main className="pt-32 pb-20">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-6">
            Get in <span className="rainbow-text">Touch</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-300">
            Have questions or feedback? We&apos;d love to hear from you. Reach
            out to our team using the form below.
          </p>
        </div>

        <ContactSection />
      </div>
    </main>
  );
}
