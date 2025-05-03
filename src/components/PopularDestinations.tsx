
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import DestinationCard from './DestinationCard';
import { Button } from "@/components/ui/button";
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
    image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742",
    price: 25000,
    rating: 4.8,
  },
  {
    id: 2,
    name: "Santorini, Greece",
    image: "https://images.unsplash.com/photo-1426604966848-d7adac402bff",
    price: 45000,
    rating: 4.9,
  },
  {
    id: 3,
    name: "Kyoto, Japan",
    image: "https://images.unsplash.com/photo-1466442929976-97f336a657be",
    price: 35000,
    rating: 4.7,
  },
  {
    id: 4,
    name: "Amalfi Coast, Italy",
    image: "https://images.unsplash.com/photo-1482938289607-e9573fc25ebb",
    price: 40000,
    rating: 4.6,
  },
];

const PopularDestinations = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-udan-charcoal">Popular Destinations</h2>
        </div>
        
        <Carousel className="w-full">
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
          <CarouselPrevious className="left-0 md:-left-12" />
          <CarouselNext className="right-0 md:-right-12" />
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
