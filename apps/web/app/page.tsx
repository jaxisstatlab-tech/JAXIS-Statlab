import Navbar from "./components/layout/Navbar";
import Hero from "./components/sections/Hero";
import Approach from "./components/sections/Approach";
import Solutions from "./components/sections/Solutions";
import HowItWorks from "./components/sections/HowItWorks";
import Pricing from "./components/sections/Pricing";
import Security from "./components/sections/Security";
import FAQ from "./components/sections/FAQ";
import FooterCTA from "./components/sections/FooterCTA";

export default function Home() {
  return (
    <div className="site-root" style={{ backgroundColor: "#010114", minHeight: "100vh" }}>
      <Navbar />
      <main>
        <Hero />
        <Approach />
        <HowItWorks />
        <Solutions />
        <Pricing />
        <Security />
        <FAQ />
        <FooterCTA />
      </main>
    </div>
  );
}
