
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import PartnersSection from "@/components/PartnersSection";
import PopularDestinations from "@/components/PopularDestinations";
import ServicesSection from "@/components/ServicesSection";
import CruiseSection from "@/components/CruiseSection";

const Index = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        <HeroSection />
        <PartnersSection />
        <PopularDestinations />
        <ServicesSection />
        <CruiseSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
