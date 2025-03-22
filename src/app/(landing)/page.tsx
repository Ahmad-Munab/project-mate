import Hero from "@/components/landing/hero";
import Features from "@/components/landing/features";
import Pricing from "@/components/landing/pricing";
import Faq from "@/components/landing/faq";
import ScrollToTop from "@/components/landing/scroll-to-top";

export default function Home() {
  return (
    <>
      <Hero />
      <Features />
      <Pricing />
      <Faq />
      <ScrollToTop />
    </>
  );
}
