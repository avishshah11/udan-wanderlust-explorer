
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";

const HeroSection = () => {
  return (
    <section className="pt-28 pb-16 md:pt-40 md:pb-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-udan-charcoal leading-tight">
              Let's <span className="text-udan-orange">travel</span> the world
            </h1>
            <p className="text-udan-gray text-lg md:text-xl max-w-md">
              Experience the world's most beautiful destinations with our premium travel services. Your journey begins here.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button asChild className="bg-udan-orange hover:bg-udan-orange/90 text-white px-6 py-2 rounded-full text-base md:text-lg">
                <Link to="/contact">Plan your trip</Link>
              </Button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 relative">
            <div className="flex flex-col gap-4">
              <img 
                src="https://images.unsplash.com/photo-1506744038136-46273834b3fb" 
                alt="Mountain landscape" 
                className="w-full h-auto rounded-xl object-cover max-h-60"
              />
              <img 
                src="https://images.unsplash.com/photo-1500375592092-40eb2168fd21" 
                alt="Beach view" 
                className="w-full h-auto rounded-xl object-cover max-h-60"
              />
            </div>
            <div className="mt-8">
              <img 
                src="https://images.unsplash.com/photo-1472396961693-142e6e269027" 
                alt="Wildlife" 
                className="w-full h-auto rounded-xl object-cover h-full"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
