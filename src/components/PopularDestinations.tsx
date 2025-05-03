
import { useState } from 'react';
import { Link } from 'react-router-dom';
import DestinationCard from './DestinationCard';
import { Button } from "@/components/ui/button";

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
  {
    id: 5,
    name: "Maldives",
    image: "https://images.unsplash.com/photo-1573843981267-be1999ff37cd",
    price: 55000,
    rating: 5.0,
  },
  {
    id: 6,
    name: "Swiss Alps",
    image: "https://images.unsplash.com/photo-1433086966358-54859d0ed716",
    price: 38000,
    rating: 4.7,
  },
  {
    id: 7,
    name: "Machu Picchu, Peru",
    image: "https://images.unsplash.com/photo-1526392060635-9d6019884377",
    price: 42000,
    rating: 4.9,
  },
  {
    id: 8,
    name: "Dubai, UAE",
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c",
    price: 48000,
    rating: 4.8,
  },
  {
    id: 9,
    name: "Serengeti, Tanzania",
    image: "https://images.unsplash.com/photo-1516426122078-c23e76319801",
    price: 52000,
    rating: 4.7,
  },
];

const PopularDestinations = () => {
  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-udan-charcoal">Popular Destinations</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {destinations.map((destination) => (
            <div key={destination.id}>
              <DestinationCard 
                image={destination.image}
                name={destination.name}
                price={destination.price}
                rating={destination.rating}
              />
            </div>
          ))}
        </div>

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
