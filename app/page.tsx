

import { About } from "@/components/landingpage/About";
import { Cta } from "@/components/landingpage/Cta";
import { FAQ } from "@/components/landingpage/FAQ";
import { Features } from "@/components/landingpage/Features";
import { Footer } from "@/components/landingpage/Footer";
import { Hero } from "@/components/landingpage/Hero";
import { HowItWorks } from "@/components/landingpage/HowItWorks";
import { Navbar } from "@/components/landingpage/Navbar";
import { Newsletter } from "@/components/landingpage/Newsletter";
import { Pricing } from "@/components/landingpage/Pricing";
import { ScrollToTop } from "@/components/landingpage/ScrollToTop";
import { Services } from "@/components/landingpage/Services";
import { Sponsors } from "@/components/landingpage/Sponsors";
import { Team } from "@/components/landingpage/Team";
import { Testimonials } from "@/components/landingpage/Testimonials";


export default function HomePage() {
  return (
    <>
      <Navbar />
      <Hero />
      <Sponsors />
      <About />
      <HowItWorks />
      <Features />
      <Services />
      <Cta />
      <Testimonials />
      <Team />
      <Pricing />
      <Newsletter />
      <FAQ />
      <Footer />
      <ScrollToTop />
    </>
  );
}
