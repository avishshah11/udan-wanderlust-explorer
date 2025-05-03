
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DestinationCard from "@/components/DestinationCard";
import { Link } from "react-router-dom";

const indiaDestinations = [
  {
    id: 1,
    name: "Kerala Backwaters",
    image: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944",
    price: 15000,
    rating: 4.7,
  },
  {
    id: 2,
    name: "Taj Mahal, Agra",
    image: "https://images.unsplash.com/photo-1548013146-72479768bada",
    price: 12000,
    rating: 4.9,
  },
  {
    id: 3,
    name: "Goa Beaches",
    image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2",
    price: 18000,
    rating: 4.6,
  },
  {
    id: 4,
    name: "Varanasi Ghats",
    image: "https://images.unsplash.com/photo-1571536802807-30aa00c0ac4a",
    price: 14000,
    rating: 4.5,
  },
  {
    id: 5,
    name: "Ladakh",
    image: "https://images.unsplash.com/photo-1590496794008-383c8070b257",
    price: 25000,
    rating: 4.8,
  },
  {
    id: 6,
    name: "Rajasthan Palaces",
    image: "https://images.unsplash.com/photo-1575505586569-646b2ca898fc",
    price: 20000,
    rating: 4.7,
  },
];

const worldDestinations = [
  {
    id: 1,
    name: "Bali, Indonesia",
    image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742",
    price: 65000,
    rating: 4.8,
  },
  {
    id: 2,
    name: "Santorini, Greece",
    image: "https://images.unsplash.com/photo-1426604966848-d7adac402bff",
    price: 95000,
    rating: 4.9,
  },
  {
    id: 3,
    name: "Kyoto, Japan",
    image: "https://images.unsplash.com/photo-1466442929976-97f336a657be",
    price: 85000,
    rating: 4.7,
  },
  {
    id: 4,
    name: "Machu Picchu, Peru",
    image: "https://images.unsplash.com/photo-1526392060635-9d6019884377",
    price: 110000,
    rating: 4.9,
  },
  {
    id: 5,
    name: "Paris, France",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34",
    price: 80000,
    rating: 4.7,
  },
  {
    id: 6,
    name: "Maldives",
    image: "https://images.unsplash.com/photo-1573843981267-be1999ff37cd",
    price: 120000,
    rating: 5.0,
  },
];

const Packages = () => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main>
        {/* Hero */}
        <section className="pt-32 pb-16 bg-udan-lightGray">
          <div className="container mx-auto px-4 md:px-6 text-center">
            <h1 className="text-3xl md:text-4xl font-bold text-udan-charcoal mb-4">Explore Our Travel Packages</h1>
            <p className="text-udan-gray max-w-2xl mx-auto">
              Discover our carefully curated selection of travel packages designed to create unforgettable experiences around the world.
            </p>
          </div>
        </section>
        
        {/* India Destinations */}
        <section className="py-16">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-udan-charcoal mb-8">Top Destinations in India</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {indiaDestinations.map((destination) => (
                <DestinationCard 
                  key={destination.id}
                  image={destination.image}
                  name={destination.name}
                  price={destination.price}
                  rating={destination.rating}
                />
              ))}
            </div>
          </div>
        </section>
        
        {/* World Destinations */}
        <section className="py-16 bg-udan-lightGray">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-2xl md:text-3xl font-bold text-udan-charcoal mb-8">Top Destinations Around the World</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {worldDestinations.map((destination) => (
                <DestinationCard 
                  key={destination.id}
                  image={destination.image}
                  name={destination.name}
                  price={destination.price}
                  rating={destination.rating}
                />
              ))}
            </div>
          </div>
        </section>
        
        {/* Call to Action */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4 md:px-6">
            <div className="bg-udan-orange/10 rounded-2xl p-8 md:p-12 text-center">
              <h2 className="text-2xl md:text-3xl font-bold text-udan-charcoal mb-4">
                Looking for a Custom Travel Experience?
              </h2>
              <p className="text-udan-gray max-w-2xl mx-auto mb-8">
                Our travel experts can create a personalized itinerary tailored to your preferences, budget, and travel style.
              </p>
              <Link to="/contact" className="bg-udan-orange text-white px-8 py-3 rounded-full font-medium hover:bg-udan-orange/90 transition-colors">
                Contact Us for Custom Packages
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Packages;
