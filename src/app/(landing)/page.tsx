import Navbar from "@/components/landing/navbar";
import Hero from "@/components/landing/hero";
import Features from "@/components/landing/features";
import Pricing from "@/components/landing/pricing";
import Faq from "@/components/landing/faq";
import Footer from "@/components/landing/footer";
import ScrollToTop from "@/components/landing/scroll-to-top";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <Faq />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
