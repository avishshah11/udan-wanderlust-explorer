
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import DestinationCard from './DestinationCard';
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from "@/components/ui/carousel";

const destinations = [
  {
    id: 1,
    name: "Bali, Indonesia",
    image: "https://images.unsplash.com/photo-1555400038-63f5ba517a47",
    price: 25000,
    rating: 4.8,
  },
  {
    id: 2,
    name: "Santorini, Greece",
    image: "https://images.unsplash.com/photo-1615015456178-ae6bb600b7ef",
    price: 45000,
    rating: 4.9,
  },
  {
    id: 3,
    name: "Kyoto, Japan",
    image: "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e",
    price: 35000,
    rating: 4.7,
  },
  {
    id: 4,
    name: "Amalfi Coast, Italy",
    image: "https://images.unsplash.com/photo-1533656338503-b22f63e96cd8",
    price: 40000,
    rating: 4.6,
  },
];

const PopularDestinations = () => {
  const isMobile = useIsMobile();
  const [shouldShowControls, setShouldShowControls] = useState(true);
  const [api, setApi] = useState<any>(null);

  useEffect(() => {
    if (!api) return;
    
    // Check if we should show controls based on content size vs viewport
    const checkShouldShowControls = () => {
      if (api) {
        const { slidesInView } = api;
        // Only show controls if we have more slides than what's visible
        setShouldShowControls(slidesInView() < destinations.length);
      }
    };
    
    // Run once and on window resize
    checkShouldShowControls();
    window.addEventListener('resize', checkShouldShowControls);
    
    return () => {
      window.removeEventListener('resize', checkShouldShowControls);
    };
  }, [api]);

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-udan-charcoal">Popular Destinations</h2>
          
          {shouldShowControls && (
            <div className="flex space-x-2">
              <CarouselPrevious className="static transform-none h-8 w-8 rounded-full" />
              <CarouselNext className="static transform-none h-8 w-8 rounded-full" />
            </div>
          )}
        </div>
        
        <Carousel className="w-full" setApi={setApi}>
          <CarouselContent className="-ml-4">
            {destinations.map((destination) => (
              <CarouselItem key={destination.id} className="pl-4 md:basis-1/2 lg:basis-1/3 xl:basis-1/4">
                <DestinationCard 
                  image={destination.image}
                  name={destination.name}
                  price={destination.price}
                  rating={destination.rating}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>

        <div className="mt-10 text-center">
          <Button asChild className="bg-udan-orange hover:bg-udan-orange/90 text-white px-6 py-2 rounded-full">
            <Link to="/contact">Plan your trip</Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default PopularDestinations;
