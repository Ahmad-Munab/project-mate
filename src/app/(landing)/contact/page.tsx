import type { Metadata } from "next";
import ContactForm from "@/components/landing/contact-form";
import SocialLinks from "@/components/landing/social-links";

export const metadata: Metadata = {
  title: "Contact Us | ProjectMate",
  description:
    "Get in touch with the ProjectMate team. We'd love to hear from you!",
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <ContactForm />
          <SocialLinks />
        </div>
      </div>
    </main>
  );
}
