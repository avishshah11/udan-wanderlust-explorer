
import { useState, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DestinationCard from './DestinationCard';

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
];

const PopularDestinations = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  const scroll = (direction: 'left' | 'right') => {
    if (containerRef.current) {
      const { current } = containerRef;
      const scrollAmount = 300;
      
      if (direction === 'left') {
        current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
        setScrollPosition(Math.max(0, scrollPosition - scrollAmount));
      } else {
        current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        setScrollPosition(scrollPosition + scrollAmount);
      }
    }
  };

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-udan-charcoal">Popular Destinations</h2>
          
          <div className="flex gap-2">
            <button 
              onClick={() => scroll('left')}
              className="w-10 h-10 rounded-full border border-udan-lightGray bg-white flex items-center justify-center hover:bg-udan-lightGray transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => scroll('right')}
              className="w-10 h-10 rounded-full border border-udan-lightGray bg-white flex items-center justify-center hover:bg-udan-lightGray transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div 
          ref={containerRef}
          className="overflow-x-auto hide-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex gap-6 min-w-max pb-4">
            {destinations.map((destination) => (
              <div key={destination.id} className="min-w-[280px] md:min-w-[320px]">
                <DestinationCard 
                  image={destination.image}
                  name={destination.name}
                  price={destination.price}
                  rating={destination.rating}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PopularDestinations;
